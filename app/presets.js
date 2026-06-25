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

  // ── Branchen-Vokabular je Sprache (additiv, Deutsch = Quelle in PRESETS) ──
  // Nur Felder, die sich vom Deutschen unterscheiden. Fehlt ein Feld/eine Sprache,
  // greift automatisch der deutsche Wert aus PRESETS (siehe localize()).
  var L10N = {
    reinigung: {
      en: { label: 'Building cleaning', terms: {
        objekt: 'Site', objektPlural: 'Sites', objektKunde: 'Site / Customer', adresseObjekt: 'Address / Site',
        feldMitarbeiter: 'Cleaner', feldMitarbeiterPlural: 'Cleaners', aktiveFeldMitarbeiter: 'Active cleaners',
        anzahlFeld: 'Number of cleaners', rolle: 'Cleaning staff', feldStamm: 'Cleaner / Driver',
        feldAnsichtTitel: 'Open cleaner view', leistungsart: 'Cleaning type', suchePlatzhalter: 'Site, employee, customer...' } },
      fr: { label: 'Nettoyage de bâtiments', terms: {
        objekt: 'Site', objektPlural: 'Sites', objektKunde: 'Site / Client', adresseObjekt: 'Adresse / Site',
        feldMitarbeiter: 'Agent de nettoyage', feldMitarbeiterPlural: 'Agents de nettoyage', aktiveFeldMitarbeiter: 'Agents actifs',
        anzahlFeld: 'Nombre d\'agents', rolle: 'Agent de propreté', feldStamm: 'Agent / Chauffeur',
        feldAnsichtTitel: 'Ouvrir la vue agent', leistungsart: 'Type de nettoyage', suchePlatzhalter: 'Site, employé, client...' } },
      it: { label: 'Pulizia edifici', terms: {
        objekt: 'Sito', objektPlural: 'Siti', objektKunde: 'Sito / Cliente', adresseObjekt: 'Indirizzo / Sito',
        feldMitarbeiter: 'Addetto pulizie', feldMitarbeiterPlural: 'Addetti pulizie', aktiveFeldMitarbeiter: 'Addetti attivi',
        anzahlFeld: 'Numero di addetti', rolle: 'Addetto pulizie', feldStamm: 'Addetto / Autista',
        feldAnsichtTitel: 'Apri vista addetto', leistungsart: 'Tipo di pulizia', suchePlatzhalter: 'Sito, dipendente, cliente...' } },
      es: { label: 'Limpieza de edificios', terms: {
        objekt: 'Inmueble', objektPlural: 'Inmuebles', objektKunde: 'Inmueble / Cliente', adresseObjekt: 'Dirección / Inmueble',
        feldMitarbeiter: 'Limpiador', feldMitarbeiterPlural: 'Limpiadores', aktiveFeldMitarbeiter: 'Limpiadores activos',
        anzahlFeld: 'Número de limpiadores', rolle: 'Personal de limpieza', feldStamm: 'Limpiador / Conductor',
        feldAnsichtTitel: 'Abrir vista de limpiador', leistungsart: 'Tipo de limpieza', suchePlatzhalter: 'Inmueble, empleado, cliente...' } }
    },

    handwerk: {
      en: { label: 'Trades (plumbing/electrical/painting/heating)', terms: {
        objekt: 'Site', objektPlural: 'Sites', objektKunde: 'Site / Customer', adresseObjekt: 'Address / Site',
        feldMitarbeiter: 'Installer', feldMitarbeiterPlural: 'Installers', aktiveFeldMitarbeiter: 'Active installers',
        anzahlFeld: 'Number of installers', rolle: 'Installer', feldStamm: 'Installer / Driver',
        feldAnsichtTitel: 'Open installer view', leistungsart: 'Order type', suchePlatzhalter: 'Site, employee, customer...' },
        navLabels: { mitarbeiter: 'Installers', planung: 'Daily planning' },
        services: {
          installation: { title: 'Installation / Assembly', desc: 'New installation, on-site assembly' },
          reparatur: { title: 'Repair', desc: 'Fault clearance, restoration' },
          wartung: { title: 'Maintenance / Service', desc: 'Regular upkeep, service contract' },
          notfall: { title: 'Emergency call-out', desc: 'On-call / urgent fault' } } },
      fr: { label: 'Artisanat (sanitaire/électricité/peinture/chauffage)', terms: {
        objekt: 'Chantier', objektPlural: 'Chantiers', objektKunde: 'Chantier / Client', adresseObjekt: 'Adresse / Chantier',
        feldMitarbeiter: 'Monteur', feldMitarbeiterPlural: 'Monteurs', aktiveFeldMitarbeiter: 'Monteurs actifs',
        anzahlFeld: 'Nombre de monteurs', rolle: 'Monteur', feldStamm: 'Monteur / Chauffeur',
        feldAnsichtTitel: 'Ouvrir la vue monteur', leistungsart: 'Type de mandat', suchePlatzhalter: 'Chantier, employé, client...' },
        navLabels: { mitarbeiter: 'Monteurs', planung: 'Planning journalier' },
        services: {
          installation: { title: 'Installation / Montage', desc: 'Nouvelle installation, montage sur place' },
          reparatur: { title: 'Réparation', desc: 'Dépannage, remise en état' },
          wartung: { title: 'Entretien / Service', desc: 'Entretien régulier, contrat de service' },
          notfall: { title: 'Intervention d\'urgence', desc: 'Piquet / panne urgente' } } },
      it: { label: 'Artigianato (idraulica/elettrico/pittura/riscaldamento)', terms: {
        objekt: 'Cantiere', objektPlural: 'Cantieri', objektKunde: 'Cantiere / Cliente', adresseObjekt: 'Indirizzo / Cantiere',
        feldMitarbeiter: 'Montatore', feldMitarbeiterPlural: 'Montatori', aktiveFeldMitarbeiter: 'Montatori attivi',
        anzahlFeld: 'Numero di montatori', rolle: 'Montatore', feldStamm: 'Montatore / Autista',
        feldAnsichtTitel: 'Apri vista montatore', leistungsart: 'Tipo di ordine', suchePlatzhalter: 'Cantiere, dipendente, cliente...' },
        navLabels: { mitarbeiter: 'Montatori', planung: 'Pianificazione giornaliera' },
        services: {
          installation: { title: 'Installazione / Montaggio', desc: 'Nuova installazione, montaggio in loco' },
          reparatur: { title: 'Riparazione', desc: 'Eliminazione guasti, ripristino' },
          wartung: { title: 'Manutenzione / Service', desc: 'Manutenzione regolare, contratto di servizio' },
          notfall: { title: 'Intervento d\'emergenza', desc: 'Reperibilità / guasto urgente' } } },
      es: { label: 'Oficios (fontanería/electricidad/pintura/calefacción)', terms: {
        objekt: 'Obra', objektPlural: 'Obras', objektKunde: 'Obra / Cliente', adresseObjekt: 'Dirección / Obra',
        feldMitarbeiter: 'Montador', feldMitarbeiterPlural: 'Montadores', aktiveFeldMitarbeiter: 'Montadores activos',
        anzahlFeld: 'Número de montadores', rolle: 'Montador', feldStamm: 'Montador / Conductor',
        feldAnsichtTitel: 'Abrir vista de montador', leistungsart: 'Tipo de pedido', suchePlatzhalter: 'Obra, empleado, cliente...' },
        navLabels: { mitarbeiter: 'Montadores', planung: 'Planificación diaria' },
        services: {
          installation: { title: 'Instalación / Montaje', desc: 'Nueva instalación, montaje in situ' },
          reparatur: { title: 'Reparación', desc: 'Resolución de averías, reparación' },
          wartung: { title: 'Mantenimiento / Servicio', desc: 'Mantenimiento regular, contrato de servicio' },
          notfall: { title: 'Intervención de emergencia', desc: 'Guardia / avería urgente' } } }
    },

    garten: {
      en: { label: 'Garden / Landscaping', terms: {
        objekt: 'Property', objektPlural: 'Properties', objektKunde: 'Property / Customer', adresseObjekt: 'Address / Property',
        feldMitarbeiter: 'Gardener', feldMitarbeiterPlural: 'Gardeners', aktiveFeldMitarbeiter: 'Active gardeners',
        anzahlFeld: 'Number of gardeners', rolle: 'Gardener', feldStamm: 'Gardener / Driver',
        feldAnsichtTitel: 'Open gardener view', leistungsart: 'Service type', suchePlatzhalter: 'Property, employee, customer...' },
        navLabels: { baustellen: 'Garden projects', mitarbeiter: 'Gardeners', planung: 'Route planning', abos: 'Maintenance contracts' },
        services: {
          rasen: { title: 'Lawn care', desc: 'Mowing, scarifying, fertilising' },
          hecke: { title: 'Hedge trimming', desc: 'Cutting, shaping, disposal' },
          pflanzung: { title: 'Planting / Design', desc: 'Planting, redesign' },
          unterhalt: { title: 'Garden maintenance', desc: 'Regular care (subscription)' } } },
      fr: { label: 'Jardinage / Paysagisme', terms: {
        objekt: 'Terrain', objektPlural: 'Terrains', objektKunde: 'Terrain / Client', adresseObjekt: 'Adresse / Terrain',
        feldMitarbeiter: 'Jardinier', feldMitarbeiterPlural: 'Jardiniers', aktiveFeldMitarbeiter: 'Jardiniers actifs',
        anzahlFeld: 'Nombre de jardiniers', rolle: 'Jardinier', feldStamm: 'Jardinier / Chauffeur',
        feldAnsichtTitel: 'Ouvrir la vue jardinier', leistungsart: 'Type de prestation', suchePlatzhalter: 'Terrain, employé, client...' },
        navLabels: { baustellen: 'Projets de jardin', mitarbeiter: 'Jardiniers', planung: 'Planification des tournées', abos: 'Contrats d\'entretien' },
        services: {
          rasen: { title: 'Entretien de pelouse', desc: 'Tonte, scarification, fertilisation' },
          hecke: { title: 'Taille de haies', desc: 'Coupe, taille de forme, évacuation' },
          pflanzung: { title: 'Plantation / Aménagement', desc: 'Plantation, réaménagement' },
          unterhalt: { title: 'Entretien de jardin', desc: 'Entretien régulier (abonnement)' } } },
      it: { label: 'Giardinaggio / Paesaggistica', terms: {
        objekt: 'Terreno', objektPlural: 'Terreni', objektKunde: 'Terreno / Cliente', adresseObjekt: 'Indirizzo / Terreno',
        feldMitarbeiter: 'Giardiniere', feldMitarbeiterPlural: 'Giardinieri', aktiveFeldMitarbeiter: 'Giardinieri attivi',
        anzahlFeld: 'Numero di giardinieri', rolle: 'Giardiniere', feldStamm: 'Giardiniere / Autista',
        feldAnsichtTitel: 'Apri vista giardiniere', leistungsart: 'Tipo di prestazione', suchePlatzhalter: 'Terreno, dipendente, cliente...' },
        navLabels: { baustellen: 'Progetti giardino', mitarbeiter: 'Giardinieri', planung: 'Pianificazione giri', abos: 'Contratti di manutenzione' },
        services: {
          rasen: { title: 'Cura del prato', desc: 'Taglio, arieggiatura, concimazione' },
          hecke: { title: 'Taglio siepi', desc: 'Taglio, modellatura, smaltimento' },
          pflanzung: { title: 'Piantumazione / Progettazione', desc: 'Piantumazione, riprogettazione' },
          unterhalt: { title: 'Manutenzione giardino', desc: 'Cura regolare (abbonamento)' } } },
      es: { label: 'Jardinería / Paisajismo', terms: {
        objekt: 'Terreno', objektPlural: 'Terrenos', objektKunde: 'Terreno / Cliente', adresseObjekt: 'Dirección / Terreno',
        feldMitarbeiter: 'Jardinero', feldMitarbeiterPlural: 'Jardineros', aktiveFeldMitarbeiter: 'Jardineros activos',
        anzahlFeld: 'Número de jardineros', rolle: 'Jardinero', feldStamm: 'Jardinero / Conductor',
        feldAnsichtTitel: 'Abrir vista de jardinero', leistungsart: 'Tipo de servicio', suchePlatzhalter: 'Terreno, empleado, cliente...' },
        navLabels: { baustellen: 'Proyectos de jardín', mitarbeiter: 'Jardineros', planung: 'Planificación de rutas', abos: 'Contratos de mantenimiento' },
        services: {
          rasen: { title: 'Cuidado del césped', desc: 'Siega, escarificado, abonado' },
          hecke: { title: 'Poda de setos', desc: 'Corte, perfilado, retirada' },
          pflanzung: { title: 'Plantación / Diseño', desc: 'Plantación, rediseño' },
          unterhalt: { title: 'Mantenimiento de jardín', desc: 'Cuidado regular (suscripción)' } } }
    },

    schaedling: {
      en: { label: 'Pest control / Caretaking', terms: {
        objekt: 'Site', objektPlural: 'Sites', objektKunde: 'Site / Customer', adresseObjekt: 'Address / Site',
        feldMitarbeiter: 'Technician', feldMitarbeiterPlural: 'Technicians', aktiveFeldMitarbeiter: 'Active technicians',
        anzahlFeld: 'Number of technicians', rolle: 'Pest control technician', feldStamm: 'Technician / Driver',
        feldAnsichtTitel: 'Open technician view', leistungsart: 'Order type', suchePlatzhalter: 'Site, employee, customer...' },
        navLabels: { planung: 'Job planning', mitarbeiter: 'Technicians', abos: 'Monitoring contracts' },
        services: {
          inspektion: { title: 'Initial inspection', desc: 'On-site infestation analysis' },
          bekaempfung: { title: 'Treatment', desc: 'Treatment against pests' },
          nachkontrolle: { title: 'Follow-up check', desc: 'Effectiveness check, follow-up treatment' },
          monitoring: { title: 'Monitoring contract', desc: 'Regular inspection (subscription)' } },
        extraFields: {
          befall: { label: 'Type of infestation', placeholder: 'e.g. rats, cockroaches, wasps' },
          nachkontrolle: { label: 'Follow-up check on' } } },
      fr: { label: 'Lutte antiparasitaire / Conciergerie', terms: {
        objekt: 'Site', objektPlural: 'Sites', objektKunde: 'Site / Client', adresseObjekt: 'Adresse / Site',
        feldMitarbeiter: 'Technicien', feldMitarbeiterPlural: 'Techniciens', aktiveFeldMitarbeiter: 'Techniciens actifs',
        anzahlFeld: 'Nombre de techniciens', rolle: 'Technicien antiparasitaire', feldStamm: 'Technicien / Chauffeur',
        feldAnsichtTitel: 'Ouvrir la vue technicien', leistungsart: 'Type de mandat', suchePlatzhalter: 'Site, employé, client...' },
        navLabels: { planung: 'Planification des interventions', mitarbeiter: 'Techniciens', abos: 'Contrats de monitoring' },
        services: {
          inspektion: { title: 'Inspection initiale', desc: 'Analyse de l\'infestation sur place' },
          bekaempfung: { title: 'Traitement', desc: 'Traitement contre les nuisibles' },
          nachkontrolle: { title: 'Contrôle de suivi', desc: 'Contrôle d\'efficacité, traitement complémentaire' },
          monitoring: { title: 'Contrat de monitoring', desc: 'Contrôle régulier (abonnement)' } },
        extraFields: {
          befall: { label: 'Type d\'infestation', placeholder: 'p. ex. rats, cafards, guêpes' },
          nachkontrolle: { label: 'Contrôle de suivi le' } } },
      it: { label: 'Disinfestazione / Custodia', terms: {
        objekt: 'Sito', objektPlural: 'Siti', objektKunde: 'Sito / Cliente', adresseObjekt: 'Indirizzo / Sito',
        feldMitarbeiter: 'Tecnico', feldMitarbeiterPlural: 'Tecnici', aktiveFeldMitarbeiter: 'Tecnici attivi',
        anzahlFeld: 'Numero di tecnici', rolle: 'Tecnico disinfestatore', feldStamm: 'Tecnico / Autista',
        feldAnsichtTitel: 'Apri vista tecnico', leistungsart: 'Tipo di ordine', suchePlatzhalter: 'Sito, dipendente, cliente...' },
        navLabels: { planung: 'Pianificazione interventi', mitarbeiter: 'Tecnici', abos: 'Contratti di monitoraggio' },
        services: {
          inspektion: { title: 'Ispezione iniziale', desc: 'Analisi dell\'infestazione in loco' },
          bekaempfung: { title: 'Disinfestazione', desc: 'Trattamento contro i parassiti' },
          nachkontrolle: { title: 'Controllo successivo', desc: 'Controllo dell\'efficacia, ritrattamento' },
          monitoring: { title: 'Contratto di monitoraggio', desc: 'Controllo regolare (abbonamento)' } },
        extraFields: {
          befall: { label: 'Tipo di infestazione', placeholder: 'es. ratti, scarafaggi, vespe' },
          nachkontrolle: { label: 'Controllo successivo il' } } },
      es: { label: 'Control de plagas / Conserjería', terms: {
        objekt: 'Inmueble', objektPlural: 'Inmuebles', objektKunde: 'Inmueble / Cliente', adresseObjekt: 'Dirección / Inmueble',
        feldMitarbeiter: 'Técnico', feldMitarbeiterPlural: 'Técnicos', aktiveFeldMitarbeiter: 'Técnicos activos',
        anzahlFeld: 'Número de técnicos', rolle: 'Técnico de plagas', feldStamm: 'Técnico / Conductor',
        feldAnsichtTitel: 'Abrir vista de técnico', leistungsart: 'Tipo de pedido', suchePlatzhalter: 'Inmueble, empleado, cliente...' },
        navLabels: { planung: 'Planificación de intervenciones', mitarbeiter: 'Técnicos', abos: 'Contratos de monitoreo' },
        services: {
          inspektion: { title: 'Inspección inicial', desc: 'Análisis de la plaga in situ' },
          bekaempfung: { title: 'Tratamiento', desc: 'Tratamiento contra plagas' },
          nachkontrolle: { title: 'Control posterior', desc: 'Control de eficacia, retratamiento' },
          monitoring: { title: 'Contrato de monitoreo', desc: 'Control regular (suscripción)' } },
        extraFields: {
          befall: { label: 'Tipo de plaga', placeholder: 'p. ej. ratas, cucarachas, avispas' },
          nachkontrolle: { label: 'Control posterior el' } } }
    },

    werkstatt: {
      en: { label: 'Car garage', terms: {
        objekt: 'Vehicle', objektPlural: 'Vehicles', objektKunde: 'Vehicle / Customer', adresseObjekt: 'Vehicle / Plate',
        feldMitarbeiter: 'Mechanic', feldMitarbeiterPlural: 'Mechanics', aktiveFeldMitarbeiter: 'Active mechanics',
        anzahlFeld: 'Number of mechanics', rolle: 'Mechanic', feldStamm: 'Mechanic / Driver',
        feldAnsichtTitel: 'Open mechanic view', leistungsart: 'Order type', suchePlatzhalter: 'Vehicle, plate, customer...' },
        navLabels: { offerten: 'Cost estimate', mitarbeiter: 'Mechanics', berichte: 'Reports' },
        services: {
          service: { title: 'Service / Inspection', desc: 'Maintenance per manufacturer spec' },
          reparatur: { title: 'Repair', desc: 'Restoration, parts replacement' },
          diagnose: { title: 'Diagnostics', desc: 'Fault finding, reading the fault memory' },
          reifen: { title: 'Tyre change', desc: 'Change, balancing, storage' } },
        extraFields: {
          kennzeichen: { label: 'Number plate', placeholder: 'e.g. ZH 123 456' },
          fahrzeug: { label: 'Vehicle (make / model)', placeholder: 'e.g. VW Golf 1.4 TSI' },
          km: { label: 'Mileage', placeholder: 'km' } } },
      fr: { label: 'Garage automobile', terms: {
        objekt: 'Véhicule', objektPlural: 'Véhicules', objektKunde: 'Véhicule / Client', adresseObjekt: 'Véhicule / Plaque',
        feldMitarbeiter: 'Mécanicien', feldMitarbeiterPlural: 'Mécaniciens', aktiveFeldMitarbeiter: 'Mécaniciens actifs',
        anzahlFeld: 'Nombre de mécaniciens', rolle: 'Mécanicien', feldStamm: 'Mécanicien / Chauffeur',
        feldAnsichtTitel: 'Ouvrir la vue mécanicien', leistungsart: 'Type de mandat', suchePlatzhalter: 'Véhicule, plaque, client...' },
        navLabels: { offerten: 'Devis estimatif', mitarbeiter: 'Mécaniciens', berichte: 'Rapports' },
        services: {
          service: { title: 'Service / Inspection', desc: 'Entretien selon les prescriptions du constructeur' },
          reparatur: { title: 'Réparation', desc: 'Remise en état, remplacement de pièces' },
          diagnose: { title: 'Diagnostic', desc: 'Recherche de pannes, lecture de la mémoire de défauts' },
          reifen: { title: 'Changement de pneus', desc: 'Changement, équilibrage, stockage' } },
        extraFields: {
          kennzeichen: { label: 'Plaque d\'immatriculation', placeholder: 'p. ex. ZH 123 456' },
          fahrzeug: { label: 'Véhicule (marque / modèle)', placeholder: 'p. ex. VW Golf 1.4 TSI' },
          km: { label: 'Kilométrage', placeholder: 'km' } } },
      it: { label: 'Officina auto', terms: {
        objekt: 'Veicolo', objektPlural: 'Veicoli', objektKunde: 'Veicolo / Cliente', adresseObjekt: 'Veicolo / Targa',
        feldMitarbeiter: 'Meccanico', feldMitarbeiterPlural: 'Meccanici', aktiveFeldMitarbeiter: 'Meccanici attivi',
        anzahlFeld: 'Numero di meccanici', rolle: 'Meccanico', feldStamm: 'Meccanico / Autista',
        feldAnsichtTitel: 'Apri vista meccanico', leistungsart: 'Tipo di ordine', suchePlatzhalter: 'Veicolo, targa, cliente...' },
        navLabels: { offerten: 'Preventivo', mitarbeiter: 'Meccanici', berichte: 'Rapporti' },
        services: {
          service: { title: 'Tagliando / Ispezione', desc: 'Manutenzione secondo le specifiche del produttore' },
          reparatur: { title: 'Riparazione', desc: 'Ripristino, sostituzione ricambi' },
          diagnose: { title: 'Diagnosi', desc: 'Ricerca guasti, lettura memoria errori' },
          reifen: { title: 'Cambio gomme', desc: 'Cambio, equilibratura, deposito' } },
        extraFields: {
          kennzeichen: { label: 'Targa', placeholder: 'es. ZH 123 456' },
          fahrzeug: { label: 'Veicolo (marca / modello)', placeholder: 'es. VW Golf 1.4 TSI' },
          km: { label: 'Chilometraggio', placeholder: 'km' } } },
      es: { label: 'Taller de coches', terms: {
        objekt: 'Vehículo', objektPlural: 'Vehículos', objektKunde: 'Vehículo / Cliente', adresseObjekt: 'Vehículo / Matrícula',
        feldMitarbeiter: 'Mecánico', feldMitarbeiterPlural: 'Mecánicos', aktiveFeldMitarbeiter: 'Mecánicos activos',
        anzahlFeld: 'Número de mecánicos', rolle: 'Mecánico', feldStamm: 'Mecánico / Conductor',
        feldAnsichtTitel: 'Abrir vista de mecánico', leistungsart: 'Tipo de pedido', suchePlatzhalter: 'Vehículo, matrícula, cliente...' },
        navLabels: { offerten: 'Presupuesto', mitarbeiter: 'Mecánicos', berichte: 'Partes' },
        services: {
          service: { title: 'Servicio / Inspección', desc: 'Mantenimiento según especificaciones del fabricante' },
          reparatur: { title: 'Reparación', desc: 'Reparación, sustitución de piezas' },
          diagnose: { title: 'Diagnóstico', desc: 'Búsqueda de fallos, lectura de la memoria de averías' },
          reifen: { title: 'Cambio de neumáticos', desc: 'Cambio, equilibrado, almacenaje' } },
        extraFields: {
          kennzeichen: { label: 'Matrícula', placeholder: 'p. ej. ZH 123 456' },
          fahrzeug: { label: 'Vehículo (marca / modelo)', placeholder: 'p. ej. VW Golf 1.4 TSI' },
          km: { label: 'Kilometraje', placeholder: 'km' } } }
    }
  };

  function get() {
    try {
      var v = localStorage.getItem(STORE_KEY);
      if (v && PRESETS[v]) return v;
    } catch (e) {}
    return DEFAULT;
  }

  // Aktuelle App-Sprache (geteilt mit der i18n-Engine). Ohne MosaI18n → Deutsch.
  function currentLang() {
    try { if (window.MosaI18n && typeof window.MosaI18n.get === 'function') return window.MosaI18n.get(); } catch (e) {}
    return 'de';
  }

  // Gibt eine sprach-lokalisierte Kopie des Presets zurück. Deutsch (oder fehlende
  // Übersetzung) → das Original-Objekt unverändert (kein Klon, kein Verhaltenswechsel).
  // Nur die sichtbaren Vokabular-Felder werden überlagert; modules/hideViews/checklist/
  // protocolTasks usw. bleiben aus dem Original erhalten.
  function localize(p, lang) {
    if (!p) return p;
    var lng = lang || currentLang();
    var tr = (lng !== 'de' && L10N[p.key]) ? L10N[p.key][lng] : null;
    if (!tr) return p;
    var out = {};
    for (var k in p) { if (Object.prototype.hasOwnProperty.call(p, k)) out[k] = p[k]; }
    if (tr.label) out.label = tr.label;
    if (p.terms) {
      out.terms = {};
      for (var tk in p.terms) out.terms[tk] = (tr.terms && tr.terms[tk] != null) ? tr.terms[tk] : p.terms[tk];
    }
    if (p.navLabels) {
      out.navLabels = {};
      for (var nk in p.navLabels) out.navLabels[nk] = (tr.navLabels && tr.navLabels[nk] != null) ? tr.navLabels[nk] : p.navLabels[nk];
    }
    if (p.services) {
      out.services = p.services.map(function (s) {
        var st = tr.services && tr.services[s.key];
        if (!st) return s;
        var ns = {}; for (var sk in s) ns[sk] = s[sk];
        if (st.title != null) ns.title = st.title;
        if (st.desc != null) ns.desc = st.desc;
        return ns;
      });
    }
    if (p.extraFields) {
      out.extraFields = p.extraFields.map(function (f) {
        var ft = tr.extraFields && tr.extraFields[f.key];
        if (!ft) return f;
        var nf = {}; for (var fk in f) nf[fk] = f[fk];
        if (ft.label != null) nf.label = ft.label;
        if (ft.placeholder != null) nf.placeholder = ft.placeholder;
        return nf;
      });
    }
    return out;
  }

  function preset(key) {
    return localize(PRESETS[key || get()] || PRESETS[DEFAULT], currentLang());
  }

  // Begriff der aktuellen Branche (sprach-lokalisiert); Fallback reinigung → Key.
  function t(termKey, vKey) {
    var p = preset(vKey);
    if (p.terms && p.terms[termKey] != null) return p.terms[termKey];
    var d = localize(PRESETS[DEFAULT], currentLang());
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
    var lng = currentLang();
    return Object.keys(PRESETS).map(function (k) {
      var tl = (lng !== 'de' && L10N[k] && L10N[k][lng]) ? L10N[k][lng].label : null;
      return { key: k, label: tl || PRESETS[k].label };
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
    // Hinweis: set() schreibt nur lokal (cc-vertical). Der geräteübergreifende Sync läuft über das
    // Firmenprofil — die Aufrufer (app.html onVerticalChange, onboarding.html) speichern company.vertical,
    // das via company_settings.profile (JSONB) synct und beim Login mit applyVerticalFromCompany() greift.
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
