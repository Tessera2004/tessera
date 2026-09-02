-- Keep the permission helper fully internal after moving RLS helpers to private.
begin;

create or replace function private.has_tenant_permission(permission text)
returns boolean language plpgsql stable security definer set search_path = public, private
as $$
declare
  r text := private.current_tenant_role();
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
    where tenant_id = private.current_tenant_id() and role_item->>'key' = r limit 1;
  if custom_perms is not null then
    if permission = 'operations.write' then return custom_perms ?| array['edit_auftrag','edit_objekte']; end if;
    if permission = 'reports.write' then return custom_perms ? 'edit_auftrag'; end if;
    if permission = 'finance.write' then return custom_perms ?| array['edit_offerts','edit_prices']; end if;
  end if;
  return permission = any(array['operations.read','customers.read','reports.read']);
end $$;

revoke all on function private.has_tenant_permission(text) from public, anon;
grant execute on function private.has_tenant_permission(text) to authenticated;

commit;
