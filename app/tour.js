/* ============================================================
   MosaOS · Geführte Tour
   ------------------------------------------------------------
   Zeigt neuen Nutzern die App an den echten Bedienelementen statt in
   einem Text, den niemand liest. Ein Schritt hebt ein Element hervor,
   erklärt es in ein bis zwei Sätzen und wartet auf „Weiter".

   Bewusste Entscheidungen:
   · Überspringen ist immer sichtbar. Eine Tour, aus der man nicht
     herauskommt, wird weggeklickt statt gelesen.
   · Der Fortschritt wird gemerkt. Wer unterbricht, steigt beim
     nächsten Öffnen an derselben Stelle wieder ein.
   · Die Schritte sind branchenneutral formuliert und zeigen auf
     data-view-Punkte, die es in jeder Branche gibt. Fehlt ein Ziel
     (Modul nicht gebucht), wird der Schritt still übersprungen.
   · Startet nur einmal von selbst. Danach über „Tour starten" in den
     Einstellungen.
   ============================================================ */
(function () {
  'use strict';

  const SCHLUESSEL = 'cc-tour-v1';        // { fertig: bool, schritt: number }
  const RAND = 10;                        // Luft um das hervorgehobene Element

  /* Übersetzung mit Rückfall auf Deutsch — tt() kommt aus app.html,
     ist beim Laden dieser Datei aber noch nicht zwingend da. */
  function t(key, standard) {
    try {
      if (typeof window.tt === 'function') return window.tt(key, standard);
      if (window.MosaI18n && typeof MosaI18n.t === 'function') return MosaI18n.t(key, standard);
    } catch (e) {}
    return standard;
  }

  /* Branchenbegriff für den Kernbereich (Einsätze/Aufträge/…) */
  function begriff(schluessel, standard) {
    try {
      if (window.MosaVertical && typeof MosaVertical.t === 'function') {
        const v = MosaVertical.t(schluessel);
        if (v) return v;
      }
    } catch (e) {}
    return standard;
  }

  /* Der Kernbereich heisst je Branche anders. Ohne diese Zuordnung
     würde bei der Schädlingsbekämpfung „Einsatzplanung" hervorgehoben
     statt „Köderstellen" — beide Punkte gibt es dort. */
  const KERN = {
    reinigung:  'planung',
    werkstatt:  'werkstattplan',
    handwerk:   'baustellen',
    garten:     'baustellen',
    schaedling: 'koederstellen'
  };
  function kernbereich() {
    let v = null;
    try { v = window.MosaVertical && MosaVertical.get(); } catch (e) {}
    const zuerst = KERN[v];
    const rest = ['koederstellen', 'werkstattplan', 'baustellen', 'planung']
                   .filter(x => x !== zuerst);
    return [zuerst, ...rest].filter(Boolean).map(x => `.nav-item[data-view="${x}"]`);
  }

  /* ---------- Schritte ----------
     ziel: CSS-Wähler. null = mittig ohne Hervorhebung.
     view: Ansicht, die vorher geöffnet wird. */
  function schritte() {
    return [
      { ziel: null, view: null,
        titel: () => t('tour.1.t', 'Willkommen bei MosaOS'),
        text:  () => t('tour.1.x', 'In sechs kurzen Schritten zeigen wir dir, wo was liegt. Du kannst jederzeit abbrechen und später weitermachen.') },

      { ziel: '.nav-item[data-view="dashboard"]', view: 'dashboard',
        titel: () => t('tour.2.t', 'Deine Übersicht'),
        text:  () => t('tour.2.x', 'Das Dashboard zeigt den Tag auf einen Blick: offene Einsätze, Rückrufe und was noch zu tun ist.') },

      { ziel: kernbereich(), view: null,
        titel: () => t('tour.3.t', 'Hier läuft die Arbeit'),
        text:  () => t('tour.3.x', 'Der Kernbereich deiner Branche. Hier planst du, wer wann wo im Einsatz ist — und siehst, was gerade läuft.') },

      { ziel: '.nav-item[data-view="kunden"]', view: null,
        titel: () => t('tour.4.t', 'Kunden und Objekte'),
        text:  () => t('tour.4.x', 'Jeder Einsatz, jede Offerte und jede Rechnung hängt an einem Kunden. Anrufe und E-Mails bleiben ebenfalls dort — nichts geht in einem Postfach verloren.') },

      { ziel: '.nav-item[data-view="rechnungen"]', view: null,
        titel: () => t('tour.5.t', 'Vom Einsatz zur Rechnung'),
        text:  () => t('tour.5.x', 'Erledigte Einsätze werden hier zur Rechnung — als PDF, mit dem Zahlteil deines Landes. Den Status siehst du im Überblick.') },

      { ziel: '.nav-item[data-view="mitarbeiter"]', view: null,
        titel: () => t('tour.6.t', 'Dein Team'),
        text:  () => t('tour.6.x', 'Hier legst du Mitarbeitende an. Sie öffnen die Feld-App am Handy, sehen ihren Tag, checken beim Kunden ein und schliessen mit Rapport ab.') },

      { ziel: '.nav-item[data-view="einstellungen"]', view: null,
        titel: () => t('tour.7.t', 'Land, Steuersatz und Firmendaten'),
        text:  () => t('tour.7.x', 'Wichtig vor der ersten Rechnung: Unter Einstellungen stehen Firmenadresse, IBAN und dein Land. Das Land steuert Währung, Steuersatz und den Zahlteil — Schweiz QR-Einzahlschein, Deutschland und Österreich SEPA.') },

      /* zielEgal: die Karte „Erste Schritte" kann ausgeblendet sein.
         Der Abschluss soll trotzdem erscheinen, dann eben mittig. */
      { ziel: '#firstSteps', zielEgal: true, view: 'dashboard',
        titel: () => t('tour.8.t', 'Und jetzt?'),
        text:  () => t('tour.8.x', 'Die Karte „Erste Schritte" führt dich durch die Einrichtung. Du kannst die Tour später über die Einstellungen erneut starten.') }
    ];
  }

  /* ---------- Zustand ---------- */
  function laden() {
    try { return JSON.parse(localStorage.getItem(SCHLUESSEL)) || {}; } catch (e) { return {}; }
  }
  function sichern(z) {
    try { localStorage.setItem(SCHLUESSEL, JSON.stringify(z)); } catch (e) {}
  }

  let liste = [];
  let i = 0;
  let offen = false;

  /* ---------- Bausteine ---------- */
  function bauen() {
    if (document.getElementById('tourHuelle')) return;
    const h = document.createElement('div');
    h.id = 'tourHuelle';
    h.innerHTML =
      '<div id="tourLoch"></div>' +
      '<div id="tourKarte" role="dialog" aria-modal="true">' +
        '<div id="tourZaehler"></div>' +
        '<h3 id="tourTitel"></h3>' +
        '<p id="tourText"></p>' +
        '<div id="tourKnoepfe">' +
          '<button type="button" id="tourWeg" class="tour-flach"></button>' +
          '<div class="tour-rechts">' +
            '<button type="button" id="tourZurueck" class="tour-flach"></button>' +
            '<button type="button" id="tourWeiter" class="tour-voll"></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(h);

    document.getElementById('tourWeg').addEventListener('click', () => beenden(false));
    // Klick auf die abgedunkelte Flaeche beendet die Tour. Ohne das wirkt die
    // ganze App tot: Die Huelle liegt ueber allem, jeder Klick daneben geht
    // ins Leere, und der Benutzer haelt die Knoepfe fuer kaputt.
    h.addEventListener('click', (e) => { if (e.target === h) beenden(false); });
    document.getElementById('tourZurueck').addEventListener('click', () => gehe(i - 1));
    document.getElementById('tourWeiter').addEventListener('click', () => gehe(i + 1));
    document.addEventListener('keydown', tastatur);
    window.addEventListener('resize', () => { if (offen) zeichnen(); });
  }

  function tastatur(e) {
    if (!offen) return;
    if (e.key === 'Escape') beenden(false);
    if (e.key === 'ArrowRight' || e.key === 'Enter') gehe(i + 1);
    if (e.key === 'ArrowLeft') gehe(i - 1);
  }

  /* Das hervorgehobene Element bestimmen — fehlt es, sucht der Aufrufer
     den nächsten Schritt. */
  function ziel(schritt) {
    if (!schritt.ziel) return null;
    // Der Kernbereich heisst je Branche anders — deshalb darf ein
    // Schritt mehrere Wähler angeben; der erste sichtbare gewinnt.
    const kandidaten = Array.isArray(schritt.ziel) ? schritt.ziel : [schritt.ziel];
    for (const w of kandidaten) {
      const el = document.querySelector(w);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;   // ausgeblendet
      return el;
    }
    return null;
  }

  function zeichnen() {
    const s = liste[i];
    if (!s) return;
    const loch = document.getElementById('tourLoch');
    const karte = document.getElementById('tourKarte');
    const el = ziel(s);

    if (el) {
      const r = el.getBoundingClientRect();
      loch.style.display = 'block';
      loch.style.top = (r.top - RAND) + 'px';
      loch.style.left = (r.left - RAND) + 'px';
      loch.style.width = (r.width + RAND * 2) + 'px';
      loch.style.height = (r.height + RAND * 2) + 'px';
    } else {
      loch.style.display = 'none';
    }

    document.getElementById('tourZaehler').textContent =
      (i + 1) + ' ' + t('tour.von', 'von') + ' ' + liste.length;
    document.getElementById('tourTitel').textContent = s.titel();
    document.getElementById('tourText').textContent = s.text();
    document.getElementById('tourWeg').textContent = t('tour.weg', 'Überspringen');
    document.getElementById('tourZurueck').textContent = t('tour.zurueck', 'Zurück');
    document.getElementById('tourZurueck').style.visibility = i === 0 ? 'hidden' : 'visible';
    document.getElementById('tourWeiter').textContent = (i === liste.length - 1)
      ? t('tour.fertig', 'Fertig') : t('tour.weiter', 'Weiter');

    /* Karte neben das Ziel legen, sonst mittig. Sie darf nie aus dem
       Bild laufen — auf schmalen Fenstern rutscht sie unter das Ziel. */
    karte.style.visibility = 'hidden';
    karte.style.top = '0px'; karte.style.left = '0px';
    const kb = karte.getBoundingClientRect();
    const bw = window.innerWidth, bh = window.innerHeight;

    if (!el) {
      karte.style.left = Math.round((bw - kb.width) / 2) + 'px';
      karte.style.top = Math.round((bh - kb.height) / 2) + 'px';
    } else {
      const r = el.getBoundingClientRect();
      let x = r.right + RAND + 16;
      let y = r.top - 8;
      if (x + kb.width > bw - 16) {            // rechts kein Platz → darunter
        x = Math.min(Math.max(16, r.left), bw - kb.width - 16);
        y = r.bottom + RAND + 16;
      }
      if (y + kb.height > bh - 16) y = Math.max(16, bh - kb.height - 16);
      karte.style.left = Math.round(x) + 'px';
      karte.style.top = Math.round(y) + 'px';
    }
    karte.style.visibility = 'visible';
  }

  function gehe(n) {
    if (n < 0) return;
    if (n >= liste.length) { beenden(true); return; }

    const s = liste[n];
    if (s.view && typeof window.navTo === 'function') {
      try { window.navTo(s.view); } catch (e) {}
    }
    i = n;
    sichern({ fertig: false, schritt: i });

    /* Nach einem Ansichtswechsel braucht das Bild einen Moment */
    setTimeout(() => {
      /* Ziel fehlt (Modul nicht gebucht) → still weiter.
         Ausnahme: Schritte mit zielEgal werden trotzdem gezeigt. */
      if (liste[i].ziel && !liste[i].zielEgal && !ziel(liste[i])) { gehe(i + 1); return; }
      zeichnen();
    }, s.view ? 220 : 40);
  }

  function starten(vonVorn) {
    liste = schritte();
    bauen();
    offen = true;
    document.getElementById('tourHuelle').classList.add('an');
    document.body.classList.add('tour-laeuft');
    const z = laden();
    gehe(vonVorn ? 0 : Math.min(z.schritt || 0, liste.length - 1));
  }

  function beenden(fertig) {
    offen = false;
    const h = document.getElementById('tourHuelle');
    if (h) h.classList.remove('an');
    document.body.classList.remove('tour-laeuft');
    sichern({ fertig: !!fertig, schritt: fertig ? 0 : i });
  }

  /* ---------- Start ----------
     Nur einmal von selbst, und erst wenn die Oberfläche steht. */
  function vielleichtStarten() {
    const z = laden();
    if (z.fertig) return;
    if (localStorage.getItem('cc-tour-nie') === '1') return;
    setTimeout(() => { if (!offen) starten(false); }, 900);
  }

  window.MosaTour = {
    starten: () => starten(true),
    fortsetzen: () => starten(false),
    beenden: () => beenden(false),
    erledigt: () => !!laden().fertig
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vielleichtStarten);
  } else {
    vielleichtStarten();
  }
})();
