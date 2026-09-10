import { adminClient } from '../_shared/supabase.ts';
import { decryptMailValue, encryptMailValue, mailEncryptionKeyVersion } from '../_shared/mail-crypto.ts';
import { tenantHasMailModule } from '../_shared/mail-entitlement.ts';
import { gmailMessageIdsFromHistory, gmailMessageToPayload } from '../_shared/mail-sync-core.ts';

const MAX_ACCOUNTS_PER_RUN = 50;
const MAX_MESSAGES_PER_ACCOUNT = 100;

async function secretMatches(received: string, expected: string) {
  if (!received || !expected) return false;
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [left, right] = await Promise.all([digest(received), digest(expected)]);
  let different = 0;
  for (let i = 0; i < left.length; i += 1) different |= left[i] ^ right[i];
  return different === 0;
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function senderHash(email: string) {
  if (!email) return null;
  const salt = Deno.env.get('MAIL_CONTACT_HASH_SALT') || '';
  if (salt.length < 32) throw new Error('MAIL_CONTACT_HASH_SALT_INVALID');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(email.trim().toLowerCase()));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function refreshGmailAccessToken(refreshToken: string) {
  const clientId = Deno.env.get('GMAIL_OAUTH_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('GMAIL_OAUTH_CLIENT_SECRET') || '';
  if (!clientId || !clientSecret) throw new Error('MAIL_OAUTH_NOT_CONFIGURED');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const token = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !token.access_token) {
    if (token.error === 'invalid_grant') throw new Error('GMAIL_REAUTH_REQUIRED');
    throw new Error('GMAIL_TOKEN_REFRESH_FAILED');
  }
  return String(token.access_token);
}

async function gmailJson(url: URL | string, accessToken: string) {
  const result = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
  if (result.status === 404) return { missing: true, data: {} as Record<string, unknown> };
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(result.status === 401 ? 'GMAIL_REAUTH_REQUIRED' : 'GMAIL_API_FAILED');
  return { missing: false, data: data as Record<string, unknown> };
}

async function initialMessageIds(accessToken: string) {
  const profile = await gmailJson('https://gmail.googleapis.com/gmail/v1/users/me/profile', accessToken);
  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  listUrl.search = new URLSearchParams({ labelIds: 'INBOX', maxResults: '25', q: 'newer_than:7d' }).toString();
  const list = await gmailJson(listUrl, accessToken);
  const messages = Array.isArray(list.data.messages) ? list.data.messages as Array<Record<string, unknown>> : [];
  return {
    ids: messages.map((message) => String(message.id || '')).filter(Boolean),
    cursor: String(profile.data.historyId || ''),
  };
}

async function historyMessageIds(accessToken: string, startHistoryId: string) {
  const ids = new Set<string>();
  let pageToken = '';
  let cursor = startHistoryId;
  for (let page = 0; page < 5 && ids.size < MAX_MESSAGES_PER_ACCOUNT; page += 1) {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/history');
    const query: Record<string, string> = {
      startHistoryId,
      historyTypes: 'messageAdded',
      labelId: 'INBOX',
      maxResults: '100',
    };
    if (pageToken) query.pageToken = pageToken;
    url.search = new URLSearchParams(query).toString();
    const result = await gmailJson(url, accessToken);
    if (result.missing) return null;
    gmailMessageIdsFromHistory(result.data).forEach((id) => ids.add(id));
    cursor = String(result.data.historyId || cursor);
    pageToken = String(result.data.nextPageToken || '');
    if (!pageToken) break;
  }
  // Niemals den Cursor vorschieben, solange noch Seiten oder mehr Nachrichten
  // offen sind: Das waere ein stiller Datenverlust. Der Admin sieht den Fehler
  // und kann den Rueckstand kontrolliert aufarbeiten.
  if (pageToken || ids.size > MAX_MESSAGES_PER_ACCOUNT) throw new Error('GMAIL_BACKLOG_TOO_LARGE');
  return { ids: [...ids], cursor };
}

async function newMessageIds(accessToken: string, cursor: string | null) {
  if (!cursor) return await initialMessageIds(accessToken);
  return await historyMessageIds(accessToken, cursor) || await initialMessageIds(accessToken);
}

async function fetchMessage(accessToken: string, id: string) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`);
  url.searchParams.set('format', 'full');
  const result = await gmailJson(url, accessToken);
  return result.missing ? null : result.data;
}

function safeErrorCode(error: unknown) {
  const code = error instanceof Error ? error.message : 'MAIL_SYNC_FAILED';
  return [
    'MAIL_ENCRYPTION_KEY_INVALID', 'MAIL_DECRYPTION_FAILED', 'MAIL_CONTACT_HASH_SALT_INVALID',
    'MAIL_OAUTH_NOT_CONFIGURED', 'GMAIL_REAUTH_REQUIRED', 'GMAIL_TOKEN_REFRESH_FAILED',
    'GMAIL_API_FAILED', 'MAIL_MODULE_REQUIRED',
    'GMAIL_BACKLOG_TOO_LARGE',
  ].includes(code) ? code : 'MAIL_SYNC_FAILED';
}

async function syncAccount(account: Record<string, unknown>, retentionDays: number) {
  const tenantId = String(account.tenant_id);
  const accountId = String(account.id);
  if (Number(account.token_key_version) !== mailEncryptionKeyVersion()) throw new Error('MAIL_ENCRYPTION_KEY_INVALID');
  const refreshToken = await decryptMailValue(
    String(account.encrypted_refresh_token),
    `refresh-token:${tenantId}:${accountId}:gmail`,
  );
  const accessToken = await refreshGmailAccessToken(refreshToken);
  const discovered = await newMessageIds(accessToken, account.provider_cursor ? String(account.provider_cursor) : null);
  const db = adminClient();
  const ids = [...new Set(discovered.ids)].slice(0, MAX_MESSAGES_PER_ACCOUNT);
  let existingIds = new Set<string>();
  if (ids.length) {
    const { data, error } = await db.from('mail_messages').select('provider_message_id')
      .eq('mail_account_id', accountId).eq('tenant_id', tenantId).in('provider_message_id', ids);
    if (error) throw error;
    existingIds = new Set((data || []).map((row) => String(row.provider_message_id)));
  }
  const unseenIds = ids.filter((id) => !existingIds.has(id));
  const rows: Array<Record<string, unknown>> = [];
  for (let offset = 0; offset < unseenIds.length; offset += 5) {
    const batchIds = unseenIds.slice(offset, offset + 5);
    const messages = await Promise.all(batchIds.map((id) => fetchMessage(accessToken, id)));
    for (let i = 0; i < messages.length; i += 1) {
      const message = messages[i];
      if (!message) continue;
      const messageId = crypto.randomUUID();
      const payload = gmailMessageToPayload(message);
      rows.push({
        id: messageId,
        tenant_id: tenantId,
        mail_account_id: accountId,
        provider_message_id: batchIds[i],
        provider_thread_id: message.threadId ? String(message.threadId) : null,
        received_at: payload.receivedAt,
        encrypted_payload: await encryptMailValue(JSON.stringify(payload), `message:${tenantId}:${messageId}:gmail`),
        payload_key_version: mailEncryptionKeyVersion(),
        sender_hash: await senderHash(payload.from),
        needs_human: true,
        status: 'new',
        retention_until: new Date(Date.now() + retentionDays * 86400000).toISOString(),
      });
    }
  }
  if (rows.length) {
    const { error } = await db.from('mail_messages').upsert(rows, {
      onConflict: 'mail_account_id,provider_message_id',
      ignoreDuplicates: true,
    });
    if (error) throw error;
  }
  const { error: updateError } = await db.from('mail_accounts').update({
    provider_cursor: discovered.cursor || account.provider_cursor,
    last_synced_at: new Date().toISOString(),
    last_error_code: null,
    status: 'active',
  }).eq('id', accountId).eq('tenant_id', tenantId);
  if (updateError) throw updateError;
  return { found: ids.length, created: rows.length };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return response({ error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!await secretMatches(req.headers.get('x-cron-secret') || '', Deno.env.get('MAIL_CRON_SECRET') || '')) {
    return response({ error: 'UNAUTHORIZED' }, 401);
  }
  const db = adminClient();
  const { data: accounts, error } = await db.from('mail_accounts')
    .select('id,tenant_id,provider,email,encrypted_refresh_token,token_key_version,provider_cursor,last_synced_at')
    .eq('provider', 'gmail').eq('status', 'active')
    .order('last_synced_at', { ascending: true, nullsFirst: true }).limit(MAX_ACCOUNTS_PER_RUN);
  if (error) return response({ error: 'DATABASE_ERROR' }, 500);

  const result = { checked: 0, created: 0, failed: 0, skipped: 0 };
  for (const account of accounts || []) {
    const tenantId = String(account.tenant_id);
    const entitled = await tenantHasMailModule(tenantId);
    const { data: settings } = await db.from('mail_agent_settings')
      .select('enabled,mode,retention_days').eq('tenant_id', tenantId).maybeSingle();
    if (!entitled || !settings?.enabled || settings.mode !== 'draft_only') {
      result.skipped += 1;
      continue;
    }
    result.checked += 1;
    const { data: run } = await db.from('mail_agent_runs').insert({
      tenant_id: tenantId,
      mail_account_id: account.id,
      run_type: 'sync',
      status: 'running',
    }).select('id').single();
    try {
      const synced = await syncAccount(account, Math.max(1, Math.min(365, Number(settings.retention_days) || 30)));
      result.created += synced.created;
      if (run?.id) await db.from('mail_agent_runs').update({
        status: 'success', messages_found: synced.found, drafts_created: 0, finished_at: new Date().toISOString(),
      }).eq('id', run.id).eq('tenant_id', tenantId);
    } catch (syncError) {
      result.failed += 1;
      const errorCode = safeErrorCode(syncError);
      await db.from('mail_accounts').update({
        status: errorCode === 'GMAIL_REAUTH_REQUIRED' ? 'reauth_required' : 'active',
        last_error_code: errorCode,
      }).eq('id', account.id).eq('tenant_id', tenantId);
      if (run?.id) await db.from('mail_agent_runs').update({
        status: 'failed', error_code: errorCode, finished_at: new Date().toISOString(),
      }).eq('id', run.id).eq('tenant_id', tenantId);
    }
  }
  return response(result);
});
