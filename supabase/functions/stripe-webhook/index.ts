import { adminClient } from '../_shared/supabase.ts';
import { stripeRequest } from '../_shared/stripe.ts';

async function signature(secret: string, payload: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const value = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(value)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const raw = await req.text();
  const header = req.headers.get('stripe-signature') || '';
  const timestamp = header.split(',').find((v) => v.startsWith('t='))?.slice(2);
  const signatures = header.split(',').filter((v) => v.startsWith('v1=')).map((v) => v.slice(3));
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return new Response('invalid signature', { status: 400 });
  const expected = await signature(Deno.env.get('STRIPE_WEBHOOK_SECRET') || '', `${timestamp}.${raw}`);
  if (!signatures.some((v) => v === expected)) return new Response('invalid signature', { status: 400 });
  const event = JSON.parse(raw);
  const db = adminClient();
  const { data: seen, error: seenError } = await db.from('stripe_events').select('event_id').eq('event_id', event.id).maybeSingle();
  if (seenError) return new Response('database error', { status: 500 });
  if (seen) return new Response('ok');
  let object = event.data?.object || {};
  if (event.type === 'checkout.session.completed' && object.subscription) object = await stripeRequest(`/subscriptions/${object.subscription}`, undefined, 'GET');
  if (String(event.type).startsWith('customer.subscription.') || event.type === 'checkout.session.completed') {
    const tenantId = object.metadata?.tenant_id || event.data?.object?.metadata?.tenant_id || event.data?.object?.client_reference_id;
    if (!tenantId) return new Response('missing tenant', { status: 400 });
    let modules: string[] = [];
    try { modules = JSON.parse(object.metadata?.modules || '[]'); } catch { modules = []; }
    const { error: subscriptionError } = await db.from('subscriptions').upsert({
      tenant_id: tenantId, stripe_customer_id: String(object.customer || event.data?.object?.customer || ''),
      stripe_subscription_id: String(object.id || event.data?.object?.subscription || ''), status: object.status || 'active',
      modules, current_period_end: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' });
    if (subscriptionError) return new Response('database error', { status: 500 });
  }
  const { error: eventError } = await db.from('stripe_events').insert({ event_id: event.id, event_type: event.type });
  if (eventError) return new Response('database error', { status: 500 });
  return new Response('ok');
});
