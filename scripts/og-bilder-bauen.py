#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vorschaubilder (og:image) je Seite und Sprache erzeugen
========================================================
Bisher zeigten alle Sprachfassungen dieselbe deutsche Karte. Wer die
französische Seite auf LinkedIn teilt, bekam eine deutsche Vorschau.

Hier wird jede Seite in ihrer Sprache bei 1200 x 630 aufgenommen — dem
Format, das LinkedIn, WhatsApp und Google für die Karte verwenden.
Aufgenommen wird in doppelter Auflösung und heruntergerechnet, damit
die Schrift sauber bleibt.

Chromium macht das Bild direkt. Der frühere Umweg über html2canvas
(inklusive seiner Farb- und Verlaufs-Eigenheiten) entfällt.

Aufruf: python3 scripts/og-bilder-bauen.py
"""
import os, subprocess, shutil, threading, functools
import http.server, socketserver
from playwright.sync_api import sync_playwright

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUS    = os.path.join(WURZEL, 'assets', 'og')
FFMPEG = '/Users/brianknuchel/claude youtube/shorts/bin/ffmpeg'

BREIT, HOCH = 1200, 630        # Zielformat der Karte
# Aufgenommen wird breiter: bei 1200 px bricht die Überschrift in den
# romanischen Sprachen über fünf Zeilen und der Rest fällt aus dem Bild.
# 1600 x 840 hat dasselbe Seitenverhältnis und die Desktop-Anordnung.
AUF_BREIT, AUF_HOCH = 1600, 840
SPRACHEN = ['de', 'fr', 'it', 'es', 'en']

# Nur die Seiten mit eigenem Hero. Über-uns, Anfrage und die
# Rechtsseiten teilen sich die Karte der Startseite ihrer Sprache.
SEITEN = ['index.html', 'werkstatt.html', 'handwerk.html', 'garten.html',
          'reinigung.html', 'schaedlingsbekaempfung.html']


def server_starten():
    """Eigener kleiner Server statt file:// — die Sprachseiten verweisen
       absolut (/styles.css), das lädt aus einer Datei-URL nicht."""
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=WURZEL)
    handler.log_message = lambda *a, **k: None
    srv = socketserver.TCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'


def url_fuer(seite, lang, basis):
    return basis + ('/' if lang == 'de' else f'/{lang}/') + seite


def name_fuer(seite, lang):
    return seite.replace('.html', '') + '-' + lang


def main():
    os.makedirs(AUS, exist_ok=True)
    roh = os.path.join(WURZEL, '.og-roh')
    if os.path.isdir(roh):
        shutil.rmtree(roh)
    os.makedirs(roh)

    srv, basis = server_starten()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        seite = browser.new_page(viewport={'width': AUF_BREIT, 'height': AUF_HOCH},
                                 device_scale_factor=2, locale='de-CH')
        for lang in SPRACHEN:
            for datei in SEITEN:
                lokal = os.path.join(WURZEL, datei) if lang == 'de' \
                        else os.path.join(WURZEL, lang, datei)
                if not os.path.exists(lokal):
                    continue
                seite.goto(url_fuer(datei, lang, basis), wait_until='load')
                seite.evaluate("document.fonts.ready")
                seite.wait_for_timeout(700)
                seite.evaluate("""() => {
                  // Cookie-Hinweis und Einblend-Animationen gehören nicht
                  // auf die Vorschaukarte.
                  document.getElementById('mosaos-cookie')?.remove();
                  // Die Startseite zeigt beim Laden eine Einblendung mit dem
                  // Logo. Ohne diesen Schritt wäre genau die auf der Karte.
                  document.getElementById('intro')?.remove();
                  document.body.classList.remove('intro-active');
                  document.body.classList.add('intro-done');
                  document.querySelectorAll('.reveal, [class*="reveal"]').forEach(el => {
                    el.style.opacity = 1; el.style.transform = 'none';
                  });
                  document.querySelectorAll('.scroll-hint, .scroll-indicator')
                    .forEach(el => el.style.display = 'none');
                  window.scrollTo(0, 0);
                }""")
                seite.wait_for_timeout(400)
                name = name_fuer(datei, lang)
                seite.screenshot(path=os.path.join(roh, name + '.png'))
                print('  ', name)
        browser.close()
    srv.shutdown()

    # Als JPEG in Zielgrösse — 40 PNG-Karten wären unnötig schwer
    for f in sorted(os.listdir(roh)):
        name = f[:-4]
        subprocess.run([FFMPEG, '-y', '-v', 'error',
                        '-i', os.path.join(roh, f),
                        '-vf', f'scale={BREIT}:{HOCH}:flags=lanczos',
                        '-q:v', '3', os.path.join(AUS, name + '.jpg')], check=True)
    shutil.rmtree(roh)

    # Alte Karten ohne Sprachkürzel entfernen
    for alt in ['mosaos.jpg', 'branchen.jpg', 'werkstatt.jpg', 'handwerk.jpg',
                'garten.jpg', 'reinigung.jpg', 'schaedlingsbekaempfung.jpg']:
        p = os.path.join(AUS, alt)
        if os.path.exists(p):
            os.remove(p)

    print('Fertig:', len(os.listdir(AUS)), 'Karten in assets/og/')


if __name__ == '__main__':
    main()
