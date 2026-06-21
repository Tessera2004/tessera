/* ============================================================
   Tessera — Supabase-Verbindung (gemeinsam für alle Seiten)
   Diese Werte sind öffentlich-sicher (publishable key).
   Die echte Absicherung macht die Mandanten-Trennung (RLS)
   in der Datenbank.
   ============================================================ */
window.SUPA_URL = 'https://cmwdgizhyjqnxjvpstat.supabase.co';
window.SUPA_KEY = 'sb_publishable_Db__T4fLYMl_q89PcJWHvg_Par2FWH3';

window.SB = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(window.SUPA_URL, window.SUPA_KEY)
  : null;

/* Kleiner Helfer: aktuelle Session holen (oder null) */
window.tesseraSession = async function () {
  if (!window.SB) return null;
  const { data } = await window.SB.auth.getSession();
  return data ? data.session : null;
};
