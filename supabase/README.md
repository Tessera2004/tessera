# Supabase deployment

Use a separate staging project first.

1. Link the project with the Supabase CLI.
2. Apply migrations using `supabase db push`.
3. Set secrets: `APP_ORIGIN`, `CONTACT_HASH_SALT`, Stripe values and any mail-provider values.
4. Deploy functions with `supabase functions deploy`.
5. Run role and tenant isolation tests before changing production traffic.

Never paste a service-role key into an HTML or JavaScript file. The repository deliberately contains only the public Supabase publishable key.

