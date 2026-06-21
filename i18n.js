/* ============================================================
   TESSERA · i18n
   ------------------------------------------------------------
   Sprache wird automatisch nach Browser/Region erkannt.
   Switch im Footer überschreibt manuell (in localStorage).
   Elemente mit [data-i18n="key"] werden übersetzt.
   ============================================================ */
(function () {
  const DICT = {
    de: {
      'nav.branchen': 'Branchen',
      'nav.how': 'Wie es funktioniert',
      'nav.module': 'Module',
      'nav.preise': 'Preise',
      'nav.login': 'Login',
      'nav.demo': 'Demo testen',

      'hero.badge': 'Made in Switzerland · DSG-konform',
      'hero.title.line1': 'Eine&nbsp;Plattform.',
      'hero.title.line2': 'Jede Branche.',
      'hero.sub': 'Reinigung, Handwerk, Immobilien — du wählst deine Branche, stellst die Module zusammen, die du brauchst, und legst los. In unter 30 Minuten startklar.',
      'hero.cta.primary': 'Demo testen',
      'hero.cta.secondary': 'Wie funktioniert das?',
      'hero.trust.1': 'Daten in der Schweiz',
      'hero.trust.2': 'Keine Vertragsbindung',
      'hero.trust.3': '14 Tage gratis testen',

      'strip.label': 'Gebaut für Schweizer KMU',
      'strip.1': '🇨🇭 Hosting in der Schweiz',
      'strip.2': '🔒 DSG & DSGVO',
      'strip.3': '⚡ Setup in 30 Min',
      'strip.4': '📱 Mobile + Desktop',
      'strip.5': '💬 Support auf Deutsch',

      'branchen.eyebrow': 'Branchen',
      'branchen.title': 'Für deine Branche gebaut.',
      'branchen.sub': 'Statt Software, die für alle und niemanden ist: jede Tessera-Variante kennt die Eigenheiten deines Geschäfts. Drei Branchen sind live, weitere kommen — oder wir bauen deine.',

      'how.eyebrow': 'So funktioniert es',
      'how.title': 'In drei Schritten startklar.',
      'how.sub': 'Kein Verkaufsgespräch nötig. Kein Onboarding-Workshop. Du klickst dich selbst durch.',

      'module.eyebrow': 'Module',
      'module.title': 'Stell dir deine Tessera zusammen.',
      'module.sub': 'Klick die Module an, die du brauchst. Der Preis aktualisiert sich live.',

      'cta.title': 'Bereit, dein Büro endlich aufzuräumen?',
      'cta.sub': '14 Tage gratis, keine Kreditkarte. Wenn\'s nichts ist, klickst du auf "Account löschen" und fertig.',
      'cta.primary': 'Demo testen',
      'cta.secondary': 'Beratung anfragen',

      'footer.tagline': 'Modulare Software für Schweizer KMU. Eine Plattform, jede Branche.',
      'footer.col.product': 'Produkt',
      'footer.col.company': 'Unternehmen',
      'footer.col.legal': 'Rechtliches',
      'footer.about': 'Über uns',
      'footer.contact': 'Kontakt',
      'footer.imprint': 'Impressum',
      'footer.terms': 'AGB',
      'footer.privacy': 'Datenschutz',

      'branche.reinigung': 'Reinigung',
      'branche.reinigung.desc': 'Routenplanung, Mitarbeiter-Disposition, Kundenstamm mit Anrufprotokoll, Foto-Nachweise, CSV für den Steuerberater.',
      'branche.reinigung.f1': 'Tages-Crew-Planung mit Drag-Logik',
      'branche.reinigung.f2': 'Anrufprotokoll mit Rückruf-Tracking',
      'branche.reinigung.f3': 'Foto-Doku + QR-Anwesenheit',
      'branche.reinigung.cta': 'Demo öffnen',
      'branche.handwerk': 'Handwerk',
      'branche.handwerk.desc': 'Aufträge, Materialliste, Stundenrapport im Feld via Mobile, Offerten als PDF, Materialbestellung direkt aus dem Auftrag.',
      'branche.handwerk.f1': 'Stundenerfassung mit GPS-Stempel',
      'branche.handwerk.f2': 'Materialwirtschaft + Lieferantenkatalog',
      'branche.handwerk.f3': 'Offerten- und Rechnungs-Pipeline',
      'branche.handwerk.cta': 'Frühzugang anfragen',
      'branche.immo': 'Immobilienmakler',
      'branche.immo.desc': 'Objekt-Pipeline, Interessenten-Matching, Besichtigungstermine, Exposé-Generator, Eigentümer-Reporting.',
      'branche.immo.f1': 'Pipeline von Akquise bis Abschluss',
      'branche.immo.f2': 'Auto-Matching Interessent ↔ Objekt',
      'branche.immo.f3': 'Exposés als PDF, weiße Marke',
      'branche.immo.cta': 'Frühzugang anfragen',
      'branche.custom': 'Deine Branche fehlt?',
      'branche.custom.desc': 'Gärtnerei, Pflege, Eventservice, Transport — sag uns was du brauchst. Für jede neue Anfrage bauen wir ein eigenes Programm.',
      'branche.custom.f1': 'Bedarfsanalyse in 15 Minuten',
      'branche.custom.f2': 'Pilot-Konditionen für Erst-Branchen',
      'branche.custom.f3': 'Eigenes Programm, auf dich zugeschnitten',
      'branche.custom.cta': 'Anfrage stellen',

      'step.1.title': 'Branche wählen',
      'step.1.desc': 'Reinigung, Handwerk oder Immobilien — du wählst die Variante, die zu deinem Geschäft passt. Die Plattform passt sich an: Begriffe, Workflows, Standardfelder.',
      'step.2.title': 'Module zusammenstellen',
      'step.2.desc': 'Basis-Pakete enthalten alles, was jede Firma braucht. On-Top buchst du Module — Anrufprotokoll, Aufgaben, Buchhaltung-Export — und zahlst nur, was du nutzt.',
      'step.3.title': 'Team einladen, loslegen',
      'step.3.desc': 'Mitarbeiter per E-Mail einladen, Rollen vergeben (Admin, Disposition, Buchhaltung, Read-only), fertig. Mobile-App für die Leute im Feld gibt es gratis dazu.',

      'trust.1.head': 'Hosting in der Schweiz',
      'trust.1.desc': 'Alle Daten in Schweizer Rechenzentren. DSG- und DSGVO-konform, ohne Wenn und Aber.',
      'trust.2.head': 'In 30 Minuten startklar',
      'trust.2.desc': 'Kein Onboarding-Termin, kein Workshop. Du klickst dich selbst durch und legst los.',
      'trust.3.head': 'Keine Vertragsbindung',
      'trust.3.desc': 'Monatlich kündbar. Daten gehören dir — Export jederzeit als CSV oder Backup.',
      'trust.4.head': 'Support auf Deutsch',
      'trust.4.desc': 'Mail, Chat, optional Telefon. Antwortzeit unter 4 Stunden während Bürozeiten.',

      'mix.tab.reinigung': '🧹 Reinigung',
      'mix.tab.handwerk': '🔧 Handwerk',
      'mix.tab.immo': '🏠 Immobilien',
      'mix.summary.label': 'Deine Tessera',
      'mix.summary.meta': '+ pro Mitarbeiter CHF 4 / Monat<br/>14 Tage gratis · jederzeit kündbar',
      'mix.summary.cta': 'Mit dieser Konfiguration starten',
      'mix.summary.demo': 'Erst die Demo testen',
      'mix.h.base': 'Basis (immer enthalten)',
      'mix.h.addons': 'Module on-top',
      'mix.incl': 'inklusive',
      'mix.soon': 'bald',
      'mix.per': '/ Monat',
      'mod.route.name': 'Routenplanung & Disposition', 'mod.route.desc': 'Tages-Crew, Drag-and-Drop, Auto-Optimierung',
      'mod.kunden.name': 'Kunden & Objekte', 'mod.kunden.desc': 'Stammdaten, Verlauf, Verträge',
      'mod.team.name': 'Mitarbeiter & Rollen', 'mod.team.desc': 'Rechte, Mobile-Zugang, Zeiterfassung',
      'mod.auftraege.name': 'Aufträge & Baustellen', 'mod.auftraege.desc': 'Auftragsplan, Status, Adressen, Anfahrtszeit',
      'mod.objekt.name': 'Objekt-Pipeline', 'mod.objekt.desc': 'Verkauf/Vermietung, Status, Bilder, Eckdaten',
      'mod.interessent.name': 'Interessenten & Eigentümer', 'mod.interessent.desc': 'CRM, Suchprofile, Match-Score',
      'mod.anruf.name': 'Anrufprotokoll', 'mod.anruf.desc': 'Zentrales Anrufjournal, Rückruf-Tracking, "Aufgabe daraus machen"',
      'mod.aufgaben.name': 'Aufgaben', 'mod.aufgaben.desc': 'Tasks an Büromitarbeiter, Priorität, Fälligkeit, Verknüpfung',
      'mod.buch.name': 'Buchhaltung-Export', 'mod.buch.desc': 'CSV/DATEV/Bexio für deinen Treuhänder, automatisch monatlich',
      'mod.foto.name': 'Foto-Doku', 'mod.foto.desc': 'Mitarbeiter machen Foto vor/nach Reinigung, automatisch im Auftrag',
      'mod.email.name': 'E-Mail-Postfach', 'mod.email.desc': 'Gmail/iCloud verbinden, Mails als Aufgabe weitergeben',
      'mod.lohn.name': 'Lohnabrechnung', 'mod.lohn.desc': 'Schweizer Lohnausweis, Sozialabgaben, Quellensteuer',
      'mod.stunden.name': 'Stundenrapport mobil', 'mod.stunden.desc': 'Stempel-In/Out am Handy, GPS-Standort, automatische Rechnungspositionen',
      'mod.material.name': 'Materialwirtschaft', 'mod.material.desc': 'Lagerbestand, Lieferantenkatalog, automatische Bestellung',
      'mod.offerten.name': 'Offerten & Rechnungen', 'mod.offerten.desc': 'PDF-Generator, QR-Rechnung Schweiz, Mahnwesen',
      'mod.expose.name': 'Exposé-Generator', 'mod.expose.desc': 'PDF mit deiner Marke, Bilder, Karte, Eckdaten — in 30 Sekunden fertig',
      'mod.matching.name': 'Auto-Matching', 'mod.matching.desc': 'Neuer Interessent ↔ passendes Objekt automatisch verknüpft',
      'mod.besichtigung.name': 'Besichtigungs-Tool', 'mod.besichtigung.desc': 'Termin-Slots, Einladungs-Links, Erinnerungen, Feedback-Sammlung',
    },

    fr: {
      'nav.branchen': 'Secteurs',
      'nav.how': 'Comment ça marche',
      'nav.module': 'Modules',
      'nav.preise': 'Tarifs',
      'nav.login': 'Connexion',
      'nav.demo': 'Essayer la démo',

      'hero.badge': 'Made in Switzerland · conforme LPD',
      'hero.title.line1': 'Une&nbsp;plateforme.',
      'hero.title.line2': 'Chaque secteur.',
      'hero.sub': 'Nettoyage, artisanat, immobilier — vous choisissez votre secteur, composez les modules nécessaires et démarrez. Opérationnel en moins de 30 minutes.',
      'hero.cta.primary': 'Essayer la démo',
      'hero.cta.secondary': 'Comment ça marche ?',
      'hero.trust.1': 'Données en Suisse',
      'hero.trust.2': 'Sans engagement',
      'hero.trust.3': '14 jours gratuits',

      'strip.label': 'Conçu pour les PME suisses',
      'strip.1': '🇨🇭 Hébergement en Suisse',
      'strip.2': '🔒 LPD & RGPD',
      'strip.3': '⚡ Prêt en 30 min',
      'strip.4': '📱 Mobile + Bureau',
      'strip.5': '💬 Support en français',

      'branchen.eyebrow': 'Secteurs',
      'branchen.title': 'Conçu pour votre secteur.',
      'branchen.sub': 'Au lieu d\'un logiciel générique : chaque variante de Tessera connaît les spécificités de votre métier. Trois secteurs sont en ligne, d\'autres arrivent — ou nous construisons le vôtre.',

      'how.eyebrow': 'Comment ça marche',
      'how.title': 'Prêt en trois étapes.',
      'how.sub': 'Pas d\'entretien commercial. Pas d\'atelier d\'onboarding. Vous découvrez par vous-même.',

      'module.eyebrow': 'Modules',
      'module.title': 'Composez votre Tessera.',
      'module.sub': 'Cliquez sur les modules dont vous avez besoin. Le prix s\'actualise en direct.',

      'cta.title': 'Prêt à ranger votre bureau ?',
      'cta.sub': '14 jours gratuits, sans carte. Si ça ne convient pas, vous cliquez sur "Supprimer le compte" et c\'est fini.',
      'cta.primary': 'Essayer la démo',
      'cta.secondary': 'Demander conseil',

      'footer.tagline': 'Logiciel modulaire pour les PME suisses. Une plateforme, chaque secteur.',
      'footer.col.product': 'Produit',
      'footer.col.company': 'Entreprise',
      'footer.col.legal': 'Mentions légales',
      'footer.about': 'À propos',
      'footer.contact': 'Contact',
      'footer.imprint': 'Mentions légales',
      'footer.terms': 'CGV',
      'footer.privacy': 'Confidentialité',

      'branche.reinigung': 'Nettoyage',
      'branche.reinigung.desc': 'Planification de tournées, gestion d\'équipes, fichier clients avec journal d\'appels, preuves photo, export CSV pour le fiduciaire.',
      'branche.reinigung.f1': 'Planning d\'équipe avec glisser-déposer',
      'branche.reinigung.f2': 'Journal d\'appels avec suivi de rappels',
      'branche.reinigung.f3': 'Photos + présence par QR code',
      'branche.reinigung.cta': 'Ouvrir la démo',
      'branche.handwerk': 'Artisanat',
      'branche.handwerk.desc': 'Mandats, listes de matériel, rapport d\'heures mobile sur chantier, devis PDF, commande matériel depuis le mandat.',
      'branche.handwerk.f1': 'Pointage avec géolocalisation',
      'branche.handwerk.f2': 'Gestion stock + catalogue fournisseurs',
      'branche.handwerk.f3': 'Pipeline devis et factures',
      'branche.handwerk.cta': 'Accès anticipé',
      'branche.immo': 'Agents immobiliers',
      'branche.immo.desc': 'Pipeline d\'objets, matching de prospects, visites, générateur d\'annonces, reporting propriétaires.',
      'branche.immo.f1': 'De la prospection à la signature',
      'branche.immo.f2': 'Matching auto prospect ↔ bien',
      'branche.immo.f3': 'Annonces PDF en marque blanche',
      'branche.immo.cta': 'Accès anticipé',
      'branche.custom': 'Votre secteur n\'est pas là ?',
      'branche.custom.desc': 'Jardinerie, soins, événementiel, transport — dis-nous ce qu\'il te faut. Pour chaque nouvelle demande, on construit un programme dédié.',
      'branche.custom.f1': 'Analyse des besoins en 15 min',
      'branche.custom.f2': 'Tarifs pilotes pour les premiers secteurs',
      'branche.custom.f3': 'Un programme sur mesure pour toi',
      'branche.custom.cta': 'Faire une demande',

      'step.1.title': 'Choisir son secteur',
      'step.1.desc': 'Nettoyage, artisanat ou immobilier — vous choisissez la variante qui correspond à votre métier. La plateforme s\'adapte : termes, flux, champs par défaut.',
      'step.2.title': 'Composer les modules',
      'step.2.desc': 'Les packs de base contiennent tout ce dont chaque entreprise a besoin. En option, vous ajoutez des modules et ne payez que ce que vous utilisez.',
      'step.3.title': 'Inviter l\'équipe, démarrer',
      'step.3.desc': 'Inviter les collaborateurs par e-mail, attribuer les rôles, c\'est parti. L\'app mobile pour le terrain est incluse.',

      'trust.1.head': 'Hébergement en Suisse',
      'trust.1.desc': 'Toutes les données dans des datacenters suisses. Conforme LPD et RGPD, sans exception.',
      'trust.2.head': 'Prêt en 30 minutes',
      'trust.2.desc': 'Pas de rendez-vous d\'onboarding, pas d\'atelier. Vous cliquez et vous démarrez.',
      'trust.3.head': 'Sans engagement',
      'trust.3.desc': 'Résiliable au mois. Vos données vous appartiennent — export CSV à tout moment.',
      'trust.4.head': 'Support en français',
      'trust.4.desc': 'Mail, chat, téléphone en option. Réponse en moins de 4h aux heures de bureau.',

      'mix.tab.reinigung': '🧹 Nettoyage',
      'mix.tab.handwerk': '🔧 Artisanat',
      'mix.tab.immo': '🏠 Immobilier',
      'mix.summary.label': 'Votre Tessera',
      'mix.summary.meta': '+ CHF 4 / mois par collaborateur<br/>14 jours gratuits · résiliable à tout moment',
      'mix.summary.cta': 'Démarrer avec cette configuration',
      'mix.summary.demo': 'Essayer d\'abord la démo',
      'mix.h.base': 'De base (toujours inclus)',
      'mix.h.addons': 'Modules en option',
      'mix.incl': 'inclus',
      'mix.soon': 'bientôt',
      'mix.per': '/ mois',
      'mod.route.name': 'Planification de tournées', 'mod.route.desc': 'Équipe du jour, glisser-déposer, optimisation auto',
      'mod.kunden.name': 'Clients & objets', 'mod.kunden.desc': 'Fiches, historique, contrats',
      'mod.team.name': 'Collaborateurs & rôles', 'mod.team.desc': 'Droits, accès mobile, saisie du temps',
      'mod.auftraege.name': 'Mandats & chantiers', 'mod.auftraege.desc': 'Planning, statut, adresses, temps de trajet',
      'mod.objekt.name': 'Pipeline d\'objets', 'mod.objekt.desc': 'Vente/location, statut, photos, données clés',
      'mod.interessent.name': 'Prospects & propriétaires', 'mod.interessent.desc': 'CRM, profils de recherche, score de match',
      'mod.anruf.name': 'Journal d\'appels', 'mod.anruf.desc': 'Journal central, suivi des rappels, "créer une tâche"',
      'mod.aufgaben.name': 'Tâches', 'mod.aufgaben.desc': 'Tâches au bureau, priorité, échéance, liens',
      'mod.buch.name': 'Export comptable', 'mod.buch.desc': 'CSV/DATEV/Bexio pour ton fiduciaire, chaque mois',
      'mod.foto.name': 'Photos de preuve', 'mod.foto.desc': 'Photo avant/après, automatiquement dans le mandat',
      'mod.email.name': 'Boîte e-mail', 'mod.email.desc': 'Connecter Gmail/iCloud, transformer un mail en tâche',
      'mod.lohn.name': 'Salaires', 'mod.lohn.desc': 'Certificat de salaire suisse, charges sociales, impôt à la source',
      'mod.stunden.name': 'Rapport d\'heures mobile', 'mod.stunden.desc': 'Pointage au mobile, GPS, postes de facture automatiques',
      'mod.material.name': 'Gestion du matériel', 'mod.material.desc': 'Stock, catalogue fournisseurs, commande auto',
      'mod.offerten.name': 'Devis & factures', 'mod.offerten.desc': 'Générateur PDF, QR-facture suisse, relances',
      'mod.expose.name': 'Générateur d\'annonces', 'mod.expose.desc': 'PDF à ta marque, photos, carte, données — prêt en 30 s',
      'mod.matching.name': 'Matching auto', 'mod.matching.desc': 'Nouveau prospect ↔ bien adapté automatiquement',
      'mod.besichtigung.name': 'Outil de visites', 'mod.besichtigung.desc': 'Créneaux, liens d\'invitation, rappels, feedback',
    },

    it: {
      'nav.branchen': 'Settori',
      'nav.how': 'Come funziona',
      'nav.module': 'Moduli',
      'nav.preise': 'Prezzi',
      'nav.login': 'Accedi',
      'nav.demo': 'Prova la demo',

      'hero.badge': 'Made in Switzerland · conforme LPD',
      'hero.title.line1': 'Una&nbsp;piattaforma.',
      'hero.title.line2': 'Ogni settore.',
      'hero.sub': 'Pulizia, artigianato, immobiliare — scegli il tuo settore, componi i moduli che ti servono e parti. Pronto in meno di 30 minuti.',
      'hero.cta.primary': 'Prova la demo',
      'hero.cta.secondary': 'Come funziona?',
      'hero.trust.1': 'Dati in Svizzera',
      'hero.trust.2': 'Senza vincoli',
      'hero.trust.3': '14 giorni gratis',

      'strip.label': 'Pensato per le PMI svizzere',
      'strip.1': '🇨🇭 Hosting in Svizzera',
      'strip.2': '🔒 LPD & GDPR',
      'strip.3': '⚡ Pronto in 30 min',
      'strip.4': '📱 Mobile + Desktop',
      'strip.5': '💬 Supporto in italiano',

      'branchen.eyebrow': 'Settori',
      'branchen.title': 'Costruito per il tuo settore.',
      'branchen.sub': 'Non un software per tutti e per nessuno: ogni variante di Tessera conosce le specificità del tuo lavoro. Tre settori sono live, altri arriveranno — o costruiamo il tuo.',

      'how.eyebrow': 'Come funziona',
      'how.title': 'Pronto in tre passi.',
      'how.sub': 'Niente colloquio di vendita. Niente workshop di onboarding. Clicchi e provi da solo.',

      'module.eyebrow': 'Moduli',
      'module.title': 'Componi la tua Tessera.',
      'module.sub': 'Clicca i moduli che ti servono. Il prezzo si aggiorna in tempo reale.',

      'cta.title': 'Pronto a mettere ordine in ufficio?',
      'cta.sub': '14 giorni gratis, senza carta. Se non fa per te, clicchi su "Elimina account" e basta.',
      'cta.primary': 'Prova la demo',
      'cta.secondary': 'Richiedi consulenza',

      'footer.tagline': 'Software modulare per le PMI svizzere. Una piattaforma, ogni settore.',
      'footer.col.product': 'Prodotto',
      'footer.col.company': 'Azienda',
      'footer.col.legal': 'Note legali',
      'footer.about': 'Chi siamo',
      'footer.contact': 'Contatto',
      'footer.imprint': 'Impressum',
      'footer.terms': 'Termini',
      'footer.privacy': 'Privacy',

      'branche.reinigung': 'Pulizie',
      'branche.reinigung.desc': 'Pianificazione percorsi, gestione team, anagrafica clienti con registro chiamate, prove fotografiche, esportazione CSV per il fiduciario.',
      'branche.reinigung.f1': 'Pianificazione squadre con drag-and-drop',
      'branche.reinigung.f2': 'Registro chiamate con tracking richiami',
      'branche.reinigung.f3': 'Foto + presenza con QR code',
      'branche.reinigung.cta': 'Apri la demo',
      'branche.handwerk': 'Artigianato',
      'branche.handwerk.desc': 'Ordini, materiali, rapporto ore mobile in cantiere, preventivi PDF, ordini materiali direttamente dall\'incarico.',
      'branche.handwerk.f1': 'Timbratura con GPS',
      'branche.handwerk.f2': 'Magazzino + catalogo fornitori',
      'branche.handwerk.f3': 'Pipeline preventivi e fatture',
      'branche.handwerk.cta': 'Accesso anticipato',
      'branche.immo': 'Agenti immobiliari',
      'branche.immo.desc': 'Pipeline immobili, matching interessati, visite, generatore di annunci, reporting proprietari.',
      'branche.immo.f1': 'Dalla ricerca alla chiusura',
      'branche.immo.f2': 'Matching auto interessato ↔ immobile',
      'branche.immo.f3': 'Annunci PDF in white label',
      'branche.immo.cta': 'Accesso anticipato',
      'branche.custom': 'Manca il tuo settore?',
      'branche.custom.desc': 'Giardinaggio, cura, eventi, trasporti — dicci di cosa hai bisogno. Per ogni nuova richiesta costruiamo un programma dedicato.',
      'branche.custom.f1': 'Analisi esigenze in 15 minuti',
      'branche.custom.f2': 'Condizioni pilota per i primi settori',
      'branche.custom.f3': 'Programma su misura per te',
      'branche.custom.cta': 'Invia richiesta',

      'step.1.title': 'Scegli il settore',
      'step.1.desc': 'Pulizie, artigianato o immobiliare — scegli la variante per il tuo lavoro. La piattaforma si adatta: termini, flussi, campi predefiniti.',
      'step.2.title': 'Componi i moduli',
      'step.2.desc': 'I pacchetti base contengono tutto ciò che serve. In aggiunta scegli i moduli e paghi solo quello che usi.',
      'step.3.title': 'Invita il team, parti',
      'step.3.desc': 'Invita i collaboratori via email, assegna i ruoli, fatto. L\'app mobile per chi è sul campo è gratis.',

      'trust.1.head': 'Hosting in Svizzera',
      'trust.1.desc': 'Tutti i dati in data center svizzeri. Conforme LPD e GDPR, senza compromessi.',
      'trust.2.head': 'Pronto in 30 minuti',
      'trust.2.desc': 'Niente appuntamento di onboarding, niente workshop. Clicchi e parti.',
      'trust.3.head': 'Senza vincoli',
      'trust.3.desc': 'Disdetta mensile. I dati sono tuoi — esportazione CSV in qualsiasi momento.',
      'trust.4.head': 'Supporto in italiano',
      'trust.4.desc': 'Mail, chat, telefono opzionale. Risposta entro 4h in orario d\'ufficio.',

      'mix.tab.reinigung': '🧹 Pulizie',
      'mix.tab.handwerk': '🔧 Artigianato',
      'mix.tab.immo': '🏠 Immobiliare',
      'mix.summary.label': 'La tua Tessera',
      'mix.summary.meta': '+ CHF 4 / mese per collaboratore<br/>14 giorni gratis · disdetta in ogni momento',
      'mix.summary.cta': 'Avvia con questa configurazione',
      'mix.summary.demo': 'Prima prova la demo',
      'mix.h.base': 'Di base (sempre incluso)',
      'mix.h.addons': 'Moduli aggiuntivi',
      'mix.incl': 'incluso',
      'mix.soon': 'presto',
      'mix.per': '/ mese',
      'mod.route.name': 'Pianificazione percorsi', 'mod.route.desc': 'Squadra del giorno, drag-and-drop, ottimizzazione auto',
      'mod.kunden.name': 'Clienti e oggetti', 'mod.kunden.desc': 'Anagrafica, storico, contratti',
      'mod.team.name': 'Collaboratori e ruoli', 'mod.team.desc': 'Permessi, accesso mobile, rilevamento ore',
      'mod.auftraege.name': 'Ordini e cantieri', 'mod.auftraege.desc': 'Piano ordini, stato, indirizzi, tempo di viaggio',
      'mod.objekt.name': 'Pipeline immobili', 'mod.objekt.desc': 'Vendita/affitto, stato, foto, dati chiave',
      'mod.interessent.name': 'Interessati e proprietari', 'mod.interessent.desc': 'CRM, profili di ricerca, match-score',
      'mod.anruf.name': 'Registro chiamate', 'mod.anruf.desc': 'Registro centrale, tracking richiami, "crea attività"',
      'mod.aufgaben.name': 'Attività', 'mod.aufgaben.desc': 'Compiti all\'ufficio, priorità, scadenza, collegamenti',
      'mod.buch.name': 'Export contabile', 'mod.buch.desc': 'CSV/DATEV/Bexio per il fiduciario, ogni mese',
      'mod.foto.name': 'Foto di prova', 'mod.foto.desc': 'Foto prima/dopo, automaticamente nell\'incarico',
      'mod.email.name': 'Casella e-mail', 'mod.email.desc': 'Collega Gmail/iCloud, trasforma le mail in attività',
      'mod.lohn.name': 'Buste paga', 'mod.lohn.desc': 'Certificato di salario svizzero, oneri sociali, imposta alla fonte',
      'mod.stunden.name': 'Rapporto ore mobile', 'mod.stunden.desc': 'Timbratura da mobile, GPS, voci di fattura automatiche',
      'mod.material.name': 'Gestione materiali', 'mod.material.desc': 'Magazzino, catalogo fornitori, ordine automatico',
      'mod.offerten.name': 'Preventivi e fatture', 'mod.offerten.desc': 'Generatore PDF, fattura QR svizzera, solleciti',
      'mod.expose.name': 'Generatore annunci', 'mod.expose.desc': 'PDF con il tuo marchio, foto, mappa, dati — pronto in 30 s',
      'mod.matching.name': 'Matching auto', 'mod.matching.desc': 'Nuovo interessato ↔ immobile adatto in automatico',
      'mod.besichtigung.name': 'Strumento visite', 'mod.besichtigung.desc': 'Slot, link di invito, promemoria, raccolta feedback',
    },

    es: {
      'nav.branchen': 'Sectores',
      'nav.how': 'Cómo funciona',
      'nav.module': 'Módulos',
      'nav.preise': 'Precios',
      'nav.login': 'Acceder',
      'nav.demo': 'Probar la demo',

      'hero.badge': 'Made in Switzerland · conforme RGPD',
      'hero.title.line1': 'Una&nbsp;plataforma.',
      'hero.title.line2': 'Cada sector.',
      'hero.sub': 'Limpieza, oficios, inmobiliaria — eliges tu sector, combinas los módulos que necesitas y arrancas. Listo en menos de 30 minutos.',
      'hero.cta.primary': 'Probar la demo',
      'hero.cta.secondary': '¿Cómo funciona?',
      'hero.trust.1': 'Datos alojados en Suiza',
      'hero.trust.2': 'Sin permanencia',
      'hero.trust.3': '14 días de prueba gratis',

      'strip.label': 'Hecho para pymes',
      'strip.1': '🇨🇭 Hosting en Suiza',
      'strip.2': '🔒 RGPD',
      'strip.3': '⚡ Listo en 30 min',
      'strip.4': '📱 Móvil + escritorio',
      'strip.5': '💬 Soporte multilingüe',

      'branchen.eyebrow': 'Sectores',
      'branchen.title': 'Construido para tu sector.',
      'branchen.sub': 'En vez de software para todos y para nadie, cada variante de Tessera conoce las particularidades de tu negocio. Tres sectores están en producción, llegan más — o construimos el tuyo.',

      'how.eyebrow': 'Cómo funciona',
      'how.title': 'Listo en tres pasos.',
      'how.sub': 'Sin llamada comercial. Sin taller de onboarding. Tú mismo lo pruebas.',

      'module.eyebrow': 'Módulos',
      'module.title': 'Compón tu Tessera.',
      'module.sub': 'Marca los módulos que necesites. El precio se actualiza en directo.',

      'cta.title': '¿Listo para ordenar tu oficina?',
      'cta.sub': '14 días gratis, sin tarjeta. Si no te convence, haces clic en "Eliminar cuenta" y listo.',
      'cta.primary': 'Probar la demo',
      'cta.secondary': 'Contactar',

      'footer.tagline': 'Software modular para pymes. Una plataforma, cada sector.',
      'footer.col.product': 'Producto',
      'footer.col.company': 'Empresa',
      'footer.col.legal': 'Legal',
      'footer.about': 'Sobre nosotros',
      'footer.contact': 'Contacto',
      'footer.imprint': 'Aviso legal',
      'footer.terms': 'Condiciones',
      'footer.privacy': 'Privacidad',

      'branche.reinigung': 'Limpieza',
      'branche.reinigung.desc': 'Planificación de rutas, gestión de personal, fichero de clientes con registro de llamadas, pruebas fotográficas, exportación CSV.',
      'branche.reinigung.f1': 'Planificación de equipos con drag-and-drop',
      'branche.reinigung.f2': 'Registro de llamadas con seguimiento',
      'branche.reinigung.f3': 'Fotos + asistencia con QR',
      'branche.reinigung.cta': 'Abrir demo',
      'branche.handwerk': 'Oficios',
      'branche.handwerk.desc': 'Encargos, materiales, parte de horas móvil en obra, presupuestos PDF, pedido de materiales desde el encargo.',
      'branche.handwerk.f1': 'Fichaje con geolocalización',
      'branche.handwerk.f2': 'Inventario + catálogo de proveedores',
      'branche.handwerk.f3': 'Pipeline presupuestos y facturas',
      'branche.handwerk.cta': 'Acceso anticipado',
      'branche.immo': 'Inmobiliarias',
      'branche.immo.desc': 'Pipeline de inmuebles, matching de interesados, visitas, generador de anuncios, reporting a propietarios.',
      'branche.immo.f1': 'De la captación al cierre',
      'branche.immo.f2': 'Matching automático interesado ↔ inmueble',
      'branche.immo.f3': 'Anuncios PDF, marca blanca',
      'branche.immo.cta': 'Acceso anticipado',
      'branche.custom': '¿Falta tu sector?',
      'branche.custom.desc': 'Jardinería, cuidados, eventos, transporte — cuéntanos qué necesitas. Para cada solicitud nueva, construimos un programa dedicado.',
      'branche.custom.f1': 'Análisis de necesidades en 15 min',
      'branche.custom.f2': 'Condiciones piloto para primeros sectores',
      'branche.custom.f3': 'Un programa a tu medida',
      'branche.custom.cta': 'Enviar solicitud',

      'step.1.title': 'Elige tu sector',
      'step.1.desc': 'Limpieza, oficios o inmobiliario — eliges la variante para tu negocio. La plataforma se adapta: términos, flujos, campos por defecto.',
      'step.2.title': 'Compón los módulos',
      'step.2.desc': 'Los paquetes base contienen todo lo necesario. Añades módulos opcionales y pagas solo lo que usas.',
      'step.3.title': 'Invita al equipo y arranca',
      'step.3.desc': 'Invita a los colaboradores por email, asigna roles, listo. La app móvil para los que están en campo es gratis.',

      'trust.1.head': 'Hosting en Suiza',
      'trust.1.desc': 'Todos los datos en centros de datos suizos. Conforme RGPD, sin excepciones.',
      'trust.2.head': 'Listo en 30 minutos',
      'trust.2.desc': 'Sin cita de onboarding, sin taller. Haces clic y arrancas.',
      'trust.3.head': 'Sin permanencia',
      'trust.3.desc': 'Cancelable mensualmente. Los datos son tuyos — exportación CSV cuando quieras.',
      'trust.4.head': 'Soporte multilingüe',
      'trust.4.desc': 'Email, chat, teléfono opcional. Respuesta en menos de 4h en horario de oficina.',

      'mix.tab.reinigung': '🧹 Limpieza',
      'mix.tab.handwerk': '🔧 Oficios',
      'mix.tab.immo': '🏠 Inmobiliario',
      'mix.summary.label': 'Tu Tessera',
      'mix.summary.meta': '+ CHF 4 / mes por colaborador<br/>14 días gratis · cancelable en cualquier momento',
      'mix.summary.cta': 'Empezar con esta configuración',
      'mix.summary.demo': 'Probar primero la demo',
      'mix.h.base': 'De base (siempre incluido)',
      'mix.h.addons': 'Módulos adicionales',
      'mix.incl': 'incluido',
      'mix.soon': 'pronto',
      'mix.per': '/ mes',
      'mod.route.name': 'Planificación de rutas', 'mod.route.desc': 'Equipo del día, drag-and-drop, optimización auto',
      'mod.kunden.name': 'Clientes y objetos', 'mod.kunden.desc': 'Datos, historial, contratos',
      'mod.team.name': 'Personal y roles', 'mod.team.desc': 'Permisos, acceso móvil, registro de horas',
      'mod.auftraege.name': 'Encargos y obras', 'mod.auftraege.desc': 'Plan de encargos, estado, direcciones, tiempo de viaje',
      'mod.objekt.name': 'Pipeline de inmuebles', 'mod.objekt.desc': 'Venta/alquiler, estado, fotos, datos clave',
      'mod.interessent.name': 'Interesados y propietarios', 'mod.interessent.desc': 'CRM, perfiles de búsqueda, match-score',
      'mod.anruf.name': 'Registro de llamadas', 'mod.anruf.desc': 'Registro central, seguimiento de rellamadas, "crear tarea"',
      'mod.aufgaben.name': 'Tareas', 'mod.aufgaben.desc': 'Tareas para la oficina, prioridad, vencimiento, enlaces',
      'mod.buch.name': 'Exportación contable', 'mod.buch.desc': 'CSV/DATEV/Bexio para tu gestor, cada mes',
      'mod.foto.name': 'Pruebas fotográficas', 'mod.foto.desc': 'Foto antes/después, automáticamente en el encargo',
      'mod.email.name': 'Buzón de correo', 'mod.email.desc': 'Conecta Gmail/iCloud, convierte correos en tareas',
      'mod.lohn.name': 'Nóminas', 'mod.lohn.desc': 'Certificado de salario suizo, cargas sociales, impuesto en origen',
      'mod.stunden.name': 'Parte de horas móvil', 'mod.stunden.desc': 'Fichaje desde móvil, GPS, líneas de factura automáticas',
      'mod.material.name': 'Gestión de materiales', 'mod.material.desc': 'Stock, catálogo de proveedores, pedido automático',
      'mod.offerten.name': 'Presupuestos y facturas', 'mod.offerten.desc': 'Generador PDF, factura QR suiza, reclamaciones',
      'mod.expose.name': 'Generador de anuncios', 'mod.expose.desc': 'PDF con tu marca, fotos, mapa, datos — listo en 30 s',
      'mod.matching.name': 'Matching automático', 'mod.matching.desc': 'Nuevo interesado ↔ inmueble adecuado en automático',
      'mod.besichtigung.name': 'Herramienta de visitas', 'mod.besichtigung.desc': 'Franjas, enlaces de invitación, recordatorios, feedback',
    },

    en: {
      'nav.branchen': 'Industries',
      'nav.how': 'How it works',
      'nav.module': 'Modules',
      'nav.preise': 'Pricing',
      'nav.login': 'Login',
      'nav.demo': 'Try the demo',

      'hero.badge': 'Made in Switzerland · GDPR-ready',
      'hero.title.line1': 'One&nbsp;platform.',
      'hero.title.line2': 'Every industry.',
      'hero.sub': 'Cleaning, trades, real estate — pick your industry, assemble the modules you need, get going. Ready in under 30 minutes.',
      'hero.cta.primary': 'Try the demo',
      'hero.cta.secondary': 'How does it work?',
      'hero.trust.1': 'Data hosted in Switzerland',
      'hero.trust.2': 'No lock-in',
      'hero.trust.3': '14-day free trial',

      'strip.label': 'Built for Swiss SMBs',
      'strip.1': '🇨🇭 Swiss hosting',
      'strip.2': '🔒 GDPR & Swiss DPA',
      'strip.3': '⚡ Setup in 30 min',
      'strip.4': '📱 Mobile + desktop',
      'strip.5': '💬 Multilingual support',

      'branchen.eyebrow': 'Industries',
      'branchen.title': 'Built for your industry.',
      'branchen.sub': 'Instead of software made for everyone and no one, each Tessera variant knows the specifics of your trade. Three industries are live, more are coming — or we build yours.',

      'how.eyebrow': 'How it works',
      'how.title': 'Ready in three steps.',
      'how.sub': 'No sales call required. No onboarding workshop. You click through yourself.',

      'module.eyebrow': 'Modules',
      'module.title': 'Assemble your Tessera.',
      'module.sub': 'Tick the modules you need. Price updates live.',

      'cta.title': 'Ready to tidy up your office?',
      'cta.sub': '14 days free, no credit card. If it\'s not for you, click "Delete account" and you\'re done.',
      'cta.primary': 'Try the demo',
      'cta.secondary': 'Talk to us',

      'footer.tagline': 'Modular software for Swiss SMBs. One platform, every industry.',
      'footer.col.product': 'Product',
      'footer.col.company': 'Company',
      'footer.col.legal': 'Legal',
      'footer.about': 'About us',
      'footer.contact': 'Contact',
      'footer.imprint': 'Imprint',
      'footer.terms': 'Terms',
      'footer.privacy': 'Privacy',

      'branche.reinigung': 'Cleaning',
      'branche.reinigung.desc': 'Route planning, staff scheduling, customer records with call log, photo proof, CSV export for your accountant.',
      'branche.reinigung.f1': 'Daily crew planning with drag-and-drop',
      'branche.reinigung.f2': 'Call log with callback tracking',
      'branche.reinigung.f3': 'Photo proof + QR check-in',
      'branche.reinigung.cta': 'Open demo',
      'branche.handwerk': 'Trades',
      'branche.handwerk.desc': 'Jobs, materials, mobile time tracking on site, PDF quotes, material ordering directly from the job.',
      'branche.handwerk.f1': 'Time tracking with GPS stamp',
      'branche.handwerk.f2': 'Inventory + supplier catalogue',
      'branche.handwerk.f3': 'Quotes and invoicing pipeline',
      'branche.handwerk.cta': 'Request early access',
      'branche.immo': 'Real estate agents',
      'branche.immo.desc': 'Property pipeline, lead matching, viewings, listing generator, owner reporting.',
      'branche.immo.f1': 'From sourcing to closing',
      'branche.immo.f2': 'Auto-matching lead ↔ property',
      'branche.immo.f3': 'PDF listings, white label',
      'branche.immo.cta': 'Request early access',
      'branche.custom': 'Your industry missing?',
      'branche.custom.desc': 'Gardening, care, events, transport — tell us what you need. For every new request we build a dedicated program.',
      'branche.custom.f1': 'Needs analysis in 15 minutes',
      'branche.custom.f2': 'Pilot pricing for first industries',
      'branche.custom.f3': 'A dedicated program tailored to you',
      'branche.custom.cta': 'Send a request',

      'step.1.title': 'Pick your industry',
      'step.1.desc': 'Cleaning, trades or real estate — pick the variant that matches your business. The platform adapts: terms, workflows, default fields.',
      'step.2.title': 'Assemble your modules',
      'step.2.desc': 'Base packs include everything every company needs. On top, you add modules and only pay for what you use.',
      'step.3.title': 'Invite the team, go',
      'step.3.desc': 'Invite staff by email, assign roles, done. The mobile app for the people in the field is included for free.',

      'trust.1.head': 'Swiss hosting',
      'trust.1.desc': 'All data in Swiss data centers. GDPR and Swiss DPA compliant, no compromises.',
      'trust.2.head': 'Ready in 30 minutes',
      'trust.2.desc': 'No onboarding meeting, no workshop. You click through and get going.',
      'trust.3.head': 'No lock-in',
      'trust.3.desc': 'Monthly cancellation. Your data is yours — CSV export anytime.',
      'trust.4.head': 'Multilingual support',
      'trust.4.desc': 'Mail, chat, optional phone. Response under 4 hours during business hours.',

      'mix.tab.reinigung': '🧹 Cleaning',
      'mix.tab.handwerk': '🔧 Trades',
      'mix.tab.immo': '🏠 Real estate',
      'mix.summary.label': 'Your Tessera',
      'mix.summary.meta': '+ CHF 4 / month per user<br/>14 days free · cancel anytime',
      'mix.summary.cta': 'Start with this configuration',
      'mix.summary.demo': 'Try the demo first',
      'mix.h.base': 'Base (always included)',
      'mix.h.addons': 'Add-on modules',
      'mix.incl': 'included',
      'mix.soon': 'soon',
      'mix.per': '/ month',
      'mod.route.name': 'Route planning', 'mod.route.desc': 'Daily crew, drag-and-drop, auto-optimization',
      'mod.kunden.name': 'Customers & objects', 'mod.kunden.desc': 'Records, history, contracts',
      'mod.team.name': 'Staff & roles', 'mod.team.desc': 'Permissions, mobile access, time tracking',
      'mod.auftraege.name': 'Jobs & sites', 'mod.auftraege.desc': 'Job plan, status, addresses, travel time',
      'mod.objekt.name': 'Property pipeline', 'mod.objekt.desc': 'Sale/rental, status, photos, key data',
      'mod.interessent.name': 'Leads & owners', 'mod.interessent.desc': 'CRM, search profiles, match score',
      'mod.anruf.name': 'Call log', 'mod.anruf.desc': 'Central call journal, callback tracking, "turn into task"',
      'mod.aufgaben.name': 'Tasks', 'mod.aufgaben.desc': 'Tasks for office staff, priority, due date, links',
      'mod.buch.name': 'Accounting export', 'mod.buch.desc': 'CSV/DATEV/Bexio for your accountant, monthly',
      'mod.foto.name': 'Photo proof', 'mod.foto.desc': 'Before/after photo, automatically on the job',
      'mod.email.name': 'Email inbox', 'mod.email.desc': 'Connect Gmail/iCloud, turn mails into tasks',
      'mod.lohn.name': 'Payroll', 'mod.lohn.desc': 'Swiss salary statement, social contributions, withholding tax',
      'mod.stunden.name': 'Mobile time tracking', 'mod.stunden.desc': 'Clock in/out on phone, GPS, automatic invoice lines',
      'mod.material.name': 'Inventory', 'mod.material.desc': 'Stock, supplier catalogue, automatic ordering',
      'mod.offerten.name': 'Quotes & invoices', 'mod.offerten.desc': 'PDF generator, Swiss QR invoice, reminders',
      'mod.expose.name': 'Listing generator', 'mod.expose.desc': 'PDF in your brand, photos, map, data — ready in 30s',
      'mod.matching.name': 'Auto-matching', 'mod.matching.desc': 'New lead ↔ matching property linked automatically',
      'mod.besichtigung.name': 'Viewing tool', 'mod.besichtigung.desc': 'Time slots, invite links, reminders, feedback',
    },
  };

  const SUPPORTED = ['de', 'fr', 'it', 'es', 'en'];
  const LS_KEY = 'tessera-lang';
  const LS_REGION = 'tessera-region';

  /* Region (Ländercode) aus Browser-Locale extrahieren — z.B. de-CH → CH, es-ES → ES */
  function detectRegion() {
    const saved = localStorage.getItem(LS_REGION);
    if (saved) return saved;
    const langs = navigator.languages || [navigator.language || ''];
    for (const l of langs) {
      const parts = l.split('-');
      if (parts.length > 1) return parts[1].toUpperCase();
    }
    // Fallback über Zeitzone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.startsWith('Europe/Zurich')) return 'CH';
      if (tz.startsWith('Europe/Berlin')) return 'DE';
      if (tz.startsWith('Europe/Vienna')) return 'AT';
      if (tz.startsWith('Europe/Paris')) return 'FR';
      if (tz.startsWith('Europe/Rome')) return 'IT';
      if (tz.startsWith('Europe/Madrid')) return 'ES';
    } catch {}
    return 'CH';
  }

  function detect() {
    // 1. Manuelle Wahl
    const saved = localStorage.getItem(LS_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
    // 2. Browser-Sprache
    const langs = navigator.languages || [navigator.language || 'de'];
    for (const l of langs) {
      const short = l.toLowerCase().slice(0, 2);
      if (SUPPORTED.includes(short)) return short;
    }
    // 3. Fallback via Region
    const region = detectRegion();
    const regionMap = { CH: 'de', DE: 'de', AT: 'de', FR: 'de', IT: 'de', ES: 'es' };
    return regionMap[region] || 'en';
  }

  function apply(lang) {
    const dict = DICT[lang] || DICT.de;
    const fallback = DICT.de;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const val = dict[key] != null ? dict[key] : fallback[key];
      if (val == null) return;
      if (val.includes('&') || val.includes('<')) el.innerHTML = val;
      else el.textContent = val;
    });
    document.querySelectorAll('.lang-switch button').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    // Mixer neu rendern, falls geladen
    if (window.TESSERA_MIXER_REFRESH) window.TESSERA_MIXER_REFRESH();
  }

  function set(lang) {
    if (!SUPPORTED.includes(lang)) return;
    localStorage.setItem(LS_KEY, lang);
    apply(lang);
  }

  window.TESSERA_I18N = { detect, detectRegion, apply, set, supported: SUPPORTED, dict: DICT };

  document.addEventListener('DOMContentLoaded', () => {
    apply(detect());
    document.querySelectorAll('.lang-switch button[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => set(btn.dataset.lang));
    });
  });
})();
