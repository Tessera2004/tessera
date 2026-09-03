#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sprachfassungen der Website erzeugen
=====================================
Bisher lief die Übersetzung nur im Browser: eine Seite, fünf Sprachen,
eine URL. Suchmaschinen sehen davon nur Deutsch — vier Fünftel der
Übersetzungsarbeit waren unsichtbar.

Dieses Skript erzeugt echte Seiten unter /fr/, /it/, /es/ und /en/.
Der Trick: die Seite wird in Chromium geladen und dort mit der
vorhandenen Übersetzung umgeschaltet (MOSAOS_I18N.apply). Danach wird
das fertige HTML herausgeschrieben. So gibt es keine zweite Quelle für
Texte — es bleibt bei i18n.js.

Danach wird nachbearbeitet:
  · <html lang> und og:locale
  · canonical auf die Sprachfassung
  · hreflang-Verweise auf alle fünf Fassungen + x-default
  · relative Pfade auf absolute, weil die Seite im Unterordner liegt
  · Sprachumschalter wird zu echten Verweisen statt Klick-Umschaltung
  · FAQPage-Schema aus dem übersetzten Text erzeugt

Deutsch bleibt an der Wurzel und bekommt nur hreflang und das Schema.

Aufruf: python3 scripts/sprachen-bauen.py
"""
import os, re, io, json, html, shutil
from playwright.sync_api import sync_playwright

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASIS  = 'https://mosaos.pages.dev'
# Ohne Server: die deutschen Quellen nutzen relative Pfade und laufen
# deshalb auch über file:// . Das macht den Bauschritt unabhängig
# von einer laufenden Vorschau.
QUELLE = 'file://' + WURZEL

SPRACHEN = ['de', 'fr', 'it', 'es', 'en']
LOCALE   = {'de': 'de_CH', 'fr': 'fr_CH', 'it': 'it_CH', 'es': 'es_ES', 'en': 'en_GB'}

# Nur die Marketingseiten bekommen Sprachfassungen. Die Rechtsseiten
# bleiben deutsch — deren Übersetzung ist eine juristische Frage,
# keine technische.
# branchen.html fehlt hier bewusst: die Seite hat keine data-i18n-Texte,
# es gibt also nichts zu übersetzen. Eine Seite ohne Übersetzung darf
# keine Sprachalternativen behaupten.
SEITEN = ['index.html', 'werkstatt.html', 'handwerk.html', 'garten.html',
          'reinigung.html', 'schaedlingsbekaempfung.html',
          'ueber-uns.html', 'anfrage.html']

FRAGEN = ['preis', 'test', 'daten', 'mobil', 'qr', 'setup']


def url_fuer(seite, lang):
    pfad = '' if seite == 'index.html' else seite
    return f'{BASIS}/' + ('' if lang == 'de' else f'{lang}/') + pfad


def hreflang_block(seite):
    zeilen = []
    for l in SPRACHEN:
        zeilen.append(f'  <link rel="alternate" hreflang="{l}" href="{url_fuer(seite, l)}" />')
    zeilen.append(f'  <link rel="alternate" hreflang="x-default" href="{url_fuer(seite, "de")}" />')
    return '\n'.join(zeilen) + '\n'


def faq_schema(seite_html):
    """Fragen und Antworten aus dem bereits übersetzten HTML lesen."""
    eintraege = []
    for f in FRAGEN:
        mf = re.search(rf'data-i18n="faq\.{f}\.f"[^>]*>(.*?)</h3>', seite_html, re.S)
        ma = re.search(rf'data-i18n="faq\.{f}\.a"[^>]*>(.*?)</p>', seite_html, re.S)
        if not (mf and ma):
            continue
        frage = html.unescape(re.sub(r'<[^>]+>', '', mf.group(1))).strip()
        antwort = html.unescape(re.sub(r'<[^>]+>', '', ma.group(1))).strip()
        eintraege.append({'@type': 'Question', 'name': frage,
                          'acceptedAnswer': {'@type': 'Answer', 'text': antwort}})
    if not eintraege:
        return ''
    daten = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': eintraege}
    return ('  <script type="application/ld+json">\n  '
            + json.dumps(daten, ensure_ascii=False, indent=2).replace('\n', '\n  ')
            + '\n  </script>\n')


def pfade_absolut(s):
    """Relative Verweise absolut machen — die Seite liegt im Unterordner."""
    def ersetze(m):
        attr, wert = m.group(1), m.group(2)
        if re.match(r'^(https?:|//|/|#|mailto:|tel:|data:)', wert):
            return m.group(0)
        return f'{attr}="/{wert}"'
    return re.sub(r'\b(href|src)="([^"]+)"', ersetze, s)


def seitenlinks_in_sprache(s, lang):
    """Verweise auf andere Marketingseiten bleiben in derselben Sprache."""
    if lang == 'de':
        return s
    for seite in SEITEN:
        s = s.replace(f'href="/{seite}"', f'href="/{lang}/{seite}"')
    s = s.replace('href="/index.html#', f'href="/{lang}/index.html#')
    return s


def umschalter_zu_links(s, seite, lang):
    """Der Umschalter schaltete per Klick um. Jetzt sind es Verweise —
       nur so kann eine Suchmaschine den Sprachfassungen folgen."""
    def bau(m):
        knoepfe = []
        for l in SPRACHEN:
            ziel = ('/' if l == 'de' else f'/{l}/') + ('' if seite == 'index.html' else seite)
            aktiv = ' active' if l == lang else ''
            knoepfe.append(f'<a href="{ziel}" hreflang="{l}" class="lang-link{aktiv}">{l.upper()}</a>')
        return '<div class="lang-switch">' + ''.join(knoepfe) + '</div>'
    return re.sub(r'<div class="lang-switch">.*?</div>', bau, s, flags=re.S)


UMSCHALTER_STIL = """  <style>
    /* Sprachumschalter: echte Verweise statt Klick-Umschaltung */
    .lang-switch .lang-link {
      display:inline-flex; align-items:center; justify-content:center;
      padding:5px 9px; border-radius:6px; font-size:11px; font-weight:600;
      color:var(--text-subtle); text-decoration:none; transition:all .2s var(--ease);
    }
    .lang-switch .lang-link:hover { color:var(--text); }
    .lang-switch .lang-link.active { background:var(--swiss); color:var(--swiss-on); }
  </style>
"""


def kopfzeilen_uebersetzen(s, seite, lang, titel, beschr):
    """Titel und Beschreibung stehen fest im HTML — die Übersetzung im
       Browser fasst sie nicht an. Hier werden sie gesetzt, inklusive der
       davon abgeleiteten og:- und twitter:-Angaben."""
    if not titel:
        return s
    alt_titel = re.search(r'<title>(.*?)</title>', s, re.S)
    alt_beschr = re.search(r'<meta name="description" content="(.*?)"', s, re.S)
    s = re.sub(r'<title>.*?</title>', '<title>' + html.escape(titel) + '</title>', s, count=1, flags=re.S)
    if alt_titel:
        s = s.replace(f'content="{alt_titel.group(1)}"', f'content="{html.escape(titel)}"')
    if alt_beschr:
        s = s.replace(f'content="{alt_beschr.group(1)}"', f'content="{html.escape(beschr)}"')
    return s


# Seiten ohne eigenen Hero teilen sich die Karte der Startseite
EIGENE_KARTE = {'index.html', 'werkstatt.html', 'handwerk.html', 'garten.html',
                'reinigung.html', 'schaedlingsbekaempfung.html'}


def vorschaubild(s, seite, lang):
    """og:image je Sprache — sonst zeigt die französische Seite beim
       Teilen eine deutsche Karte."""
    schluessel = (seite if seite in EIGENE_KARTE else 'index.html').replace('.html', '')
    bild = f'{BASIS}/assets/og/{schluessel}-{lang}.jpg'
    s = re.sub(r'(<meta property="og:image" content=")[^"]*(")', rf'\g<1>{bild}\g<2>', s)
    s = re.sub(r'(<meta name="twitter:image" content=")[^"]*(")', rf'\g<1>{bild}\g<2>', s)
    return s


def bearbeite(roh, seite, lang, titel=None, beschr=None):
    s = roh

    # Kopf aufräumen: alte canonical/og:locale/hreflang/FAQ-Schema raus.
    # Das FAQ-Schema steckt schon in der deutschen Quelle — ohne diesen
    # Schritt stünde es in der Sprachfassung zweimal.
    s = re.sub(r'\s*<script type="application/ld\+json">\s*\{\s*"@context": "https://schema\.org",\s*"@type": "FAQPage".*?</script>', '', s, flags=re.S)
    s = re.sub(r'\s*<link rel="canonical"[^>]*>', '', s)
    s = re.sub(r'\s*<link rel="alternate" hreflang="[^"]*"[^>]*>', '', s)
    s = re.sub(r'\s*<meta property="og:locale"[^>]*>', '', s)
    s = re.sub(r'\s*<meta property="og:url"[^>]*>', '', s)

    if lang != 'de':
        s = pfade_absolut(s)
        s = seitenlinks_in_sprache(s, lang)

    s = umschalter_zu_links(s, seite, lang)
    s = kopfzeilen_uebersetzen(s, seite, lang, titel, beschr)
    s = vorschaubild(s, seite, lang)
    s = re.sub(r'<html lang="[a-z-]+"', f'<html lang="{lang}"', s, count=1)
    if lang != 'de':
        # Ohne diese Zeile würde i18n.js beim Laden die Browsersprache
        # erkennen und den fertig übersetzten Text wieder überschreiben.
        s = s.replace('<head>', f'<head>\n  <script>window.MOSAOS_LANG_FIXED = "{lang}";</script>', 1)

    kopf = (f'  <link rel="canonical" href="{url_fuer(seite, lang)}" />\n'
            + hreflang_block(seite)
            + f'  <meta property="og:locale" content="{LOCALE[lang]}" />\n'
            + f'  <meta property="og:url" content="{url_fuer(seite, lang)}" />\n'
            + faq_schema(s)
            + (UMSCHALTER_STIL if '.lang-link' not in s else ''))
    s = s.replace('</head>', kopf + '</head>', 1)
    return s


def deutsch_ergaenzen():
    """Die deutschen Seiten bleiben die gepflegte Quelle. Sie werden nur
       um hreflang, og:locale und das FAQ-Schema ergänzt — nie aus dem
       gerenderten DOM zurückgeschrieben."""
    for datei in SEITEN:
        pfad = os.path.join(WURZEL, datei)
        s = io.open(pfad, encoding='utf-8').read()
        s = re.sub(r'\s*<link rel="alternate" hreflang="[^"]*"[^>]*>', '', s)
        s = re.sub(r'\s*<script type="application/ld\+json">\s*\{\s*"@context": "https://schema.org",\s*"@type": "FAQPage".*?</script>', '', s, flags=re.S)
        s = vorschaubild(s, datei, 'de')
        kopf = hreflang_block(datei) + faq_schema(s)
        s = s.replace('</head>', kopf + '</head>', 1)
        io.open(pfad, 'w', encoding='utf-8').write(s)
    print(f'  de: {len(SEITEN)} Seiten ergänzt (Quelle bleibt unverändert)')


def main():
    deutsch_ergaenzen()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        seite = browser.new_page(viewport={'width': 1440, 'height': 900}, locale='de-CH')

        for lang in [l for l in SPRACHEN if l != 'de']:
            if True:
                ordner = os.path.join(WURZEL, lang)
                if os.path.isdir(ordner):
                    shutil.rmtree(ordner)
                os.makedirs(ordner)

            for datei in SEITEN:
                seite.goto(f'{QUELLE}/{datei}', wait_until='load')
                seite.evaluate("document.fonts.ready")
                seite.wait_for_timeout(250)
                seite.evaluate(f"window.MOSAOS_I18N.apply('{lang}')")
                seite.wait_for_timeout(250)
                # Das Cookie-Banner fügt config.js zur Laufzeit ein. Bliebe es
                # im gespeicherten HTML, stünde es doppelt auf der Seite.
                seite.evaluate("""() => {
                  document.getElementById('mosaos-cookie')?.remove();
                }""")
                schluessel = datei.replace('.html', '')
                titel = seite.evaluate(f"window.MOSAOS_I18N.t('meta.{schluessel}.title', '{lang}')")
                beschr = seite.evaluate(f"window.MOSAOS_I18N.t('meta.{schluessel}.desc', '{lang}')")
                if titel.startswith('meta.'):
                    titel = beschr = None      # kein Eintrag → deutsche Kopfzeile behalten
                roh = seite.evaluate("'<!DOCTYPE html>\\n' + document.documentElement.outerHTML")
                fertig = bearbeite(roh, datei, lang, titel, beschr)
                ziel = os.path.join(WURZEL, lang, datei)
                with open(ziel, 'w', encoding='utf-8') as f:
                    f.write(fertig)
            print(f'  {lang}: {len(SEITEN)} Seiten')

        browser.close()
    print('Fertig. Deutsch an der Wurzel, andere Sprachen in /fr /it /es /en')


if __name__ == '__main__':
    main()
