#!/usr/bin/env python3
"""
============================================================
MosaOS — Ratgeber-Seiten erzeugen

Baut aus den Textdateien in scripts/ratgeber/<sprache>.json die
fertigen HTML-Seiten:

    ratgeber/<slug>.html            (Deutsch, Wurzel)
    <sprache>/ratgeber/<slug>.html  (fr, it, es, en)
    ratgeber/index.html             (Uebersicht, je Sprache)

Warum ein Generator und keine 18 gepflegten Dateien: Kopf, Navigation,
Fusszeile und die hreflang-Verweise muessen in allen Sprachen gleich
sein. Von Hand gepflegt laufen sie garantiert auseinander — genau so
sind die canonical-Verweise auf mosaos.pages.dev entstanden.

Aufruf:
    python3 scripts/ratgeber-erzeugen.py
Es wird nur unterhalb von ratgeber/ geschrieben, nichts geloescht.
============================================================
"""
import json, os, html

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUELLE = os.path.join(WURZEL, 'scripts', 'ratgeber')
DOMAIN = 'https://mosaos.ch'
SPRACHEN = ['de', 'fr', 'it', 'es', 'en']
STAND = '2026-09-04'


def pfad(sprache, datei):
    """ratgeber/x.html fuer Deutsch, fr/ratgeber/x.html fuer die anderen."""
    return os.path.join(WURZEL, *(['ratgeber', datei] if sprache == 'de'
                                  else [sprache, 'ratgeber', datei]))


def adresse(sprache, datei):
    return f'{DOMAIN}/ratgeber/{datei}' if sprache == 'de' else f'{DOMAIN}/{sprache}/ratgeber/{datei}'


def hoch(sprache, ziel):
    """Verweis von einer Ratgeber-Seite auf eine Seite der Hauptebene."""
    return f'../{ziel}' if sprache == 'de' else f'../../{sprache}/{ziel}' if ziel != 'index.html' else f'../../{sprache}/'


def wurzel(sprache):
    return '../' if sprache == 'de' else f'../../{sprache}/'


def mittel(sprache):
    """Pfad zu styles.css, logo/ usw. — die liegen immer in der Wurzel."""
    return '../' if sprache == 'de' else '../../'


def kopf(sprache, datei, titel, beschreibung, keywords, w):
    alt = '\n'.join(f'  <link rel="alternate" hreflang="{s}" href="{adresse(s, datei)}" />'
                    for s in SPRACHEN)
    m = mittel(sprache)
    return f'''<!DOCTYPE html>
<html lang="{sprache}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="{html.escape(beschreibung)}" />
  <meta name="keywords" content="{html.escape(keywords)}" />
  <title>{html.escape(titel)}</title>
  <link rel="canonical" href="{adresse(sprache, datei)}" />
{alt}
  <link rel="alternate" hreflang="x-default" href="{adresse('de', datei)}" />
  <link rel="icon" type="image/svg+xml" href="{m}logo/favicon.svg" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="{html.escape(titel)}" />
  <meta property="og:description" content="{html.escape(beschreibung)}" />
  <meta property="og:url" content="{adresse(sprache, datei)}" />
  <meta property="og:image" content="{DOMAIN}/assets/og/index-{sprache}.jpg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="{m}styles.css?v=10" />
  <style>
    /* Lesetext: eine schmale Spalte, damit Zeilen nicht ueber den ganzen
       Bildschirm laufen — alles andere kommt aus styles.css. */
    .rg-wrap {{ max-width: 760px; margin: 0 auto; padding: 0 24px; }}
    /* Die Uebersicht braucht Platz fuer drei Karten nebeneinander,
       der Lesetext dagegen eine schmale Spalte. */
    .rg-wrap.wide {{ max-width: 1080px; }}
    .rg-head {{ padding: 120px 0 32px; }}
    .rg-head .eyebrow {{ color: var(--swiss); font-weight: 600; font-size: 13px;
      letter-spacing: .08em; text-transform: uppercase; margin-bottom: 14px; }}
    .rg-head h1 {{ font-size: clamp(30px, 5vw, 44px); line-height: 1.15;
      letter-spacing: -.02em; margin: 0 0 18px; color: var(--text); }}
    .rg-lead {{ font-size: 18px; line-height: 1.65; color: var(--text-muted); margin: 0; }}
    .rg-meta {{ font-size: 13.5px; color: var(--text-subtle); margin-top: 20px; }}
    .rg-body {{ padding-bottom: 72px; }}
    .rg-body h2 {{ font-size: 24px; letter-spacing: -.01em; margin: 44px 0 14px; color: var(--text); }}
    .rg-body h3 {{ font-size: 18px; margin: 30px 0 10px; color: var(--text); }}
    .rg-body p {{ font-size: 16px; line-height: 1.72; color: var(--text-soft); margin: 0 0 16px; }}
    .rg-body ul {{ margin: 0 0 20px; padding-left: 22px; }}
    .rg-body li {{ font-size: 16px; line-height: 1.7; color: var(--text-soft); margin-bottom: 9px; }}
    .rg-note {{ background: var(--bg-soft); border: 1px solid var(--border-soft);
      border-left: 3px solid var(--swiss); border-radius: var(--r-md);
      padding: 18px 20px; margin: 28px 0; font-size: 15px; line-height: 1.65;
      color: var(--text-soft); }}
    .rg-cta {{ background: var(--surface); border: 1px solid var(--border-strong);
      border-radius: var(--r-xl); padding: 32px; margin: 48px 0 0; text-align: center;
      box-shadow: var(--shadow-lg); }}
    .rg-cta h2 {{ margin-top: 0; }}
    .rg-more {{ border-top: 1px solid var(--border-soft); margin-top: 56px; padding-top: 28px; }}
    .rg-more a {{ display: block; color: var(--text); font-weight: 600;
      text-decoration: none; padding: 10px 0; font-size: 15.5px; }}
    .rg-more a:hover {{ color: var(--swiss); }}
    @media (max-width: 860px) {{
      .nav-actions {{ display: flex; gap: 8px; align-items: center; }}
      .rg-head {{ padding-top: 96px; }}
    }}
    .rg-cards {{ display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(min(280px,100%), 1fr));
      margin: 40px 0 72px; }}
    .rg-card {{ background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: 26px 24px; text-decoration: none; display: block;
      transition: border-color .2s var(--ease), transform .2s var(--ease); }}
    .rg-card:hover {{ border-color: var(--border-strong); transform: translateY(-3px); }}
    .rg-card h2 {{ font-size: 18px; margin: 0 0 10px; color: var(--text); }}
    .rg-card p {{ font-size: 14.5px; line-height: 1.55; color: var(--text-muted); margin: 0; }}
  </style>
</head>
<body>
  <div class="noise" aria-hidden="true"></div>
  <header class="nav" id="nav" style="opacity:1; transform:none;">
    <div class="nav-inner">
      <a href="{wurzel(sprache)}" class="nav-logo" aria-label="MosaOS">
        <img src="{m}logo/mosaos-mark.svg" alt="" width="32" height="32" />
        <span>Mosa<span class="brand-os">OS</span></span>
      </a>
      <nav class="nav-links" aria-label="{html.escape(w['nav_aria'])}">
        <a href="{wurzel(sprache)}#branchen">{html.escape(w['nav_branchen'])}</a>
        <a href="{wurzel(sprache)}#preise">{html.escape(w['nav_preise'])}</a>
        <a href="index.html">{html.escape(w['nav_ratgeber'])}</a>
      </nav>
      <div class="nav-actions">
        <a href="{m}app/login.html" class="btn btn-ghost">{html.escape(w['nav_login'])}</a>
        <a href="{m}app/onboarding.html" class="btn btn-primary">{html.escape(w['nav_start'])}</a>
        <div class="lang-switch">{''.join(
          f'<a href="{adresse(s, datei).replace(DOMAIN, "")}" hreflang="{s}" class="lang-link{" active" if s == sprache else ""}">{s.upper()}</a>'
          for s in SPRACHEN)}</div>
      </div>
    </div>
  </header>
'''


def fuss(sprache, w):
    m = mittel(sprache)
    return f'''
  <footer class="footer">
    <div class="container">
      <div class="footer-bottom">
        <p>© 2026 MosaOS · {html.escape(w['fuss_claim'])}</p>
        <p>
          <a href="{m}impressum.html">{html.escape(w['fuss_impressum'])}</a> ·
          <a href="{m}agb.html">{html.escape(w['fuss_agb'])}</a> ·
          <a href="{m}datenschutz.html">{html.escape(w['fuss_datenschutz'])}</a>
        </p>
      </div>
    </div>
  </footer>
</body>
</html>
'''


def artikel_html(sprache, art, alle, w):
    """Baut eine Artikelseite. 'abschnitte' ist eine Liste von Bloecken."""
    teile = []
    for b in art['abschnitte']:
        art_typ = b[0]
        if art_typ == 'h2':
            teile.append(f'      <h2>{html.escape(b[1])}</h2>')
        elif art_typ == 'h3':
            teile.append(f'      <h3>{html.escape(b[1])}</h3>')
        elif art_typ == 'p':
            teile.append(f'      <p>{html.escape(b[1])}</p>')
        elif art_typ == 'ul':
            eintraege = ''.join(f'<li>{html.escape(x)}</li>' for x in b[1])
            teile.append(f'      <ul>{eintraege}</ul>')
        elif art_typ == 'hinweis':
            teile.append(f'      <div class="rg-note">{html.escape(b[1])}</div>')
    rumpf = '\n'.join(teile)

    andere = [a for a in alle if a['datei'] != art['datei']]
    weiter = '\n'.join(
        f'      <a href="{a["datei"]}">→ {html.escape(a["titel_kurz"])}</a>' for a in andere)

    # Strukturierte Daten: hilft Google, den Text als Ratgeber zu erkennen.
    daten = json.dumps({
        '@context': 'https://schema.org', '@type': 'Article',
        'headline': art['h1'], 'description': art['beschreibung'],
        'inLanguage': sprache, 'datePublished': STAND, 'dateModified': STAND,
        'author': {'@type': 'Organization', 'name': 'MosaOS'},
        'publisher': {'@type': 'Organization', 'name': 'MosaOS'},
        'mainEntityOfPage': adresse(sprache, art['datei']),
    }, ensure_ascii=False, indent=2)

    return (kopf(sprache, art['datei'], art['titel'], art['beschreibung'], art['keywords'], w) + f'''
  <script type="application/ld+json">
{daten}
  </script>

  <article>
    <div class="rg-wrap rg-head">
      <div class="eyebrow">{html.escape(w['eyebrow'])}</div>
      <h1>{html.escape(art['h1'])}</h1>
      <p class="rg-lead">{html.escape(art['lead'])}</p>
      <p class="rg-meta">{html.escape(w['stand'])} {STAND} · {html.escape(art['lesezeit'])}</p>
    </div>

    <div class="rg-wrap rg-body">
{rumpf}

      <div class="rg-cta">
        <h2>{html.escape(w['cta_titel'])}</h2>
        <p>{html.escape(w['cta_text'])}</p>
        <a href="{mittel(sprache)}app/onboarding.html" class="btn btn-primary btn-lg">{html.escape(w['cta_knopf'])}</a>
      </div>

      <div class="rg-more">
        <h3>{html.escape(w['weiter'])}</h3>
{weiter}
      </div>
    </div>
  </article>
''' + fuss(sprache, w))


def uebersicht_html(sprache, alle, w):
    karten = '\n'.join(
        f'''      <a class="rg-card" href="{a['datei']}">
        <h2>{html.escape(a['titel_kurz'])}</h2>
        <p>{html.escape(a['beschreibung'])}</p>
      </a>''' for a in alle)
    return (kopf(sprache, 'index.html', w['hub_titel'], w['hub_beschreibung'],
                 w['hub_keywords'], w) + f'''
  <div class="rg-wrap wide rg-head">
    <div class="eyebrow">{html.escape(w['eyebrow'])}</div>
    <h1>{html.escape(w['hub_h1'])}</h1>
    <p class="rg-lead">{html.escape(w['hub_lead'])}</p>
  </div>

  <div class="rg-wrap wide">
    <div class="rg-cards">
{karten}
    </div>
  </div>
''' + fuss(sprache, w))


def main():
    gesamt = 0
    for sprache in SPRACHEN:
        quelle = os.path.join(QUELLE, f'{sprache}.json')
        if not os.path.exists(quelle):
            print(f'  ! {sprache}: keine Textdatei, uebersprungen')
            continue
        with open(quelle, encoding='utf-8') as f:
            daten = json.load(f)
        w, alle = daten['woerter'], daten['artikel']
        os.makedirs(os.path.dirname(pfad(sprache, 'index.html')), exist_ok=True)
        for art in alle:
            ziel = pfad(sprache, art['datei'])
            with open(ziel, 'w', encoding='utf-8') as f:
                f.write(artikel_html(sprache, art, alle, w))
            gesamt += 1
        with open(pfad(sprache, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(uebersicht_html(sprache, alle, w))
        gesamt += 1
        print(f'  ✓ {sprache}: {len(alle)} Artikel + Übersicht')
    print(f'\n{gesamt} Seiten geschrieben.')


if __name__ == '__main__':
    main()
