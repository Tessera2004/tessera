/* ============================================================
   MosaOS — Supabase Konfiguration (Multi-Mandant / Option B)
   ============================================================
   Diese Datei wird von app.html UND checkin.html genutzt.
   Wenn du supabase-client.js bereits konfiguriert hast,
   kannst du URL und Key leer lassen — die App verwendet dann
   automatisch den Client aus supabase-client.js.

   ============================================================
   EINMALIG IM SUPABASE SQL-EDITOR AUSFÜHREN
   (Project Settings → SQL Editor → neues Query)
   ============================================================

   ── SCHRITT 1: Mandanten-Tabellen ───────────────────────────

   CREATE TABLE IF NOT EXISTS tenants (
     id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
     name       TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE IF NOT EXISTS tenant_users (
     user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
     role       TEXT DEFAULT 'admin',
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- RLS: Nutzer sieht nur seinen eigenen Eintrag
   ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "tu_read_own" ON tenant_users
     FOR SELECT TO authenticated USING (user_id = auth.uid());
   CREATE POLICY "tu_insert_own" ON tenant_users
     FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

   -- RLS: Nutzer sieht nur seinen Mandanten
   ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "t_read_own" ON tenants
     FOR SELECT TO authenticated
     USING (id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

   ── SCHRITT 1b: Einladungen (Mitarbeiter ins bestehende Team holen) ─

   CREATE TABLE IF NOT EXISTS invites (
     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
     email       TEXT NOT NULL,
     role        TEXT DEFAULT 'readonly',
     firstname   TEXT, lastname TEXT,
     created_by  TEXT,
     created_at  TIMESTAMPTZ DEFAULT NOW(),
     accepted_at TIMESTAMPTZ
   );
   ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
   DROP POLICY IF EXISTS "inv_tenant" ON invites;
   CREATE POLICY "inv_tenant" ON invites FOR ALL TO authenticated
     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));

   ── SCHRITT 2: Trigger — Mandant automatisch bei Registrierung ─
   (Invite-fähig: existiert eine offene Einladung für die E-Mail,
    tritt der Nutzer DIESEM Mandanten bei statt einen neuen anzulegen.)

   CREATE OR REPLACE FUNCTION handle_new_user()
   RETURNS TRIGGER
   LANGUAGE plpgsql
   SECURITY DEFINER SET search_path = public
   AS $$
   DECLARE new_tid UUID; inv RECORD;
   BEGIN
     SELECT * INTO inv FROM invites
       WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL
       ORDER BY created_at DESC LIMIT 1;
     IF inv.tenant_id IS NOT NULL THEN
       INSERT INTO tenant_users (user_id, tenant_id, role)
         VALUES (NEW.id, inv.tenant_id, COALESCE(inv.role, 'readonly'));
       UPDATE invites SET accepted_at = NOW() WHERE id = inv.id;
     ELSE
       INSERT INTO tenants (name)
         VALUES (COALESCE(NEW.raw_user_meta_data->>'company', 'Mandant ' || NEW.id))
         RETURNING id INTO new_tid;
       INSERT INTO tenant_users (user_id, tenant_id, role)
         VALUES (NEW.id, new_tid, 'admin');
     END IF;
     RETURN NEW;
   END;
   $$;

   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION handle_new_user();

   ── SCHRITT 3: Bestehende Nutzer nachträglich zuordnen ─────────
   (nur ausführen wenn du schon Nutzer in Supabase hast)

   DO $$
   DECLARE r RECORD; new_tid UUID;
   BEGIN
     FOR r IN SELECT id, raw_user_meta_data FROM auth.users LOOP
       IF NOT EXISTS (SELECT 1 FROM tenant_users WHERE user_id = r.id) THEN
         INSERT INTO tenants (name)
           VALUES (COALESCE(r.raw_user_meta_data->>'company', 'Mandant ' || r.id))
           RETURNING id INTO new_tid;
         INSERT INTO tenant_users (user_id, tenant_id, role)
           VALUES (r.id, new_tid, 'admin');
       END IF;
     END LOOP;
   END $$;

   ── SCHRITT 4: timelog — tenant_id hinzufügen ─────────────────

   ALTER TABLE timelog ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

   -- Alte Policies entfernen
   DROP POLICY IF EXISTS "anon_insert"  ON timelog;
   DROP POLICY IF EXISTS "auth_read"    ON timelog;
   DROP POLICY IF EXISTS "anon_update"  ON timelog;

   -- Neue Policies mit Mandanten-Trennung
   -- INSERT anon: QR-Check-in ohne Login; tenant_id kommt aus dem QR-Payload (vertrauenswürdig)
   CREATE POLICY "timelog_anon_insert" ON timelog
     FOR INSERT TO anon WITH CHECK (true);

   -- SELECT authenticated: Nur eigener Mandant (RLS filtert automatisch)
   CREATE POLICY "timelog_tenant_select" ON timelog
     FOR SELECT TO authenticated
     USING (tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

   -- UPDATE anon: Check-out (selbe Browser-Session, hat die Row-ID aus dem Insert)
   CREATE POLICY "timelog_anon_update" ON timelog
     FOR UPDATE TO anon USING (true) WITH CHECK (true);

   ── SCHRITT 5: timelog-Tabelle anlegen (falls noch nicht vorhanden) ─

   CREATE TABLE IF NOT EXISTS timelog (
     id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id     UUID        REFERENCES tenants(id),
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

   ── SCHRITT 6: Storage Bucket ─────────────────────────────────
   Supabase Dashboard → Storage → New bucket
   Name:   checkin-photos
   Public: JA
   (Fotos werden unter dem Pfad {tenant_id}/{dateiname} gespeichert)

   ============================================================ */

window.MOSAOS_SUPABASE = {
  url:     '',   // leer lassen, wenn supabase-client.js konfiguriert ist
  anonKey: '',   // leer lassen, wenn supabase-client.js konfiguriert ist
};
