-- ============================================================
-- Warum "office_users new row violates row-level security policy"?
--
-- Die Schreibregel auf office_users verlangt, dass du in der
-- Tabelle tenant_users als 'admin' stehst. Die Rolle, die die App
-- oben rechts anzeigt, kommt aus office_users — das ist eine
-- ANDERE Tabelle. Stimmen die beiden nicht überein, schlägt jedes
-- Speichern still fehl; man sieht es nur in der Browser-Konsole.
--
-- SO BENUTZT DU ES
-- Supabase öffnen → SQL Editor → einfügen → Run.
-- ============================================================

-- 1. Wer bist du, und welche Rolle hat die Datenbank für dich?
select
  u.email,
  tu.role            as rolle_in_der_datenbank,
  tu.tenant_id,
  t.name             as betrieb
from auth.users u
left join public.tenant_users tu on tu.user_id = u.id
left join public.tenants t       on t.id = tu.tenant_id
order by u.created_at;

-- Erwartet: deine Adresse mit rolle_in_der_datenbank = 'admin'.
-- Steht dort etwas anderes oder NULL, ist das der Fehler.


-- 2. Und was sagt die App-Tabelle?
select firstname, lastname, email, role as rolle_in_der_app
from public.office_users
order by lastname;


-- ============================================================
-- 3. KORREKTUR — erst ausführen, wenn Abfrage 1 das Problem zeigt.
--    Die eigene E-Mail-Adresse einsetzen.
-- ============================================================

-- update public.tenant_users
--   set role = 'admin'
--   where user_id = (select id from auth.users where email = 'DEINE@ADRESSE.CH');

-- Fehlt der Eintrag ganz, muss er angelegt werden.
-- Die tenant_id steht in Abfrage 1 bei einem anderen Benutzer,
-- oder in der Tabelle tenants:

-- insert into public.tenant_users (user_id, tenant_id, role)
-- select u.id, 'HIER-DIE-TENANT-ID', 'admin'
--   from auth.users u where u.email = 'DEINE@ADRESSE.CH';


-- 4. Nach der Korrektur prüfen: sollte 'admin' liefern.
-- select public.current_tenant_role();
