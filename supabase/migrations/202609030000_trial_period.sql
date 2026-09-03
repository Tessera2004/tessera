-- MosaOS — 14-Tage-Testphase. Apply through the Supabase CLI, never by copy/paste.
-- Ohne aktives Abo endet der Zugang nach Ablauf von trial_ends_at (harte Bezahl-Wand).
begin;

alter table public.subscriptions add column if not exists trial_ends_at timestamptz;

-- Bestandsmandanten: Testphase ab ihrem Erstellungsdatum, mindestens noch 14 Tage ab heute,
-- damit niemand durch das Update rueckwirkend ausgesperrt wird.
insert into public.subscriptions (tenant_id, trial_ends_at)
select t.id, greatest(t.created_at + interval '14 days', now() + interval '14 days')
from public.tenants t
on conflict (tenant_id) do nothing;

update public.subscriptions s
set trial_ends_at = greatest(t.created_at + interval '14 days', now() + interval '14 days'),
    updated_at = now()
from public.tenants t
where t.id = s.tenant_id and s.trial_ends_at is null;

-- Neue Mandanten bekommen die Testphase direkt bei der Registrierung.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  new_tid uuid;
  inv public.invites%rowtype;
  raw_token text := coalesce(new.raw_user_meta_data->>'invite_token', '');
begin
  if raw_token <> '' then
    select * into inv from public.invites
      where lower(email) = lower(new.email)
        and accepted_at is null
        and expires_at > now()
        and token_hash = encode(digest(raw_token, 'sha256'), 'hex')
      order by created_at desc limit 1
      for update skip locked;
  end if;

  if inv.id is not null then
    insert into public.tenant_users (user_id, tenant_id, role)
      values (new.id, inv.tenant_id, coalesce(inv.role, 'readonly'));
    update public.invites set accepted_at = now() where id = inv.id;
  else
    insert into public.tenants (name)
      values (coalesce(nullif(new.raw_user_meta_data->>'company',''), 'Mandant ' || new.id))
      returning id into new_tid;
    insert into public.tenant_users (user_id, tenant_id, role)
      values (new.id, new_tid, 'admin');
    insert into public.subscriptions (tenant_id, status, trial_ends_at)
      values (new_tid, 'inactive', now() + interval '14 days')
      on conflict (tenant_id) do nothing;
  end if;
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

commit;
