import { json, options, randomToken, sha256, withCors } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const auth = await authenticatedTenant(req);
    if (!['admin','disposition'].includes(auth.role)) return json({ error: 'FORBIDDEN' }, 403);
    const body = await req.json();
    const jobKey = String(body.jobKey || '').slice(0, 200);
    const jobLabel = String(body.jobLabel || '').slice(0, 300);
    const jobDate = String(body.jobDate || '');
    const employeeIds = Array.isArray(body.employeeIds) ? body.employeeIds.map(String).slice(0, 100) : [];
    if (!jobKey || !/^\d{4}-\d{2}-\d{2}$/.test(jobDate) || !employeeIds.length) return json({ error: 'INVALID_INPUT' }, 400);
    const secret = randomToken();
    const db = adminClient();
    const { data, error } = await db.from('checkin_tokens').insert({
      tenant_id: auth.tenantId, job_key: jobKey, job_label: jobLabel, job_date: jobDate,
      employee_ids: employeeIds, expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      created_by: auth.user.id, token_hash: await sha256(secret),
    }).select('id,expires_at').single();
    if (error) throw error;
    return json({ token: `${data.id}.${secret}`, expiresAt: data.expires_at });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL';
    return json({ error: code }, code === 'UNAUTHORIZED' ? 401 : 500);
  }
}));

