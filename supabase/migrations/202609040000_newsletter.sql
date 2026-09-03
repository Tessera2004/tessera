-- Newsletter mit doppelter Anmeldebestaetigung (Double Opt-in).
--
-- Warum doppelt: Ohne nachweisbare Einwilligung ist Werbung per Mail in der
-- Schweiz nach UWG Art. 3 Abs. 1 lit. o unzulaessig, in der EU nach DSGVO.
-- Ein einzelnes Formularfeld beweist nichts — jeder koennte fremde Adressen
-- eintragen. Erst der Klick im Bestaetigungslink beweist, dass der Inhaber
-- der Adresse zugestimmt hat. Darum zaehlt nur confirmed_at, nie created_at.
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 320),
  -- Nur der Hash des Tokens wird gespeichert. Wer die Tabelle lesen kann,
  -- soll fremde Anmeldungen nicht bestaetigen koennen.
  token_hash text,
  token_expires_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  source text check (source is null or char_length(source) <= 100),
  source_ip_hash text,
  created_at timestamptz not null default now()
);

-- Nur bestaetigte und nicht abgemeldete Adressen duerfen angeschrieben werden.
create index if not exists newsletter_subscribers_versandliste_idx
  on public.newsletter_subscribers (confirmed_at)
  where confirmed_at is not null and unsubscribed_at is null;

alter table public.newsletter_subscribers enable row level security;

-- Kein Zugriff fuer angemeldete oder anonyme Nutzer: Eine Mailingliste ist
-- eine Sammlung fremder Adressen. Gelesen und geschrieben wird ausschliesslich
-- ueber die Edge Functions mit dem Service-Schluessel.
revoke all on public.newsletter_subscribers from anon, authenticated;
