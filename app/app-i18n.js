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
