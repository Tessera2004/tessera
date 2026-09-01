begin;
create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(), name text, created_at timestamptz not null default now()
);
create table if not exists public.tenant_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null default 'readonly', created_at timestamptz not null default now()
);
create index if not exists tenant_users_tenant_idx on public.tenant_users(tenant_id);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null, role text not null default 'readonly', firstname text, lastname text,
  created_by text, created_at timestamptz not null default now(), accepted_at timestamptz
);
create index if not exists invites_open_email_idx on public.invites(lower(email)) where accepted_at is null;

create table if not exists public.office_users (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  firstname text, lastname text, email text, role text not null default 'readonly', updated_at timestamptz not null default now()
);
create table if not exists public.employees (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  first_name text, last_name text, email text, role text, team_id text, status text not null default 'aktiv',
  can_drive boolean not null default false, photo text, updated_at timestamptz not null default now()
);
create table if not exists public.teams (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text, short text, color text, updated_at timestamptz not null default now()
);
create table if not exists public.customers (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  first_name text, last_name text, address text, phone text, email text, note text,
  calls jsonb not null default '[]'::jsonb, updated_at timestamptz not null default now()
);
create table if not exists public.plan_jobs (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  date_key text not null, customer_id text, objekt text, ort text, svc text, price numeric,
  paymethod text not null default 'rechnung', start_time text, end_time text, duration integer,
  team text, assigned jsonb not null default '[]'::jsonb, note_office text, note_crew text,
  status text not null default 'geplant', updated_at timestamptz not null default now()
);
create index if not exists plan_jobs_tenant_date_idx on public.plan_jobs(tenant_id,date_key);
create table if not exists public.tasks (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null, description text, assignee text, due_date text, priority text not null default 'normal',
  done boolean not null default false, completed_at timestamptz, contact_email text, contact_phone text,
  link_label text, link_type text, source_mail jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.reports (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  objekt text, employee text, date text, time text, status text not null default 'vollstaendig', note text,
  photos jsonb not null default '[]'::jsonb, signature_img text, tasks jsonb not null default '[]'::jsonb,
  photo_count integer, is_protocol boolean not null default false, signed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.vehicles (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  plate text, model text, owner text, km text, next_service text, note text, updated_at timestamptz not null default now()
);
create table if not exists public.work_orders (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  vehicle_id text, plate text, model text, owner text, complaint text, status text not null default 'angenommen',
  mechanic text, bay text, due text, note text, works jsonb not null default '[]'::jsonb,
  parts jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tire_storage (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  vehicle_id text, owner text, plate text, season text, rim text, qty integer, dim text, tread text,
  location text, since text, note text, updated_at timestamptz not null default now()
);
create table if not exists public.bait_stations (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id text, objekt_name text, number text, location text, type text, agent text,
  status text not null default 'ok', last_check text, interval_days integer, note text, updated_at timestamptz not null default now()
);
create table if not exists public.pest_protocols (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id text, objekt_name text, date text, technician text, pest_type text, measure text,
  agent text, amount text, findings text, recheck text, signed boolean not null default false, note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.construction_sites (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id text, objekt_name text, title text, address text, type text, monteur text,
  status text not null default 'angefragt', budget numeric, note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.work_reports (
  id text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  site_id text, site_title text, customer_id text, objekt_name text, date text, monteur text,
  works jsonb not null default '[]'::jsonb, material jsonb not null default '[]'::jsonb,
  note text, signed boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.company_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb, prices jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb, roles jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.timelog (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  job_key text not null, job_label text, employee_id text, employee_name text,
  check_in timestamptz not null default now(), check_out timestamptz, duration_m integer,
  photo_url text, notes text, created_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  stripe_customer_id text unique, stripe_subscription_id text unique,
  status text not null default 'inactive', modules jsonb not null default '[]'::jsonb,
  current_period_end timestamptz, updated_at timestamptz not null default now()
);
create table if not exists public.stripe_events (
  event_id text primary key, event_type text not null, processed_at timestamptz not null default now()
);

create index if not exists employees_tenant_idx on public.employees(tenant_id);
create index if not exists customers_tenant_idx on public.customers(tenant_id);
create index if not exists reports_tenant_idx on public.reports(tenant_id);
create index if not exists timelog_tenant_checkin_idx on public.timelog(tenant_id,check_in);
commit;
