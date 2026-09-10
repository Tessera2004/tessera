import { adminClient } from '../_shared/supabase.ts';

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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return response({ error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!await secretMatches(req.headers.get('x-cron-secret') || '', Deno.env.get('MAIL_CRON_SECRET') || '')) {
    return response({ error: 'UNAUTHORIZED' }, 401);
  }
  const db = adminClient();
  const now = new Date().toISOString();
  const { data: due, error } = await db.from('mail_messages').select('id,tenant_id')
    .lt('retention_until', now).order('retention_until').limit(1000);
  if (error) return response({ error: 'DATABASE_ERROR' }, 500);
  const rows = due || [];
  if (rows.length) {
    const { error: deleteError } = await db.from('mail_messages').delete().in('id', rows.map((row) => row.id));
    if (deleteError) return response({ error: 'DATABASE_ERROR' }, 500);
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(String(row.tenant_id), (counts.get(String(row.tenant_id)) || 0) + 1));
    await db.from('mail_agent_runs').insert([...counts.entries()].map(([tenantId, count]) => ({
      tenant_id: tenantId,
      run_type: 'retention',
      status: 'success',
      messages_found: count,
      finished_at: now,
    })));
  }
  await db.from('mail_oauth_states').delete().lt('expires_at', now);
  const runCutoff = new Date(Date.now() - 365 * 86400000).toISOString();
  await db.from('mail_agent_runs').delete().lt('started_at', runCutoff);
  return response({ deleted: rows.length, more: rows.length === 1000 });
});
