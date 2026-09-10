# Supabase deployment

Use a separate staging project first.

1. Link the project with the Supabase CLI.
2. Apply migrations using `supabase db push`.
3. Set secrets: `APP_ORIGIN`, `CONTACT_HASH_SALT`, Stripe values and any mail-provider values.
4. Deploy functions with `supabase functions deploy`.
5. Run role and tenant isolation tests before changing production traffic.

Never paste a service-role key into an HTML or JavaScript file. The repository deliberately contains only the public Supabase publishable key.

## Mail-Assistent (noch nicht produktiv)

Etappe 1 erwartet folgende Supabase-Secrets:

- `GMAIL_OAUTH_CLIENT_ID`
- `GMAIL_OAUTH_CLIENT_SECRET`
- `MAIL_OAUTH_REDIRECT_URI` – exakt die URL der Function `mail-oauth-callback`
- `MAIL_TOKEN_ENCRYPTION_KEY` – ein base64url-codierter, zufaelliger 32-Byte-Schluessel
- `MAIL_CONTACT_HASH_SALT` – ein unabhaengiger, zufaelliger Wert mit mindestens 32 Zeichen
- `MAIL_CRON_SECRET` – ein unabhaengiger, zufaelliger Wert fuer Scheduler-Aufrufe

Der Verschluesselungsschluessel darf nach dem ersten gespeicherten Postfach nicht
einfach ersetzt werden. Eine Rotation braucht eine kontrollierte Neuverschluesselung
und eine erhoehte `token_key_version`.

Die neue Migration und Functions zuerst in Staging anwenden. Anschliessend den
Negativtest `scripts/mail-assistent-rls-test.sql` gegen die lokale oder separate
Staging-Testdatenbank ausfuehren. Das Skript ist nicht fuer Produktion bestimmt.

Etappe 2 stellt `mail-sync` und `mail-retention` bereit. Im Supabase-Scheduler
werden nach dem Staging-Test zwei POST-Aufrufe mit dem Header
`x-cron-secret: <MAIL_CRON_SECRET>` eingerichtet:

- `mail-sync`: alle 30 Minuten;
- `mail-retention`: taeglich, bei `more: true` erneut aufrufen.

Der Cron-Secret darf weder als URL-Parameter noch im Repository stehen. Solange
`mail_agent_settings.enabled` false ist, ruft der Sync keine Gmail-Nachrichten ab.
