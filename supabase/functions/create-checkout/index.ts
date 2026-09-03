import { json, options, withCors } from '../_shared/http.ts';
import { authenticatedTenant, adminClient } from '../_shared/supabase.ts';
import { safeReturnUrl, stripeRequest } from '../_shared/stripe.ts';

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const auth = await authenticatedTenant(req);
    if (auth.role !== 'admin') return json({ error: 'FORBIDDEN' }, 403);
    const body = await req.json();
    // 'komplett' ist das Paket, das ZUSAETZLICH zur Basis gebucht wird und alle
    // Einzelmodule ersetzt. Fehlt es hier, wird es stillschweigend weggefiltert und
    // der Kunde zahlt nur die Basis, ohne ein einziges Modul zu bekommen.
    const allowed = ['offerten','rechnungen','anrufprotokoll','aufgaben','email','abos','berichte','zeiten','nachkalkulation','komplett'];
    let modules = [...new Set((Array.isArray(body.modules) ? body.modules : []).filter((m: string) => allowed.includes(m)))];
    // Paket schlaegt Einzelmodule — sonst zahlt der Kunde beides nebeneinander.
    if (modules.includes('komplett')) modules = ['komplett'];
    const prices = JSON.parse(Deno.env.get('STRIPE_PRICE_MAP') || '{}');
    if (!prices.base) throw new Error('STRIPE_PRICE_MAP_NOT_CONFIGURED');
    const selectedPrices = [prices.base, ...modules.map((m) => prices[m]).filter(Boolean)];
    if (selectedPrices.length !== modules.length + 1) throw new Error('MISSING_PRICE_CONFIGURATION');

    // Preis je Mitarbeitendem. Die Website verspricht ihn seit Beginn,
    // abgerechnet wurde er nie — das war ein Versprechen ohne Deckung.
    // Gezaehlt werden nur aktive: Wer den Betrieb verlassen hat, steht noch
    // in der Liste, soll aber nichts mehr kosten.
    const sitze = await zaehleAktive(auth.tenantId);
    const p = new URLSearchParams({
      mode: 'subscription', success_url: safeReturnUrl(body.successUrl), cancel_url: safeReturnUrl(body.cancelUrl),
      client_reference_id: auth.tenantId, 'metadata[tenant_id]': auth.tenantId,
      'subscription_data[metadata][tenant_id]': auth.tenantId,
      'subscription_data[metadata][modules]': JSON.stringify(modules),
    });
    selectedPrices.forEach((price, i) => { p.set(`line_items[${i}][price]`, price); p.set(`line_items[${i}][quantity]`, '1'); });
    // Nur aufnehmen, wenn es ueberhaupt Mitarbeitende gibt: Stripe laesst in
    // einer Checkout-Sitzung keine Position mit Menge 0 zu. Ein Einzelner
    // ohne Angestellte zahlt also nur das Paket.
    if (prices.mitarbeiter && sitze > 0) {
      const i = selectedPrices.length;
      p.set(`line_items[${i}][price]`, prices.mitarbeiter);
      p.set(`line_items[${i}][quantity]`, String(sitze));
    }
    const session = await stripeRequest('/checkout/sessions', p);
    return json({ url: session.url });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL';
    return json({ error: code }, code === 'UNAUTHORIZED' ? 401 : 400);
  }
}));

// Zaehlt die aktiv gefuehrten Mitarbeitenden eines Betriebs.
// Scheitert die Abfrage, wird 0 zurueckgegeben statt der Kauf abgebrochen:
// Lieber eine Rechnung ohne Sitzposition als ein Kunde, der nicht bezahlen
// kann. Die Menge wird ohnehin vor jeder Rechnung neu gesetzt.
async function zaehleAktive(tenantId: string): Promise<number> {
  try {
    const { count, error } = await adminClient()
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'aktiv');
    if (error) throw error;
    return count || 0;
  } catch (e) {
    console.error('Mitarbeitende nicht zaehlbar, Sitzposition entfaellt:', e);
    return 0;
  }
}
