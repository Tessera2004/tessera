/* ============================================================
   MosaOS — Stripe / Abo-Konfiguration (Frontend)
   ------------------------------------------------------------
   Nur ÖFFENTLICHE Werte. Der Geheimschlüssel (sk_…) gehört NIE
   hierher — der liegt als Secret in den Supabase Edge Functions.
   ============================================================ */
window.MOSAOS_STRIPE = {
  // Öffentlicher Stripe-Schlüssel (Test-Modus). Darf öffentlich sein.
  publishableKey: 'pk_test_51TlXK2DiMEsNEh6fk3cSp8uMPv7ktUlTJfSm1cWxYsOIKLxfFmCxsZL3OmtCTpiVnNsR8TImNx8WDRuutGSqaRsw00lMLoWY8S',

  // Basis-URL der Supabase Edge Functions (aus supabase-client.js abgeleitet)
  get functionsUrl() {
    return (window.SUPA_URL || '') + '/functions/v1';
  },

  // Abonnierbare Module (Key = exakt der App-Feature-Key UND der Stripe-Lookup-Key-Suffix).
  // Basis ist immer enthalten und wird separat berechnet.
  basePriceChf: 49,
  modules: [
    { key: 'offerten',        label: 'Offerten',             priceChf: 25 },
    { key: 'rechnungen',      label: 'Rechnungen',           priceChf: 19 },
    { key: 'anrufprotokoll',  label: 'Anrufprotokoll',       priceChf: 19 },
    { key: 'aufgaben',        label: 'Aufgaben',             priceChf: 15 },
    { key: 'email',           label: 'E-Mail-Postfach',      priceChf: 39 },
    { key: 'abos',            label: 'Abo-Verträge',         priceChf: 19 },
    { key: 'berichte',        label: 'Nachweise & Berichte', priceChf: 19 },
    { key: 'zeiten',          label: 'Zeiterfassung',        priceChf: 19 },
    { key: 'nachkalkulation', label: 'Nachkalkulation',      priceChf: 19 },
  ],
};
