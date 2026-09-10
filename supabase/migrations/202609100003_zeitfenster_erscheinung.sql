-- Logo und Farbe des Betriebs.
--
-- Bisher trug der Buchungsplan bei jedem Kunden dasselbe Gesicht. Auf der
-- Website eines Coiffeurs sieht ein Gast dann ein fremdes Rot neben dem
-- Erscheinungsbild des Salons und stutzt — genau an der Stelle, an der er
-- eine Buchung abschicken soll. Vertrauen entscheidet dort ueber den Abbruch.
--
-- Deshalb zwei Felder, mehr nicht. Ein voller Baukasten waere reizvoll und
-- wuerde nie fertig; Logo und eine Akzentfarbe decken ab, was ein Kleinbetrieb
-- tatsaechlich verlangt.
begin;

alter table public.zf_betriebe
  -- Adresse eines Bildes, kein Upload. Das Logo liegt ohnehin schon auf der
  -- Website des Kunden — die Adresse laesst sich mit einem Rechtsklick
  -- abholen. Ein eigener Dateispeicher waere Aufwand fuer ein Problem, das
  -- der Kunde bereits geloest hat.
  add column if not exists logo_url text
    check (logo_url is null or logo_url ~ '^https://[^\s]{5,500}$'),

  -- Akzentfarbe als Hex. Ersetzt das MosaOS-Rot im Buchungsplan des Kunden.
  -- Die Pruefung haelt Unfug aus dem Stylesheet heraus: Der Wert wird im
  -- Browser in eine CSS-Variable geschrieben, und dort hat nur eine Farbe
  -- etwas verloren.
  add column if not exists farbe text
    check (farbe is null or farbe ~ '^#[0-9a-fA-F]{6}$');

-- Der Betrieb pflegt beides selbst im Kundenbereich.
grant update (logo_url, farbe) on public.zf_betriebe to authenticated;

commit;
