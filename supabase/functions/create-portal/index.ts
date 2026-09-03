import { json, options, withCors } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';
import { safeReturnUrl, stripeRequest } from '../_shared/stripe.ts';

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  try {
    const auth = await authenticatedTenant(req);
    if (auth.role !== 'admin') return json({ error: 'FORBIDDEN' }, 403);
    const body = await req.json();
    const { data } = await adminClient().from('subscriptions').select('stripe_customer_id').eq('tenant_id', auth.tenantId).single();
    if (!data?.stripe_customer_id) return json({ error: 'NO_STRIPE_CUSTOMER' }, 404);
    const portal = await stripeRequest('/billing_portal/sessions', new URLSearchParams({
      customer: data.stripe_customer_id, return_url: safeReturnUrl(body.returnUrl),
    }));
    return json({ url: portal.url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'INTERNAL' }, 400);
  }
}));

