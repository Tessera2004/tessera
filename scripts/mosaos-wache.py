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
if warnungen:
    print('HANDLUNGSBEDARF:')
    for w in warnungen: print('  ! ' + w)
elif befunde:
    print('AUFFAELLIG:')
    for b in befunde: print('  → ' + b)
else:
    print('Alles unauffaellig. Nichts zu tun.')
sys.exit(1 if warnungen else 0)
