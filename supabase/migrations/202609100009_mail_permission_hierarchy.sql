-- Mailrechte fuer eigene Rollen: hoehere Rechte schliessen die fuer ihre
-- Ausuebung notwendigen niedrigeren Rechte ein.
begin;

create or replace function private.has_mail_permission(permission text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  current_role text := private.current_tenant_role();
  custom_perms jsonb;
begin
  if permission <> all(array['mail.read','mail.review','mail.send','mail.admin']) then return false; end if;
  if current_role = 'admin' then return true; end if;
  if current_role = 'disposition' then return permission = any(array['mail.read','mail.review','mail.send']); end if;
  select role_item->'perms' into custom_perms
    from public.company_settings,
         lateral jsonb_array_elements(coalesce(roles, '[]'::jsonb)) role_item
    where tenant_id = private.current_tenant_id() and role_item->>'key' = current_role
    limit 1;
  if custom_perms is null then return false; end if;
  if custom_perms ? 'admin_email' then return true; end if;
  if permission = 'mail.read' then
    return custom_perms ?| array['view_email','review_email','send_email'];
  end if;
  if permission = 'mail.review' then return custom_perms ?| array['review_email','send_email']; end if;
  if permission = 'mail.send' then return custom_perms ? 'send_email'; end if;
  return false;
end;
$$;
revoke all on function private.has_mail_permission(text) from public, anon;
grant execute on function private.has_mail_permission(text) to authenticated;

notify pgrst, 'reload schema';
commit;
