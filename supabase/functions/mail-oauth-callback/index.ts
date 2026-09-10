import { ALLOWED_ORIGINS, sha256 } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import {
  decryptMailValue,
  encryptMailValue,
  mailEncryptionKeyVersion,
} from '../_shared/mail-crypto.ts';
import { tenantHasMailModule } from '../_shared/mail-entitlement.ts';

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

function resultRedirect(returnPath: string, key: 'mail_connected' | 'mail_error', value: string) {
  const origin = ALLOWED_ORIGINS[0] || 'https://mosaos.ch';
  const safePath = returnPath.startsWith('/') && !returnPath.startsWith('//')
    ? returnPath
    : '/app/app.html';
  const target = new URL(safePath, origin);
  target.searchParams.set(key, value);
  return new Response(null, {
    status: 303,
    headers: { Location: target.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

function oauthError(code: string, returnPath = '/app/app.html') {
  return resultRedirect(returnPath, 'mail_error', code);
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const requestUrl = new URL(req.url);
  const state = requestUrl.searchParams.get('state') || '';
  const code = requestUrl.searchParams.get('code') || '';
  const providerError = requestUrl.searchParams.get('error') || '';
  if (!state || state.length > 500) return oauthError('invalid_state');

  const db = adminClient();
  const stateHash = await sha256(state);
  const { data: claimed, error: claimError } = await db
    .from('mail_oauth_states')
    .update({ consumed_at: new Date().toISOString() })
    .eq('state_hash', stateHash)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('id,tenant_id,user_id,provider,encrypted_pkce_verifier,token_key_version,return_path')
    .maybeSingle();
  if (claimError || !claimed) return oauthError('invalid_or_expired_state');
  const returnPath = String(claimed.return_path || '/app/app.html');
  if (providerError || !code) return oauthError('authorization_denied', returnPath);
  if (claimed.provider !== 'gmail' || claimed.token_key_version !== mailEncryptionKeyVersion()) {
    return oauthError('unsupported_connection', returnPath);
  }

  let issuedRefreshToken = '';
  let accountSaved = false;
  try {
    const { data: membership, error: membershipError } = await db.from('tenant_users')
      .select('role').eq('user_id', claimed.user_id).eq('tenant_id', claimed.tenant_id).maybeSingle();
    if (membershipError || !membership) throw new Error('AUTHORIZATION_REVOKED');
    let mayAdminMail = membership.role === 'admin';
    if (!mayAdminMail && membership.role) {
      const { data: settings } = await db.from('company_settings').select('roles')
        .eq('tenant_id', claimed.tenant_id).maybeSingle();
      const roles = Array.isArray(settings?.roles) ? settings.roles : [];
      const custom = roles.find((role: Record<string, unknown>) => role?.key === membership.role);
      mayAdminMail = Array.isArray(custom?.perms) && custom.perms.includes('admin_email');
    }
    if (!mayAdminMail) throw new Error('AUTHORIZATION_REVOKED');
    if (!await tenantHasMailModule(claimed.tenant_id)) throw new Error('MAIL_MODULE_REQUIRED');

    const clientId = Deno.env.get('GMAIL_OAUTH_CLIENT_ID') || '';
    const clientSecret = Deno.env.get('GMAIL_OAUTH_CLIENT_SECRET') || '';
    const redirectUri = Deno.env.get('MAIL_OAUTH_REDIRECT_URI') || '';
    if (!clientId || !clientSecret || !redirectUri) throw new Error('MAIL_OAUTH_NOT_CONFIGURED');
    const verifier = await decryptMailValue(
      claimed.encrypted_pkce_verifier,
      `oauth-state:${claimed.tenant_id}:${stateHash}:gmail`,
    );

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: verifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    const tokens = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokens.access_token || !tokens.refresh_token) {
      throw new Error('TOKEN_EXCHANGE_FAILED');
    }
    issuedRefreshToken = String(tokens.refresh_token);

    const grantedScopes = String(tokens.scope || '').split(/\s+/).filter(Boolean);
    if (!REQUIRED_SCOPES.every((scope) => grantedScopes.includes(scope))) {
      await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(issuedRefreshToken), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => null);
      throw new Error('REQUIRED_SCOPES_MISSING');
    }

    const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: 'Bearer ' + tokens.access_token },
    });
    const profile = await profileResponse.json().catch(() => ({}));
    const email = String(profile.emailAddress || '').trim().toLowerCase();
    if (!profileResponse.ok || !email || email.length > 320) throw new Error('MAILBOX_PROFILE_FAILED');

    const { error: settingsError } = await db.from('mail_agent_settings').insert({
      tenant_id: claimed.tenant_id,
      enabled: false,
      mode: 'draft_only',
      updated_by: claimed.user_id,
    });
    if (settingsError && settingsError.code !== '23505') throw settingsError;

    const { data: existing, error: existingError } = await db.from('mail_accounts')
      .select('id,encrypted_refresh_token,token_key_version').eq('tenant_id', claimed.tenant_id)
      .eq('provider', 'gmail').maybeSingle();
    if (existingError) throw existingError;
    const accountId = existing?.id || crypto.randomUUID();
    const encryptedRefreshToken = await encryptMailValue(
      issuedRefreshToken,
      `refresh-token:${claimed.tenant_id}:${accountId}:gmail`,
    );
    const account = {
      id: accountId,
      tenant_id: claimed.tenant_id,
      provider: 'gmail',
      email,
      encrypted_refresh_token: encryptedRefreshToken,
      token_key_version: mailEncryptionKeyVersion(),
      scopes: grantedScopes,
      status: 'active',
      last_error_code: null,
      created_by: claimed.user_id,
    };
    const saveResult = existing
      ? await db.from('mail_accounts').update(account).eq('id', accountId).eq('tenant_id', claimed.tenant_id)
      : await db.from('mail_accounts').insert(account);
    if (saveResult.error) throw saveResult.error;
    accountSaved = true;

    // Beim erneuten Verbinden darf der ersetzte Refresh-Token nicht aktiv
    // bleiben. Ist er identisch, wuerde ein Widerruf auch die neue Verbindung
    // zerstoeren und wird deshalb ausgelassen.
    if (existing?.encrypted_refresh_token && existing.token_key_version === mailEncryptionKeyVersion()) {
      try {
        const previousToken = await decryptMailValue(
          existing.encrypted_refresh_token,
          `refresh-token:${claimed.tenant_id}:${accountId}:gmail`,
        );
        if (previousToken !== issuedRefreshToken) {
          await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(previousToken), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
        }
      } catch {
        // Die neue Verbindung ist bereits sicher gespeichert. Ein alter, nicht
        // lesbarer Token wird bei der dokumentierten Schluesselrotation behandelt.
      }
    }

    await db.from('mail_oauth_states').delete().eq('id', claimed.id);
    return resultRedirect(returnPath, 'mail_connected', 'gmail');
  } catch (error) {
    if (issuedRefreshToken && !accountSaved) {
      await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(issuedRefreshToken), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => null);
    }
    const known = new Set([
      'MAIL_OAUTH_NOT_CONFIGURED', 'TOKEN_EXCHANGE_FAILED', 'REQUIRED_SCOPES_MISSING',
      'MAILBOX_PROFILE_FAILED', 'MAIL_DECRYPTION_FAILED', 'MAIL_ENCRYPTION_KEY_INVALID',
      'AUTHORIZATION_REVOKED', 'MAIL_MODULE_REQUIRED',
    ]);
    const message = error instanceof Error && known.has(error.message) ? error.message.toLowerCase() : 'connection_failed';
    return oauthError(message, returnPath);
  }
});
