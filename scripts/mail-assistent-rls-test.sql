-- Lokaler Negativtest fuer das Mail-Assistent-Fundament.
-- Ausfuehren nur gegen die lokale Supabase-Testdatenbank, nie gegen Produktion:
--   psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/mail-assistent-rls-test.sql
begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mail-a@example.test','',now(),'{}','{}',now(),now()),
  ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mail-b@example.test','',now(),'{}','{}',now(),now());

-- handle_new_user erzeugt fuer beide Testnutzer einen eigenen Mandanten und die Adminrolle.
do $$
begin
  if (select count(*) from public.tenant_users where user_id in (
    '10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002'
  )) <> 2 then
    raise exception 'test users were not assigned to tenants';
  end if;
end $$;

select set_config(
  'mosaos.test_tenant_a',
  (select tenant_id::text from public.tenant_users where user_id = '10000000-0000-0000-0000-000000000001'),
  false
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);

insert into public.mail_agent_settings (tenant_id, enabled, updated_by)
select tenant_id, false, user_id from public.tenant_users
where user_id = '10000000-0000-0000-0000-000000000001';

insert into public.mail_agent_knowledge (tenant_id, category, title, content, source, approved, created_by, updated_by)
select tenant_id, 'company', 'Testfirma A', 'Nur fuer Mandant A', 'RLS-Test', true, user_id, user_id
from public.tenant_users where user_id = '10000000-0000-0000-0000-000000000001';

do $$
begin
  -- Selbst ein Admin darf die Token-Tabelle nicht direkt aus dem Browser lesen.
  begin
    perform id from public.mail_accounts limit 1;
    raise exception 'mail_accounts was directly readable';
  exception when insufficient_privilege then null;
  end;

  -- Ein unbekanntes Recht muss immer abgelehnt werden.
  if private.has_mail_permission('mail.delete_everything') then
    raise exception 'unknown mail permission was accepted';
  end if;
  begin
    perform public.claim_mail_message_for_analysis();
    raise exception 'analysis queue was callable as authenticated user';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Mandant B darf weder Einstellungen noch Wissen von Mandant A sehen.
select set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
do $$
begin
  if (select count(*) from public.mail_agent_settings) <> 0 then
    raise exception 'cross-tenant settings read was possible';
  end if;
  if (select count(*) from public.mail_agent_knowledge) <> 0 then
    raise exception 'cross-tenant knowledge read was possible';
  end if;
  begin
    insert into public.mail_agent_knowledge (tenant_id, category, title, content, source)
    values (current_setting('mosaos.test_tenant_a')::uuid, 'company', 'Fremd', 'Fremder Inhalt', 'RLS-Test');
    raise exception 'cross-tenant knowledge insert was possible';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
update public.tenant_users set role = 'disposition'
where user_id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);

do $$
declare affected integer;
begin
  if (select count(*) from public.mail_agent_knowledge) <> 1 then
    raise exception 'disposition could not read own tenant knowledge';
  end if;
  update public.mail_agent_knowledge set content = 'Nicht erlaubt';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'disposition changed admin-controlled knowledge';
  end if;
end $$;

reset role;
update public.tenant_users set role = 'readonly'
where user_id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);

do $$
begin
  if (select count(*) from public.mail_agent_knowledge) <> 0 then
    raise exception 'readonly role could read mail knowledge';
  end if;
  if private.has_mail_permission('mail.read') then
    raise exception 'readonly role received mail.read';
  end if;
end $$;

select 'mail assistant tenant isolation and role checks passed' as test_result;
rollback;
