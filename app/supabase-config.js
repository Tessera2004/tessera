/* ============================================================
   MosaOS — Supabase Konfiguration
   ============================================================
   Trage hier deine Supabase-Zugangsdaten ein.
   Diese Datei wird von app.html UND checkin.html genutzt.

   SETUP (einmalig im Supabase Dashboard):
   ─────────────────────────────────────────
   1. Projekt-URL und anon key unter:
      Supabase Dashboard → Project Settings → API

   2. SQL ausführen (SQL Editor im Dashboard):
   ─────────────────────────────────────────────

   CREATE TABLE timelog (
     id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
     job_key       TEXT        NOT NULL,
     job_label     TEXT,
     employee_id   TEXT,
     employee_name TEXT,
     check_in      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     check_out     TIMESTAMPTZ,
     duration_m    INT,
     photo_url     TEXT,
     notes         TEXT,
     created_at    TIMESTAMPTZ DEFAULT NOW()
   );

   ALTER TABLE timelog ENABLE ROW LEVEL SECURITY;

   -- Mitarbeiter dürfen anonym einchecken (INSERT ohne Login)
   CREATE POLICY "anon_insert" ON timelog
     FOR INSERT TO anon WITH CHECK (true);

   -- Büro liest alle Einträge (nur nach Supabase-Login)
   CREATE POLICY "auth_read" ON timelog
     FOR SELECT TO authenticated USING (true);

   -- Büro (oder gleiche Session) darf checkout/photo updaten
   CREATE POLICY "anon_update" ON timelog
     FOR UPDATE TO anon USING (true) WITH CHECK (true);

   3. Storage Bucket anlegen:
      Supabase Dashboard → Storage → New bucket
      Name: checkin-photos
      Public: JA (damit photo_url direkt aufrufbar ist)

   ============================================================ */

window.MOSAOS_SUPABASE = {
  url:     '',   // https://xxxxxxxxxxxxxxxx.supabase.co
  anonKey: '',   // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
};
