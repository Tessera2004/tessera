#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
App prüfen — die Fehler finden, die man sonst erst beim Kunden sieht
====================================================================

Diese App hat keine Tests. Jede Änderung wird dadurch geprüft, dass
jemand klickt. Die Fehler, die im September 2026 tatsächlich passiert
sind, waren aber alle maschinell erkennbar:

  · ein doppeltes Escape in app-i18n.js (`l\\'appel`) — die Datei lud
    nicht mehr, die App fiel still auf Deutsch zurück. Zweimal passiert.
  · ein Übersetzungsschlüssel nur auf Deutsch angelegt
  · eine vergessene Cache-Version — lokal richtig, beim Besucher tagelang
    der alte Stand
  · ein MosaDB.push mit einem Typ, den db-sync.js gar nicht kennt. Der
    Betrieb sah "Änderungen werden nicht gespeichert", die Daten blieben
    in einem Browser liegen.

Genau danach sucht dieses Skript. Es ersetzt keine Tests, aber es fängt
die Klasse Fehler, die hier wirklich Zeit gekostet hat.

Aufruf:  python3 scripts/app-pruefen.py
Rückgabe: 0 wenn alles sauber, 1 bei Befunden.
"""
import json
import pathlib
import re
import subprocess
import sys

WURZEL = pathlib.Path(__file__).resolve().parent.parent
APP = WURZEL / 'app'

# Auf diesem Mac gibt es kein globales node — siehe scripts/supabase.sh
NODE = pathlib.Path(
    '/Users/brianknuchel/.cache/codex-runtimes/codex-primary-runtime'
    '/dependencies/node/bin/node'
)

befunde = []
hinweise = []


def befund(bereich, text):
    befunde.append((bereich, text))


def kurz(zeilen, grenze=160):
    """Node druckt die ganze fehlerhafte Zeile — die ist hier oft
    mehrere tausend Zeichen lang. Fuer den Bericht reicht der Anfang."""
    raus = []
    for z in zeilen:
        z = z.strip()
        raus.append(z if len(z) <= grenze else z[:grenze] + ' …')
    return ' / '.join(raus)


# ---------------------------------------------------------------- Syntax
def pruefe_syntax():
    """Jede JS-Datei muss für sich allein parsen."""
    if not NODE.exists():
        hinweise.append('node nicht gefunden — Syntaxprüfung übersprungen')
        return
    dateien = sorted(APP.glob('*.js'))
    for f in dateien:
        r = subprocess.run([str(NODE), '--check', str(f)],
                           capture_output=True, text=True)
        if r.returncode != 0:
            erste = [z for z in r.stderr.split('\n') if z.strip()][:3]
            befund('Syntax', f'{f.name}: ' + kurz(erste))
    print(f'  {len(dateien)} JS-Dateien geprüft')


# ------------------------------------------------------------ Sprachen
def pruefe_sprachen():
    """Alle fünf Sprachen müssen laden und dieselben Schlüssel haben."""
    if not NODE.exists():
        return
    datei = APP / 'app-i18n.js'
    if not datei.exists():
        befund('Sprachen', 'app-i18n.js fehlt')
        return

    # In Node laden statt mit einem regulären Ausdruck raten — nur so
    # fällt ein kaputtes Escape wirklich auf.
    # Die Datei haengt sich am Ende an das Dokument — in Node muss ein
    # Minimal-Ersatz her, sonst scheitert die Pruefung an sich selbst.
    skript = f'''
      const stumpf = {{ addEventListener(){{}}, querySelectorAll: () => [],
        querySelector: () => null, setAttribute(){{}}, getAttribute: () => null,
        readyState: 'complete',
        documentElement: {{ setAttribute(){{}}, getAttribute: () => null }} }};
      global.document = stumpf;
      global.localStorage = {{ getItem: () => null, setItem(){{}}, removeItem(){{}} }};
      global.navigator = {{ language: 'de-CH' }};
      global.window = {{ addEventListener(){{}}, location: {{ search: '' }} }};
      require({json.dumps(str(datei))});
      const d = (global.window.MosaI18n || {{}}).DICT || {{}};
      const raus = {{}};
      for (const l of Object.keys(d)) raus[l] = Object.keys(d[l]);
      console.log(JSON.stringify(raus));
    '''
    r = subprocess.run([str(NODE), '-e', skript], capture_output=True, text=True)
    if r.returncode != 0:
        erste = [z for z in r.stderr.split('\n') if z.strip()][:3]
        befund('Sprachen', 'app-i18n.js lädt nicht: ' + kurz(erste))
        return
    try:
        dicts = json.loads(r.stdout.strip().split('\n')[-1])
    except Exception as e:
        befund('Sprachen', f'Antwort nicht lesbar: {e}')
        return

    erwartet = {'de', 'fr', 'it', 'es', 'en'}
    fehlend = erwartet - set(dicts)
    if fehlend:
        befund('Sprachen', 'fehlende Sprachen: ' + ', '.join(sorted(fehlend)))
        return

    leit = set(dicts['de'])
    for lang in sorted(erwartet - {'de'}):
        fehlt = leit - set(dicts[lang])
        if fehlt:
            zeig = sorted(fehlt)[:6]
            mehr = f' … und {len(fehlt) - 6} weitere' if len(fehlt) > 6 else ''
            befund('Sprachen',
                   f'{lang}: {len(fehlt)} Schlüssel fehlen — '
                   + ', '.join(zeig) + mehr)
    print(f'  5 Sprachen, {len(leit)} Schlüssel')


# ------------------------------------------------------------ Sync-Typen
def pruefe_synctypen():
    """Jeder MosaDB.push-Typ muss in db-sync.js behandelt werden.

    Ein unbekannter Typ wirft zur Laufzeit, landet in der Warteschlange
    und wird nach fünf Versuchen aufgegeben — die Daten sind dann weg.
    """
    sync = (APP / 'db-sync.js').read_text(encoding='utf-8')
    behandelt = set(re.findall(r"type\s*===\s*'([a-z_]+)'", sync))

    benutzt = {}
    for f in sorted(APP.glob('*.js')) + sorted(APP.glob('*.html')):
        if f.name == 'db-sync.js':
            continue
        for m in re.finditer(r"MosaDB\??\.?push\(\s*'([a-z_]+)'", f.read_text(encoding='utf-8')):
            benutzt.setdefault(m.group(1), set()).add(f.name)

    for typ, wo in sorted(benutzt.items()):
        if typ not in behandelt:
            befund('Sync', f"'{typ}' wird geschoben ({', '.join(sorted(wo))}), "
                           f'aber db-sync.js kennt den Typ nicht')
    print(f'  {len(benutzt)} Sync-Typen benutzt, {len(behandelt)} behandelt')


# --------------------------------------------------------- Cache-Version
def pruefe_cache_versionen():
    """Geänderte Dateien brauchen eine neue ?v= Nummer.

    Verglichen wird gegen den letzten Commit: was sich geändert hat, muss
    entweder selbst eine neue Version tragen oder in einer HTML-Datei mit
    erhöhter Nummer verwiesen werden.
    """
    r = subprocess.run(['git', 'diff', '--name-only', 'HEAD'],
                       cwd=WURZEL, capture_output=True, text=True)
    geaendert = {pathlib.Path(z).name for z in r.stdout.split('\n')
                 if z.startswith('app/') and z.endswith(('.js', '.css'))}
    if not geaendert:
        print('  keine ungesicherten Änderungen an JS/CSS')
        return

    # Welche Versionen stehen jetzt in den HTML-Dateien, welche vorher?
    def versionen(text):
        return dict(re.findall(r'([\w.-]+\.(?:js|css))\?v=(\d+)', text))

    jetzt, vorher = {}, {}
    for html in APP.glob('*.html'):
        jetzt.update(versionen(html.read_text(encoding='utf-8')))
        alt = subprocess.run(['git', 'show', f'HEAD:app/{html.name}'],
                             cwd=WURZEL, capture_output=True, text=True)
        if alt.returncode == 0:
            vorher.update(versionen(alt.stdout))

    for name in sorted(geaendert):
        if name not in jetzt:
            continue   # ohne ?v= verwiesen, etwa die aufgeteilten app-*.js
        if jetzt.get(name) == vorher.get(name):
            befund('Cache', f'{name} wurde geändert, aber ?v={jetzt[name]} '
                            f'blieb gleich — der Besucher sieht den alten Stand')
    print(f'  {len(geaendert)} geänderte Datei(en) auf Cache-Version geprüft')


# ------------------------------------------------------------ Migrationen
def pruefe_migrationen():
    """Zwei Migrationen mit derselben Versionsnummer vertragen sich nicht."""
    ordner = WURZEL / 'supabase' / 'migrations'
    if not ordner.exists():
        return
    nummern = {}
    for f in ordner.glob('*.sql'):
        nr = f.name.split('_')[0]
        nummern.setdefault(nr, []).append(f.name)
    for nr, dateien in sorted(nummern.items()):
        if len(dateien) > 1:
            befund('Migration', f'Version {nr} doppelt vergeben: '
                                + ', '.join(sorted(dateien)))
    print(f'  {len(list(ordner.glob("*.sql")))} Migrationen geprüft')


# ------------------------------------------------------------------ Lauf
def main():
    print('App prüfen\n')
    for name, fn in [('Syntax', pruefe_syntax),
                     ('Sprachen', pruefe_sprachen),
                     ('Sync-Typen', pruefe_synctypen),
                     ('Cache-Versionen', pruefe_cache_versionen),
                     ('Migrationen', pruefe_migrationen)]:
        print(f'→ {name}')
        try:
            fn()
        except Exception as e:
            befund(name, f'Prüfung selbst fehlgeschlagen: {e}')
        print()

    for h in hinweise:
        print(f'Hinweis: {h}')

    if not befunde:
        print('Alles sauber.')
        return 0
    print(f'{len(befunde)} Befund(e):\n')
    for bereich, text in befunde:
        print(f'  [{bereich}] {text}')
    return 1


if __name__ == '__main__':
    sys.exit(main())
