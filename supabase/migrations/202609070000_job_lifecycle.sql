begin;

-- Durchgaengiger Auftragsstatus. Alte, vergangene Termine gelten als beendet,
-- kuenftige als definitiv; so bleiben historische Rechnungen sichtbar, ohne
-- kuenftige Einsaetze vorzeitig abzurechnen.
alter table public.plan_jobs alter column status drop default;
update public.plan_jobs
set status = case
  when status in ('beendet', 'erledigt', 'abgeschlossen', 'completed') then 'beendet'
  when status in ('provisorisch', 'provisional', 'draft') then 'provisorisch'
  when date_key < to_char(current_date, 'YYYY-MM-DD') then 'beendet'
  else 'definitiv'
end;
alter table public.plan_jobs alter column status set default 'provisorisch';

alter table public.plan_jobs add column if not exists completed_at timestamptz;
alter table public.plan_jobs add column if not exists invoice_number text;
alter table public.plan_jobs add column if not exists invoice_status text;
alter table public.plan_jobs add column if not exists invoice_created_at timestamptz;
alter table public.plan_jobs add column if not exists invoice_sent_at timestamptz;
alter table public.plan_jobs add column if not exists invoice_send_error text;
alter table public.plan_jobs add column if not exists receipt_created_at timestamptz;

alter table public.plan_jobs drop constraint if exists plan_jobs_status_check;
alter table public.plan_jobs add constraint plan_jobs_status_check
  check (status in ('provisorisch', 'definitiv', 'beendet'));
alter table public.plan_jobs drop constraint if exists plan_jobs_invoice_status_check;
alter table public.plan_jobs add constraint plan_jobs_invoice_status_check
  check (invoice_status is null or invoice_status in
    ('pending', 'sending', 'sent', 'failed', 'delivery_unknown'));

create index if not exists plan_jobs_invoice_pending_idx
  on public.plan_jobs(tenant_id, invoice_status)
  where invoice_status in ('pending', 'failed', 'delivery_unknown');

-- Atomarer Versand-Lock fuer Disposition und Buchhaltung. Zwei gleichzeitig
-- offene Buero-Fenster koennen dadurch nie beide dieselbe Rechnung senden.
create or replace function public.claim_job_invoice_delivery(p_job_id text)
returns table(id text, date_key text, customer_id text, objekt text, invoice_number text)
language plpgsql security definer set search_path = '' as $$
begin
  if not (
    coalesce(private.has_tenant_permission('operations.write'), false)
    or coalesce(private.has_tenant_permission('finance.write'), false)
  ) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;
  return query
    update public.plan_jobs j
    set invoice_status = 'sending', invoice_send_error = null, updated_at = now()
    where j.id = p_job_id
      and j.tenant_id = private.current_tenant_id()
      and j.status = 'beendet'
      and j.paymethod = 'rechnung'
      and j.invoice_status = 'pending'
    returning j.id, j.date_key, j.customer_id, j.objekt, j.invoice_number;
end;
$$;
revoke all on function public.claim_job_invoice_delivery(text) from public, anon;
grant execute on function public.claim_job_invoice_delivery(text) to authenticated;

-- Felddienst darf ausschliesslich einen ihm zugeteilten definitiven Auftrag
-- beenden. Alle anderen Spalten bleiben fuer ihn unveraenderbar.
create or replace function private.restrict_field_job_completion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() = 'authenticated'
     and not coalesce(private.has_tenant_permission('operations.write'), false) then
    if (to_jsonb(new) - array['status', 'completed_at', 'invoice_status', 'updated_at'])
       is distinct from
       (to_jsonb(old) - array['status', 'completed_at', 'invoice_status', 'updated_at'])
       or old.status is distinct from 'definitiv'
       or new.status is distinct from 'beendet' then
      raise exception 'Only completion of an assigned definitive job is permitted'
        using errcode = '42501';
    end if;
    new.completed_at := coalesce(old.completed_at, now());
    new.invoice_status := case
      when old.paymethod = 'rechnung' then coalesce(old.invoice_status, 'pending')
      else null
    end;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.restrict_field_job_completion() from public, anon, authenticated;
drop trigger if exists restrict_field_job_completion on public.plan_jobs;
create trigger restrict_field_job_completion before update on public.plan_jobs
for each row execute function private.restrict_field_job_completion();

drop policy if exists plan_jobs_field_complete on public.plan_jobs;
create policy plan_jobs_field_complete on public.plan_jobs
for update to authenticated
using (
  tenant_id = private.current_tenant_id()
  and status = 'definitiv'
  and exists (
    select 1 from public.employees e
    where lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and e.tenant_id = plan_jobs.tenant_id
      and plan_jobs.assigned ? e.id
  )
)
with check (
  tenant_id = private.current_tenant_id()
  and status = 'beendet'
);

notify pgrst, 'reload schema';
commit;
