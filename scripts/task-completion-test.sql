begin;

alter table public.plan_jobs add column if not exists series_id text;
alter table public.plan_jobs add column if not exists recurring text;


-- RLS limits rows; this trigger also limits columns for assignees without
-- operations.write. Office editors keep their existing permissions.
create or replace function private.restrict_task_completion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() = 'authenticated'
     and not coalesce(private.has_tenant_permission('operations.write'), false) then
    if (to_jsonb(new) - array['done', 'completed_at', 'updated_at'])
       is distinct from (to_jsonb(old) - array['done', 'completed_at', 'updated_at'])
       or new.done is distinct from true then
      raise exception 'Only task completion is permitted' using errcode = '42501';
    end if;
    new.completed_at := case when old.done then old.completed_at else now() end;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.restrict_task_completion() from public, anon, authenticated;
drop trigger if exists restrict_task_completion on public.tasks;
create trigger restrict_task_completion before update on public.tasks
for each row execute function private.restrict_task_completion();

notify pgrst, 'reload schema';


create temporary table task_completion_test (like public.tasks including defaults);
create trigger completion_guard before update on task_completion_test for each row execute function private.restrict_task_completion();
insert into task_completion_test (id,tenant_id,title) values ('test','00000000-0000-0000-0000-000000000001','Original');
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
update task_completion_test set done=true,completed_at='2000-01-01';
do $$ begin
 if not exists(select 1 from task_completion_test where done and completed_at > '2026-01-01') then raise exception 'completion timestamp test failed'; end if;
 begin
  update task_completion_test set title='Changed';
  raise exception 'title edit was allowed';
 exception when insufficient_privilege then null; end;
 begin
  update task_completion_test set done=false;
  raise exception 'reopening was allowed';
 exception when insufficient_privilege then null; end;
 begin
  update task_completion_test set assignee='different';
  raise exception 'reassignment was allowed';
 exception when insufficient_privilege then null; end;
end $$;
select 'completion allowed; title, reassignment and reopening blocked' as test_result;
rollback;
