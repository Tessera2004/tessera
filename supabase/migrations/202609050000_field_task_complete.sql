begin;

-- B11: Aufgaben in der Feld-App abhaken.
--
-- Die Rolle 'field' hat bewusst kein operations.write. Ohne eigene Regel
-- laeuft ein Update auf tasks stillschweigend ins Leere: RLS meldet keinen
-- Fehler, es werden nur null Zeilen geaendert. Der Mitarbeiter haette
-- getippt und nichts waere passiert.
--
-- Darum eine eng gefasste Regel: ein angemeldeter Benutzer darf genau die
-- Aufgaben aendern, die ihm selbst zugeteilt sind - erkannt ueber dieselbe
-- E-Mail, mit der sich die Feld-App ohnehin dem Mitarbeiter zuordnet.
-- Spaltenweise laesst sich das in Postgres nicht einschraenken (alle
-- Benutzer teilen sich die DB-Rolle 'authenticated'), die Begrenzung liegt
-- also auf der Zeile: fremde Aufgaben bleiben unberuehrbar.

create or replace function private.own_task_assignee_ids()
returns setof text
language sql stable security definer set search_path = public, private as $$
  select e.id from public.employees e
   where e.tenant_id = private.current_tenant_id()
     and e.email is not null
     and lower(e.email) = lower(nullif(auth.jwt() ->> 'email', ''))
  union
  select o.id from public.office_users o
   where o.tenant_id = private.current_tenant_id()
     and o.email is not null
     and lower(o.email) = lower(nullif(auth.jwt() ->> 'email', ''))
$$;

-- Regeln laufen mit den Rechten des fragenden Benutzers, also braucht
-- 'authenticated' das Ausfuehrungsrecht. Als RPC ist die Funktion trotzdem
-- nicht erreichbar: das Schema 'private' wird von PostgREST nicht angeboten.
revoke all on function private.own_task_assignee_ids() from public, anon;
grant execute on function private.own_task_assignee_ids() to authenticated;

drop policy if exists tasks_own_update on public.tasks;
create policy tasks_own_update on public.tasks for update to authenticated
  using (
    tenant_id = private.current_tenant_id()
    and assignee is not null
    and assignee in (select private.own_task_assignee_ids())
  )
  with check (
    tenant_id = private.current_tenant_id()
    and assignee is not null
    and assignee in (select private.own_task_assignee_ids())
  );

commit;
