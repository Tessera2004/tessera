import { json, options, withCors } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';
import { decryptMailValue, mailEncryptionKeyVersion } from '../_shared/mail-crypto.ts';
import { tenantHasMailModule } from '../_shared/mail-entitlement.ts';
import { hasMailPermission } from '../_shared/mail-user.ts';
import { refreshGmailAccessToken } from '../_shared/gmail-auth.ts';
import { gmailReplyRaw } from '../_shared/mail-delivery-core.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function setDeliveryState(tenantId: string, messageId: string, status: string, errorCode: string | null) {
  await adminClient().from('mail_messages').update({ status, delivery_error_code: errorCode })
    .eq('id', messageId).eq('tenant_id', tenantId).eq('status', 'sending');
}

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  let tenantId = '';
  let claimedMessageId = '';
  let claimedAccountId = '';
  let networkStarted = false;
  try {
    const auth = await authenticatedTenant(req);
    tenantId = auth.tenantId;
    if (!await hasMailPermission(req, 'mail.send')) return json({ error: 'FORBIDDEN' }, 403);
    if (!await tenantHasMailModule(tenantId)) return json({ error: 'MAIL_MODULE_REQUIRED' }, 402);
    const input = await req.json().catch(() => ({}));
    const draftId = String(input.draftId || '');
    if (!UUID.test(draftId)) return json({ error: 'INVALID_INPUT' }, 400);
    const db = adminClient();
    const { data: messageId, error: claimError } = await db.rpc('claim_mail_draft_delivery', {
      p_draft_id: draftId, p_tenant_id: tenantId, p_actor_id: auth.user.id,
    });
    if (claimError) throw claimError;
    if (!messageId) return json({ error: 'ALREADY_SENT_OR_NOT_READY' }, 409);
    claimedMessageId = String(messageId);

    const { data: message, error } = await db.from('mail_messages')
      .select('id,mail_account_id,provider_thread_id,encrypted_payload,payload_key_version,mail_drafts!inner(id,encrypted_subject,encrypted_body,payload_key_version),mail_accounts!inner(id,provider,email,encrypted_refresh_token,token_key_version)')
      .eq('id', claimedMessageId).eq('tenant_id', tenantId).eq('mail_drafts.id', draftId).maybeSingle();
    if (error || !message) throw new Error('MAIL_DELIVERY_DATA_UNAVAILABLE');
    const draft = Array.isArray(message.mail_drafts) ? message.mail_drafts[0] : message.mail_drafts;
    const account = Array.isArray(message.mail_accounts) ? message.mail_accounts[0] : message.mail_accounts;
    if (!draft || !account || account.provider !== 'gmail' || Number(message.payload_key_version) !== mailEncryptionKeyVersion()
      || Number(draft.payload_key_version) !== mailEncryptionKeyVersion() || Number(account.token_key_version) !== mailEncryptionKeyVersion()) {
      throw new Error('MAIL_DELIVERY_DATA_UNAVAILABLE');
    }
    claimedAccountId = String(account.id);
    const [payloadText, subject, body, refreshToken] = await Promise.all([
      decryptMailValue(String(message.encrypted_payload), `message:${tenantId}:${message.id}:gmail`),
      decryptMailValue(String(draft.encrypted_subject), `draft:${tenantId}:${draft.id}:subject`),
      decryptMailValue(String(draft.encrypted_body), `draft:${tenantId}:${draft.id}:body`),
      decryptMailValue(String(account.encrypted_refresh_token), `refresh-token:${tenantId}:${account.id}:gmail`),
    ]);
    const payload = JSON.parse(payloadText);
    const accessToken = await refreshGmailAccessToken(refreshToken);
    const raw = gmailReplyRaw({ from: String(account.email), to: String(payload.from || ''), subject, body,
      messageId: String(payload.messageId || ''), references: String(payload.references || '') });

    networkStarted = true;
    let gmailResponse: Response;
    try {
      gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw, ...(message.provider_thread_id ? { threadId: message.provider_thread_id } : {}) }),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      await setDeliveryState(tenantId, claimedMessageId, 'delivery_unknown', 'GMAIL_DELIVERY_UNKNOWN');
      return json({ error: 'DELIVERY_UNKNOWN' }, 502);
    }
    const gmailResult = await gmailResponse.json().catch(() => ({}));
    if (!gmailResponse.ok) {
      if (gmailResponse.status >= 500) {
        await setDeliveryState(tenantId, claimedMessageId, 'delivery_unknown', 'GMAIL_DELIVERY_UNKNOWN');
        return json({ error: 'DELIVERY_UNKNOWN' }, 502);
      }
      await setDeliveryState(tenantId, claimedMessageId, 'reviewed', gmailResponse.status === 401 ? 'GMAIL_REAUTH_REQUIRED' : 'GMAIL_SEND_REJECTED');
      if (gmailResponse.status === 401) await db.from('mail_accounts').update({ status: 'reauth_required', last_error_code: 'GMAIL_REAUTH_REQUIRED' })
        .eq('id', account.id).eq('tenant_id', tenantId);
      return json({ error: gmailResponse.status === 401 ? 'GMAIL_REAUTH_REQUIRED' : 'GMAIL_SEND_REJECTED' }, 502);
    }
    const sentAt = new Date().toISOString();
    const { data: finished, error: finishError } = await db.rpc('finish_mail_draft_delivery', {
      p_draft_id: draftId, p_tenant_id: tenantId, p_sent_at: sentAt,
    });
    if (finishError || !finished) {
      await setDeliveryState(tenantId, claimedMessageId, 'delivery_unknown', 'DELIVERY_RECORDED_INCOMPLETE');
      return json({ error: 'DELIVERY_UNKNOWN' }, 502);
    }
    await db.from('audit_log').insert({ tenant_id: tenantId, actor_id: auth.user.id, action: 'send',
      table_name: 'mail_drafts', record_id: draftId, metadata: { messageId: claimedMessageId, providerMessageId: gmailResult.id || null } });
    return json({ ok: true, sentAt });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'MAIL_SEND_FAILED';
    if (claimedMessageId && !networkStarted) await setDeliveryState(tenantId, claimedMessageId, 'reviewed', code.slice(0, 100));
    if (claimedAccountId && code === 'GMAIL_REAUTH_REQUIRED') await adminClient().from('mail_accounts').update({
      status: 'reauth_required', last_error_code: 'GMAIL_REAUTH_REQUIRED',
    }).eq('id', claimedAccountId).eq('tenant_id', tenantId);
    if (code === 'UNAUTHORIZED') return json({ error: code }, 401);
    if (code === 'NO_TENANT' || code === 'MAIL_PERMISSION_CHECK_FAILED') return json({ error: 'FORBIDDEN' }, 403);
    if (code === 'GMAIL_REAUTH_REQUIRED') return json({ error: code }, 502);
    return json({ error: 'MAIL_SEND_FAILED' }, 500);
  }
}));
