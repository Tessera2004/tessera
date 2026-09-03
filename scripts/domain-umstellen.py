#!/usr/bin/env python3
"""
============================================================
MosaOS — Domain in allen Dateien umstellen

Die Adresse steckt an ueber 800 Stellen: canonical, hreflang in fuenf
Sprachen, Open Graph, JSON-LD, sitemap.xml, robots.txt. Von Hand
uebersieht man garantiert eine — und eine vergessene canonical schickt
Google weiter auf die alte Adresse.

Aufruf:
    python3 scripts/domain-umstellen.py --von mosaos.pages.dev --nach mosaos.ch
    python3 scripts/domain-umstellen.py --von … --nach … --trocken   (nur zeigen)

WICHTIG: Erst ausfuehren und pushen, wenn die neue Domain wirklich
antwortet. Sonst zeigen canonical und sitemap ins Leere.
============================================================
"""
import os, sys, argparse

ENDUNGEN = ('.html', '.js', '.xml', '.txt', '.json', '.md')
UEBERSPRINGEN = {'node_modules', '.git', 'dist', 'build'}

def dateien(wurzel):
    for pfad, ordner, namen in os.walk(wurzel):
        ordner[:] = [o for o in ordner if o not in UEBERSPRINGEN and not o.startswith('.')]
        for n in namen:
            if n.endswith(ENDUNGEN):
                yield os.path.join(pfad, n)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--von', required=True, help='alte Domain, z. B. mosaos.pages.dev')
    p.add_argument('--nach', required=True, help='neue Domain, z. B. mosaos.ch')
    p.add_argument('--trocken', action='store_true', help='nur anzeigen, nichts schreiben')
    a = p.parse_args()

    wurzel = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    gesamt = 0
    betroffen = 0
    for f in sorted(dateien(wurzel)):
        try:
            s = open(f, encoding='utf-8').read()
        except (UnicodeDecodeError, OSError):
            continue
        n = s.count(a.von)
        if not n:
            continue
        gesamt += n
        betroffen += 1
        rel = os.path.relpath(f, wurzel)
        print(f'  {rel:<45} {n:>4}')
        if not a.trocken:
            open(f, 'w', encoding='utf-8').write(s.replace(a.von, a.nach))

    print(f'\n{gesamt} Stellen in {betroffen} Dateien'
          + (' — nichts geändert (--trocken).' if a.trocken else f' von {a.von} auf {a.nach} umgestellt.'))
    if not a.trocken and gesamt:
        print('\nNicht vergessen, weil sie NICHT in Dateien stehen:')
        print('  · Supabase-Secret APP_ORIGIN')
        print('  · Unternehmenswebsite im Stripe-Konto')
        print('  · Google Search Console: neue Property anlegen')

if __name__ == '__main__':
    main()
