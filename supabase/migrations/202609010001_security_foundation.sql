-- MosaOS security foundation. Apply through the Supabase CLI, never by copy/paste.
begin;

create extension if not exists pgcrypto;

alter table public.tenant_users add column if not exists role text not null default 'readonly';
alter table public.invites add column if not exists token_hash text;
alter table public.invites add column if not exists expires_at timestamptz not null default (now() + interval '7 days');
alter table public.invites add column if not exists accepted_at timestamptz;
alter table public.company_settings add column if not exists custom_services jsonb not null default '[]'::jsonb;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  new_tid uuid;
  inv public.invites%rowtype;
  raw_token text := coalesce(new.raw_user_meta_data->>'invite_token', '');
begin
  if raw_token <> '' then
    select * into inv from public.invites
      where lower(email) = lower(new.email)
        and accepted_at is null
        and expires_at > now()
        and token_hash = encode(digest(raw_token, 'sha256'), 'hex')
      order by created_at desc limit 1
      for update skip locked;
  end if;

  if inv.id is not null then
    insert into public.tenant_users (user_id, tenant_id, role)
      values (new.id, inv.tenant_id, coalesce(inv.role, 'readonly'));
    update public.invites set accepted_at = now() where id = inv.id;
  else
    insert into public.tenants (name)
      values (coalesce(nullif(new.raw_user_meta_data->>'company',''), 'Mandant ' || new.id))
      returning id into new_tid;
    insert into public.tenant_users (user_id, tenant_id, role)
      values (new.id, new_tid, 'admin');
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  company text not null check (char_length(company) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  phone text check (phone is null or char_length(phone) <= 80),
  industry text check (industry is null or char_length(industry) <= 100),
  message text not null check (char_length(message) between 1 and 5000),
  consent_at timestamptz not null,
  source_ip_hash text,
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','processing','closed','spam'))
);

create table if not exists public.checkin_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  job_key text not null,
  job_label text,
  job_date date not null,
  employee_ids text[] not null default '{}',
  token_hash text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.timelog add column if not exists checkin_token_id uuid references public.checkin_tokens(id) on delete set null;
create unique index if not exists timelog_checkin_token_employee_unique
  on public.timelog(checkin_token_id, employee_id)
  where checkin_token_id is not null;
alter table public.timelog add column if not exists updated_at timestamptz not null default now();

create or replace function public.current_tenant_id()
returns uuid language sql stable security definer set search_path = public
as $$ select tenant_id from public.tenant_users where user_id = auth.uid() limit 1 $$;

create or replace function public.current_tenant_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.tenant_users where user_id = auth.uid() limit 1 $$;

create or replace function public.has_tenant_permission(permission text)
returns boolean language plpgsql stable security definer set search_path = public
as $$
declare
  r text := public.current_tenant_role();
  custom_perms jsonb;
begin
  if r = 'admin' then return true; end if;
  if r = 'disposition' then
    return permission = any(array['operations.read','operations.write','reports.read','reports.write','customers.read','customers.write']);
  end if;
  if r = 'buchhaltung' then
    return permission = any(array['finance.read','finance.write','customers.read','reports.read']);
  end if;
  if r = 'field' then
    return permission = any(array['operations.read','reports.read','reports.write']);
  end if;
  select role_item->'perms' into custom_perms
    from public.company_settings, lateral jsonb_array_elements(coalesce(roles, '[]'::jsonb)) role_item
    where tenant_id = public.current_tenant_id() and role_item->>'key' = r limit 1;
  if custom_perms is not null then
    if permission = 'operations.write' then return custom_perms ?| array['edit_auftrag','edit_objekte']; end if;
    if permission = 'reports.write' then return custom_perms ? 'edit_auftrag'; end if;
    if permission = 'finance.write' then return custom_perms ?| array['edit_offerts','edit_prices']; end if;
  end if;
  return permission = any(array['operations.read','customers.read','reports.read']);
end $$;

revoke all on function public.current_tenant_id() from public;
revoke all on function public.current_tenant_role() from public;
revoke all on function public.has_tenant_permission(text) from public;
grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.current_tenant_role() to authenticated;
grant execute on function public.has_tenant_permission(text) to authenticated;

-- Remove unsafe catch-all and anonymous policies created by prototypes.
do $$
declare t text; p record;
begin
  foreach t in array array['tenants','tenant_users','office_users','employees','teams','customers','plan_jobs','tasks','reports','vehicles','work_orders','tire_storage','bait_stations','pest_protocols','construction_sites','work_reports','company_settings','invites','timelog','checkin_tokens','audit_log','contact_requests','subscriptions','stripe_events'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
        execute format('drop policy if exists %I on public.%I', p.policyname, t);
      end loop;
    end if;
  end loop;
end $$;

create policy tenant_users_read_self on public.tenant_users for select to authenticated
  using (user_id = auth.uid());
create policy tenants_read_own on public.tenants for select to authenticated
  using (id = public.current_tenant_id());

-- Operational data: all tenant members can read; only authorised roles can change.
do $$
declare t text;
begin
  foreach t in array array['employees','teams','customers','plan_jobs','tasks','vehicles','work_orders','tire_storage','bait_stations','pest_protocols','construction_sites'] loop
    if to_regclass('public.' || t) is not null then
      execute format('create policy %I on public.%I for select to authenticated using (tenant_id = public.current_tenant_id())', t || '_read', t);
      execute format('create policy %I on public.%I for insert to authenticated with check (tenant_id = public.current_tenant_id() and public.has_tenant_permission(''operations.write''))', t || '_insert', t);
      execute format('create policy %I on public.%I for update to authenticated using (tenant_id = public.current_tenant_id() and public.has_tenant_permission(''operations.write'')) with check (tenant_id = public.current_tenant_id() and public.has_tenant_permission(''operations.write''))', t || '_update', t);
      execute format('create policy %I on public.%I for delete to authenticated using (tenant_id = public.current_tenant_id() and public.has_tenant_permission(''operations.write''))', t || '_delete', t);
    end if;
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['reports','work_reports'] loop
    if to_regclass('public.' || t) is not null then
      execute format('create policy %I on public.%I for select to authenticated using (tenant_id = public.current_tenant_id() and public.has_tenant_permission(''reports.read''))', t || '_read', t);
      execute format('create policy %I on public.%I for insert to authenticated with check (tenant_id = public.current_tenant_id() and public.has_tenant_permission(''reports.write''))', t || '_insert', t);
      execute format('create policy %I on public.%I for update to authenticated using (tenant_id = public.current_tenant_id() and public.has_tenant_permission(''reports.write'')) with check (tenant_id = public.current_tenant_id() and public.has_tenant_permission(''reports.write''))', t || '_update', t);
    end if;
  end loop;
end $$;

create policy office_users_read on public.office_users for select to authenticated using (tenant_id = public.current_tenant_id());
create policy office_users_admin on public.office_users for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_role() = 'admin')
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_role() = 'admin');
create policy settings_read on public.company_settings for select to authenticated using (tenant_id = public.current_tenant_id());
create policy settings_admin on public.company_settings for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_role() = 'admin')
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_role() = 'admin');
create policy invites_admin on public.invites for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_role() = 'admin')
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_role() = 'admin');
create policy timelog_read on public.timelog for select to authenticated using (tenant_id = public.current_tenant_id());
create policy timelog_admin_update on public.timelog for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_tenant_permission('operations.write'))
  with check (tenant_id = public.current_tenant_id() and public.has_tenant_permission('operations.write'));
create policy audit_read_admin on public.audit_log for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_role() = 'admin');
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- Only Edge Functions using service_role may write public contact requests or anonymous check-ins.
revoke all on public.contact_requests from anon, authenticated;
revoke insert, update, delete on public.timelog from anon;
revoke all on public.checkin_tokens from anon;
revoke all on public.checkin_tokens from authenticated;
revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;
revoke insert, update, delete on storage.objects from anon;

create or replace function public.audit_tenant_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log(tenant_id, actor_id, action, table_name, record_id, metadata)
  values ((row_data->>'tenant_id')::uuid, auth.uid(), lower(tg_op), tg_table_name,
          coalesce(row_data->>'id', row_data->>'tenant_id'),
          jsonb_build_object('at', now()));
  return case when tg_op = 'DELETE' then old else new end;
end $$;

do $$
declare t text;
begin
  foreach t in array array['office_users','employees','teams','customers','plan_jobs','tasks','reports','vehicles','work_orders','tire_storage','bait_stations','pest_protocols','construction_sites','work_reports','company_settings','timelog'] loop
    execute format('drop trigger if exists audit_change on public.%I', t);
    execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.audit_tenant_change()', t);
  end loop;
end $$;

-- Private check-in evidence. Edge Functions upload; authenticated tenant members receive signed URLs later.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('checkin-photos','checkin-photos',false,5242880,array['image/jpeg','image/png'])
on conflict (id) do update set public=false, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png'];

drop policy if exists checkin_photos_read on storage.objects;
create policy checkin_photos_read on storage.objects for select to authenticated
using (bucket_id='checkin-photos' and (storage.foldername(name))[1] = public.current_tenant_id()::text);

commit;
