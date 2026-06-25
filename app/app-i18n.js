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
      'common.lang': 'Sprache'
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
      'common.lang': 'Langue'
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
      'common.lang': 'Lingua'
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
      'common.lang': 'Idioma'
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
      'common.lang': 'Language'
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
