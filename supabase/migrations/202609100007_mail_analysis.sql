-- MosaOS Mail-Assistent: atomare Analyse-Queue und begrenzter Kundenkontext.
begin;

alter table public.mail_agent_settings
  add column if not exists monthly_token_limit bigint not null default 5000000
  check (monthly_token_limit between 10000 and 100000000);

alter table public.mail_messages add column if not exists analysis_started_at timestamptz;
alter table public.mail_messages add column if not exists analysis_attempts integer not null default 0
  check (analysis_attempts between 0 and 10);
alter table public.mail_messages add column if not exists analysis_error_code text
  check (analysis_error_code is null or char_length(analysis_error_code) <= 100);

alter table public.mail_messages drop constraint if exists mail_messages_status_check;
alter table public.mail_messages add constraint mail_messages_status_check
  check (status in ('new','analysing','drafted','reviewed','sent','ignored','failed'));

create index if not exists mail_messages_analysis_queue_idx
  on public.mail_messages(status, received_at)
  where status in ('new','analysing','failed');

-- SKIP LOCKED verhindert doppelte OpenAI-Aufrufe bei ueberlappenden Cron-Laeufen.
-- Die Function ist trotz public-Schema ausschliesslich fuer service_role aufrufbar.
create or replace function public.claim_mail_message_for_analysis()
returns uuid language plpgsql security definer set search_path = '' as $$
declare claimed_id uuid;
begin
  with candidate as (
    select m.id
    from public.mail_messages m
    join public.mail_accounts a on a.id = m.mail_account_id and a.tenant_id = m.tenant_id
    join public.mail_agent_settings s on s.tenant_id = m.tenant_id
    where a.status = 'active'
      and s.enabled = true
      and s.mode = 'draft_only'
      and m.analysis_attempts < 3
      and (
        m.status in ('new','failed')
        or (m.status = 'analysing' and m.analysis_started_at < now() - interval '15 minutes')
      )
    order by m.received_at
    for update of m skip locked
    limit 1
  )
  update public.mail_messages m
  set status = 'analysing',
      analysis_started_at = now(),
      analysis_attempts = m.analysis_attempts + 1,
      analysis_error_code = null
  from candidate c
  where m.id = c.id
  returning m.id into claimed_id;
  return claimed_id;
end;
$$;
revoke all on function public.claim_mail_message_for_analysis() from public, anon, authenticated;
grant execute on function public.claim_mail_message_for_analysis() to service_role;

-- Exakter, case-insensitiver Abgleich ohne ILIKE-Wildcards. Die KI erhaelt nur
-- den fuer eine Antwort notwendigen Kundenstamm, keine internen Notizen.
create or replace function public.mail_customer_context(p_tenant_id uuid, p_email text)
returns table(id text, first_name text, last_name text, address text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.first_name, c.last_name, c.address
  from public.customers c
  where c.tenant_id = p_tenant_id
    and lower(trim(c.email)) = lower(trim(p_email))
  order by c.updated_at desc
  limit 1
$$;
revoke all on function public.mail_customer_context(uuid,text) from public, anon, authenticated;
grant execute on function public.mail_customer_context(uuid,text) to service_role;

notify pgrst, 'reload schema';
commit;
