#!/usr/bin/env python3
"""Prueft die oeffentlichen Zeitfenster-Wege ohne Buchung oder Mailversand.

Der Test ist absichtlich schreibfrei: Er liest die Demo-Konfiguration und
sendet nur Anfragen, die vor einem Datenbank-Insert abgewiesen werden muessen.
So kann er vor jeder Akquise gefahrlos gegen die produktive Function laufen.
"""

from __future__ import annotations

import json
import os
import ssl
import sys
from datetime import datetime, timedelta
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


BASIS = "https://kxhsroiholjnyisaystr.supabase.co"
FUNKTION = f"{BASIS}/functions/v1/zeitfenster"
SEITE = "https://termine.mosaos.ch"
SCHLUESSEL = "sb_publishable_eoasP900q_btzYLvvnTUQQ_L839WJH7"

# Das mit macOS gelieferte Python kennt den System-Schluesselbund nicht immer.
# Der vorhandene PEM-Satz ist dieselbe Vertrauenskette, die auch curl nutzt;
# Zertifikatspruefung bleibt voll aktiv.
SSL_KONTEXT = (
    ssl.create_default_context(cafile="/etc/ssl/cert.pem")
    if os.path.exists("/etc/ssl/cert.pem")
    else ssl.create_default_context()
)


def anfrage(
    url: str,
    *,
    methode: str = "GET",
    daten: dict[str, object] | None = None,
    headers: dict[str, str] | None = None,
    mit_schluessel: bool = True,
) -> tuple[int, str, dict[str, str]]:
    kopf = {
        "User-Agent": "Mozilla/5.0 MosaOS-Zeitfenster-Pruefung/1.0",
        **({"apikey": SCHLUESSEL} if mit_schluessel else {}),
        **(headers or {}),
    }
    roh = None
    if daten is not None:
        roh = json.dumps(daten).encode()
        kopf["Content-Type"] = "application/json"
    req = Request(url, data=roh, headers=kopf, method=methode)
    try:
        with urlopen(req, timeout=15, context=SSL_KONTEXT) as res:
            return (
                res.status,
                res.read().decode(),
                {k.lower(): v for k, v in res.headers.items()},
            )
    except HTTPError as e:
        return e.code, e.read().decode(), {k.lower(): v for k, v in e.headers.items()}


def json_antwort(
    name: str,
    pfad: str,
    erwartet: int,
    *,
    methode: str = "GET",
    daten: dict[str, object] | None = None,
    headers: dict[str, str] | None = None,
) -> dict[str, object]:
    status, text, _ = anfrage(
        f"{FUNKTION}{pfad}", methode=methode, daten=daten, headers=headers
    )
    if status != erwartet:
        raise AssertionError(f"{name}: HTTP {status} statt {erwartet}: {text[:300]}")
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise AssertionError(f"{name}: keine JSON-Antwort") from e


def pruefe(bedingung: bool, meldung: str) -> None:
    if not bedingung:
        raise AssertionError(meldung)


def main() -> None:
    pruefungen = 0

    heute = datetime.now(ZoneInfo("Europe/Zurich")).date()
    query = urlencode(
        {
            "betrieb": "demo",
            "von": heute.isoformat(),
            "bis": (heute + timedelta(days=20)).isoformat(),
        }
    )
    demo = json_antwort("Demo-Konfiguration", f"/konfiguration?{query}", 200)
    pruefe(demo.get("name") == "Zeitfenster Demo", "Demo: falscher Name")
    pruefe(isinstance(demo.get("tage"), dict), "Demo: freie Tage fehlen")
    pruefungen += 1

    fehler = json_antwort(
        "Unbekannter Betrieb", "/konfiguration?betrieb=gibt-es-nicht", 404
    )
    pruefe(
        fehler.get("error") == "BETRIEB_UNBEKANNT",
        "Unbekannter Betrieb: falscher Fehlercode",
    )
    pruefungen += 1

    fehler = json_antwort(
        "Ungueltige Buchung",
        "/buchen",
        400,
        methode="POST",
        daten={
            "betrieb": "demo",
            "datum": "ungueltig",
            "zeit": "08:30",
            "name": "Test",
            "email": "test@example.com",
        },
    )
    pruefe(
        fehler.get("error") == "TERMIN_UNGUELTIG",
        "Ungueltige Buchung: falscher Fehlercode",
    )
    pruefungen += 1

    fehler = json_antwort(
        "Notzugang", "/termine?betrieb=demo&token=ungueltig", 403
    )
    pruefe(
        fehler.get("error") == "KEIN_ZUGRIFF",
        "Notzugang: falscher Fehlercode",
    )
    pruefungen += 1

    fehler = json_antwort(
        "Zeitplan-Schutz",
        "/erinnerungen",
        403,
        methode="POST",
        daten={},
        headers={"x-cron-secret": "ungueltig"},
    )
    pruefe(
        fehler.get("error") == "KEIN_ZUGRIFF",
        "Zeitplan-Schutz: falscher Fehlercode",
    )
    pruefungen += 1

    status, _, kopf = anfrage(
        f"{FUNKTION}/konfiguration?betrieb=demo", methode="OPTIONS"
    )
    pruefe(status == 204, f"CORS: HTTP {status} statt 204")
    pruefe(
        kopf.get("access-control-allow-origin") == "*",
        "CORS: erlaubte Herkunft fehlt",
    )
    pruefungen += 1

    # Gastaktionen werden auf der eigenen Domain dargestellt. Supabase setzt
    # HTML-Antworten seiner Function aus Sicherheitsgruenden auf text/plain;
    # deshalb ist die Function hier nur JSON-Backend und nie die sichtbare Seite.
    status, text, kopf = anfrage(
        f"{SEITE}/absagen?token=ungueltig", mit_schluessel=False
    )
    pruefe(status == 200, f"Absageseite: HTTP {status} statt 200")
    pruefe("Termin absagen" in text, "Absageseite: Inhalt fehlt")
    pruefe(
        "text/html" in kopf.get("content-type", ""),
        "Absageseite: falscher Inhaltstyp",
    )
    pruefungen += 1

    status, text, kopf = anfrage(
        f"{SEITE}/erinnerung-aus?token=ungueltig", mit_schluessel=False
    )
    pruefe(status == 200, f"Abmeldeseite: HTTP {status} statt 200")
    pruefe("Erinnerungen abbestellen" in text, "Abmeldeseite: Inhalt fehlt")
    pruefe(
        "text/html" in kopf.get("content-type", ""),
        "Abmeldeseite: falscher Inhaltstyp",
    )
    pruefungen += 1

    fehler = json_antwort(
        "Absage-API",
        "/absagen?token=ungueltig",
        404,
        headers={"Accept": "application/json"},
    )
    pruefe(
        fehler.get("error") == "TERMIN_NICHT_GEFUNDEN",
        "Absage-API: falscher Fehlercode",
    )
    pruefungen += 1

    fehler = json_antwort(
        "Abmelde-API",
        "/erinnerung-aus?token=ungueltig",
        404,
        headers={"Accept": "application/json"},
    )
    pruefe(
        fehler.get("error") == "ERINNERUNG_NICHT_GEFUNDEN",
        "Abmelde-API: falscher Fehlercode",
    )
    pruefungen += 1

    # Die Tabellen enthalten personenbezogene Buchungen. Ohne Anmeldung darf
    # PostgREST deshalb weder Betriebe noch Termine direkt herausgeben.
    for tabelle in ("zf_betriebe", "zf_buchungen"):
        status, text, _ = anfrage(f"{BASIS}/rest/v1/{tabelle}?select=*&limit=1")
        if status not in (401, 403):
            raise AssertionError(
                f"RLS {tabelle}: HTTP {status} statt 401/403: {text[:300]}"
            )
        pruefungen += 1

    print(f"Zeitfenster: {pruefungen} sichere Produktionspruefungen bestanden.")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, OSError) as e:
        print(f"Zeitfenster-Pruefung fehlgeschlagen: {e}", file=sys.stderr)
        raise SystemExit(1)
