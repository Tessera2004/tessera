#!/usr/bin/env python3
"""
============================================================
MosaOS — taegliche Kontrolle

Prueft, was ohne Anmeldung pruefbar ist, und sagt ehrlich, was es NICHT
sehen kann. Antwortet nie auf irgendetwas, aendert nichts — es meldet nur.

Aufruf:   python3 scripts/mosaos-wache.py
Mit Stripe-Zahlen: STRIPE_READONLY_KEY=rk_live_... python3 scripts/mosaos-wache.py
============================================================
"""
import os, sys, ssl, json, socket, urllib.request, urllib.error
from datetime import datetime, timezone

# Die Kontrolle laeuft mehrmals taeglich. Ohne Gedaechtnis wuerde sie jedes Mal
# dasselbe melden und nach drei Tagen ignoriert. Deshalb wird der letzte Befund
# gespeichert und beim naechsten Lauf verglichen — gemeldet wird die Aenderung.
ZUSTAND = os.path.expanduser('~/.mosaos-wache.json')

def zustand_lesen():
    try:
        return json.load(open(ZUSTAND, encoding='utf-8'))
    except Exception:
        return {}

def zustand_schreiben(d):
    try:
        json.dump(d, open(ZUSTAND, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    except Exception:
        pass

DOMAIN = 'mosaos.ch'
SUPA = 'https://kxhsroiholjnyisaystr.supabase.co/functions/v1'
SEITEN = ['/', '/reinigung', '/werkstatt', '/handwerk', '/garten',
          '/schaedlingsbekaempfung', '/anfrage', '/sitemap.xml', '/robots.txt', '/llms.txt']

def ssl_kontext():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    if os.path.exists('/etc/ssl/cert.pem'):
        return ssl.create_default_context(cafile='/etc/ssl/cert.pem')
    return ssl.create_default_context()

SSL = ssl_kontext()
befunde, warnungen = [], []

# Cloudflare weist Anfragen ohne Browser-Kennung mit 403 ab. Ohne diese Zeile
# meldet die Kontrolle jeden Morgen faelschlich, die Website sei kaputt.
KENNUNG = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' \
          '(KHTML, like Gecko) Chrome/128.0 Safari/537.36 MosaOS-Kontrolle'

def hole(url, methode='GET', kopf=None, daten=None, zeit=25):
    k = {'User-Agent': KENNUNG}
    k.update(kopf or {})
    a = urllib.request.Request(url, method=methode, headers=k, data=daten)
    try:
        with urllib.request.urlopen(a, context=SSL, timeout=zeit) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b''
    except Exception as e:
        return None, str(e).encode()

print(f'MosaOS — Kontrolle {datetime.now().strftime("%d.%m.%Y %H:%M")}\n')

# ---------- Website ----------
print('Website')
kaputt = []
for p in SEITEN:
    code, _ = hole(f'https://{DOMAIN}{p}')
    if code != 200:
        kaputt.append(f'{p} → {code}')
if kaputt:
    warnungen.append('Seiten antworten nicht mit 200: ' + ', '.join(kaputt))
    print('  ✗ ' + ', '.join(kaputt))
else:
    print(f'  ✓ alle {len(SEITEN)} geprueften Seiten erreichbar')

# 404 muss ein echter 404 sein
code, _ = hole(f'https://{DOMAIN}/gibt-es-nicht-{datetime.now().timestamp():.0f}')
if code != 404:
    warnungen.append(f'Unbekannte Adressen liefern {code} statt 404')
    print(f'  ✗ unbekannte Adresse liefert {code} statt 404')

# ---------- Zertifikat ----------
try:
    with socket.create_connection((DOMAIN, 443), timeout=10) as s:
        with SSL.wrap_socket(s, server_hostname=DOMAIN) as ss:
            ende = datetime.strptime(ss.getpeercert()['notAfter'], '%b %d %H:%M:%S %Y %Z').replace(tzinfo=timezone.utc)
    tage = (ende - datetime.now(timezone.utc)).days
    print(f'  ✓ Zertifikat noch {tage} Tage gueltig')
    if tage < 21:
        warnungen.append(f'Zertifikat laeuft in {tage} Tagen ab')
except Exception as e:
    warnungen.append(f'Zertifikat nicht pruefbar: {e}')

# ---------- Bezahlung ----------
print('\nBezahlung')
code, _ = hole(f'{SUPA}/create-checkout', 'POST', {'Content-Type': 'application/json'}, b'{}')
print(f'  {"✓" if code == 401 else "✗"} Checkout antwortet ({code}; 401 = erwartet ohne Login)')
if code != 401:
    warnungen.append(f'Checkout antwortet mit {code} statt 401')
code, _ = hole(f'{SUPA}/stripe-webhook', 'POST', None, b'{}')
print(f'  {"✓" if code == 400 else "✗"} Webhook antwortet ({code}; 400 = erwartet ohne Signatur)')
if code != 400:
    warnungen.append(f'Stripe-Webhook antwortet mit {code} statt 400')

# ---------- Stripe-Zahlen (nur mit Lese-Schluessel) ----------
schluessel = os.environ.get('STRIPE_READONLY_KEY', '').strip()
if schluessel:
    print('\nStripe')
    for name, pfad in [('Aktive Abos', '/subscriptions?status=active&limit=100'),
                       ('Kunden', '/customers?limit=100')]:
        code, roh = hole('https://api.stripe.com/v1' + pfad, kopf={'Authorization': 'Bearer ' + schluessel})
        if code == 200:
            n = len(json.loads(roh).get('data', []))
            print(f'  {name}: {n}')
            if name == 'Aktive Abos' and n > 0:
                befunde.append(f'{n} aktive(s) Abo — im Stripe-Dashboard nachsehen')
        else:
            warnungen.append(f'Stripe {name} nicht lesbar (HTTP {code})')
else:
    print('\nStripe: uebersprungen (kein STRIPE_READONLY_KEY gesetzt)')

# ---------- Was diese Kontrolle NICHT sieht ----------
print('\nNicht geprueft — dort musst du selbst nachschauen:')
for z in ['LinkedIn: Follower, Kommentare, Nachrichten (blockt automatisierte Abrufe)',
          'E-Mail-Postfach info@mosaos.ch',
          'Google Search Console und Bing Webmaster Tools',
          'Anfragen aus dem Website-Formular (braucht Supabase-Zugang)']:
    print('  · ' + z)

# ---------- Fazit ----------
print()
vorher = zustand_lesen()
jetzt = {
    'warnungen': sorted(warnungen),
    'befunde': sorted(befunde),
    'stand': datetime.now().isoformat(timespec='minutes'),
}

neue_warnungen = [w for w in jetzt['warnungen'] if w not in vorher.get('warnungen', [])]
behoben = [w for w in vorher.get('warnungen', []) if w not in jetzt['warnungen']]
neue_befunde = [b for b in jetzt['befunde'] if b not in vorher.get('befunde', [])]

if warnungen:
    print('HANDLUNGSBEDARF:')
    for w in warnungen:
        print(('  ! NEU: ' if w in neue_warnungen else '  ! (bekannt) ') + w)
if behoben:
    print('BEHOBEN seit dem letzten Lauf:')
    for b in behoben: print('  ✓ ' + b)
if befunde:
    print('AUFFAELLIG:')
    for b in befunde:
        print(('  → NEU: ' if b in neue_befunde else '  → (bekannt) ') + b)
if not warnungen and not befunde and not behoben:
    letzter = vorher.get('stand', 'unbekannt')
    print(f'Alles unauffaellig. Unveraendert seit dem letzten Lauf ({letzter}).')

# Fuer die Meldung: nur bei echter Aenderung lohnt sich ein Hinweis an Brian
aenderung = bool(neue_warnungen or behoben or neue_befunde)
print(f'\nAENDERUNG_SEIT_LETZTEM_LAUF: {"ja" if aenderung else "nein"}')

zustand_schreiben(jetzt)

# --- Damit die Meldung Brian auch wirklich erreicht ---------------------
# Die Kontrolle laeuft im Hintergrund. Ohne die beiden folgenden Wege stuende
# das Ergebnis nur in einer Sitzung, in die man hineinschauen muss — ein
# Waechter, dessen Meldung niemand findet, ist keiner.

# 1) Logbuch: eine Zeile pro Lauf, zum Nachlesen wann was war.
try:
    with open(os.path.expanduser('~/mosaos-kontrolle.log'), 'a', encoding='utf-8') as f:
        stand = 'PROBLEM' if warnungen else ('auffaellig' if befunde else 'ok')
        zusatz = ''
        if neue_warnungen: zusatz = ' | NEU: ' + '; '.join(neue_warnungen)
        elif behoben:      zusatz = ' | BEHOBEN: ' + '; '.join(behoben)
        elif neue_befunde: zusatz = ' | NEU: ' + '; '.join(neue_befunde)
        f.write(f"{datetime.now():%Y-%m-%d %H:%M}  {stand}{zusatz}\n")
except Exception:
    pass

# 2) Mitteilung auf dem Mac — nur bei echter Aenderung. Vier stille Hinweise
#    pro Tag wuerden dazu fuehren, dass auch der fuenfte weggeklickt wird.
if aenderung:
    try:
        import subprocess, shlex
        if warnungen:
            titel, text = 'MosaOS: Handlungsbedarf', (neue_warnungen or warnungen)[0]
        elif behoben:
            titel, text = 'MosaOS: wieder in Ordnung', behoben[0]
        else:
            titel, text = 'MosaOS: neue Beobachtung', neue_befunde[0]
        text = text[:180]
        subprocess.run(['osascript', '-e',
            f'display notification {shlex.quote(text)} with title {shlex.quote(titel)}'],
            timeout=10, capture_output=True)
    except Exception:
        pass

sys.exit(1 if warnungen else 0)
