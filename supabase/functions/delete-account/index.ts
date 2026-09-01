import { json, options } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const auth = await authenticatedTenant(req);
    const db = adminClient();
    const { count } = await db.from('tenant_users').select('user_id', { count: 'exact', head: true })
      .eq('tenant_id', auth.tenantId).eq('role', 'admin');
    if (auth.role === 'admin' && (count || 0) <= 1) return json({ error: 'LAST_ADMIN' }, 409);
    const { error } = await db.auth.admin.deleteUser(auth.user.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL';
    return json({ error: code }, code === 'UNAUTHORIZED' ? 401 : 500);
  }
});
