-- Mailrechte direkt aus der angemeldeten Mandantenmitgliedschaft ableiten.
-- Die vorherige RPC delegierte an zwei verschachtelte SECURITY-DEFINER-
-- Funktionen und lieferte in der gehosteten PostgREST-Sitzung fuer Admins
-- faelschlich false. Die Regeln selbst bleiben unveraendert.
begin;

create or replace function public.current_user_has_mail_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with membership as (
    select tu.tenant_id, tu.role
    from public.tenant_users tu
    where tu.user_id = auth.uid()
    limit 1
  ), custom_role as (
    select role_item->'perms' as perms
    from membership m
    join public.company_settings cs on cs.tenant_id = m.tenant_id
    cross join lateral jsonb_array_elements(coalesce(cs.roles, '[]'::jsonb)) role_item
    where role_item->>'key' = m.role
    limit 1
  )
  select coalesce((
    select case
      when p_permission <> all(array['mail.read','mail.review','mail.send','mail.admin']) then false
      when m.role = 'admin' then true
      when m.role = 'disposition' then p_permission = any(array['mail.read','mail.review','mail.send'])
      when (select perms from custom_role) ? 'admin_email' then true
      when p_permission = 'mail.read' then (select perms from custom_role) ?| array['view_email','review_email','send_email']
      when p_permission = 'mail.review' then (select perms from custom_role) ?| array['review_email','send_email']
      when p_permission = 'mail.send' then (select perms from custom_role) ? 'send_email'
      else false
    end
    from membership m
  ), false)
$$;

revoke all on function public.current_user_has_mail_permission(text) from public, anon;
grant execute on function public.current_user_has_mail_permission(text) to authenticated;

notify pgrst, 'reload schema';
commit;
