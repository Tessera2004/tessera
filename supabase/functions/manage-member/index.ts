import { json, options } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  try {
    const auth = await authenticatedTenant(req);
    if (auth.role !== 'admin') return json({ error: 'FORBIDDEN' }, 403);
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const db = adminClient();
    let page = 1; let target = null;
    while (!target && page <= 20) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      target = data.users.find((u) => (u.email || '').toLowerCase() === email) || null;
      if (data.users.length < 100) break; page++;
    }
    if (!target) return json({ error: 'USER_NOT_FOUND' }, 404);
    const { data: member } = await db.from('tenant_users').select('role').eq('user_id', target.id).eq('tenant_id', auth.tenantId).maybeSingle();
    if (!member) return json({ error: 'NOT_A_TENANT_MEMBER' }, 404);
    if (body.action === 'updateRole') {
      const role = String(body.role || '');
      if (!['admin','disposition','buchhaltung','field','readonly'].includes(role) && !role.startsWith('role_')) return json({ error: 'INVALID_ROLE' }, 400);
      if (target.id === auth.user.id && role !== 'admin') return json({ error: 'CANNOT_DEMOTE_SELF' }, 409);
      const { error } = await db.from('tenant_users').update({ role }).eq('user_id', target.id).eq('tenant_id', auth.tenantId);
      if (error) throw error;
      return json({ ok: true });
    }
    if (body.action === 'remove') {
      if (target.id === auth.user.id) return json({ error: 'CANNOT_REMOVE_SELF' }, 409);
      if (member.role === 'admin') {
        const { count } = await db.from('tenant_users').select('user_id', { count: 'exact', head: true }).eq('tenant_id', auth.tenantId).eq('role', 'admin');
        if ((count || 0) <= 1) return json({ error: 'LAST_ADMIN' }, 409);
      }
      const { error } = await db.auth.admin.deleteUser(target.id); if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: 'INVALID_ACTION' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'INTERNAL' }, 500);
  }
});

