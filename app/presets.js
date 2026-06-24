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
        leistungsart: 'Reinigungsart',
        suchePlatzhalter: 'Objekt, Mitarbeiter, Kunde...'
      },
      modules: ['offerten', 'aufgaben', 'abos', 'berichte', 'zeiten', 'nachkalkulation', 'rechnungen'],
      // hideViews = Module, die diese Branche grundsätzlich NICHT braucht (zusätzlich zur Abo-Schaltung ausgeblendet).
      // extraViews = branchen-eigene Module, die es nur hier gibt.
      hideViews: [],
      extraViews: [],
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
        leistungsart: 'Auftragsart',
        suchePlatzhalter: 'Baustelle, Mitarbeiter, Kunde...'
      },
      modules: ['offerten', 'aufgaben', 'berichte', 'zeiten', 'nachkalkulation', 'rechnungen'],
      hideViews: ['abos'],         // Handwerk: keine wiederkehrenden Abo-Verträge
      // Handwerk: projekt-/baustellenbasiert. Eigene Module: Baustellen-Board + Arbeitsrapporte (Regie).
      extraViews: ['baustellen', 'rapporte'],
      navLabels: { mitarbeiter: 'Monteure', planung: 'Tagesplanung' },
      checklist: [
        'Werkzeugkoffer komplett',
        'Akkuschrauber & geladene Akkus',
        'Verbrauchsmaterial (Schrauben/Dübel/Dichtungen)',
        'Leiter / Tritt',
        'Arbeitsschutz (Brille/Handschuhe)',
        'Fahrzeug vollgetankt'
      ],
      protocolTasks: ['Material montiert', 'Funktion geprüft', 'Arbeitsbereich gereinigt', 'Kunde eingewiesen'],
      // Leistungs-Vorlagen (Platzhalter-Preise CHF — vom Kunden anpassbar). unit: 'h' = pro Stunde, 'flat' = pauschal.
      services: [
        { key: 'installation', title: 'Installation / Montage', desc: 'Neuinstallation, Montage vor Ort', unit: 'h', price: 95 },
        { key: 'reparatur', title: 'Reparatur', desc: 'Störungsbehebung, Instandsetzung', unit: 'h', price: 110 },
        { key: 'wartung', title: 'Wartung / Service', desc: 'Regelmäßiger Unterhalt, Servicevertrag', unit: 'flat', price: 180 },
        { key: 'notfall', title: 'Notfall-Einsatz', desc: 'Pikett / dringende Störung', unit: 'h', price: 150 }
      ]
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
        leistungsart: 'Leistungsart',
        suchePlatzhalter: 'Grundstück, Mitarbeiter, Kunde...'
      },
      modules: ['offerten', 'aufgaben', 'abos', 'berichte', 'zeiten', 'rechnungen'],
      hideViews: ['nachkalkulation'],   // Garten: Pauschal-/Stundenarbeit, keine Soll/Ist-Nachkalkulation
      // Garten: projektbasiert wie Handwerk (Gartenprojekte + Rapporte) + saisonaler Unterhalt (Abo).
      extraViews: ['baustellen', 'rapporte'],
      navLabels: { baustellen: 'Gartenprojekte', mitarbeiter: 'Gärtner', planung: 'Tourenplanung', abos: 'Unterhaltsverträge' },
      checklist: [
        'Rasenmäher & Treibstoff',
        'Heckenschere / Motorsense',
        'Schnittgut-Anhänger angekuppelt',
        'Handwerkzeug (Schere/Rechen/Spaten)',
        'Arbeitshandschuhe & Gehörschutz',
        'Fahrzeug vollgetankt'
      ],
      protocolTasks: ['Rasen gemäht', 'Hecken / Sträucher geschnitten', 'Schnittgut entsorgt', 'Wege gereinigt'],
      services: [
        { key: 'rasen', title: 'Rasenpflege', desc: 'Mähen, Vertikutieren, Düngen', unit: 'h', price: 75 },
        { key: 'hecke', title: 'Heckenschnitt', desc: 'Schneiden, Formschnitt, Entsorgung', unit: 'h', price: 80 },
        { key: 'pflanzung', title: 'Pflanzung / Gestaltung', desc: 'Bepflanzung, Umgestaltung', unit: 'flat', price: 0 },
        { key: 'unterhalt', title: 'Gartenunterhalt', desc: 'Regelmäßige Pflege (Abo)', unit: 'flat', price: 120 }
      ]
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
        leistungsart: 'Auftragsart',
        suchePlatzhalter: 'Objekt, Mitarbeiter, Kunde...'
      },
      modules: ['offerten', 'aufgaben', 'abos', 'berichte', 'zeiten', 'rechnungen'],
      hideViews: ['nachkalkulation'],
      // Schädling: Techniker fahren zu Objekten (Routen bleiben). Eigene Module:
      // Köderstellen-Monitoring + rechtssichere Kontroll-/Behandlungsprotokolle.
      extraViews: ['koederstellen', 'protokolle'],
      navLabels: { planung: 'Einsatzplanung', mitarbeiter: 'Techniker', abos: 'Monitoring-Verträge' },
      checklist: [
        'Köder & Fallen',
        'Sprühgerät & Bekämpfungsmittel',
        'Schutzausrüstung (Maske/Handschuhe/Overall)',
        'Dokumentations- & Warnschilder',
        'Sicherheitsdatenblätter dabei',
        'Fahrzeug vollgetankt'
      ],
      protocolTasks: ['Befall lokalisiert', 'Köder / Fallen platziert', 'Behandlung durchgeführt', 'Nachkontrolle vereinbart'],
      services: [
        { key: 'inspektion', title: 'Erstinspektion', desc: 'Befallsanalyse vor Ort', unit: 'flat', price: 150 },
        { key: 'bekaempfung', title: 'Bekämpfung', desc: 'Behandlung gegen Schädlinge', unit: 'flat', price: 280 },
        { key: 'nachkontrolle', title: 'Nachkontrolle', desc: 'Wirkungskontrolle, Nachbehandlung', unit: 'flat', price: 90 },
        { key: 'monitoring', title: 'Monitoring-Vertrag', desc: 'Regelmäßige Kontrolle (Abo)', unit: 'flat', price: 200 }
      ],
      extraFields: [
        { key: 'befall', label: 'Befallsart', type: 'text', placeholder: 'z. B. Ratten, Schaben, Wespen' },
        { key: 'nachkontrolle', label: 'Nachkontrolle am', type: 'date' }
      ]
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
        leistungsart: 'Auftragsart',
        suchePlatzhalter: 'Fahrzeug, Kennzeichen, Kunde...'
      },
      modules: ['offerten', 'aufgaben', 'berichte', 'zeiten', 'rechnungen'],
      // Werkstatt: Autos kommen IN die Werkstatt → keine Routenplanung, keine Abos.
      // Dafür ein eigenes Modul: Fahrzeug-Akte.
      hideViews: ['planung', 'abos'],
      extraViews: ['werkstattplan', 'fahrzeuge', 'reifen'],
      // Saubere Garagen-Begriffe in der Seitenleiste (überschreibt Standard-Nav-Labels).
      navLabels: { offerten: 'Kostenvoranschlag', mitarbeiter: 'Mechaniker', berichte: 'Rapporte' },
      checklist: [
        'Auftragsunterlagen / Arbeitskarte',
        'Benötigte Ersatzteile bereit',
        'Werkzeug & Diagnosegerät',
        'Hebebühne frei',
        'Schutzbezüge (Sitz/Lenkrad/Boden)'
      ],
      protocolTasks: ['Diagnose erstellt', 'Teile ersetzt', 'Probefahrt durchgeführt', 'Endkontrolle'],
      services: [
        { key: 'service', title: 'Service / Inspektion', desc: 'Wartung nach Herstellervorgabe', unit: 'flat', price: 280 },
        { key: 'reparatur', title: 'Reparatur', desc: 'Instandsetzung, Teiletausch', unit: 'h', price: 140 },
        { key: 'diagnose', title: 'Diagnose', desc: 'Fehlersuche, Fehlerspeicher auslesen', unit: 'flat', price: 120 },
        { key: 'reifen', title: 'Reifenwechsel', desc: 'Wechsel, Wuchten, Einlagerung', unit: 'flat', price: 80 }
      ],
      extraFields: [
        { key: 'kennzeichen', label: 'Kennzeichen', type: 'text', placeholder: 'z. B. ZH 123 456' },
        { key: 'fahrzeug', label: 'Fahrzeug (Marke / Modell)', type: 'text', placeholder: 'z. B. VW Golf 1.4 TSI' },
        { key: 'km', label: 'Kilometerstand', type: 'text', placeholder: 'km' }
      ]
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

  // Module, die diese Branche grundsätzlich nicht braucht (Sidebar-Views ausblenden).
  function hiddenViews(vKey) {
    return (preset(vKey).hideViews || []).slice();
  }

  // Branchen-eigene Module (Views), die es nur in dieser Branche gibt.
  function extraViews(vKey) {
    return (preset(vKey).extraViews || []).slice();
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
    modules: modules, hiddenViews: hiddenViews, extraViews: extraViews,
    list: list, apply: apply,
    PRESETS: PRESETS, DEFAULT: DEFAULT
  };

  // Begriffe sofort anwenden, sobald DOM bereit ist.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(); });
  } else {
    apply();
  }
})();
