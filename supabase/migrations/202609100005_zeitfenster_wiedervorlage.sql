-- Wiedervorlage: Erinnerung an den naechsten Termin.
--
-- Ein Hund muss alle sechs bis acht Wochen zum Salon, eine Podologie-Kundin
-- kommt im selben Rhythmus. Heute liegt dieses Wissen im Kopf der Inhaberin.
-- Wer nicht von selbst anruft, kommt irgendwann nicht mehr — und niemand
-- merkt es, weil ein ausbleibender Anruf kein Ereignis ist.
--
-- Diese Migration macht daraus etwas, das von selbst laeuft.
begin;

alter table public.zf_betriebe
  -- Nach wie vielen Wochen erinnert wird. 0 bedeutet aus.
  --
  -- Am Betrieb und nicht an der Leistung: Ein Salon hat einen Rhythmus, und
  -- eine Einstellung, die man einmal setzt und versteht, wird benutzt. Eine
  -- Tabelle mit einem Wert je Leistung waere genauer und bliebe leer.
  add column if not exists wiedervorlage_wochen int not null default 0
    check (wiedervorlage_wochen between 0 and 52);

grant update (wiedervorlage_wochen) on public.zf_betriebe to authenticated;

alter table public.zf_buchungen
  -- Wann erinnert wurde. Verhindert, dass derselbe Termin zweimal ausloest —
  -- etwa wenn der taegliche Auftrag doppelt laeuft oder nachgeholt wird.
  add column if not exists erinnert_at timestamptz,

  -- Nur der Hash. Der Klartext steht einmalig im Abmeldelink der Erinnerung.
  -- Ein eigener Token, nicht der zum Absagen: Wer sich abmeldet, will keine
  -- Werbung mehr — er soll dabei nicht aus Versehen seinen Termin verlieren.
  add column if not exists abmelde_token_hash text;

create index if not exists zf_buchungen_erinnerung_idx
  on public.zf_buchungen (betrieb_id, datum)
  where erinnert_at is null and status <> 'abgesagt';

create index if not exists zf_buchungen_abmelde_idx
  on public.zf_buchungen (abmelde_token_hash)
  where abmelde_token_hash is not null;

-- Wer keine Erinnerungen mehr will.
--
-- Rechtlich ist das der Kern der Sache. Eine Erinnerung an eine
-- Privatperson ist Werbung; erlaubt ist sie nur ueber die Ausnahme fuer
-- bestehende Kundenbeziehungen (DE: UWG § 7 Abs. 3). Die verlangt unter
-- anderem, dass bei der Erhebung UND in jeder einzelnen Mail auf das
-- Widerspruchsrecht hingewiesen wird — und dass ein Widerspruch wirkt.
-- Ohne diese Tabelle waere die ganze Funktion abmahnfaehig.
create table if not exists public.zf_erinnerung_aus (
  betrieb_id uuid not null references public.zf_betriebe(id) on delete cascade,
  email text not null,
  abgemeldet_at timestamptz not null default now(),
  primary key (betrieb_id, email)
);

alter table public.zf_erinnerung_aus enable row level security;

-- Der Betrieb darf sehen, wer sich abgemeldet hat — aber niemanden eintragen
-- oder wieder austragen. Ein Widerspruch, den der Werbende zuruecknehmen
-- kann, ist keiner.
drop policy if exists zf_erinnerung_aus_lesen on public.zf_erinnerung_aus;
create policy zf_erinnerung_aus_lesen on public.zf_erinnerung_aus
  for select to authenticated
  using (betrieb_id in (select private.zf_meine_betriebe()));

grant select on public.zf_erinnerung_aus to authenticated;

commit;
