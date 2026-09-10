import { json, options, withCors } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';
import { decryptMailValue, mailEncryptionKeyVersion } from '../_shared/mail-crypto.ts';

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const auth = await authenticatedTenant(req);
    if (auth.role !== 'admin') return json({ error: 'FORBIDDEN' }, 403);
    const body = await req.json().catch(() => ({}));
    const accountId = String(body.accountId || '');
    if (!/^[0-9a-f-]{36}$/i.test(accountId)) return json({ error: 'INVALID_INPUT' }, 400);

    const db = adminClient();
    const { data: account, error } = await db.from('mail_accounts')
      .select('id,tenant_id,provider,email,encrypted_refresh_token,token_key_version')
      .eq('id', accountId).eq('tenant_id', auth.tenantId).maybeSingle();
    if (error) throw error;
    if (!account) return json({ error: 'NOT_FOUND' }, 404);
    if (account.provider !== 'gmail' || account.token_key_version !== mailEncryptionKeyVersion()) {
      return json({ error: 'UNSUPPORTED_CONNECTION' }, 409);
    }

    const refreshToken = await decryptMailValue(
      account.encrypted_refresh_token,
      `refresh-token:${auth.tenantId}:${account.id}:gmail`,
    );
    const revoked = await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(refreshToken), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    // 400 bedeutet normalerweise, dass der Token bereits ungueltig ist. In
    // diesem Fall kann die lokale Kopie ebenfalls sicher entfernt werden.
    if (!revoked.ok && revoked.status !== 400) {
      await db.from('mail_accounts').update({ status: 'disabled', last_error_code: 'TOKEN_REVOCATION_FAILED' })
        .eq('id', account.id).eq('tenant_id', auth.tenantId);
      return json({ error: 'TOKEN_REVOCATION_FAILED' }, 502);
    }

    const { error: deleteError } = await db.from('mail_accounts').delete()
      .eq('id', account.id).eq('tenant_id', auth.tenantId);
    if (deleteError) throw deleteError;
    await db.from('audit_log').insert({
      tenant_id: auth.tenantId,
      actor_id: auth.user.id,
      action: 'disconnect',
      table_name: 'mail_accounts',
      record_id: account.id,
      metadata: { provider: account.provider },
    });
    return json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL';
    if (code === 'UNAUTHORIZED') return json({ error: code }, 401);
    if (code === 'NO_TENANT') return json({ error: code }, 403);
    if (code === 'MAIL_DECRYPTION_FAILED' || code === 'MAIL_ENCRYPTION_KEY_INVALID') {
      return json({ error: 'MAIL_SECRET_UNAVAILABLE' }, 500);
    }
    return json({ error: 'INTERNAL' }, 500);
  }
}));
