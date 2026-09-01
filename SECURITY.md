# MosaOS Security

Report security issues privately to `info.mosaos@gmail.com`. Do not open public issues containing customer data, credentials or exploit details.

## Non-negotiable rules

- Production data is accessed only with an authenticated user and tenant-scoped RLS.
- Browser role checks are UX only; the database remains authoritative.
- `service_role`, Stripe secrets, OAuth client secrets and signing secrets are Supabase secrets and never frontend values.
- Anonymous users never write directly to business tables or Storage.
- Check-in and invitation links use random, expiring, revocable tokens.
- Evidence photos remain private and are served only through short-lived signed URLs.
- Every production schema or policy change is committed as a migration and tested in staging first.
- Security events and sensitive data changes are retained in the audit log.

## Required production controls

Enable Supabase leaked-password protection, MFA for MosaOS administrators, point-in-time recovery or tested backups, log retention, email confirmation and appropriate Auth rate limits. Rotate secrets after personnel changes or suspected disclosure.

