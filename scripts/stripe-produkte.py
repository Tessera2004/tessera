#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Stripe-Produkte und -Preise aus stripe-config.js anlegen
=========================================================
Legt für Basis, jedes Modul und das Komplettpaket ein Produkt mit einem
monatlichen Preis an — mit genau den lookup_keys, die die Edge Function
`create-checkout` erwartet (`mosaos_base`, `mosaos_<modul>`,
`mosaos_komplett`).

Wichtig zum Vorgehen in Stripe:
  · Ein bestehender Preis lässt sich NICHT ändern. Bei einer Preisanpassung
    wird ein neuer Preis erzeugt und der alte deaktiviert. Der lookup_key
    wandert dabei mit, damit der Checkout weiter funktioniert.
  · Test- und Live-Modus sind getrennte Welten. Was im Test existiert,
    gibt es im Live-Konto nicht. Deshalb dieses Skript zweimal laufen
    lassen — einmal mit dem Test-, einmal mit dem Live-Schlüssel.

Der Schlüssel steht nirgends im Repo. Das Skript fragt ihn beim Start
ab (verdeckte Eingabe), oder nimmt STRIPE_SECRET_KEY aus der Umgebung:

    python3 scripts/stripe-produkte.py --trocken   # nur anzeigen
    python3 scripts/stripe-produkte.py             # wirklich anlegen

Für das echte Konto denselben Aufruf mit dem sk_live_-Schlüssel.
"""
import os, sys, re, json, ssl, getpass, urllib.parse, urllib.request


def ssl_kontext():
    """Das Python von python.org bringt keine Wurzelzertifikate mit —
       ohne diesen Schritt scheitert jeder Aufruf an Stripe mit
       CERTIFICATE_VERIFY_FAILED. certifi zuerst, sonst der Speicher
       von macOS."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    if os.path.exists('/etc/ssl/cert.pem'):
        return ssl.create_default_context(cafile='/etc/ssl/cert.pem')
    return ssl.create_default_context()


SSL = ssl_kontext()

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(WURZEL, 'app', 'stripe-config.js')
API    = 'https://api.stripe.com/v1'
WAEHRUNG = 'chf'

TROCKEN = '--trocken' in sys.argv

def schluessel_holen():
    """Aus der Umgebung — und sonst nachfragen. Die Eingabe ist
       verdeckt und landet weder im Verlauf der Kommandozeile noch in
       einer Datei."""
    k = os.environ.get('STRIPE_SECRET_KEY', '').strip()
    if k:
        return k
    print('Stripe-Geheimschlüssel eingeben (die Eingabe bleibt unsichtbar).')
    print('Zu finden im Stripe-Dashboard unter API-Schlüssel — beginnt mit sk_test_ oder sk_live_.\n')
    sys.stdout.flush()          # sonst erscheint die Eingabezeile vor dem Hinweis
    try:
        return getpass.getpass('Schlüssel: ').strip()
    except (EOFError, KeyboardInterrupt):
        raise SystemExit('\nAbgebrochen.')


SCHLUESSEL = ''


def preise_lesen():
    """Basis, Module und Paket aus stripe-config.js holen — eine Quelle."""
    s = open(CONFIG, encoding='utf-8').read()
    basis = int(re.search(r'basePriceChf:\s*(\d+)', s).group(1))
    module = [{'key': k, 'label': l, 'chf': int(p)} for k, l, p in
              re.findall(r"\{\s*key:\s*'([^']+)',\s*label:\s*'([^']+)',\s*priceChf:\s*(\d+)", s)]
    sitz_m = re.search(r'seatPriceChf:\s*(\d+)', s)
    sitz = int(sitz_m.group(1)) if sitz_m else None
    k = re.search(r"komplett:\s*\{[^}]*label:\s*'([^']+)'[^}]*priceChf:\s*(\d+)", s)
    paket = {'key': 'komplett', 'label': k.group(1), 'chf': int(k.group(2))} if k else None
    # Basis-Eintrag steckt nicht in der Modulliste
    module = [m for m in module if m['key'] != 'komplett']
    return basis, module, paket, sitz


def ruf(pfad, daten=None, methode=None):
    url = API + pfad
    kopf = {'Authorization': 'Bearer ' + SCHLUESSEL,
            'Content-Type': 'application/x-www-form-urlencoded'}
    koerper = urllib.parse.urlencode(daten, doseq=True).encode() if daten else None
    anfrage = urllib.request.Request(url, data=koerper, headers=kopf,
                                     method=methode or ('POST' if daten else 'GET'))
    try:
        with urllib.request.urlopen(anfrage, context=SSL) as a:
            return json.loads(a.read().decode())
    except urllib.error.HTTPError as e:
        fehler = json.loads(e.read().decode()).get('error', {})
        raise SystemExit(f"Stripe meldet: {fehler.get('message', e)}")


def produkt_finden(name):
    for p in ruf('/products?limit=100&active=true').get('data', []):
        if p['name'] == name:
            return p
    return None


def preis_mit_key(lookup):
    d = ruf('/prices?limit=100&active=true&lookup_keys[]=' + urllib.parse.quote(lookup))
    return (d.get('data') or [None])[0]


# Sammelt lookup_key → price_id, damit am Ende das fertige STRIPE_PRICE_MAP
# ausgegeben werden kann. Ohne dieses Secret bricht create-checkout ab.
PREIS_IDS = {}


def sicherstellen(name, lookup, chf):
    """Produkt + monatlicher Preis. Stimmt der Betrag schon, passiert nichts."""
    rappen = chf * 100
    vorhanden = preis_mit_key(lookup)
    if vorhanden and vorhanden['unit_amount'] == rappen and vorhanden['currency'] == WAEHRUNG:
        PREIS_IDS[lookup] = vorhanden['id']
        print(f'  = {name:<24} CHF {chf:>3}  (unverändert)')
        return

    produkt = produkt_finden(name)
    if TROCKEN:
        was = 'Preis ändern' if vorhanden else ('neuer Preis' if produkt else 'Produkt + Preis anlegen')
        print(f'  → {name:<24} CHF {chf:>3}  ({was})')
        return

    if not produkt:
        produkt = ruf('/products', {'name': name})

    # Reihenfolge ist wichtig: Stripe lässt einen Preis nicht archivieren,
    # solange er der Standardpreis seines Produkts ist. Also erst den
    # neuen Preis anlegen — mit transfer_lookup_key wandert der
    # lookup_key dabei automatisch mit —, dann den neuen zum Standard
    # machen, und erst danach den alten stilllegen.
    neuer = ruf('/prices', {
        'product': produkt['id'],
        'unit_amount': rappen,
        'currency': WAEHRUNG,
        'recurring[interval]': 'month',
        'lookup_key': lookup,
        'transfer_lookup_key': 'true' if vorhanden else 'false',
        'nickname': f'{name} · monatlich',
    })
    PREIS_IDS[lookup] = neuer['id']
    ruf(f"/products/{produkt['id']}", {'default_price': neuer['id']})
    if vorhanden:
        ruf(f"/prices/{vorhanden['id']}", {'active': 'false'})

    print(f'  ✓ {name:<24} CHF {chf:>3}  ({"aktualisiert" if vorhanden else "neu"})')


def main():
    global SCHLUESSEL
    SCHLUESSEL = schluessel_holen()
    if not SCHLUESSEL:
        raise SystemExit('Kein Schlüssel eingegeben — nichts geändert.')
    if not SCHLUESSEL.startswith('sk_'):
        raise SystemExit('Das sieht nicht nach einem Geheimschlüssel aus (erwartet: sk_test_… oder sk_live_…).')

    modus = 'LIVE — echtes Geld' if SCHLUESSEL.startswith('sk_live_') else 'Test/Sandbox'
    basis, module, paket, sitz = preise_lesen()
    print(f'Konto: {modus}{"  [nur Vorschau]" if TROCKEN else ""}\n')

    sicherstellen('MosaOS Basis', 'mosaos_base', basis)
    for m in module:
        sicherstellen(m['label'], 'mosaos_' + m['key'], m['chf'])
    if paket:
        sicherstellen('MosaOS ' + paket['label'], 'mosaos_komplett', paket['chf'])
    # Preis je Mitarbeitendem. Wird im Abo mit einer Menge gebucht, alle
    # anderen Positionen immer mit Menge 1.
    if sitz:
        sicherstellen('MosaOS Mitarbeitende', 'mosaos_mitarbeiter', sitz)

    gesamt = basis + sum(m['chf'] for m in module)
    print(f'\nEinzeln alles: CHF {gesamt}/Monat'
          + (f'  ·  Komplett: CHF {basis + paket["chf"]}/Monat' if paket else '')
          + (f'  ·  je Mitarbeitendem: CHF {sitz}/Monat' if sitz else ''))
    if TROCKEN:
        print('\nNichts geändert. Ohne --trocken erneut ausführen.')
        return

    # Fertiges Secret ausgeben. Die Edge Function create-checkout liest es als
    # STRIPE_PRICE_MAP; die Schlüssel heissen dort 'base' und die Modul-Keys.
    karte = {}
    for lookup, pid in PREIS_IDS.items():
        karte[lookup[len('mosaos_'):] if lookup.startswith('mosaos_') else lookup] = pid
    print('\n' + '=' * 62)
    print('STRIPE_PRICE_MAP — als Secret in Supabase eintragen')
    print('  Dashboard → Edge Functions → Secrets → Name: STRIPE_PRICE_MAP')
    print('=' * 62)
    print(json.dumps(karte, separators=(',', ':')))


if __name__ == '__main__':
    main()
