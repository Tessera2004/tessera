begin;

-- Non-destructive additions. Deploy before the matching front end.
alter table public.plan_jobs add column if not exists details jsonb not null default '{}';

create table if not exists public.invoice_counters (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  next_no bigint not null default 1
);
alter table public.invoice_counters enable row level security;
revoke all on public.invoice_counters from anon, authenticated;

create table if not exists public.job_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  job_id text not null,
  number text not null,
  document jsonb not null,
  pdf_base64 text,
  delivery_status text not null default 'pending' check(delivery_status in ('pending','sending','sent','failed','delivery_unknown')),
  sent_at timestamptz,
  issued_at timestamptz not null default now(),
  unique(tenant_id,job_id), unique(tenant_id,number)
);
alter table public.job_invoices enable row level security;
revoke all on public.job_invoices from anon, authenticated;
grant select on public.job_invoices to authenticated;
create policy job_invoices_read on public.job_invoices for select to authenticated
  using(tenant_id=private.current_tenant_id() and
    (private.has_tenant_permission('finance.write') or private.has_tenant_permission('operations.write')));

create or replace function public.issue_job_invoice(p_job_id text, p_document jsonb)
returns public.job_invoices language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant_id(); j public.plan_jobs; result public.job_invoices; n bigint;
begin
  if t is null or not (coalesce(private.has_tenant_permission('finance.write'),false) or coalesce(private.has_tenant_permission('operations.write'),false)) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  select * into j from public.plan_jobs where id=p_job_id and tenant_id=t for update;
  if not found or j.status is distinct from 'beendet' or j.paymethod is distinct from 'rechnung' then raise exception 'JOB_NOT_INVOICEABLE'; end if;
  select * into result from public.job_invoices where tenant_id=t and job_id=p_job_id;
  if found then return result; end if;
  if j.invoice_number is not null then raise exception 'LEGACY_INVOICE_REQUIRES_REVIEW'; end if;
  if p_document is null or octet_length(p_document::text)>2000000 or jsonb_typeof(p_document->'lines') is distinct from 'array'
    or coalesce(p_document->>'currency','') not in ('CHF','EUR','€')
    or coalesce((p_document->>'net')::numeric,-1)<0
    or coalesce((p_document->>'tax')::numeric,-1)<0
    or coalesce((p_document->>'gross')::numeric,-1)<>round((p_document->>'net')::numeric+(p_document->>'tax')::numeric,2)
    or coalesce(p_document#>>'{company,name}','')='' or coalesce(p_document#>>'{debtor,name}','')=''
    or coalesce((p_document->>'net')::numeric,-1)<>round(coalesce(j.price,0)::numeric,2)
    or (select round(coalesce(sum((v->>'amount')::numeric),0),2) from jsonb_array_elements(p_document->'lines') v)<>round(coalesce(j.price,0)::numeric,2)
    then raise exception 'INVALID_INVOICE_DOCUMENT'; end if;
  insert into public.invoice_counters(tenant_id,next_no) values(t,2)
    on conflict(tenant_id) do update set next_no=public.invoice_counters.next_no+1
    returning next_no-1 into n;
  insert into public.job_invoices(tenant_id,job_id,number,document)
    values(t,p_job_id,'RE-'||to_char(current_date,'YYYY')||'-'||lpad(n::text,greatest(6,length(n::text)),'0'),p_document)
    returning * into result;
  return result;
end; $$;

create or replace function public.store_job_invoice_pdf(p_job_id text,p_pdf text)
returns text language plpgsql security definer set search_path='' as $$
declare result text;
begin
  if not (coalesce(private.has_tenant_permission('finance.write'),false) or coalesce(private.has_tenant_permission('operations.write'),false)) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if p_pdf is null or length(p_pdf)>10000000 or p_pdf !~ '^JVBERi0[A-Za-z0-9+/=]+$' then raise exception 'INVALID_PDF'; end if;
  update public.job_invoices set pdf_base64=coalesce(pdf_base64,p_pdf)
    where tenant_id=private.current_tenant_id() and job_id=p_job_id returning pdf_base64 into result;
  if not found then raise exception 'INVOICE_NOT_ISSUED'; end if;
  return result;
end; $$;
revoke all on function public.issue_job_invoice(text,jsonb),public.store_job_invoice_pdf(text,text) from public,anon;
grant execute on function public.issue_job_invoice(text,jsonb),public.store_job_invoice_pdf(text,text) to authenticated;

notify pgrst,'reload schema';
commit;
