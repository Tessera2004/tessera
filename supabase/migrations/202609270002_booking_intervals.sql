begin;
set local search_path=public,extensions;
create extension if not exists btree_gist with schema extensions;
alter table public.zf_betriebe add column if not exists service_details jsonb not null default '{}';
grant update(service_details) on public.zf_betriebe to authenticated;
alter table public.zf_buchungen add column if not exists duration_minutes integer not null default 30 check(duration_minutes between 5 and 720);
alter table public.zf_buchungen add column if not exists buffer_minutes integer not null default 0 check(buffer_minutes between 0 and 180);

-- Existing bookings keep a 30-minute baseline until reviewed. Never silently
-- cancel conflicting appointments: this entire migration aborts for review.
do $$ begin
  if exists(select 1 from public.zf_buchungen a join public.zf_buchungen b
    on a.betrieb_id=b.betrieb_id and a.id<b.id and a.status<>'abgesagt' and b.status<>'abgesagt'
    and tsrange(a.datum+a.zeit,a.datum+a.zeit+make_interval(mins=>a.duration_minutes+a.buffer_minutes),'[)') &&
        tsrange(b.datum+b.zeit,b.datum+b.zeit+make_interval(mins=>b.duration_minutes+b.buffer_minutes),'[)')) then
    raise exception 'EXISTING_BOOKINGS_OVERLAP: review durations before applying';
  end if;
end $$;
alter table public.zf_buchungen add constraint zf_no_overlapping_bookings
  exclude using gist(betrieb_id with =,
    tsrange(datum+zeit,datum+zeit+make_interval(mins=>duration_minutes+buffer_minutes),'[)') with &&)
  where(status<>'abgesagt');

-- Derive duration server-side for public AND authenticated inserts. Clients
-- cannot bypass overlap checks by submitting a shorter service duration.
create or replace function private.zf_service_duration() returns trigger
language plpgsql security definer set search_path='' as $$
declare config jsonb; services text[];
begin
  if tg_op='INSERT' or new.leistung is distinct from old.leistung then
    select service_details,leistungen into config,services from public.zf_betriebe where id=new.betrieb_id;
    if coalesce(array_length(services,1),0)>0 and not coalesce(new.leistung=any(services),false) then
      raise exception 'INVALID_SERVICE';
    end if;
    new.duration_minutes:=coalesce((config->coalesce(new.leistung,'')->>'duration')::integer,30);
    new.buffer_minutes:=coalesce((config->coalesce(new.leistung,'')->>'buffer')::integer,0);
  else
    new.duration_minutes:=old.duration_minutes;new.buffer_minutes:=old.buffer_minutes;
  end if;
  return new;
end $$;
create trigger zf_service_duration before insert or update on public.zf_buchungen
  for each row execute function private.zf_service_duration();
notify pgrst,'reload schema';
commit;
