-- Internal trigger functions must never be callable over PostgREST/RPC.
-- The tenant helpers remain available to authenticated users because active RLS
-- policies invoke them while evaluating a request. Anonymous users get no access.
begin;

revoke execute on function public.audit_tenant_change() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.current_tenant_id() from public, anon;
revoke execute on function public.current_tenant_role() from public, anon;
revoke execute on function public.has_tenant_permission(text) from public, anon;

grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.current_tenant_role() to authenticated;
grant execute on function public.has_tenant_permission(text) to authenticated;

commit;
