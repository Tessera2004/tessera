-- Eigene Textvorlagen und Zeitfaktoren gehoeren zur Firma.
--
-- Beide werden seit dem 5./6. September in der App gespeichert, aber
-- company_settings hatte keine Spalte dafuer. db-sync warf dadurch
-- "Unbekannter Sync-Typ", der Betrieb sah die Meldung "Aenderungen werden
-- nicht gespeichert", und die Texte blieben in genau einem Browser liegen.
--
-- Gleiches Muster wie custom_services in 202609010001.

alter table public.company_settings
  add column if not exists templates jsonb not null default '{}'::jsonb;

alter table public.company_settings
  add column if not exists time_factors jsonb not null default '{}'::jsonb;
