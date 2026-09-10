-- MosaOS Mail-Assistent: sichere Pruefung und genau-einmaliger Versandversuch.
begin;

alter table public.mail_messages add column if not exists delivery_error_code text
  check (delivery_error_code is null or char_length(delivery_error_code) <= 100);

alter table public.mail_messages drop constraint if exists mail_messages_status_check;
alter table public.mail_messages add constraint mail_messages_status_check
  check (status in ('new','analysing','drafted','reviewed','sending','sent','delivery_unknown','ignored','failed'));

-- Kontrollierter Zugriff auf private.has_mail_permission fuer JWT-geschuetzte
-- Edge Functions. Es werden weder Rolle noch Mandant offengelegt.
create or replace function public.current_user_has_mail_permission(p_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_mail_permission(p_permission)
$$;
revoke all on function public.current_user_has_mail_permission(text) from public, anon;
grant execute on function public.current_user_has_mail_permission(text) to authenticated;

-- Nur der service_role darf einen Entwurf fuer einen einzigen Versandversuch
-- beanspruchen. Gleichzeitige Doppelklicks erhalten keinen zweiten Claim.
create or replace function public.claim_mail_draft_delivery(
  p_draft_id uuid, p_tenant_id uuid, p_actor_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare claimed_message_id uuid;
begin
  update public.mail_messages m
  set status = 'sending', delivery_error_code = null
  from public.mail_drafts d
  where d.id = p_draft_id
    and d.tenant_id = p_tenant_id
    and d.message_id = m.id
    and m.tenant_id = p_tenant_id
    and m.status in ('drafted','reviewed')
    and d.sent_at is null
  returning m.id into claimed_message_id;

  if claimed_message_id is not null then
    update public.mail_drafts
    set reviewed_by = coalesce(reviewed_by, p_actor_id),
        reviewed_at = coalesce(reviewed_at, now())
    where id = p_draft_id and tenant_id = p_tenant_id;
  end if;
  return claimed_message_id;
end;
$$;
revoke all on function public.claim_mail_draft_delivery(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.claim_mail_draft_delivery(uuid,uuid,uuid) to service_role;

-- Speichern und Statuswechsel laufen unter derselben Nachrichtensperre. So
-- kann eine parallele Bearbeitung einen bereits gestarteten Versand nicht
-- nachtraeglich veraendern.
create or replace function public.save_mail_draft_review(
  p_tenant_id uuid, p_message_id uuid, p_draft_id uuid, p_actor_id uuid,
  p_encrypted_subject text, p_encrypted_body text, p_key_version integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare current_status text; existing_draft_id uuid;
begin
  select status into current_status from public.mail_messages
  where id = p_message_id and tenant_id = p_tenant_id for update;
  if current_status is null or current_status not in ('new','failed','drafted','reviewed') then
    return null;
  end if;
  select id into existing_draft_id from public.mail_drafts
  where message_id = p_message_id and tenant_id = p_tenant_id;
  if existing_draft_id is not null and existing_draft_id <> p_draft_id then return null; end if;

  if existing_draft_id is null then
    insert into public.mail_drafts(
      id,tenant_id,message_id,encrypted_subject,encrypted_body,payload_key_version,
      confidence,missing_information,knowledge_refs,model,input_tokens,output_tokens,reviewed_by,reviewed_at
    ) values (
      p_draft_id,p_tenant_id,p_message_id,p_encrypted_subject,p_encrypted_body,p_key_version,
      'low','[]'::jsonb,'{}'::uuid[],'manual',0,0,p_actor_id,now()
    );
  else
    update public.mail_drafts set encrypted_subject = p_encrypted_subject,
      encrypted_body = p_encrypted_body, payload_key_version = p_key_version,
      reviewed_by = p_actor_id, reviewed_at = now()
    where id = existing_draft_id and tenant_id = p_tenant_id;
  end if;
  update public.mail_messages set status = 'reviewed'
  where id = p_message_id and tenant_id = p_tenant_id;
  return p_draft_id;
end;
$$;
revoke all on function public.save_mail_draft_review(uuid,uuid,uuid,uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.save_mail_draft_review(uuid,uuid,uuid,uuid,text,text,integer) to service_role;

create or replace function public.finish_mail_draft_delivery(
  p_draft_id uuid, p_tenant_id uuid, p_sent_at timestamptz
) returns boolean language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  update public.mail_messages m set status = 'sent', delivery_error_code = null
  from public.mail_drafts d
  where d.id = p_draft_id and d.tenant_id = p_tenant_id
    and d.message_id = m.id and m.tenant_id = p_tenant_id
    and m.status = 'sending' and d.sent_at is null;
  get diagnostics affected = row_count;
  if affected <> 1 then return false; end if;
  update public.mail_drafts set sent_at = p_sent_at
  where id = p_draft_id and tenant_id = p_tenant_id and sent_at is null;
  if not found then raise exception 'mail delivery finalization conflict'; end if;
  return true;
end;
$$;
revoke all on function public.finish_mail_draft_delivery(uuid,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.finish_mail_draft_delivery(uuid,uuid,timestamptz) to service_role;

create index if not exists mail_messages_delivery_idx
  on public.mail_messages(tenant_id, status, updated_at)
  where status in ('reviewed','sending','delivery_unknown');

notify pgrst, 'reload schema';
commit;
