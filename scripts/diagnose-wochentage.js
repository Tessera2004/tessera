/* ============================================================
   Diagnose: Warum reagieren Montag und Dienstag nicht?

   SO BENUTZT DU ES
   1. mosaos.ch/app/app.html öffnen, zur Routenplanung wechseln
   2. Rechtsklick irgendwo → "Untersuchen" → Reiter "Console"
   3. Diese ganze Datei hineinkopieren, Enter drücken
   4. Die Ausgabe abschreiben oder abfotografieren

   Es wird nichts verändert — nur gemessen.
   ============================================================ */
(() => {
  const pills = [...document.querySelectorAll('.day-pill')].filter(e => e.offsetParent);
  if (!pills.length) { console.log('Keine Tages-Schaltflächen gefunden — bist du in der Routenplanung?'); return; }

  const leiste = document.querySelector('.day-switcher');
  console.log('%cFenster: ' + window.innerWidth + ' × ' + window.innerHeight
            + ' · Zoom: ' + Math.round(window.devicePixelRatio * 100) / 100, 'font-weight:bold');
  if (leiste) {
    console.log('Leiste: sichtbar ' + leiste.clientWidth + 'px, Inhalt ' + leiste.scrollWidth
              + 'px, verschoben um ' + leiste.scrollLeft + 'px');
  }

  const zeilen = pills.map(p => {
    const r = p.getBoundingClientRect();
    const mx = r.left + r.width / 2, my = r.top + r.height / 2;
    const treffer = document.elementFromPoint(mx, my);
    const eigen = treffer === p || p.contains(treffer);
    return {
      Tag: p.textContent.trim().split('\n')[0],
      Breite: Math.round(r.width),
      'Von links': Math.round(r.left),
      'Klick trifft': eigen ? '✓ die Schaltfläche'
        : '✗ ' + (treffer ? (treffer.id || treffer.className || treffer.tagName) : 'nichts'),
      Deaktiviert: p.disabled ? 'ja' : 'nein',
      Zeiger: getComputedStyle(p).pointerEvents
    };
  });
  console.table(zeilen);

  const problem = zeilen.filter(z => z['Klick trifft'].startsWith('✗'));
  if (problem.length) {
    console.log('%cDIESE TAGE SIND VERDECKT: ' + problem.map(p => p.Tag).join(', '),
                'color:#e11d2a;font-weight:bold');
    console.log('Das Element davor steht in der Spalte "Klick trifft".');
  } else {
    console.log('%cAlle Tage sind frei erreichbar — das Problem liegt woanders.',
                'color:#1a7f4b;font-weight:bold');
    console.log('Klick jetzt auf Montag und schau, ob sich die Überschrift der Seite ändert.');
  }
})();
