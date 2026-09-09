begin;

-- Einmalige Bereinigung des am 9. September 2026 angelegten E2E-Testbestands.
-- Der doppelte Abgleich auf Firmenname und Owner-E-Mail verhindert, dass ein
-- gleichnamiger echter Mandant versehentlich betroffen sein kann.
delete from public.tenants t
where t.name = 'MosaOS E2E Testbetrieb'
  and exists (
    select 1
    from public.tenant_users tu
    join auth.users u on u.id = tu.user_id
    where tu.tenant_id = t.id
      and lower(u.email) = 'brianswisshd@icloud.com'
      and tu.role = 'admin'
  );

delete from auth.users
where lower(email) in (
  'brianswisshd@icloud.com',
  'mosaos-e2e-field-20260909@example.invalid'
);

commit;
