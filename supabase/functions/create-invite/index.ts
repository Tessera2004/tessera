import { json, options, randomToken, sha256 } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const auth = await authenticatedTenant(req);
    if (auth.role !== 'admin') return json({ error: 'FORBIDDEN' }, 403);
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const role = ['admin','disposition','buchhaltung','field','readonly'].includes(body.role) ? body.role : 'readonly';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'INVALID_EMAIL' }, 400);
    const token = randomToken();
    const db = adminClient();
    const { data, error } = await db.from('invites').insert({
      tenant_id: auth.tenantId, email, role,
      firstname: String(body.firstname || '').slice(0, 100) || null,
      lastname: String(body.lastname || '').slice(0, 100) || null,
      created_by: auth.user.id, token_hash: await sha256(token),
      expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
    }).select('id,expires_at').single();
    if (error) throw error;
    return json({ id: data.id, token, expiresAt: data.expires_at });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL';
    return json({ error: code }, code === 'UNAUTHORIZED' ? 401 : 500);
  }
});

