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

  // Preis pro aktiv gefuehrtem Mitarbeitenden, zusaetzlich zum Paket.
  // Die Website verspricht das seit Beginn; abgerechnet wurde es nie.
  // Eine Zahl an einer Stelle — Website, Checkout und Stripe-Skript
  // lesen alle hier.
  seatPriceChf: 4,

  // Komplettpaket: wird ZUSÄTZLICH zur Basis gebucht (49 + 50 = 99/Monat)
  // und ersetzt alle Einzelmodule. Einzeln gebucht kosten sie 106 —
  // das Paket ist damit sichtbar günstiger und hebt den Schnitt.
  komplett: { key: 'komplett', label: 'Alle Module', priceChf: 50, gesamtChf: 99 },

  modules: [
    { key: 'offerten',        label: 'Offerten',             priceChf: 14 },
    { key: 'rechnungen',      label: 'Rechnungen',           priceChf: 14 },
    { key: 'anrufprotokoll',  label: 'Anrufprotokoll',       priceChf: 9 },
    { key: 'aufgaben',        label: 'Aufgaben',             priceChf: 9 },
    { key: 'email',           label: 'E-Mail-Postfach',      priceChf: 19 },
    { key: 'abos',            label: 'Abo-Verträge',         priceChf: 9 },
    { key: 'berichte',        label: 'Nachweise & Berichte', priceChf: 9 },
    { key: 'zeiten',          label: 'Zeiterfassung',        priceChf: 14 },
    { key: 'nachkalkulation', label: 'Nachkalkulation',      priceChf: 9 },
  ],
};
