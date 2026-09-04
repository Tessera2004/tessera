#!/usr/bin/env python3
"""
============================================================
MosaOS — Stripe-Konfiguration pruefen (kostet nichts)

Beantwortet ohne einen einzigen Franken Umsatz die Frage:
"Wuerde der Checkout jetzt funktionieren?"

Geprueft wird:
  1. Ist der Schluessel LIVE oder Sandbox?
  2. Existiert jede Price-ID aus STRIPE_PRICE_MAP in DIESEM Konto?
     (Das ist der haeufigste Fehler: Sandbox-IDs mit Live-Schluessel.)
  3. Stimmen Betrag, Waehrung und monatliche Wiederholung?
  4. Fehlt ein Modul, das die App anbietet?
  5. Ist das Konto ueberhaupt aktiviert — kann es Zahlungen annehmen
     und auszahlen? (Preise und Webhooks nuetzen nichts, solange Stripe
     die Angaben zum Unternehmen nicht geprueft hat.)
  6. Zeigt ein aktiver Webhook auf die richtige Adresse,
     mit den fuenf Ereignissen, die der Code braucht?
     ('invoice.upcoming' gehoert dazu: ohne dieses Ereignis wird die
      Zahl der Mitarbeitenden nie nachgefuehrt und die CHF 4 pro Kopf
      bleiben fuer immer auf dem Stand vom Kauftag.)

Aufruf:
    python3 scripts/stripe-pruefen.py
Die Price-Map wird abgefragt (oder aus STRIPE_PRICE_MAP gelesen),
der Schluessel ebenso. Es wird nichts angelegt und nichts geaendert.
============================================================
"""
import os, sys, re, json, ssl, getpass, urllib.parse, urllib.request

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
WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(WURZEL, 'app', 'stripe-config.js')
API = 'https://api.stripe.com/v1'
WAEHRUNG = 'chf'
WEBHOOK_ZIEL = 'functions/v1/stripe-webhook'
NOETIGE_EVENTS = {'checkout.session.completed', 'customer.subscription.created',
                  'customer.subscription.updated', 'customer.subscription.deleted',
                  'invoice.upcoming'}
SCHLUESSEL = ''

def ruf(pfad):
    anfrage = urllib.request.Request(API + pfad, headers={'Authorization': 'Bearer ' + SCHLUESSEL})
    try:
        with urllib.request.urlopen(anfrage, context=SSL) as a:
            return json.loads(a.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return {'_fehler': json.loads(e.read().decode()).get('error', {}).get('message', str(e))}
        except Exception:
            return {'_fehler': str(e)}

def preise_lesen():
    s = open(CONFIG, encoding='utf-8').read()
    basis = int(re.search(r'basePriceChf:\s*(\d+)', s).group(1))
    module = [{'key': k, 'chf': int(p)} for k, l, p in
              re.findall(r"\{\s*key:\s*'([^']+)',\s*label:\s*'([^']+)',\s*priceChf:\s*(\d+)", s)]
    k = re.search(r"komplett:\s*\{[^}]*priceChf:\s*(\d+)", s)
    erwartet = {'base': basis}
    for m in module:
        if m['key'] != 'komplett':
            erwartet[m['key']] = m['chf']
    if k:
        erwartet['komplett'] = int(k.group(1))
    return erwartet

def main():
    global SCHLUESSEL
    SCHLUESSEL = os.environ.get('STRIPE_SECRET_KEY', '').strip()
    if not SCHLUESSEL:
        print('Stripe-Geheimschlüssel eingeben (die Eingabe bleibt unsichtbar).')
        print('Es wird NUR gelesen — nichts angelegt, nichts geändert.\n')
        sys.stdout.flush()
        try:
            SCHLUESSEL = getpass.getpass('Schlüssel: ').strip()
        except (EOFError, KeyboardInterrupt):
            raise SystemExit('\nAbgebrochen.')
    if not SCHLUESSEL.startswith('sk_'):
        raise SystemExit('Das sieht nicht nach einem Geheimschlüssel aus (erwartet: sk_live_… oder sk_test_…).')

    live = SCHLUESSEL.startswith('sk_live_')
    print(f'\nKonto: {"LIVE — echtes Geld" if live else "Test/Sandbox"}')

    roh = os.environ.get('STRIPE_PRICE_MAP', '').strip()
    if not roh:
        print('\nSTRIPE_PRICE_MAP einfügen (die Zeile aus dem Supabase-Secret, mit Klammern):')
        sys.stdout.flush()
        roh = sys.stdin.readline().strip()
    try:
        karte = json.loads(roh)
    except Exception as e:
        raise SystemExit(f'Das ist kein gültiges JSON ({e}). Fehlen die geschweiften Klammern?')

    erwartet = preise_lesen()
    fehler = 0

    print('\nPreise')
    for key, chf in erwartet.items():
        pid = karte.get(key)
        if not pid:
            print(f'  ✗ {key:<16} fehlt in der Price-Map'); fehler += 1; continue
        p = ruf('/prices/' + urllib.parse.quote(pid))
        if '_fehler' in p:
            print(f'  ✗ {key:<16} ID nicht in diesem Konto — {p["_fehler"][:70]}'); fehler += 1; continue
        probleme = []
        if not p.get('active'): probleme.append('inaktiv')
        if p.get('currency') != WAEHRUNG: probleme.append('Währung ' + str(p.get('currency')).upper())
        if (p.get('recurring') or {}).get('interval') != 'month': probleme.append('nicht monatlich')
        if p.get('unit_amount') != chf * 100:
            probleme.append(f'CHF {(p.get("unit_amount") or 0)/100:g} statt {chf}')
        if probleme:
            print(f'  ✗ {key:<16} ' + ', '.join(probleme)); fehler += 1
        else:
            print(f'  ✓ {key:<16} CHF {chf:>3}/Monat')

    unbekannt = [k for k in karte if k not in erwartet]
    if unbekannt:
        print('  ! Zusätzlich in der Karte, von der App nicht genutzt: ' + ', '.join(unbekannt))

    # Ein Konto kann Preise und Webhooks haben und trotzdem kein Geld annehmen:
    # Solange Stripe die Angaben zum Unternehmen nicht geprueft hat, steht
    # charges_enabled auf false. Der Checkout scheitert dann beim Kunden.
    print('\nKonto-Aktivierung')
    konto = ruf('/account')
    if konto:
        annehmen = konto.get('charges_enabled')
        auszahlen = konto.get('payouts_enabled')
        print(f'  {"✓" if annehmen else "✗"} Zahlungen annehmen: '
              + ('ja' if annehmen else 'NEIN — der Checkout scheitert beim Kunden'))
        print(f'  {"✓" if auszahlen else "✗"} Auszahlungen: '
              + ('ja' if auszahlen else 'NEIN — Geld kommt nicht auf dein Konto'))
        if not annehmen: fehler += 1
        if not auszahlen: fehler += 1
        offen = (konto.get('requirements') or {})
        faellig = (offen.get('currently_due') or []) + (offen.get('past_due') or [])
        if faellig:
            print('  ✗ Stripe fehlen noch diese Angaben:')
            for x in faellig[:12]:
                print('      ' + x)
            if len(faellig) > 12: print(f'      … und {len(faellig)-12} weitere')
            fehler += 1
        frist = offen.get('current_deadline')
        if frist:
            import datetime
            print('  ! Frist: ' + datetime.datetime.fromtimestamp(frist).strftime('%d.%m.%Y'))

    print('\nWebhook')
    endpunkte = ruf('/webhook_endpoints?limit=100')
    passende = [e for e in endpunkte.get('data', []) if WEBHOOK_ZIEL in (e.get('url') or '')]
    if not passende:
        print('  ✗ kein Endpunkt zeigt auf ' + WEBHOOK_ZIEL); fehler += 1
    for e in passende:
        aktiv = e.get('status') == 'enabled'
        events = set(e.get('enabled_events') or [])
        fehlend = NOETIGE_EVENTS - events if '*' not in events else set()
        print(f'  {"✓" if aktiv else "✗"} {e.get("url")}  ({e.get("status")})')
        if not aktiv: fehler += 1
        if fehlend:
            print('    ✗ fehlende Ereignisse: ' + ', '.join(sorted(fehlend))); fehler += 1

    print()
    if fehler:
        print(f'{fehler} Problem(e) gefunden — der Checkout würde jetzt scheitern.')
        sys.exit(1)
    print('Alles stimmig. Der Checkout würde jetzt funktionieren'
          + (' — mit echtem Geld.' if live else ' (Sandbox).'))

if __name__ == '__main__':
    main()
