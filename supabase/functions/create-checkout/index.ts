import { json, options } from '../_shared/http.ts';
import { authenticatedTenant } from '../_shared/supabase.ts';
import { safeReturnUrl, stripeRequest } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const auth = await authenticatedTenant(req);
    if (auth.role !== 'admin') return json({ error: 'FORBIDDEN' }, 403);
    const body = await req.json();
    const allowed = ['offerten','rechnungen','anrufprotokoll','aufgaben','email','abos','berichte','zeiten','nachkalkulation'];
    const modules = [...new Set((Array.isArray(body.modules) ? body.modules : []).filter((m: string) => allowed.includes(m)))];
    const prices = JSON.parse(Deno.env.get('STRIPE_PRICE_MAP') || '{}');
    if (!prices.base) throw new Error('STRIPE_PRICE_MAP_NOT_CONFIGURED');
    const selectedPrices = [prices.base, ...modules.map((m) => prices[m]).filter(Boolean)];
    if (selectedPrices.length !== modules.length + 1) throw new Error('MISSING_PRICE_CONFIGURATION');
    const p = new URLSearchParams({
      mode: 'subscription', success_url: safeReturnUrl(body.successUrl), cancel_url: safeReturnUrl(body.cancelUrl),
      client_reference_id: auth.tenantId, 'metadata[tenant_id]': auth.tenantId,
      'subscription_data[metadata][tenant_id]': auth.tenantId,
      'subscription_data[metadata][modules]': JSON.stringify(modules),
    });
    selectedPrices.forEach((price, i) => { p.set(`line_items[${i}][price]`, price); p.set(`line_items[${i}][quantity]`, '1'); });
    const session = await stripeRequest('/checkout/sessions', p);
    return json({ url: session.url });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL';
    return json({ error: code }, code === 'UNAUTHORIZED' ? 401 : 400);
  }
});

