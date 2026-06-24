/* ============================================================
   MosaOS — Branchen-Presets (Vertical-Engine)
   ------------------------------------------------------------
   EINE Engine, viele Branchen. Eine Branche = eine Konfiguration
   (Begriffe + Default-Module + Checklisten + Protokoll-Vorlagen),
   KEIN eigener Code/Fork.

   "reinigung" ist der Standard und bildet exakt die heutigen
   Begriffe ab → die App bleibt für Reinigungsfirmen pixelgleich.

   Verwendung:
     MosaVertical.get()        → aktueller Branchen-Key (z.B. 'reinigung')
     MosaVertical.set('garten')→ Branche wechseln (speichert + Backend)
     MosaVertical.preset()     → komplettes Preset-Objekt
     MosaVertical.t('objekt')  → Begriff der aktuellen Branche (Fallback reinigung)
     MosaVertical.modules()    → empfohlene Default-Module
     MosaVertical.apply()      → setzt alle [data-term]-Labels + Titel
   ============================================================ */
(function () {
  'use strict';

  // Reihenfolge = Anzeige-Reihenfolge im Branchen-Wähler.
  var PRESETS = {
    reinigung: {
      key: 'reinigung',
      label: 'Gebäudereinigung',
      // Begriffe — reinigung = heutige Wörter (nichts ändert sich optisch)
      terms: {
        objekt: 'Objekt',
        objektPlural: 'Objekte',
        objektKunde: 'Objekt / Kunde',
        adresseObjekt: 'Adresse / Objekt',
        feldMitarbeiter: 'Reiniger',
        feldMitarbeiterPlural: 'Reiniger',
        aktiveFeldMitarbeiter: 'Aktive Reiniger',
        anzahlFeld: 'Anzahl Reiniger',
        rolle: 'Reinigungskraft',
        feldStamm: 'Reiniger / Fahrer',
        feldAnsichtTitel: 'Reiniger-Ansicht öffnen',
        suchePlatzhalter: 'Objekt, Mitarbeiter, Kunde...'
      },
      modules: ['offerten', 'aufgaben', 'abos', 'berichte', 'zeiten', 'nachkalkulation', 'rechnungen'],
      checklist: [
        'Staubsauger & Ersatzbeutel an Bord',
        'Fensterwischer & Abzieher',
        'Reinigungsmittel & Tücher',
        'Müllsäcke',
        'Fahrzeug vollgetankt',
        'Schlüssel & Zugangscodes dabei'
      ],
      protocolTasks: ['Küche', 'Bad / WC', 'Böden gewischt', 'Staub gewischt', 'Müll entsorgt']
    },

    handwerk: {
      key: 'handwerk',
      label: 'Handwerk (Sanitär/Elektro/Maler/Heizung)',
      terms: {
        objekt: 'Baustelle',
        objektPlural: 'Baustellen',
        objektKunde: 'Baustelle / Kunde',
        adresseObjekt: 'Adresse / Baustelle',
        feldMitarbeiter: 'Monteur',
        feldMitarbeiterPlural: 'Monteure',
        aktiveFeldMitarbeiter: 'Aktive Monteure',
        anzahlFeld: 'Anzahl Monteure',
        rolle: 'Monteur',
        feldStamm: 'Monteur / Fahrer',
        feldAnsichtTitel: 'Monteur-Ansicht öffnen',
        suchePlatzhalter: 'Baustelle, Mitarbeiter, Kunde...'
      },
      modules: ['offerten', 'aufgaben', 'berichte', 'zeiten', 'nachkalkulation', 'rechnungen'],
      checklist: [
        'Werkzeugkoffer komplett',
        'Akkuschrauber & geladene Akkus',
        'Verbrauchsmaterial (Schrauben/Dübel/Dichtungen)',
        'Leiter / Tritt',
        'Arbeitsschutz (Brille/Handschuhe)',
        'Fahrzeug vollgetankt'
      ],
      protocolTasks: ['Material montiert', 'Funktion geprüft', 'Arbeitsbereich gereinigt', 'Kunde eingewiesen']
    },

    garten: {
      key: 'garten',
      label: 'Garten- / Landschaftsbau',
      terms: {
        objekt: 'Grundstück',
        objektPlural: 'Grundstücke',
        objektKunde: 'Grundstück / Kunde',
        adresseObjekt: 'Adresse / Grundstück',
        feldMitarbeiter: 'Gärtner',
        feldMitarbeiterPlural: 'Gärtner',
        aktiveFeldMitarbeiter: 'Aktive Gärtner',
        anzahlFeld: 'Anzahl Gärtner',
        rolle: 'Gärtner',
        feldStamm: 'Gärtner / Fahrer',
        feldAnsichtTitel: 'Gärtner-Ansicht öffnen',
        suchePlatzhalter: 'Grundstück, Mitarbeiter, Kunde...'
      },
      modules: ['offerten', 'aufgaben', 'abos', 'berichte', 'zeiten', 'rechnungen'],
      checklist: [
        'Rasenmäher & Treibstoff',
        'Heckenschere / Motorsense',
        'Schnittgut-Anhänger angekuppelt',
        'Handwerkzeug (Schere/Rechen/Spaten)',
        'Arbeitshandschuhe & Gehörschutz',
        'Fahrzeug vollgetankt'
      ],
      protocolTasks: ['Rasen gemäht', 'Hecken / Sträucher geschnitten', 'Schnittgut entsorgt', 'Wege gereinigt']
    },

    schaedling: {
      key: 'schaedling',
      label: 'Schädlingsbekämpfung / Hausmeister',
      terms: {
        objekt: 'Objekt',
        objektPlural: 'Objekte',
        objektKunde: 'Objekt / Kunde',
        adresseObjekt: 'Adresse / Objekt',
        feldMitarbeiter: 'Techniker',
        feldMitarbeiterPlural: 'Techniker',
        aktiveFeldMitarbeiter: 'Aktive Techniker',
        anzahlFeld: 'Anzahl Techniker',
        rolle: 'Schädlingstechniker',
        feldStamm: 'Techniker / Fahrer',
        feldAnsichtTitel: 'Techniker-Ansicht öffnen',
        suchePlatzhalter: 'Objekt, Mitarbeiter, Kunde...'
      },
      modules: ['offerten', 'aufgaben', 'abos', 'berichte', 'zeiten', 'rechnungen'],
      checklist: [
        'Köder & Fallen',
        'Sprühgerät & Bekämpfungsmittel',
        'Schutzausrüstung (Maske/Handschuhe/Overall)',
        'Dokumentations- & Warnschilder',
        'Sicherheitsdatenblätter dabei',
        'Fahrzeug vollgetankt'
      ],
      protocolTasks: ['Befall lokalisiert', 'Köder / Fallen platziert', 'Behandlung durchgeführt', 'Nachkontrolle vereinbart']
    },

    werkstatt: {
      key: 'werkstatt',
      label: 'Auto-Werkstatt',
      terms: {
        objekt: 'Fahrzeug',
        objektPlural: 'Fahrzeuge',
        objektKunde: 'Fahrzeug / Kunde',
        adresseObjekt: 'Fahrzeug / Kennzeichen',
        feldMitarbeiter: 'Mechaniker',
        feldMitarbeiterPlural: 'Mechaniker',
        aktiveFeldMitarbeiter: 'Aktive Mechaniker',
        anzahlFeld: 'Anzahl Mechaniker',
        rolle: 'Mechaniker',
        feldStamm: 'Mechaniker / Fahrer',
        feldAnsichtTitel: 'Mechaniker-Ansicht öffnen',
        suchePlatzhalter: 'Fahrzeug, Kennzeichen, Kunde...'
      },
      modules: ['offerten', 'aufgaben', 'berichte', 'zeiten', 'rechnungen'],
      checklist: [
        'Auftragsunterlagen / Arbeitskarte',
        'Benötigte Ersatzteile bereit',
        'Werkzeug & Diagnosegerät',
        'Hebebühne frei',
        'Schutzbezüge (Sitz/Lenkrad/Boden)'
      ],
      protocolTasks: ['Diagnose erstellt', 'Teile ersetzt', 'Probefahrt durchgeführt', 'Endkontrolle']
    }
  };

  var STORE_KEY = 'cc-vertical';
  var DEFAULT = 'reinigung';

  function get() {
    try {
      var v = localStorage.getItem(STORE_KEY);
      if (v && PRESETS[v]) return v;
    } catch (e) {}
    return DEFAULT;
  }

  function preset(key) {
    return PRESETS[key || get()] || PRESETS[DEFAULT];
  }

  // Begriff der aktuellen Branche; Fallback auf reinigung, dann auf den Key selbst.
  function t(termKey, vKey) {
    var p = preset(vKey);
    if (p.terms && p.terms[termKey] != null) return p.terms[termKey];
    var d = PRESETS[DEFAULT];
    if (d.terms && d.terms[termKey] != null) return d.terms[termKey];
    return termKey;
  }

  function modules(vKey) {
    return (preset(vKey).modules || []).slice();
  }

  function list() {
    return Object.keys(PRESETS).map(function (k) {
      return { key: k, label: PRESETS[k].label };
    });
  }

  // Setzt alle [data-term="..."]-Elemente + Platzhalter auf die aktuellen Begriffe.
  // reinigung => identische Texte wie bisher (kein sichtbarer Unterschied).
  function apply(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-term]').forEach(function (el) {
      var key = el.getAttribute('data-term');
      var val = t(key);
      if (el.hasAttribute('data-term-attr')) {
        el.setAttribute(el.getAttribute('data-term-attr'), val);
      } else {
        el.textContent = val;
      }
    });
  }

  function set(key, opts) {
    if (!PRESETS[key]) return false;
    try { localStorage.setItem(STORE_KEY, key); } catch (e) {}
    apply();
    // TODO (Folgeschritt): Branche am Mandanten im Backend speichern (company_settings.vertical),
    // damit die Mobile-App die Branche geräteübergreifend kennt. Phase 1 = nur lokal.
    document.dispatchEvent(new CustomEvent('mosa-vertical-changed', { detail: { vertical: key } }));
    return true;
  }

  window.MosaVertical = {
    get: get, set: set, preset: preset, t: t,
    modules: modules, list: list, apply: apply,
    PRESETS: PRESETS, DEFAULT: DEFAULT
  };

  // Begriffe sofort anwenden, sobald DOM bereit ist.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(); });
  } else {
    apply();
  }
})();
