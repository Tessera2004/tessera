-- Zeitfenster: Terminbuchung fuer fremde Betriebe.
--
-- Warum in dieser Datenbank und nicht in einer eigenen: Zeitfenster ist ein
-- anderes Produkt als MosaOS, aber Brevo, die Secrets und der Deploy-Weg
-- stehen hier bereits. Ein zweites Supabase-Projekt haette denselben Aufbau
-- noch einmal verlangt, ohne dass ein einziger Kunde davon etwas hat. Damit
-- der spaetere Auszug in ein eigenes Projekt eine einzelne Bewegung bleibt,
-- traegt alles das Praefix zf_ und haengt an keiner MosaOS-Tabelle.
--
-- Bis hierher lief Zeitfenster ausschliesslich im localStorage des Besuchers.
-- Das heisst: Eine Kundin buchte auf ihrem Handy, und die Buchung lag in
-- ihrem eigenen Browser. Der Betrieb erfuhr nie davon. Genau das behebt
-- diese Migration — ohne sie ist die Anwendung eine Vorfuehrung, kein Dienst.

-- Ein Betrieb ist ein zahlender Kunde: ein Coiffeur, eine Praxis, eine
-- Fahrschule. Oeffnungszeiten und Leistungen stehen hier und nicht mehr fest
-- im Code, damit ein neuer Kunde eine eingefuegte Zeile ist und kein Deploy.
create table if not exists public.zf_betriebe (
  id uuid primary key default gen_random_uuid(),
  -- Kennung in der Adresse, z. B. ?betrieb=coiffeur-mueller
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  name text not null check (char_length(name) between 2 and 200),

  -- Wohin die Benachrichtigung ueber eine neue Buchung geht. Diese Adresse
  -- ist der eigentliche Gegenwert des Produkts: Sie macht die Buchung im
  -- Alltag des Betriebs sichtbar, ohne dass jemand eine Oberflaeche oeffnet.
  benachrichtigung_email text not null check (benachrichtigung_email like '%@%'),

  zeitzone text not null default 'Europe/Zurich',

  -- Freie Zeiten je Wochentag nach ISO: "1" = Montag bis "7" = Sonntag.
  -- Beispiel: {"1":["08:30","09:30"],"2":["14:00"]}
  -- Ein fehlender Wochentag bedeutet geschlossen.
  oeffnungszeiten jsonb not null default '{}'::jsonb,

  -- Auswahl im Formular, z. B. ["Haarschnitt","Faerben","Beratung"].
  leistungen jsonb not null default '[]'::jsonb,

  -- Einzelne geschlossene Tage: Ferien, Feiertage, Weiterbildung.
  geschlossen date[] not null default '{}',

  -- Wie kurzfristig gebucht werden darf. Ohne diese Sperre bucht jemand um
  -- 08:25 den Termin um 08:30, und der Betrieb liest die Mail zu spaet.
  vorlauf_stunden int not null default 12 check (vorlauf_stunden between 0 and 720),

  -- Wie weit im Voraus gebucht werden darf.
  horizont_tage int not null default 60 check (horizont_tage between 1 and 365),

  -- Nur der Hash. Wer die Tabelle lesen kann, soll die Terminliste eines
  -- Betriebs nicht oeffnen koennen.
  verwaltung_token_hash text,

  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.zf_buchungen (
  id uuid primary key default gen_random_uuid(),
  betrieb_id uuid not null references public.zf_betriebe(id) on delete cascade,

  -- Datum und Uhrzeit bewusst getrennt und als Ortszeit des Betriebs, nicht
  -- als timestamptz. Ein Coiffeur denkt in "Dienstag um 10:30", nicht in UTC.
  -- Die Trennung erspart jede Umrechnung — und damit die Klasse von Fehlern,
  -- bei denen ein Termin nach der Zeitumstellung eine Stunde verrutscht.
  datum date not null,
  zeit time not null,

  leistung text check (leistung is null or char_length(leistung) <= 100),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email like '%@%' and char_length(email) <= 320),
  telefon text check (telefon is null or char_length(telefon) <= 40),
  notiz text check (notiz is null or char_length(notiz) <= 1000),

  status text not null default 'bestaetigt'
    check (status in ('bestaetigt', 'erledigt', 'abgesagt')),

  -- Nur der Hash des Absage-Tokens; der Klartext steht einmalig in der Mail
  -- an den Gast und wird nie gespeichert.
  storno_token_hash text,

  source_ip_hash text,
  created_at timestamptz not null default now(),
  abgesagt_at timestamptz
);

-- Der eigentliche Schutz vor Doppelbuchung.
--
-- Die Oberflaeche blendet belegte Zeiten aus, aber das ist nur Anzeige: Zwei
-- Gaeste, die dieselbe Seite offen haben, sehen beide denselben freien Slot
-- und tippen gleichzeitig auf Bestaetigen. Nur diese Bedingung in der
-- Datenbank entscheidet das zuverlaessig — die zweite Buchung scheitert mit
-- 23505, und die Edge Function macht daraus eine verstaendliche Absage.
--
-- Abgesagte Termine sind ausgenommen, damit ein frei gewordener Platz wieder
-- vergeben werden kann.
create unique index if not exists zf_buchungen_slot_uniq
  on public.zf_buchungen (betrieb_id, datum, zeit)
  where status <> 'abgesagt';

-- Die haeufigste Abfrage: freie Zeiten eines Betriebs in einem Zeitraum.
create index if not exists zf_buchungen_kalender_idx
  on public.zf_buchungen (betrieb_id, datum)
  where status <> 'abgesagt';

create index if not exists zf_buchungen_storno_idx
  on public.zf_buchungen (storno_token_hash)
  where storno_token_hash is not null;

alter table public.zf_betriebe enable row level security;
alter table public.zf_buchungen enable row level security;

-- Kein direkter Zugriff, auch nicht lesend.
--
-- Eine Terminliste enthaelt Namen, Mailadressen und Telefonnummern fremder
-- Personen. Selbst die Oeffnungszeiten bleiben zu, weil ueber sie der
-- Betriebsbestand aller Kunden auslesbar waere. Gelesen und geschrieben wird
-- ausschliesslich ueber die Edge Function mit dem Service-Schluessel, die
-- pro Anfrage genau einen Betrieb herausgibt.
revoke all on public.zf_betriebe from anon, authenticated;
revoke all on public.zf_buchungen from anon, authenticated;

-- Ein Betrieb zum Vorfuehren.
--
-- Er existiert, damit beim Verkaufsgespraech eine echte Buchung durch die
-- echte Kette laeuft — Datenbank, Sperre, Mail — statt einer Attrappe. Die
-- Benachrichtigung geht an das eigene Postfach. Vor dem ersten echten Kunden
-- nicht loeschen; er ist die Demo.
insert into public.zf_betriebe (slug, name, benachrichtigung_email, oeffnungszeiten, leistungen, vorlauf_stunden)
values (
  'demo',
  'Zeitfenster Demo',
  'info.mosaos@gmail.com',
  '{"1":["08:30","09:30","10:30","13:30","14:30","15:30"],
    "2":["08:30","09:30","10:30","13:30","14:30","15:30"],
    "3":["08:30","09:30","10:30","13:30","14:30","15:30"],
    "4":["08:30","09:30","10:30","13:30","14:30","15:30"],
    "5":["08:30","09:30","10:30","13:30"]}'::jsonb,
  '["Erstgespräch","Beratung","Produktdemo"]'::jsonb,
  0
)
on conflict (slug) do nothing;
