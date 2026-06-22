/* ============================================================
   MosaOS — Supabase-Verbindung (gemeinsam für alle Seiten)
   Diese Werte sind öffentlich-sicher (publishable key).
   Die echte Absicherung macht die Mandanten-Trennung (RLS)
   in der Datenbank.
   ============================================================ */
window.SUPA_URL = 'https://cmwdgizhyjqnxjvpstat.supabase.co';
window.SUPA_KEY = 'sb_publishable_Db__T4fLYMl_q89PcJWHvg_Par2FWH3';

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
