/* MosaOS Supabase browser configuration.
 *
 * Database tables, RLS policies, private Storage and Edge Functions are defined
 * only in /supabase. Apply them through the Supabase CLI in staging first.
 * Never restore the former anonymous timelog or Storage write policies here.
 */
window.MOSAOS_SUPABASE = {
  // Empty values intentionally reuse the public client from supabase-client.js.
  url: '',
  anonKey: '',
};
