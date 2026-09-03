/* ============================================================
   MosaOS — Supabase-Verbindung (gemeinsam für alle Seiten)
   Diese Werte sind öffentlich-sicher (publishable key).
   Die echte Absicherung macht die Mandanten-Trennung (RLS)
   in der Datenbank.
   ============================================================ */
// Es gibt genau EIN Projekt. Vorher schaltete ?staging=1 zwischen zwei
// Datenbanken um — das hat verschleiert, auf welcher die App gerade
// läuft, und endete darin, dass die Live-App auf ein pausiertes Projekt
// zeigte („Failed to fetch"). Der öffentliche Schlüssel darf im Browser
// stehen; die Absicherung macht die Mandanten-Trennung (RLS).
window.SUPA_URL = 'https://kxhsroiholjnyisaystr.supabase.co';
window.SUPA_KEY = 'sb_publishable_eoasP900q_btzYLvvnTUQQ_L839WJH7';
window.MOSAOS_STAGING = false;

/* „Angemeldet bleiben": Flag entscheidet, wo die Session liegt.
   localStorage  → bleibt über Browser-Neustarts erhalten (Standard)
   sessionStorage → nur bis der Browser geschlossen wird
   Beide Werte werden in login.html gesetzt; alle Seiten lesen dasselbe Flag. */
window.SB = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(window.SUPA_URL, window.SUPA_KEY, {
      auth: {
        persistSession: true,
        storage: (typeof localStorage !== 'undefined' && localStorage.getItem('mosaos_remember') === '0')
          ? window.sessionStorage : window.localStorage
      }
    })
  : null;

/* Kleiner Helfer: aktuelle Session holen (oder null) */
window.mosaosSession = async function () {
  if (!window.SB) return null;
  const { data } = await window.SB.auth.getSession();
  return data ? data.session : null;
};
