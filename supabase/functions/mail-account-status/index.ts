import { json, options, withCors } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';
import { hasMailPermission } from '../_shared/mail-user.ts';

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'GET') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const auth = await authenticatedTenant(req);
    if (!await hasMailPermission(req, 'mail.read')) return json({ error: 'FORBIDDEN' }, 403);
    const { data, error } = await adminClient().from('mail_accounts')
      .select('id,provider,email,status,last_synced_at,last_error_code,created_at')
      .eq('tenant_id', auth.tenantId).order('created_at');
    if (error) throw error;
    return json({ accounts: (data || []).map((account) => ({
      id: account.id,
      provider: account.provider,
      email: account.email,
      status: account.status,
      lastSyncedAt: account.last_synced_at,
      lastErrorCode: account.last_error_code,
      createdAt: account.created_at,
    })) });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL';
    if (code === 'UNAUTHORIZED') return json({ error: code }, 401);
    if (code === 'NO_TENANT' || code === 'MAIL_PERMISSION_CHECK_FAILED') return json({ error: 'FORBIDDEN' }, 403);
    return json({ error: 'INTERNAL' }, 500);
  }
}));
