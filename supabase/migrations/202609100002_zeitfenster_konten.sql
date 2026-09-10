-- Konten fuer Betriebe: der Kundenbereich von Zeitfenster.
--
-- Bisher hing die Terminliste an einem langen Token in der Adresse. Das
-- reichte, solange der Betrieb nur zusehen konnte. Sobald er Oeffnungszeiten,
-- Leistungen und Ferientage selbst pflegt, reicht es nicht mehr: Ein Token in
-- der Adresse landet im Browserverlauf, im Lesezeichen-Sync und in jedem
-- Screenshot, den jemand weiterschickt. Ab hier gilt eine Anmeldung.
--
-- Der Gast bucht weiterhin ohne Konto ueber die Edge Function mit dem
-- Service-Schluessel. Nur der Betrieb meldet sich an, und nur fuer ihn
-- greifen die Regeln unten.
begin;

-- Eigene Tabelle statt einer Spalte in zf_betriebe: Ein Betrieb hat heute
-- einen Zugang, aber ein Coiffeurgeschaeft mit drei Angestellten will spaeter
-- drei. Diese Form kostet jetzt nichts und erspart die Migration dann.
create table if not exists public.zf_betrieb_konten (
  betrieb_id uuid not null references public.zf_betriebe(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (betrieb_id, user_id)
);

create index if not exists zf_betrieb_konten_user_idx
  on public.zf_betrieb_konten (user_id);

-- Welche Betriebe gehoeren dem angemeldeten Konto?
--
-- security definer, weil die Funktion aus den Richtlinien der Tabellen
-- aufgerufen wird. Ohne sie muesste jede Richtlinie selbst in
-- zf_betrieb_konten lesen — und deren eigene Richtlinie wuerde dabei erneut
-- ausloesen. Das Ergebnis waere eine Endlosschleife, die Postgres mit
-- "infinite recursion detected in policy" abbricht.
--
-- Liegt in private, damit sie nicht als PostgREST-RPC aufrufbar ist —
-- dieselbe Regel wie bei den uebrigen RLS-Helfern dieses Projekts.
create schema if not exists private;

create or replace function private.zf_meine_betriebe()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select betrieb_id from public.zf_betrieb_konten where user_id = auth.uid()
$$;

revoke all on function private.zf_meine_betriebe() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.zf_meine_betriebe() to authenticated;

alter table public.zf_betrieb_konten enable row level security;

drop policy if exists zf_konten_eigene on public.zf_betrieb_konten;
create policy zf_konten_eigene on public.zf_betrieb_konten
  for select to authenticated
  using (user_id = auth.uid());

-- --- Betrieb: lesen und die eigenen Einstellungen pflegen ----------------

drop policy if exists zf_betriebe_eigener_lesen on public.zf_betriebe;
create policy zf_betriebe_eigener_lesen on public.zf_betriebe
  for select to authenticated
  using (id in (select private.zf_meine_betriebe()));

drop policy if exists zf_betriebe_eigener_pflegen on public.zf_betriebe;
create policy zf_betriebe_eigener_pflegen on public.zf_betriebe
  for update to authenticated
  using (id in (select private.zf_meine_betriebe()))
  with check (id in (select private.zf_meine_betriebe()));

grant select on public.zf_betriebe to authenticated;

-- Bewusst spaltenweise. Ein Betrieb soll seine Oeffnungszeiten aendern
-- duerfen, aber nicht seine Kennung in der Adresse — die steht auf seiner
-- Website und in jedem Absagelink, der schon verschickt wurde. Und nicht
-- verwaltung_token_hash, mit dem er sich selbst aussperren koennte.
grant update (
  name,
  benachrichtigung_email,
  zeitzone,
  oeffnungszeiten,
  leistungen,
  geschlossen,
  vorlauf_stunden,
  horizont_tage
) on public.zf_betriebe to authenticated;

-- --- Buchungen: sehen, absagen, verschieben, nachtragen ------------------

drop policy if exists zf_buchungen_eigene_lesen on public.zf_buchungen;
create policy zf_buchungen_eigene_lesen on public.zf_buchungen
  for select to authenticated
  using (betrieb_id in (select private.zf_meine_betriebe()));

drop policy if exists zf_buchungen_eigene_pflegen on public.zf_buchungen;
create policy zf_buchungen_eigene_pflegen on public.zf_buchungen
  for update to authenticated
  using (betrieb_id in (select private.zf_meine_betriebe()))
  with check (betrieb_id in (select private.zf_meine_betriebe()));

-- Nachtragen von Hand: Wer telefonisch bucht, gehoert in denselben Kalender.
-- Sonst fuehrt der Betrieb zwei Listen, und genau dann entsteht die
-- Doppelbuchung, die der eindeutige Index eigentlich verhindern soll.
drop policy if exists zf_buchungen_eigene_anlegen on public.zf_buchungen;
create policy zf_buchungen_eigene_anlegen on public.zf_buchungen
  for insert to authenticated
  with check (betrieb_id in (select private.zf_meine_betriebe()));

grant select, insert on public.zf_buchungen to authenticated;
grant update (status, datum, zeit, notiz, abgesagt_at)
  on public.zf_buchungen to authenticated;

-- Kein delete. Ein geloeschter Termin laesst sich nicht mehr nachvollziehen,
-- wenn der Gast anruft und sagt, er habe doch gebucht. Absagen genuegt und
-- gibt den Platz ebenso frei.

commit;
