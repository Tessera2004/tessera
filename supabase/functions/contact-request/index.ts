import { json, options, sha256 } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const body = await req.json();
    if (String(body.website || '')) return json({ ok: true });
    const firstName = String(body.firstName || '').trim().slice(0, 100);
    const lastName = String(body.lastName || '').trim().slice(0, 100);
    const company = String(body.company || '').trim().slice(0, 200);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 320);
    const message = String(body.message || '').trim().slice(0, 5000);
    if (!firstName || !lastName || !company || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || body.consent !== true) {
      return json({ error: 'INVALID_INPUT' }, 400);
    }
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    const ipHash = await sha256(`${Deno.env.get('CONTACT_HASH_SALT') || ''}:${ip}`);
    const db = adminClient();
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db.from('contact_requests').select('id', { count: 'exact', head: true })
      .eq('source_ip_hash', ipHash).gte('created_at', since);
    if ((count || 0) >= 5) return json({ error: 'RATE_LIMITED' }, 429);
    const { error } = await db.from('contact_requests').insert({
      first_name: firstName, last_name: lastName, company, email,
      phone: String(body.phone || '').trim().slice(0, 80) || null,
      industry: String(body.industry || '').trim().slice(0, 100) || null,
      message, consent_at: new Date().toISOString(), source_ip_hash: ipHash,
    });
    if (error) throw error;
    return json({ ok: true }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'INTERNAL' }, 500);
  }
});

