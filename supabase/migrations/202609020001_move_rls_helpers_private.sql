-- RLS helpers are needed by policies, but must not be exposed as PostgREST RPCs.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter function public.current_tenant_id() set schema private;
alter function public.current_tenant_role() set schema private;
alter function public.has_tenant_permission(text) set schema private;

grant usage on schema private to authenticated;
grant execute on function private.current_tenant_id() to authenticated;
grant execute on function private.current_tenant_role() to authenticated;
grant execute on function private.has_tenant_permission(text) to authenticated;

commit;
