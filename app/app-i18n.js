/* ============================================================
   MosaOS — App-Übersetzung (i18n) für app.html + mobile.html
   ------------------------------------------------------------
   EINE Engine, 5 Sprachen (de/fr/it/es/en). Deutsch = Quelle.

   - data-i18n="key"        → textContent des Elements
   - data-i18n-ph="key"     → placeholder
   - data-i18n-title="key"  → title-Attribut
   - MosaI18n.t('key')      → für JS-generierte Strings (Toasts, Renderer)

   Verzahnung mit der Branchen-Engine (MosaVertical):
   Bei Sprachwechsel feuert 'mosa-lang-changed' → app.html wendet danach
   die Branchen-Begriffe erneut an (MosaVertical.apply + Nav-Labels),
   damit branchenspezifische Überschreibungen über der Übersetzung liegen.

   Sprache wird in localStorage 'mosaos-lang' gespeichert (geteilt mit der
   Marketing-Website → wer dort FR gewählt hat, sieht die App auf FR).
   ============================================================ */
(function () {
  'use strict';

  var SUPPORTED = ['de', 'fr', 'it', 'es', 'en'];
  var LS_KEY = 'mosaos-lang';

  // ── Wörterbuch ────────────────────────────────────────────
  // Nur Schlüssel, die sich vom Deutschen unterscheiden, müssen je Sprache
  // gesetzt sein; fehlt ein Schlüssel, greift der deutsche Fallback.
  var DICT = {
    de: {
      // Navigations-Abschnitte
      'nav.sec.overview': 'Übersicht', 'nav.sec.jobs': 'Einsätze', 'nav.sec.customers': 'Kunden',
      'nav.sec.finance': 'Finanzen', 'nav.sec.team': 'Team', 'nav.sec.system': 'System',
      // Navigations-Einträge (Basis; Branchen-Engine überschreibt einzelne)
      'nav.dashboard': 'Dashboard', 'nav.werkstattplan': 'Werkstattplan', 'nav.fahrzeuge': 'Fahrzeuge',
      'nav.reifen': 'Reifenhotel', 'nav.koederstellen': 'Köderstellen', 'nav.protokolle': 'Protokolle',
      'nav.baustellen': 'Baustellen', 'nav.rapporte': 'Rapporte', 'nav.planung': 'Routenplanung',
      'nav.zeiten': 'Zeiterfassung', 'nav.berichte': 'Nachweise & Berichte', 'nav.kunden': 'Kunden',
      'nav.offerten': 'Offerten', 'nav.anrufprotokoll': 'Anrufprotokoll', 'nav.abos': 'Abo-Verträge',
      'nav.rechnungen': 'Rechnungen', 'nav.nachkalkulation': 'Nachkalkulation', 'nav.mitarbeiter': 'Mitarbeiter',
      'nav.team': 'Büro-Team', 'nav.aufgaben': 'Aufgaben', 'nav.email': 'E-Mail', 'nav.einstellungen': 'Einstellungen',
      // Topbar / allgemein
      'common.newAuftrag': '+ Neuer Auftrag', 'common.loggedInAs': 'Eingeloggt als',
      'common.manageTeam': 'Team verwalten', 'common.save': 'Speichern', 'common.cancel': 'Abbrechen',
      'common.delete': 'Löschen', 'common.close': 'Schließen', 'common.edit': 'Bearbeiten',
      'common.add': 'Hinzufügen', 'common.back': 'Zurück', 'common.next': 'Weiter', 'common.search': 'Suchen',
      'common.lang': 'Sprache',
      'common.logout': 'Abmelden', 'common.toggleNav': 'Liste ein-/ausklappen',
      'common.themeToggle': 'Theme wechseln', 'common.skinToggle': 'Ansicht: Büro (dunkel) ⇄ Standard',
      'view.nachkalkulation': 'Soll-Ist-Nachkalkulation', 'view.preise': 'Preise & Konditionen',
      // Einstellungen (Settings-View)
      'set.saveChanges': 'Änderungen speichern', 'set.readonlyBanner': 'Du bist als <strong style="margin:0 4px;">Read-only</strong> angemeldet — Preise können nicht gespeichert werden.',
      'set.businessField': 'Geschäftsfeld', 'set.businessFieldDesc': 'Bestimmt Begriffe, Checklisten & Vorlagen in der ganzen App. „Gebäudereinigung" ist der Standard.', 'set.branch': 'Branche',
      'set.companyTitle': 'Firma & Zahlungsangaben', 'set.companyDesc': 'Erscheinen auf jeder Rechnung. Land steuert Steuersatz, Währung und Zahlteil (CH: QR-Einzahlschein · DE/AT: SEPA).',
      'set.coName': 'Firmenname', 'set.country': 'Land', 'set.countryCH': 'Schweiz (CH)', 'set.countryDE': 'Deutschland (DE)', 'set.countryAT': 'Österreich (AT)',
      'set.street': 'Strasse & Nr.', 'set.cityZip': 'PLZ & Ort', 'set.emailPhone': 'E-Mail / Telefon', 'set.ibanHint': 'Hinterlege deine echte IBAN — sonst zeigt die QR-Rechnung die Demo-IBAN.',
      'set.modules': 'Module', 'set.modulesDesc': 'Schalte nur die Bereiche ein, die deine Firma braucht. Deaktivierte Module verschwinden aus der Seitenleiste.',
      'set.pricesPerService': 'Preise pro Leistung', 'set.pricesSubA': 'Stundensätze und Mindestbuchungen pro ', 'set.pricesSubB': ' — fließen automatisch in jeden neuen Auftrag.',
      'set.howItWorks': '<strong style="color: var(--text);">Wie das funktioniert:</strong> Im Auftrags-Wizard wird der Preis aus diesen Sätzen + den Service-Optionen automatisch berechnet. Du kannst ihn jederzeit pro Auftrag überschreiben — zum Beispiel wenn der Kunde eine andere Offerte bekommen hat.',
      'set.deleteAccount': 'Konto löschen', 'set.deleteAccountDesc': 'Löscht dein Benutzerkonto endgültig. <strong>Wenn du der einzige Nutzer deiner Firma bist, werden auch alle Firmendaten</strong> (Kunden, Mitarbeiter, Aufträge, Nachweise, Abo) unwiderruflich gelöscht und ein laufendes Abo gekündigt. Bist du nur Teammitglied, wird nur dein Zugang entfernt.', 'set.deleteAccountBtn': 'Mein Konto löschen',
      // Reinigungs-Preiskarten (nur Branche reinigung sichtbar)
      'price.unterhalt.t': 'Unterhaltsreinigung', 'price.unterhalt.s': 'Regelmäßige Pflegereinigung',
      'price.end.t': 'Endreinigung', 'price.end.s': 'Wohnungsübergabe / Auszug',
      'price.fenster.t': 'Fensterreinigung', 'price.fenster.s': 'Innen, außen, mit/ohne Leiter',
      'price.bau.t': 'Baureinigung', 'price.bau.s': 'Grob-, Fein-, Endreinigung Bau',
      'price.fassade.t': 'Fassadenreinigung', 'price.fassade.s': 'Stator, Algen, Imprägnierung',
      'price.custom.t': 'Eigene Leistung', 'price.custom.s': 'Spezialreinigung, Sonderauftrag, …', 'price.addService': '+ Service hinzufügen',
      'price.row.rate': 'Stundensatz', 'price.row.minBooking': 'Mindestbuchung', 'price.row.travelFlat': 'Anfahrt pauschal', 'price.row.perSqm': 'Preis pro m²', 'price.row.minOrder': 'Mindestauftrag',
      'price.row.rateNoLadder': 'Stundensatz (ohne Leiter)', 'price.row.ladderSurcharge': 'Aufschlag mit Leiter', 'price.row.statorSqm': 'm²-Preis Statorreinigung', 'price.row.algaeSurcharge': 'Aufschlag Algen-Entfernung', 'price.row.impregnation': 'Imprägnierung', 'price.row.minOrderValue': 'Mindestauftragswert',
      // Views: gemeinsame Tabellenköpfe + Buttons
      'th.time': 'Zeit', 'th.status': 'Status', 'common.addEmployee': '+ Mitarbeiter hinzufügen', 'common.manageTeams': 'Teams verwalten',
      // Dashboard
      'dash.kpiJobsToday': 'Einsätze heute', 'dash.kpiJobsTodayMeta': 'geplant für heute', 'dash.kpiCustomersMeta': 'im Stamm', 'dash.kpiReports': 'Berichte',
      'dash.todayJobs': 'Heutige Einsätze', 'dash.liveStatusA': 'Live-Status aller ', 'dash.viewAll': 'Alle ansehen →',
      'dash.noJobs': 'Noch keine Einsätze geplant.', 'dash.activity': 'Aktivität', 'dash.noActivity': 'Noch keine Aktivität.',
      // Planung
      'plan.prevWeek': '← Vorwoche', 'plan.today': 'Heute', 'plan.nextWeek': 'Nächste Woche →', 'plan.optimize': 'Routen optimieren',
      'plan.crewToday': 'Heutige Besetzung · ', 'plan.resetDefault': 'Auf Standard zurück', 'plan.editCrew': 'Crew bearbeiten',
      'plan.teamsLabel': 'Teams · ', 'plan.manageTeamsLink': 'Teams verwalten →', 'plan.optimized': 'Plan optimiert',
      'plan.demoStatus': 'Letzte Berechnung vor 4 Minuten · 2h 14min Fahrzeit gespart · alle Zeitfenster eingehalten', 'plan.showConflicts': 'Konflikte anzeigen (0)',
      // Kunden
      'cust.newCustomer': '+ Neuer Kunde', 'cust.searchPh': 'Kunden suchen (Name, Ort, Telefon…)',
      // Büro-Team
      'team.subtitle': 'Wer arbeitet im Büro? Welche Rechte hat wer? Wer hat was geändert?', 'team.invite': 'Einladen',
      'team.readonlyBanner': 'Du bist als <strong style="margin: 0 4px;">Read-only</strong> angemeldet — keine Änderungen möglich. Wechsle oben rechts den Benutzer.',
      'team.rolesRights': 'Rollen & Rechte', 'team.manageRoles': '⚙ Rollen verwalten',
      'team.openInvites': 'Offene Einladungen', 'team.openInvitesDesc': 'Eingeladene Personen registrieren sich mit ihrer E-Mail und landen automatisch in deinem Team.',
      // Login / Auth (login.html)
      'auth.pageTitle': 'MosaOS — Anmelden', 'auth.brandSub': 'Disposition · Nachweis · Mehr',
      'auth.welcome': 'Willkommen zurück', 'auth.welcomeSub': 'Melde dich an, um deine Planung zu öffnen.',
      'auth.email': 'E-Mail', 'auth.password': 'Passwort', 'auth.emailPh': 'dein.name@firma.ch',
      'auth.remember': 'Angemeldet bleiben', 'auth.forgot': 'Passwort vergessen?',
      'auth.signIn': 'Anmelden', 'auth.signingIn': 'Anmelden …',
      'auth.noAccount': 'Noch kein Konto?', 'auth.setupCompany': 'Firma einrichten →',
      'auth.resetTitle': 'Passwort zurücksetzen', 'auth.resetSub': 'Wir senden dir einen Link zum Zurücksetzen an deine E-Mail.',
      'auth.sendLink': 'Link senden', 'auth.sending': 'Senden …', 'auth.backToLogin': '← Zurück zum Anmelden',
      'auth.newPassTitle': 'Neues Passwort', 'auth.newPassSub': 'Wähle ein neues Passwort für dein Konto.',
      'auth.newPassLabel': 'Neues Passwort', 'auth.newPassPh': 'Mind. 8 Zeichen',
      'auth.savePass': 'Passwort speichern', 'auth.saving': 'Speichern …',
      'auth.quote': '„Routen in 30 Sekunden statt 3 Stunden geplant — das Team weiß früher Bescheid, der Kunde sieht es im Nachweis."',
      'auth.quoteAuthor': 'Eine Plattform für jede Branche',
      'auth.feat1': 'Automatische Routenplanung in Sekunden',
      'auth.feat2': 'QR-Anwesenheit & Foto-Nachweis — Mindestlohn-konform',
      'auth.feat3': 'Daten in der EU · DSG-konform',
      'auth.errNoDb': 'Verbindung zur Datenbank fehlt (Internet?).', 'auth.errInvalid': 'E-Mail oder Passwort falsch.',
      'auth.resetSent': 'Falls ein Konto existiert, ist die E-Mail unterwegs. Prüfe dein Postfach.',
      'auth.pwChanged': '✓ Passwort geändert. Weiterleitung …'
    },
    fr: {
      'nav.sec.overview': 'Aperçu', 'nav.sec.jobs': 'Interventions', 'nav.sec.customers': 'Clients',
      'nav.sec.finance': 'Finances', 'nav.sec.team': 'Équipe', 'nav.sec.system': 'Système',
      'nav.dashboard': 'Tableau de bord', 'nav.werkstattplan': 'Plan d\'atelier', 'nav.fahrzeuge': 'Véhicules',
      'nav.reifen': 'Hôtel à pneus', 'nav.koederstellen': 'Postes d\'appâtage', 'nav.protokolle': 'Protocoles',
      'nav.baustellen': 'Chantiers', 'nav.rapporte': 'Rapports', 'nav.planung': 'Planification des tournées',
      'nav.zeiten': 'Saisie des temps', 'nav.berichte': 'Justificatifs & rapports', 'nav.kunden': 'Clients',
      'nav.offerten': 'Devis', 'nav.anrufprotokoll': 'Journal d\'appels', 'nav.abos': 'Contrats d\'abonnement',
      'nav.rechnungen': 'Factures', 'nav.nachkalkulation': 'Calcul a posteriori', 'nav.mitarbeiter': 'Employés',
      'nav.team': 'Équipe bureau', 'nav.aufgaben': 'Tâches', 'nav.email': 'E-mail', 'nav.einstellungen': 'Réglages',
      'common.newAuftrag': '+ Nouvel ordre', 'common.loggedInAs': 'Connecté en tant que',
      'common.manageTeam': 'Gérer l\'équipe', 'common.save': 'Enregistrer', 'common.cancel': 'Annuler',
      'common.delete': 'Supprimer', 'common.close': 'Fermer', 'common.edit': 'Modifier',
      'common.add': 'Ajouter', 'common.back': 'Retour', 'common.next': 'Suivant', 'common.search': 'Rechercher',
      'common.lang': 'Langue',
      'common.logout': 'Se déconnecter', 'common.toggleNav': 'Replier/déplier la liste',
      'common.themeToggle': 'Changer de thème', 'common.skinToggle': 'Vue : Bureau (sombre) ⇄ Standard',
      'view.nachkalkulation': 'Calcul a posteriori (prévu/réel)', 'view.preise': 'Prix & conditions',
      'set.saveChanges': 'Enregistrer les modifications', 'set.readonlyBanner': 'Vous êtes connecté en <strong style="margin:0 4px;">lecture seule</strong> — les prix ne peuvent pas être enregistrés.',
      'set.businessField': 'Domaine d\'activité', 'set.businessFieldDesc': 'Détermine les termes, listes de contrôle et modèles dans toute l\'app. « Nettoyage de bâtiments » est la valeur par défaut.', 'set.branch': 'Secteur',
      'set.companyTitle': 'Entreprise & coordonnées de paiement', 'set.companyDesc': 'Apparaissent sur chaque facture. Le pays définit le taux de TVA, la devise et le moyen de paiement (CH : bulletin QR · DE/AT : SEPA).',
      'set.coName': 'Nom de l\'entreprise', 'set.country': 'Pays', 'set.countryCH': 'Suisse (CH)', 'set.countryDE': 'Allemagne (DE)', 'set.countryAT': 'Autriche (AT)',
      'set.street': 'Rue & n°', 'set.cityZip': 'NPA & localité', 'set.emailPhone': 'E-mail / téléphone', 'set.ibanHint': 'Saisissez votre véritable IBAN — sinon la facture QR affiche l\'IBAN de démo.',
      'set.modules': 'Modules', 'set.modulesDesc': 'Activez uniquement les domaines dont votre entreprise a besoin. Les modules désactivés disparaissent de la barre latérale.',
      'set.pricesPerService': 'Prix par prestation', 'set.pricesSubA': 'Tarifs horaires et réservations minimales par ', 'set.pricesSubB': ' — s\'appliquent automatiquement à chaque nouveau mandat.',
      'set.howItWorks': '<strong style="color: var(--text);">Comment ça marche :</strong> Dans l\'assistant de mandat, le prix est calculé automatiquement à partir de ces tarifs + des options de prestation. Vous pouvez le remplacer à tout moment par mandat — par exemple si le client a reçu un autre devis.',
      'set.deleteAccount': 'Supprimer le compte', 'set.deleteAccountDesc': 'Supprime définitivement votre compte utilisateur. <strong>Si vous êtes le seul utilisateur de votre entreprise, toutes les données de l\'entreprise</strong> (clients, employés, mandats, justificatifs, abonnement) seront également supprimées irréversiblement et un abonnement en cours résilié. Si vous n\'êtes que membre d\'équipe, seul votre accès est supprimé.', 'set.deleteAccountBtn': 'Supprimer mon compte',
      'price.unterhalt.t': 'Nettoyage d\'entretien', 'price.unterhalt.s': 'Nettoyage d\'entretien régulier',
      'price.end.t': 'Nettoyage de fin de bail', 'price.end.s': 'Remise d\'appartement / déménagement',
      'price.fenster.t': 'Nettoyage de vitres', 'price.fenster.s': 'Intérieur, extérieur, avec/sans échelle',
      'price.bau.t': 'Nettoyage de chantier', 'price.bau.s': 'Nettoyage gros œuvre, fin, final',
      'price.fassade.t': 'Nettoyage de façade', 'price.fassade.s': 'Stator, algues, imprégnation',
      'price.custom.t': 'Prestation personnalisée', 'price.custom.s': 'Nettoyage spécial, mandat spécial, …', 'price.addService': '+ Ajouter une prestation',
      'price.row.rate': 'Tarif horaire', 'price.row.minBooking': 'Réservation minimale', 'price.row.travelFlat': 'Forfait déplacement', 'price.row.perSqm': 'Prix au m²', 'price.row.minOrder': 'Commande minimale',
      'price.row.rateNoLadder': 'Tarif horaire (sans échelle)', 'price.row.ladderSurcharge': 'Supplément échelle', 'price.row.statorSqm': 'Prix m² nettoyage stator', 'price.row.algaeSurcharge': 'Supplément élimination algues', 'price.row.impregnation': 'Imprégnation', 'price.row.minOrderValue': 'Valeur de commande minimale',
      'th.time': 'Heure', 'th.status': 'Statut', 'common.addEmployee': '+ Ajouter un employé', 'common.manageTeams': 'Gérer les équipes',
      'dash.kpiJobsToday': 'Interventions du jour', 'dash.kpiJobsTodayMeta': 'prévues aujourd\'hui', 'dash.kpiCustomersMeta': 'au fichier', 'dash.kpiReports': 'Rapports',
      'dash.todayJobs': 'Interventions du jour', 'dash.liveStatusA': 'Statut en direct de tous les ', 'dash.viewAll': 'Voir tout →',
      'dash.noJobs': 'Aucune intervention planifiée.', 'dash.activity': 'Activité', 'dash.noActivity': 'Aucune activité.',
      'plan.prevWeek': '← Sem. préc.', 'plan.today': 'Aujourd\'hui', 'plan.nextWeek': 'Sem. suivante →', 'plan.optimize': 'Optimiser les tournées',
      'plan.crewToday': 'Équipe du jour · ', 'plan.resetDefault': 'Réinitialiser', 'plan.editCrew': 'Modifier l\'équipe',
      'plan.teamsLabel': 'Équipes · ', 'plan.manageTeamsLink': 'Gérer les équipes →', 'plan.optimized': 'Plan optimisé',
      'plan.demoStatus': 'Dernier calcul il y a 4 minutes · 2h 14min de trajet économisées · toutes les fenêtres respectées', 'plan.showConflicts': 'Afficher les conflits (0)',
      'cust.newCustomer': '+ Nouveau client', 'cust.searchPh': 'Rechercher des clients (nom, lieu, téléphone…)',
      'team.subtitle': 'Qui travaille au bureau ? Qui a quels droits ? Qui a modifié quoi ?', 'team.invite': 'Inviter',
      'team.readonlyBanner': 'Vous êtes connecté en <strong style="margin: 0 4px;">lecture seule</strong> — aucune modification possible. Changez d\'utilisateur en haut à droite.',
      'team.rolesRights': 'Rôles & droits', 'team.manageRoles': '⚙ Gérer les rôles',
      'team.openInvites': 'Invitations en attente', 'team.openInvitesDesc': 'Les personnes invitées s\'inscrivent avec leur e-mail et rejoignent automatiquement votre équipe.',
      'auth.pageTitle': 'MosaOS — Connexion', 'auth.brandSub': 'Planification · Justificatif · Plus',
      'auth.welcome': 'Bon retour', 'auth.welcomeSub': 'Connectez-vous pour ouvrir votre planification.',
      'auth.email': 'E-mail', 'auth.password': 'Mot de passe', 'auth.emailPh': 'vous@entreprise.ch',
      'auth.remember': 'Rester connecté', 'auth.forgot': 'Mot de passe oublié ?',
      'auth.signIn': 'Se connecter', 'auth.signingIn': 'Connexion …',
      'auth.noAccount': 'Pas encore de compte ?', 'auth.setupCompany': 'Créer une entreprise →',
      'auth.resetTitle': 'Réinitialiser le mot de passe', 'auth.resetSub': 'Nous vous enverrons un lien de réinitialisation par e-mail.',
      'auth.sendLink': 'Envoyer le lien', 'auth.sending': 'Envoi …', 'auth.backToLogin': '← Retour à la connexion',
      'auth.newPassTitle': 'Nouveau mot de passe', 'auth.newPassSub': 'Choisissez un nouveau mot de passe pour votre compte.',
      'auth.newPassLabel': 'Nouveau mot de passe', 'auth.newPassPh': 'Au moins 8 caractères',
      'auth.savePass': 'Enregistrer le mot de passe', 'auth.saving': 'Enregistrement …',
      'auth.quote': '« Des tournées planifiées en 30 secondes au lieu de 3 heures — l\'équipe est informée plus tôt, le client le voit dans le justificatif. »',
      'auth.quoteAuthor': 'Une plateforme pour chaque métier',
      'auth.feat1': 'Planification automatique des tournées en quelques secondes',
      'auth.feat2': 'Présence par QR & preuve photo — conforme au salaire minimum',
      'auth.feat3': 'Données dans l\'UE · conforme au RGPD',
      'auth.errNoDb': 'Pas de connexion à la base de données (internet ?).', 'auth.errInvalid': 'E-mail ou mot de passe incorrect.',
      'auth.resetSent': 'Si un compte existe, l\'e-mail est en route. Vérifiez votre boîte de réception.',
      'auth.pwChanged': '✓ Mot de passe modifié. Redirection …'
    },
    it: {
      'nav.sec.overview': 'Panoramica', 'nav.sec.jobs': 'Interventi', 'nav.sec.customers': 'Clienti',
      'nav.sec.finance': 'Finanze', 'nav.sec.team': 'Team', 'nav.sec.system': 'Sistema',
      'nav.dashboard': 'Dashboard', 'nav.werkstattplan': 'Piano officina', 'nav.fahrzeuge': 'Veicoli',
      'nav.reifen': 'Deposito pneumatici', 'nav.koederstellen': 'Postazioni esca', 'nav.protokolle': 'Protocolli',
      'nav.baustellen': 'Cantieri', 'nav.rapporte': 'Rapporti', 'nav.planung': 'Pianificazione giri',
      'nav.zeiten': 'Rilevamento ore', 'nav.berichte': 'Documenti e rapporti', 'nav.kunden': 'Clienti',
      'nav.offerten': 'Preventivi', 'nav.anrufprotokoll': 'Registro chiamate', 'nav.abos': 'Contratti abbonamento',
      'nav.rechnungen': 'Fatture', 'nav.nachkalkulation': 'Calcolo consuntivo', 'nav.mitarbeiter': 'Dipendenti',
      'nav.team': 'Team ufficio', 'nav.aufgaben': 'Attività', 'nav.email': 'E-mail', 'nav.einstellungen': 'Impostazioni',
      'common.newAuftrag': '+ Nuovo ordine', 'common.loggedInAs': 'Connesso come',
      'common.manageTeam': 'Gestisci team', 'common.save': 'Salva', 'common.cancel': 'Annulla',
      'common.delete': 'Elimina', 'common.close': 'Chiudi', 'common.edit': 'Modifica',
      'common.add': 'Aggiungi', 'common.back': 'Indietro', 'common.next': 'Avanti', 'common.search': 'Cerca',
      'common.lang': 'Lingua',
      'common.logout': 'Esci', 'common.toggleNav': 'Comprimi/espandi elenco',
      'common.themeToggle': 'Cambia tema', 'common.skinToggle': 'Vista: Ufficio (scuro) ⇄ Standard',
      'view.nachkalkulation': 'Calcolo consuntivo (previsto/effettivo)', 'view.preise': 'Prezzi e condizioni',
      'set.saveChanges': 'Salva modifiche', 'set.readonlyBanner': 'Sei connesso in <strong style="margin:0 4px;">sola lettura</strong> — i prezzi non possono essere salvati.',
      'set.businessField': 'Settore', 'set.businessFieldDesc': 'Determina termini, checklist e modelli in tutta l\'app. «Pulizia edifici» è l\'impostazione predefinita.', 'set.branch': 'Categoria',
      'set.companyTitle': 'Azienda e dati di pagamento', 'set.companyDesc': 'Compaiono su ogni fattura. Il paese determina aliquota, valuta e sezione di pagamento (CH: polizza QR · DE/AT: SEPA).',
      'set.coName': 'Nome azienda', 'set.country': 'Paese', 'set.countryCH': 'Svizzera (CH)', 'set.countryDE': 'Germania (DE)', 'set.countryAT': 'Austria (AT)',
      'set.street': 'Via e n.', 'set.cityZip': 'CAP e città', 'set.emailPhone': 'E-mail / telefono', 'set.ibanHint': 'Inserisci il tuo IBAN reale — altrimenti la fattura QR mostra l\'IBAN demo.',
      'set.modules': 'Moduli', 'set.modulesDesc': 'Attiva solo le aree di cui la tua azienda ha bisogno. I moduli disattivati scompaiono dalla barra laterale.',
      'set.pricesPerService': 'Prezzi per prestazione', 'set.pricesSubA': 'Tariffe orarie e prenotazioni minime per ', 'set.pricesSubB': ' — confluiscono automaticamente in ogni nuovo ordine.',
      'set.howItWorks': '<strong style="color: var(--text);">Come funziona:</strong> Nella procedura guidata il prezzo viene calcolato automaticamente da queste tariffe + le opzioni di servizio. Puoi sovrascriverlo in qualsiasi momento per ordine — ad esempio se il cliente ha ricevuto un altro preventivo.',
      'set.deleteAccount': 'Elimina account', 'set.deleteAccountDesc': 'Elimina definitivamente il tuo account utente. <strong>Se sei l\'unico utente della tua azienda, verranno eliminati irreversibilmente anche tutti i dati aziendali</strong> (clienti, dipendenti, ordini, documenti, abbonamento) e un abbonamento attivo verrà disdetto. Se sei solo un membro del team, viene rimosso solo il tuo accesso.', 'set.deleteAccountBtn': 'Elimina il mio account',
      'price.unterhalt.t': 'Pulizia di mantenimento', 'price.unterhalt.s': 'Pulizia di cura regolare',
      'price.end.t': 'Pulizia finale', 'price.end.s': 'Consegna appartamento / trasloco',
      'price.fenster.t': 'Pulizia vetri', 'price.fenster.s': 'Interno, esterno, con/senza scala',
      'price.bau.t': 'Pulizia di cantiere', 'price.bau.s': 'Pulizia grezza, fine, finale',
      'price.fassade.t': 'Pulizia facciate', 'price.fassade.s': 'Statore, alghe, impregnazione',
      'price.custom.t': 'Servizio personalizzato', 'price.custom.s': 'Pulizia speciale, incarico speciale, …', 'price.addService': '+ Aggiungi servizio',
      'price.row.rate': 'Tariffa oraria', 'price.row.minBooking': 'Prenotazione minima', 'price.row.travelFlat': 'Trasferta forfettaria', 'price.row.perSqm': 'Prezzo al m²', 'price.row.minOrder': 'Ordine minimo',
      'price.row.rateNoLadder': 'Tariffa oraria (senza scala)', 'price.row.ladderSurcharge': 'Supplemento scala', 'price.row.statorSqm': 'Prezzo m² pulizia statore', 'price.row.algaeSurcharge': 'Supplemento rimozione alghe', 'price.row.impregnation': 'Impregnazione', 'price.row.minOrderValue': 'Valore ordine minimo',
      'th.time': 'Ora', 'th.status': 'Stato', 'common.addEmployee': '+ Aggiungi dipendente', 'common.manageTeams': 'Gestisci team',
      'dash.kpiJobsToday': 'Interventi oggi', 'dash.kpiJobsTodayMeta': 'pianificati per oggi', 'dash.kpiCustomersMeta': 'in archivio', 'dash.kpiReports': 'Rapporti',
      'dash.todayJobs': 'Interventi di oggi', 'dash.liveStatusA': 'Stato live di tutti i ', 'dash.viewAll': 'Vedi tutti →',
      'dash.noJobs': 'Nessun intervento pianificato.', 'dash.activity': 'Attività', 'dash.noActivity': 'Nessuna attività.',
      'plan.prevWeek': '← Sett. prec.', 'plan.today': 'Oggi', 'plan.nextWeek': 'Sett. succ. →', 'plan.optimize': 'Ottimizza giri',
      'plan.crewToday': 'Squadra di oggi · ', 'plan.resetDefault': 'Ripristina predefinito', 'plan.editCrew': 'Modifica squadra',
      'plan.teamsLabel': 'Team · ', 'plan.manageTeamsLink': 'Gestisci team →', 'plan.optimized': 'Piano ottimizzato',
      'plan.demoStatus': 'Ultimo calcolo 4 minuti fa · 2h 14min di viaggio risparmiati · tutte le finestre rispettate', 'plan.showConflicts': 'Mostra conflitti (0)',
      'cust.newCustomer': '+ Nuovo cliente', 'cust.searchPh': 'Cerca clienti (nome, città, telefono…)',
      'team.subtitle': 'Chi lavora in ufficio? Chi ha quali diritti? Chi ha modificato cosa?', 'team.invite': 'Invita',
      'team.readonlyBanner': 'Sei connesso in <strong style="margin: 0 4px;">sola lettura</strong> — nessuna modifica possibile. Cambia utente in alto a destra.',
      'team.rolesRights': 'Ruoli e diritti', 'team.manageRoles': '⚙ Gestisci ruoli',
      'team.openInvites': 'Inviti in sospeso', 'team.openInvitesDesc': 'Le persone invitate si registrano con la loro e-mail e finiscono automaticamente nel tuo team.',
      'auth.pageTitle': 'MosaOS — Accedi', 'auth.brandSub': 'Pianificazione · Documentazione · Altro',
      'auth.welcome': 'Bentornato', 'auth.welcomeSub': 'Accedi per aprire la tua pianificazione.',
      'auth.email': 'E-mail', 'auth.password': 'Password', 'auth.emailPh': 'tu@azienda.ch',
      'auth.remember': 'Resta connesso', 'auth.forgot': 'Password dimenticata?',
      'auth.signIn': 'Accedi', 'auth.signingIn': 'Accesso …',
      'auth.noAccount': 'Non hai ancora un account?', 'auth.setupCompany': 'Crea azienda →',
      'auth.resetTitle': 'Reimposta la password', 'auth.resetSub': 'Ti invieremo un link per la reimpostazione via e-mail.',
      'auth.sendLink': 'Invia link', 'auth.sending': 'Invio …', 'auth.backToLogin': '← Torna all\'accesso',
      'auth.newPassTitle': 'Nuova password', 'auth.newPassSub': 'Scegli una nuova password per il tuo account.',
      'auth.newPassLabel': 'Nuova password', 'auth.newPassPh': 'Almeno 8 caratteri',
      'auth.savePass': 'Salva password', 'auth.saving': 'Salvataggio …',
      'auth.quote': '«Giri pianificati in 30 secondi invece di 3 ore — il team lo sa prima, il cliente lo vede nella documentazione.»',
      'auth.quoteAuthor': 'Una piattaforma per ogni settore',
      'auth.feat1': 'Pianificazione automatica dei giri in pochi secondi',
      'auth.feat2': 'Presenza tramite QR e prova fotografica — conforme al salario minimo',
      'auth.feat3': 'Dati nell\'UE · conforme al GDPR',
      'auth.errNoDb': 'Nessuna connessione al database (internet?).', 'auth.errInvalid': 'E-mail o password errati.',
      'auth.resetSent': 'Se esiste un account, l\'e-mail è in arrivo. Controlla la posta.',
      'auth.pwChanged': '✓ Password modificata. Reindirizzamento …'
    },
    es: {
      'nav.sec.overview': 'Resumen', 'nav.sec.jobs': 'Servicios', 'nav.sec.customers': 'Clientes',
      'nav.sec.finance': 'Finanzas', 'nav.sec.team': 'Equipo', 'nav.sec.system': 'Sistema',
      'nav.dashboard': 'Panel', 'nav.werkstattplan': 'Plan de taller', 'nav.fahrzeuge': 'Vehículos',
      'nav.reifen': 'Hotel de neumáticos', 'nav.koederstellen': 'Puntos de cebo', 'nav.protokolle': 'Protocolos',
      'nav.baustellen': 'Obras', 'nav.rapporte': 'Partes de trabajo', 'nav.planung': 'Planificación de rutas',
      'nav.zeiten': 'Registro de horas', 'nav.berichte': 'Justificantes e informes', 'nav.kunden': 'Clientes',
      'nav.offerten': 'Presupuestos', 'nav.anrufprotokoll': 'Registro de llamadas', 'nav.abos': 'Contratos de abono',
      'nav.rechnungen': 'Facturas', 'nav.nachkalkulation': 'Cálculo posterior', 'nav.mitarbeiter': 'Empleados',
      'nav.team': 'Equipo de oficina', 'nav.aufgaben': 'Tareas', 'nav.email': 'Correo', 'nav.einstellungen': 'Ajustes',
      'common.newAuftrag': '+ Nuevo pedido', 'common.loggedInAs': 'Conectado como',
      'common.manageTeam': 'Gestionar equipo', 'common.save': 'Guardar', 'common.cancel': 'Cancelar',
      'common.delete': 'Eliminar', 'common.close': 'Cerrar', 'common.edit': 'Editar',
      'common.add': 'Añadir', 'common.back': 'Atrás', 'common.next': 'Siguiente', 'common.search': 'Buscar',
      'common.lang': 'Idioma',
      'common.logout': 'Cerrar sesión', 'common.toggleNav': 'Plegar/desplegar lista',
      'common.themeToggle': 'Cambiar tema', 'common.skinToggle': 'Vista: Oficina (oscuro) ⇄ Estándar',
      'view.nachkalkulation': 'Cálculo posterior (previsto/real)', 'view.preise': 'Precios y condiciones',
      'set.saveChanges': 'Guardar cambios', 'set.readonlyBanner': 'Has iniciado sesión como <strong style="margin:0 4px;">solo lectura</strong> — los precios no se pueden guardar.',
      'set.businessField': 'Sector', 'set.businessFieldDesc': 'Determina términos, listas de control y plantillas en toda la app. «Limpieza de edificios» es la opción predeterminada.', 'set.branch': 'Categoría',
      'set.companyTitle': 'Empresa y datos de pago', 'set.companyDesc': 'Aparecen en cada factura. El país define el tipo impositivo, la moneda y la parte de pago (CH: boletín QR · DE/AT: SEPA).',
      'set.coName': 'Nombre de empresa', 'set.country': 'País', 'set.countryCH': 'Suiza (CH)', 'set.countryDE': 'Alemania (DE)', 'set.countryAT': 'Austria (AT)',
      'set.street': 'Calle y n.º', 'set.cityZip': 'C.P. y ciudad', 'set.emailPhone': 'Correo / teléfono', 'set.ibanHint': 'Introduce tu IBAN real — de lo contrario la factura QR muestra el IBAN de demostración.',
      'set.modules': 'Módulos', 'set.modulesDesc': 'Activa solo las áreas que tu empresa necesita. Los módulos desactivados desaparecen de la barra lateral.',
      'set.pricesPerService': 'Precios por servicio', 'set.pricesSubA': 'Tarifas por hora y reservas mínimas por ', 'set.pricesSubB': ' — se aplican automáticamente a cada nuevo pedido.',
      'set.howItWorks': '<strong style="color: var(--text);">Cómo funciona:</strong> En el asistente de pedidos el precio se calcula automáticamente a partir de estas tarifas + las opciones de servicio. Puedes sobrescribirlo en cualquier momento por pedido — por ejemplo si el cliente recibió otro presupuesto.',
      'set.deleteAccount': 'Eliminar cuenta', 'set.deleteAccountDesc': 'Elimina definitivamente tu cuenta de usuario. <strong>Si eres el único usuario de tu empresa, también se eliminarán de forma irreversible todos los datos de la empresa</strong> (clientes, empleados, pedidos, justificantes, suscripción) y se cancelará una suscripción activa. Si solo eres miembro del equipo, solo se elimina tu acceso.', 'set.deleteAccountBtn': 'Eliminar mi cuenta',
      'price.unterhalt.t': 'Limpieza de mantenimiento', 'price.unterhalt.s': 'Limpieza periódica de cuidado',
      'price.end.t': 'Limpieza final', 'price.end.s': 'Entrega de vivienda / mudanza',
      'price.fenster.t': 'Limpieza de ventanas', 'price.fenster.s': 'Interior, exterior, con/sin escalera',
      'price.bau.t': 'Limpieza de obra', 'price.bau.s': 'Limpieza gruesa, fina, final',
      'price.fassade.t': 'Limpieza de fachadas', 'price.fassade.s': 'Estátor, algas, impregnación',
      'price.custom.t': 'Servicio propio', 'price.custom.s': 'Limpieza especial, encargo especial, …', 'price.addService': '+ Añadir servicio',
      'price.row.rate': 'Tarifa por hora', 'price.row.minBooking': 'Reserva mínima', 'price.row.travelFlat': 'Desplazamiento fijo', 'price.row.perSqm': 'Precio por m²', 'price.row.minOrder': 'Pedido mínimo',
      'price.row.rateNoLadder': 'Tarifa por hora (sin escalera)', 'price.row.ladderSurcharge': 'Recargo con escalera', 'price.row.statorSqm': 'Precio m² limpieza estátor', 'price.row.algaeSurcharge': 'Recargo eliminación de algas', 'price.row.impregnation': 'Impregnación', 'price.row.minOrderValue': 'Valor mínimo de pedido',
      'th.time': 'Hora', 'th.status': 'Estado', 'common.addEmployee': '+ Añadir empleado', 'common.manageTeams': 'Gestionar equipos',
      'dash.kpiJobsToday': 'Servicios hoy', 'dash.kpiJobsTodayMeta': 'programados para hoy', 'dash.kpiCustomersMeta': 'en cartera', 'dash.kpiReports': 'Informes',
      'dash.todayJobs': 'Servicios de hoy', 'dash.liveStatusA': 'Estado en vivo de todos los ', 'dash.viewAll': 'Ver todos →',
      'dash.noJobs': 'Aún no hay servicios programados.', 'dash.activity': 'Actividad', 'dash.noActivity': 'Aún no hay actividad.',
      'plan.prevWeek': '← Sem. ant.', 'plan.today': 'Hoy', 'plan.nextWeek': 'Próx. semana →', 'plan.optimize': 'Optimizar rutas',
      'plan.crewToday': 'Cuadrilla de hoy · ', 'plan.resetDefault': 'Restablecer', 'plan.editCrew': 'Editar cuadrilla',
      'plan.teamsLabel': 'Equipos · ', 'plan.manageTeamsLink': 'Gestionar equipos →', 'plan.optimized': 'Plan optimizado',
      'plan.demoStatus': 'Último cálculo hace 4 minutos · 2h 14min de viaje ahorrados · todas las franjas cumplidas', 'plan.showConflicts': 'Mostrar conflictos (0)',
      'cust.newCustomer': '+ Nuevo cliente', 'cust.searchPh': 'Buscar clientes (nombre, ciudad, teléfono…)',
      'team.subtitle': '¿Quién trabaja en la oficina? ¿Quién tiene qué permisos? ¿Quién cambió qué?', 'team.invite': 'Invitar',
      'team.readonlyBanner': 'Has iniciado sesión como <strong style="margin: 0 4px;">solo lectura</strong> — no se pueden hacer cambios. Cambia de usuario arriba a la derecha.',
      'team.rolesRights': 'Roles y permisos', 'team.manageRoles': '⚙ Gestionar roles',
      'team.openInvites': 'Invitaciones pendientes', 'team.openInvitesDesc': 'Las personas invitadas se registran con su correo y entran automáticamente en tu equipo.',
      'auth.pageTitle': 'MosaOS — Iniciar sesión', 'auth.brandSub': 'Planificación · Justificante · Más',
      'auth.welcome': 'Bienvenido de nuevo', 'auth.welcomeSub': 'Inicia sesión para abrir tu planificación.',
      'auth.email': 'Correo', 'auth.password': 'Contraseña', 'auth.emailPh': 'tu@empresa.ch',
      'auth.remember': 'Mantener sesión iniciada', 'auth.forgot': '¿Olvidaste la contraseña?',
      'auth.signIn': 'Iniciar sesión', 'auth.signingIn': 'Iniciando sesión …',
      'auth.noAccount': '¿Aún no tienes cuenta?', 'auth.setupCompany': 'Crear empresa →',
      'auth.resetTitle': 'Restablecer contraseña', 'auth.resetSub': 'Te enviaremos un enlace de restablecimiento a tu correo.',
      'auth.sendLink': 'Enviar enlace', 'auth.sending': 'Enviando …', 'auth.backToLogin': '← Volver al inicio de sesión',
      'auth.newPassTitle': 'Nueva contraseña', 'auth.newPassSub': 'Elige una nueva contraseña para tu cuenta.',
      'auth.newPassLabel': 'Nueva contraseña', 'auth.newPassPh': 'Mínimo 8 caracteres',
      'auth.savePass': 'Guardar contraseña', 'auth.saving': 'Guardando …',
      'auth.quote': '«Rutas planificadas en 30 segundos en lugar de 3 horas: el equipo se entera antes, el cliente lo ve en el justificante.»',
      'auth.quoteAuthor': 'Una plataforma para cada sector',
      'auth.feat1': 'Planificación automática de rutas en segundos',
      'auth.feat2': 'Asistencia por QR y prueba fotográfica — conforme al salario mínimo',
      'auth.feat3': 'Datos en la UE · conforme al RGPD',
      'auth.errNoDb': 'Sin conexión a la base de datos (¿internet?).', 'auth.errInvalid': 'Correo o contraseña incorrectos.',
      'auth.resetSent': 'Si existe una cuenta, el correo está en camino. Revisa tu bandeja.',
      'auth.pwChanged': '✓ Contraseña cambiada. Redirigiendo …'
    },
    en: {
      'nav.sec.overview': 'Overview', 'nav.sec.jobs': 'Jobs', 'nav.sec.customers': 'Customers',
      'nav.sec.finance': 'Finance', 'nav.sec.team': 'Team', 'nav.sec.system': 'System',
      'nav.dashboard': 'Dashboard', 'nav.werkstattplan': 'Workshop board', 'nav.fahrzeuge': 'Vehicles',
      'nav.reifen': 'Tyre hotel', 'nav.koederstellen': 'Bait stations', 'nav.protokolle': 'Protocols',
      'nav.baustellen': 'Sites', 'nav.rapporte': 'Work reports', 'nav.planung': 'Route planning',
      'nav.zeiten': 'Time tracking', 'nav.berichte': 'Records & reports', 'nav.kunden': 'Customers',
      'nav.offerten': 'Quotes', 'nav.anrufprotokoll': 'Call log', 'nav.abos': 'Subscription contracts',
      'nav.rechnungen': 'Invoices', 'nav.nachkalkulation': 'Post-costing', 'nav.mitarbeiter': 'Employees',
      'nav.team': 'Office team', 'nav.aufgaben': 'Tasks', 'nav.email': 'Email', 'nav.einstellungen': 'Settings',
      'common.newAuftrag': '+ New order', 'common.loggedInAs': 'Logged in as',
      'common.manageTeam': 'Manage team', 'common.save': 'Save', 'common.cancel': 'Cancel',
      'common.delete': 'Delete', 'common.close': 'Close', 'common.edit': 'Edit',
      'common.add': 'Add', 'common.back': 'Back', 'common.next': 'Next', 'common.search': 'Search',
      'common.lang': 'Language',
      'common.logout': 'Sign out', 'common.toggleNav': 'Toggle list',
      'common.themeToggle': 'Switch theme', 'common.skinToggle': 'View: Office (dark) ⇄ Standard',
      'view.nachkalkulation': 'Target vs. actual costing', 'view.preise': 'Prices & terms',
      'set.saveChanges': 'Save changes', 'set.readonlyBanner': 'You are signed in as <strong style="margin:0 4px;">read-only</strong> — prices cannot be saved.',
      'set.businessField': 'Business field', 'set.businessFieldDesc': 'Determines terms, checklists & templates across the app. "Building cleaning" is the default.', 'set.branch': 'Industry',
      'set.companyTitle': 'Company & payment details', 'set.companyDesc': 'Appear on every invoice. Country controls tax rate, currency and payment part (CH: QR slip · DE/AT: SEPA).',
      'set.coName': 'Company name', 'set.country': 'Country', 'set.countryCH': 'Switzerland (CH)', 'set.countryDE': 'Germany (DE)', 'set.countryAT': 'Austria (AT)',
      'set.street': 'Street & no.', 'set.cityZip': 'ZIP & city', 'set.emailPhone': 'Email / phone', 'set.ibanHint': 'Enter your real IBAN — otherwise the QR invoice shows the demo IBAN.',
      'set.modules': 'Modules', 'set.modulesDesc': 'Enable only the areas your company needs. Disabled modules disappear from the sidebar.',
      'set.pricesPerService': 'Prices per service', 'set.pricesSubA': 'Hourly rates and minimum bookings per ', 'set.pricesSubB': ' — flow automatically into every new order.',
      'set.howItWorks': '<strong style="color: var(--text);">How this works:</strong> In the order wizard the price is calculated automatically from these rates + the service options. You can override it per order at any time — for example if the customer received a different quote.',
      'set.deleteAccount': 'Delete account', 'set.deleteAccountDesc': 'Permanently deletes your user account. <strong>If you are the only user of your company, all company data</strong> (customers, employees, orders, records, subscription) will also be irreversibly deleted and an active subscription cancelled. If you are only a team member, only your access is removed.', 'set.deleteAccountBtn': 'Delete my account',
      'price.unterhalt.t': 'Maintenance cleaning', 'price.unterhalt.s': 'Regular upkeep cleaning',
      'price.end.t': 'Final cleaning', 'price.end.s': 'Handover / move-out',
      'price.fenster.t': 'Window cleaning', 'price.fenster.s': 'Inside, outside, with/without ladder',
      'price.bau.t': 'Construction cleaning', 'price.bau.s': 'Rough, fine, final construction cleaning',
      'price.fassade.t': 'Facade cleaning', 'price.fassade.s': 'Stator, algae, impregnation',
      'price.custom.t': 'Custom service', 'price.custom.s': 'Special cleaning, custom job, …', 'price.addService': '+ Add service',
      'price.row.rate': 'Hourly rate', 'price.row.minBooking': 'Minimum booking', 'price.row.travelFlat': 'Travel flat rate', 'price.row.perSqm': 'Price per m²', 'price.row.minOrder': 'Minimum order',
      'price.row.rateNoLadder': 'Hourly rate (no ladder)', 'price.row.ladderSurcharge': 'Ladder surcharge', 'price.row.statorSqm': 'm² price stator cleaning', 'price.row.algaeSurcharge': 'Algae removal surcharge', 'price.row.impregnation': 'Impregnation', 'price.row.minOrderValue': 'Minimum order value',
      'th.time': 'Time', 'th.status': 'Status', 'common.addEmployee': '+ Add employee', 'common.manageTeams': 'Manage teams',
      'dash.kpiJobsToday': 'Jobs today', 'dash.kpiJobsTodayMeta': 'scheduled for today', 'dash.kpiCustomersMeta': 'on file', 'dash.kpiReports': 'Reports',
      'dash.todayJobs': 'Today\'s jobs', 'dash.liveStatusA': 'Live status of all ', 'dash.viewAll': 'View all →',
      'dash.noJobs': 'No jobs scheduled yet.', 'dash.activity': 'Activity', 'dash.noActivity': 'No activity yet.',
      'plan.prevWeek': '← Prev. week', 'plan.today': 'Today', 'plan.nextWeek': 'Next week →', 'plan.optimize': 'Optimise routes',
      'plan.crewToday': 'Today\'s crew · ', 'plan.resetDefault': 'Reset to default', 'plan.editCrew': 'Edit crew',
      'plan.teamsLabel': 'Teams · ', 'plan.manageTeamsLink': 'Manage teams →', 'plan.optimized': 'Plan optimised',
      'plan.demoStatus': 'Last calculation 4 minutes ago · 2h 14min travel time saved · all time windows met', 'plan.showConflicts': 'Show conflicts (0)',
      'cust.newCustomer': '+ New customer', 'cust.searchPh': 'Search customers (name, city, phone…)',
      'team.subtitle': 'Who works in the office? Who has which rights? Who changed what?', 'team.invite': 'Invite',
      'team.readonlyBanner': 'You are signed in as <strong style="margin: 0 4px;">read-only</strong> — no changes possible. Switch the user at the top right.',
      'team.rolesRights': 'Roles & rights', 'team.manageRoles': '⚙ Manage roles',
      'team.openInvites': 'Pending invitations', 'team.openInvitesDesc': 'Invited people register with their email and land automatically in your team.',
      'auth.pageTitle': 'MosaOS — Sign in', 'auth.brandSub': 'Scheduling · Proof · More',
      'auth.welcome': 'Welcome back', 'auth.welcomeSub': 'Sign in to open your planning.',
      'auth.email': 'Email', 'auth.password': 'Password', 'auth.emailPh': 'you@company.com',
      'auth.remember': 'Stay signed in', 'auth.forgot': 'Forgot password?',
      'auth.signIn': 'Sign in', 'auth.signingIn': 'Signing in …',
      'auth.noAccount': 'No account yet?', 'auth.setupCompany': 'Set up company →',
      'auth.resetTitle': 'Reset password', 'auth.resetSub': 'We\'ll send a reset link to your email.',
      'auth.sendLink': 'Send link', 'auth.sending': 'Sending …', 'auth.backToLogin': '← Back to sign in',
      'auth.newPassTitle': 'New password', 'auth.newPassSub': 'Choose a new password for your account.',
      'auth.newPassLabel': 'New password', 'auth.newPassPh': 'At least 8 characters',
      'auth.savePass': 'Save password', 'auth.saving': 'Saving …',
      'auth.quote': '"Routes planned in 30 seconds instead of 3 hours — the team knows sooner, the customer sees it in the proof."',
      'auth.quoteAuthor': 'One platform for every trade',
      'auth.feat1': 'Automatic route planning in seconds',
      'auth.feat2': 'QR attendance & photo proof — minimum-wage compliant',
      'auth.feat3': 'Data in the EU · GDPR-compliant',
      'auth.errNoDb': 'No connection to the database (internet?).', 'auth.errInvalid': 'Email or password incorrect.',
      'auth.resetSent': 'If an account exists, the email is on its way. Check your inbox.',
      'auth.pwChanged': '✓ Password changed. Redirecting …'
    }
  };

  function detect() {
    try { var s = localStorage.getItem(LS_KEY); if (s && SUPPORTED.indexOf(s) >= 0) return s; } catch (e) {}
    var langs = navigator.languages || [navigator.language || 'de'];
    for (var i = 0; i < langs.length; i++) {
      var sh = (langs[i] || '').toLowerCase().slice(0, 2);
      if (SUPPORTED.indexOf(sh) >= 0) return sh;
    }
    return 'de';
  }

  var current = detect();
  function get() { return current; }

  // Übersetzung holen; Fallback: aktuelle Sprache → Deutsch → mitgegebener Fallback → Key.
  function t(key, fallback) {
    var d = DICT[current] || DICT.de;
    if (d[key] != null) return d[key];
    if (DICT.de[key] != null) return DICT.de[key];
    return fallback != null ? fallback : key;
  }

  function apply(root) {
    var scope = root || document;
    document.documentElement.lang = current;
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'), null);
      if (v == null) return;
      if (v.indexOf('<') >= 0) el.innerHTML = v; else el.textContent = v;
    });
    scope.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-ph'), null);
      if (v != null) el.setAttribute('placeholder', v);
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-title'), null);
      if (v != null) el.setAttribute('title', v);
    });
    // Sprachwähler-Select(s) spiegeln
    document.querySelectorAll('[data-lang-select]').forEach(function (sel) { sel.value = current; });
  }

  function set(lang) {
    if (SUPPORTED.indexOf(lang) < 0) return;
    current = lang;
    try { localStorage.setItem(LS_KEY, lang); } catch (e) {}
    apply();
    // Branchen-Engine danach erneut anwenden (Überschreibungen über der Übersetzung).
    document.dispatchEvent(new CustomEvent('mosa-lang-changed', { detail: { lang: lang } }));
  }

  window.MosaI18n = { t: t, apply: apply, set: set, get: get, supported: SUPPORTED, DICT: DICT };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(); });
  } else {
    apply();
  }
})();
