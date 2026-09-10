#!/usr/bin/env python3
"""Legt einen Zeitfenster-Kunden an.

Erzeugt das SQL fuer einen neuen Betrieb und die beiden Links, die der Kunde
bei der Uebergabe bekommt. Das Verwaltungs-Token wird hier gewuerfelt und nur
als Hash gespeichert — es erscheint genau einmal, in dieser Ausgabe. Geht es
verloren, laesst sich kein neuer Link herleiten; dann diesen Aufruf mit
denselben Angaben wiederholen und das UPDATE ausfuehren.

Aufruf:

    python3 scripts/zeitfenster-kunde.py \\
        --slug coiffeur-mueller \\
        --name "Coiffeur Müller" \\
        --mail termine@coiffeur-mueller.ch \\
        --zeiten "Mo-Fr 08:30,09:30,10:30,13:30,14:30,15:30" \\
        --zeiten "Sa 09:00,10:00,11:00" \\
        --leistung Haarschnitt --leistung Färben --leistung Beratung

Das ausgegebene SQL im Supabase-SQL-Fenster ausfuehren.
"""

import argparse
import hashlib
import json
import re
import secrets

PROJEKT = "kxhsroiholjnyisaystr"
SEITE = "https://termine.mosaos.ch"

TAGE = {"mo": 1, "di": 2, "mi": 3, "do": 4, "fr": 5, "sa": 6, "so": 7}
REIHE = list(TAGE)


def tage_lesen(angabe: str) -> tuple[list[int], list[str]]:
    """"Mo-Fr 08:30,09:30" -> ([1,2,3,4,5], ["08:30","09:30"])."""
    kopf, _, zeiten = angabe.partition(" ")
    kopf = kopf.strip().lower()
    if "-" in kopf:
        von, _, bis = kopf.partition("-")
        if von not in TAGE or bis not in TAGE:
            raise SystemExit(f"Unbekannter Wochentag in {angabe!r}")
        if REIHE.index(von) > REIHE.index(bis):
            raise SystemExit(f"Wochentagsbereich ist rückwärts in {angabe!r}")
        nummern = [TAGE[t] for t in REIHE[REIHE.index(von) : REIHE.index(bis) + 1]]
    else:
        nummern = [TAGE[t.strip()] for t in kopf.split(",") if t.strip() in TAGE]
    if not nummern:
        raise SystemExit(f"Kein Wochentag erkannt in {angabe!r}")

    liste = sorted({z.strip() for z in zeiten.split(",") if z.strip()})
    for z in liste:
        # Eine Zeit, die nicht HH:MM ist, wird von der Edge Function nie als
        # Oeffnungszeit erkannt. Der Kunde sieht dann einen leeren Kalender
        # und ruft an — besser hier abbrechen.
        if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", z):
            raise SystemExit(f"Zeit {z!r} ist nicht im Format HH:MM")
    if not liste:
        raise SystemExit(f"Keine Zeiten angegeben in {angabe!r}")
    return nummern, liste


def sql_text(wert: str) -> str:
    return "'" + wert.replace("'", "''") + "'"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--slug", required=True, help="Kennung in der Adresse, klein und mit Bindestrichen")
    p.add_argument("--name", required=True, help="Name des Betriebs, wie er dem Gast angezeigt wird")
    p.add_argument("--mail", required=True, help="Wohin die Benachrichtigung ueber neue Buchungen geht")
    p.add_argument("--zeiten", action="append", required=True, metavar='"Mo-Fr 08:30,09:30"')
    p.add_argument("--leistung", action="append", default=[], help="Auswahl im Formular, mehrfach angebbar")
    p.add_argument("--konto", help="E-Mail des Zugangs fuer den Kundenbereich")
    p.add_argument("--vorlauf", type=int, default=12, help="Stunden Mindestvorlauf (Vorgabe 12)")
    p.add_argument("--horizont", type=int, default=60, help="Tage im Voraus buchbar (Vorgabe 60)")
    a = p.parse_args()

    a.slug = a.slug.strip().lower()
    a.mail = a.mail.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,60}", a.slug):
        raise SystemExit("Slug: 2–61 Kleinbuchstaben, Zahlen oder Bindestriche")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", a.mail):
        raise SystemExit("Die Benachrichtigungsadresse ist keine gültige E-Mail-Adresse")
    if not 0 <= a.vorlauf <= 720:
        raise SystemExit("Der Mindestvorlauf muss zwischen 0 und 720 Stunden liegen")
    if not 1 <= a.horizont <= 365:
        raise SystemExit("Der Buchungshorizont muss zwischen 1 und 365 Tagen liegen")

    oeffnung: dict[str, list[str]] = {}
    for angabe in a.zeiten:
        nummern, liste = tage_lesen(angabe)
        for n in nummern:
            oeffnung[str(n)] = liste

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    print("-- Im Supabase-SQL-Fenster ausfuehren:\n")
    print("insert into public.zf_betriebe")
    print("  (slug, name, benachrichtigung_email, oeffnungszeiten, leistungen,")
    print("   vorlauf_stunden, horizont_tage, verwaltung_token_hash)")
    print("values (")
    print(f"  {sql_text(a.slug)},")
    print(f"  {sql_text(a.name)},")
    print(f"  {sql_text(a.mail)},")
    print(f"  {sql_text(json.dumps(oeffnung, ensure_ascii=False))}::jsonb,")
    print(f"  {sql_text(json.dumps(a.leistung, ensure_ascii=False))}::jsonb,")
    print(f"  {a.vorlauf}, {a.horizont},")
    print(f"  {sql_text(token_hash)}")
    print(")")
    print("on conflict (slug) do update set")
    print("  name = excluded.name,")
    print("  benachrichtigung_email = excluded.benachrichtigung_email,")
    print("  oeffnungszeiten = excluded.oeffnungszeiten,")
    print("  leistungen = excluded.leistungen,")
    print("  vorlauf_stunden = excluded.vorlauf_stunden,")
    print("  horizont_tage = excluded.horizont_tage,")
    print("  verwaltung_token_hash = excluded.verwaltung_token_hash;")

    if a.konto:
        print("\n\n-- Zugang zum Kundenbereich.")
        print("-- Das Konto vorher im Supabase-Fenster unter Authentication anlegen")
        print("-- (Add user -> Invite), damit der Kunde die Einladungsmail erhaelt.")
        print("-- Diese Zeilen verknuepfen es dann mit dem Betrieb:")
        print("insert into public.zf_betrieb_konten (betrieb_id, user_id)")
        print("select b.id, u.id")
        print("  from public.zf_betriebe b, auth.users u")
        print(f" where b.slug = {sql_text(a.slug)}")
        print(f"   and u.email = {sql_text(a.konto.strip().lower())}")
        print("on conflict do nothing;")

    print("\n\n-- Ferien und Feiertage spaeter nachtragen:")
    print(f"-- update public.zf_betriebe set geschlossen = '{{2026-12-24,2026-12-25}}'")
    print(f"--   where slug = {sql_text(a.slug)};")

    print("\n\nFuer den Kunden:\n")
    print(f"  Buchungslink    {SEITE}/?betrieb={a.slug}")
    print(f"  Kundenbereich   {SEITE}/verwaltung")
    if a.konto:
        print(f"                  Anmeldung mit {a.konto.strip().lower()}")
    print(f"\n  Notzugang ohne Anmeldung: {SEITE}/?betrieb={a.slug}&verwaltung={token}")
    print("  Das Token steht nur hier. Es ist der Rückweg für den Fall, dass")
    print("  ein Kunde sich aussperrt — nicht der uebliche Weg. Der uebliche")
    print("  Weg ist der Kundenbereich mit Anmeldung.")
    print(f"\n  Absagelinks der Gäste laufen über {SEITE}/absagen")


if __name__ == "__main__":
    main()
