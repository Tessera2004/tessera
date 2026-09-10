-- MosaOS Mail-Assistent: serverseitiges, mandantengetrenntes Sicherheitsfundament.
-- Noch kein OAuth-Abruf und keine KI-Verarbeitung. Der Browser erhaelt weder
-- Provider-Tokens noch verschluesselte Mailinhalte direkt aus PostgREST.
begin;

create extension if not exists pgcrypto;

create table if not exists public.mail_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('gmail')),
  email text not null check (char_length(email) between 3 and 320),
  encrypted_refresh_token text not null check (char_length(encrypted_refresh_token) between 20 and 20000),
  token_key_version integer not null default 1 check (token_key_version > 0),
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','reauth_required','disabled')),
  provider_cursor text,
  last_synced_at timestamptz,
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id)
);

create table if not exists public.mail_oauth_states (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gmail')),
  state_hash text not null unique check (char_length(state_hash) = 64),
  encrypted_pkce_verifier text not null check (char_length(encrypted_pkce_verifier) between 20 and 2000),
  token_key_version integer not null default 1 check (token_key_version > 0),
  return_path text not null default '/app/app.html' check (return_path like '/%' and return_path not like '//%'),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mail_agent_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  enabled boolean not null default false,
  mode text not null default 'draft_only' check (mode = 'draft_only'),
  language text not null default 'de-CH' check (char_length(language) between 2 and 20),
  tone text not null default 'freundlich, professionell und klar' check (char_length(tone) between 1 and 500),
  signature text not null default '' check (char_length(signature) <= 3000),
  business_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(business_hours) = 'object'),
  reply_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(reply_rules) = 'array'),
  escalation_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(escalation_rules) = 'array'),
  retention_days integer not null default 30 check (retention_days between 1 and 365),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mail_agent_knowledge (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category text not null check (category in ('company','service','area','availability','price_rule','payment','policy','signature','other')),
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (char_length(content) between 1 and 10000),
  source text not null check (char_length(source) between 1 and 500),
  approved boolean not null default false,
  valid_from timestamptz,
  valid_until timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create table if not exists public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  mail_account_id uuid not null,
  provider_message_id text not null check (char_length(provider_message_id) between 1 and 1000),
  provider_thread_id text check (provider_thread_id is null or char_length(provider_thread_id) <= 1000),
  received_at timestamptz not null,
  encrypted_payload text not null check (char_length(encrypted_payload) between 20 and 1000000),
  payload_key_version integer not null default 1 check (payload_key_version > 0),
  sender_hash text check (sender_hash is null or char_length(sender_hash) = 64),
  category text check (category is null or category in ('customer_request','existing_customer','appointment','complaint','billing','application','unimportant','unclear')),
  priority text check (priority is null or priority in ('urgent','normal','low')),
  needs_human boolean not null default true,
  status text not null default 'new' check (status in ('new','drafted','reviewed','sent','ignored','failed')),
  retention_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (mail_account_id, tenant_id) references public.mail_accounts(id, tenant_id) on delete cascade,
  unique (mail_account_id, provider_message_id)
);

create table if not exists public.mail_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  message_id uuid not null,
  encrypted_subject text not null check (char_length(encrypted_subject) between 20 and 100000),
  encrypted_body text not null check (char_length(encrypted_body) between 20 and 1000000),
  payload_key_version integer not null default 1 check (payload_key_version > 0),
  confidence text not null default 'low' check (confidence in ('high','medium','low')),
  missing_information jsonb not null default '[]'::jsonb check (jsonb_typeof(missing_information) = 'array'),
  knowledge_refs uuid[] not null default '{}',
  model text not null check (char_length(model) between 1 and 100),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (message_id),
  foreign key (message_id, tenant_id) references public.mail_messages(id, tenant_id) on delete cascade
);

create table if not exists public.mail_agent_runs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  mail_account_id uuid references public.mail_accounts(id) on delete set null,
  run_type text not null check (run_type in ('sync','analyse','retention')),
  status text not null check (status in ('running','success','partial','failed')),
  messages_found integer not null default 0 check (messages_found >= 0),
  drafts_created integer not null default 0 check (drafts_created >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  error_code text check (error_code is null or char_length(error_code) <= 100),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists mail_accounts_tenant_status_idx on public.mail_accounts(tenant_id, status);
create unique index if not exists mail_accounts_one_provider_per_tenant
  on public.mail_accounts(tenant_id, provider);
create index if not exists mail_oauth_states_expiry_idx on public.mail_oauth_states(expires_at) where consumed_at is null;
create index if not exists mail_knowledge_tenant_approved_idx on public.mail_agent_knowledge(tenant_id, approved, category);
create index if not exists mail_messages_tenant_received_idx on public.mail_messages(tenant_id, received_at desc);
create index if not exists mail_messages_pending_idx on public.mail_messages(tenant_id, status, received_at) where status in ('new','failed');
create index if not exists mail_messages_retention_idx on public.mail_messages(retention_until);
create index if not exists mail_runs_tenant_started_idx on public.mail_agent_runs(tenant_id, started_at desc);

-- Separate Mailrechte. Die eingebauten Rollen beginnen bewusst konservativ:
-- Admin alles, Disposition lesen/pruefen/senden, alle anderen nichts.
create or replace function private.has_mail_permission(permission text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  current_role text := private.current_tenant_role();
  custom_perms jsonb;
begin
  if permission <> all(array['mail.read','mail.review','mail.send','mail.admin']) then
    return false;
  end if;
  if current_role = 'admin' then
    return true;
  end if;
  if current_role = 'disposition' then
    return permission = any(array['mail.read','mail.review','mail.send']);
  end if;
  select role_item->'perms' into custom_perms
    from public.company_settings,
         lateral jsonb_array_elements(coalesce(roles, '[]'::jsonb)) role_item
    where tenant_id = private.current_tenant_id()
      and role_item->>'key' = current_role
    limit 1;
  if custom_perms is null then
    return false;
  end if;
  if permission = 'mail.read' then return custom_perms ? 'view_email'; end if;
  if permission = 'mail.review' then return custom_perms ? 'review_email'; end if;
  if permission = 'mail.send' then return custom_perms ? 'send_email'; end if;
  if permission = 'mail.admin' then return custom_perms ? 'admin_email'; end if;
  return false;
end;
$$;

revoke all on function private.has_mail_permission(text) from public, anon;
grant execute on function private.has_mail_permission(text) to authenticated;

-- Automatische Zeitstempel ohne eine durch Browser manipulierbare Funktion.
create or replace function private.mail_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.mail_set_updated_at() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['mail_accounts','mail_agent_settings','mail_agent_knowledge','mail_messages','mail_drafts'] loop
    execute format('drop trigger if exists mail_set_updated_at on public.%I', table_name);
    execute format('create trigger mail_set_updated_at before update on public.%I for each row execute function private.mail_set_updated_at()', table_name);
  end loop;
end $$;

alter table public.mail_accounts enable row level security;
alter table public.mail_oauth_states enable row level security;
alter table public.mail_agent_settings enable row level security;
alter table public.mail_agent_knowledge enable row level security;
alter table public.mail_messages enable row level security;
alter table public.mail_drafts enable row level security;
alter table public.mail_agent_runs enable row level security;

-- Tokens, OAuth-State, verschluesselte Nachrichten und Entwuerfe sind nur ueber
-- autorisierende Edge Functions erreichbar. Es gibt absichtlich keine Browser-Policy.
revoke all on public.mail_accounts from anon, authenticated;
revoke all on public.mail_oauth_states from anon, authenticated;
revoke all on public.mail_messages from anon, authenticated;
revoke all on public.mail_drafts from anon, authenticated;

-- Unsensible Agent-Einstellungen und freigegebenes Firmenwissen duerfen mit
-- eigenen Mailrechten direkt gelesen werden. Aenderungen bleiben Mail-Admins vorbehalten.
revoke all on public.mail_agent_settings from anon, authenticated;
revoke all on public.mail_agent_knowledge from anon, authenticated;
grant select, insert, update, delete on public.mail_agent_settings to authenticated;
grant select, insert, update, delete on public.mail_agent_knowledge to authenticated;

drop policy if exists mail_settings_read on public.mail_agent_settings;
drop policy if exists mail_settings_admin_insert on public.mail_agent_settings;
drop policy if exists mail_settings_admin_update on public.mail_agent_settings;
drop policy if exists mail_settings_admin_delete on public.mail_agent_settings;
create policy mail_settings_read on public.mail_agent_settings for select to authenticated
  using (tenant_id = private.current_tenant_id() and private.has_mail_permission('mail.read'));
create policy mail_settings_admin_insert on public.mail_agent_settings for insert to authenticated
  with check (tenant_id = private.current_tenant_id() and private.has_mail_permission('mail.admin'));
create policy mail_settings_admin_update on public.mail_agent_settings for update to authenticated
  using (tenant_id = private.current_tenant_id() and private.has_mail_permission('mail.admin'))
  with check (tenant_id = private.current_tenant_id() and private.has_mail_permission('mail.admin'));
create policy mail_settings_admin_delete on public.mail_agent_settings for delete to authenticated
  using (tenant_id = private.current_tenant_id() and private.has_mail_permission('mail.admin'));

drop policy if exists mail_knowledge_read on public.mail_agent_knowledge;
drop policy if exists mail_knowledge_admin_insert on public.mail_agent_knowledge;
drop policy if exists mail_knowledge_admin_update on public.mail_agent_knowledge;
drop policy if exists mail_knowledge_admin_delete on public.mail_agent_knowledge;
create policy mail_knowledge_read on public.mail_agent_knowledge for select to authenticated
  using (tenant_id = private.current_tenant_id() and private.has_mail_permission('mail.read'));
create policy mail_knowledge_admin_insert on public.mail_agent_knowledge for insert to authenticated
  with check (tenant_id = private.current_tenant_id() and private.has_mail_permission('mail.admin'));
create policy mail_knowledge_admin_update on public.mail_agent_knowledge for update to authenticated
  using (tenant_id = private.current_tenant_id() and private.has_mail_permission('mail.admin'))
  with check (tenant_id = private.current_tenant_id() and private.has_mail_permission('mail.admin'));
create policy mail_knowledge_admin_delete on public.mail_agent_knowledge for delete to authenticated
  using (tenant_id = private.current_tenant_id() and private.has_mail_permission('mail.admin'));

-- Nur Mail-Admins sehen technische Laufdaten. Sie enthalten keine Mailtexte.
revoke all on public.mail_agent_runs from anon, authenticated;
grant select on public.mail_agent_runs to authenticated;
drop policy if exists mail_runs_admin_read on public.mail_agent_runs;
create policy mail_runs_admin_read on public.mail_agent_runs for select to authenticated
  using (tenant_id = private.current_tenant_id() and private.has_mail_permission('mail.admin'));

-- Aenderungen am freigegebenen Wissen und an Agent-Regeln sind revisionsrelevant.
drop trigger if exists audit_change on public.mail_agent_settings;
create trigger audit_change after insert or update or delete on public.mail_agent_settings
for each row execute function public.audit_tenant_change();
drop trigger if exists audit_change on public.mail_agent_knowledge;
create trigger audit_change after insert or update or delete on public.mail_agent_knowledge
for each row execute function public.audit_tenant_change();

notify pgrst, 'reload schema';
commit;
