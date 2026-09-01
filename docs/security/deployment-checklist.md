# Production security checklist

- [ ] Apply migrations to a new staging project and run cross-tenant RLS tests.
- [ ] Deploy Edge Functions and set `APP_ORIGIN`, `CONTACT_HASH_SALT`, Stripe secrets and provider secrets.
- [ ] Confirm Supabase email confirmation, MFA, CAPTCHA and Auth rate limits.
- [ ] Confirm `checkin-photos` is private and anonymous Storage writes fail.
- [ ] Verify read-only, field, disposition, accounting and admin accounts separately.
- [ ] Test invitation expiry, revocation and reuse.
- [ ] Test Stripe webhook signatures, duplicate events and cancellation.
- [ ] Restore a backup into staging and document recovery time.
- [ ] Verify Cloudflare response headers on the deployed domain.
- [ ] Run `npm test`, dependency scanning and a manual browser smoke test.
- [ ] Have the German legal documents and DPA reviewed by a Swiss professional.
- [ ] Publish the current processor list and create an incident contact rota.

