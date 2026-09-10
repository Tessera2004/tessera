/* Isolierte Beispieldaten fuer Besucher, die ueber ?demo=1 kommen.
   Der App-Code liest synchron aus localStorage. Darum sichern wir vorhandene
   App-Daten vor der Demo, ersetzen sie vollstaendig und stellen sie beim
   Verlassen wieder her. Im Demo-Modus ist jeder Backend-Zugriff gesperrt. */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (params.get('demo') !== '1') return;
  window.MOSAOS_DEMO_MODE = true;
  const BACKUP_KEY = 'mosaos_demo_backup_v2';
  const DATA_KEYS = [
    'cc-baitstations-v1', 'cc-company-v1', 'cc-currentUser', 'cc-custom-services-v1',
    'cc-customers-v1', 'cc-daycrews-v1', 'cc-employees-v1', 'cc-features-v1',
    'cc-firststeps-dismissed', 'cc-geocache-v1', 'cc-historie-v1', 'cc-invoice-status-v1',
    'cc-ist-hours-v1', 'cc-loose-calls-v1', 'cc-mail-accounts-v1', 'cc-mail-cache-v1',
    'cc-offerts', 'cc-onboarding-done', 'cc-pestprotocols-v1', 'cc-plan-jobs-v1',
    'cc-plan-overrides-v1', 'cc-price-modes', 'cc-prices', 'cc-reports-v1', 'cc-roles-v1',
    'cc-sites-v1', 'cc-tasks-v1', 'cc-teams-v1', 'cc-tires-v1', 'cc-tour-nie',
    'cc-tour-v1', 'cc-users', 'cc-vehicles-v1', 'cc-vertical', 'cc-vorlagen-v1',
    'cc-workorders-v1', 'cc-workreports-v1', 'cc-zeitfaktoren-v1',
    'mosaos_checklist_done', 'mosaos_checklist_items', 'mosaos_protocols',
    'mosaos-sync-queue-v1'
  ];
  if (!localStorage.getItem(BACKUP_KEY)) {
    const backup = {};
    DATA_KEYS.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value !== null) backup[key] = value;
    });
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  }
  DATA_KEYS.forEach((key) => localStorage.removeItem(key));
  window.MosaDemo = {
    leave() {
      if (localStorage.getItem('cc-demo-active') !== '1') return;
      DATA_KEYS.forEach((key) => localStorage.removeItem(key));
      let backup = {};
      try { backup = JSON.parse(localStorage.getItem(BACKUP_KEY) || '{}'); } catch {}
      Object.entries(backup).forEach(([key, value]) => localStorage.setItem(key, value));
      localStorage.removeItem(BACKUP_KEY);
      localStorage.removeItem('cc-demo-active');
      localStorage.removeItem('cc-demo-date');
      location.href = Object.keys(backup).length ? 'app.html' : 'onboarding.html';
    }
  };
  const dateKey = new Date().toLocaleDateString('sv-SE');
  const employees = [
    { id: 'demo-e1', firstName: 'Nina', lastName: 'Meier', email: 'nina@demo.mosaos.ch', role: 'field', teamId: 'demo-t1', status: 'aktiv', canDrive: true },
    { id: 'demo-e2', firstName: 'Sofia', lastName: 'Rossi', email: 'sofia@demo.mosaos.ch', role: 'field', teamId: 'demo-t1', status: 'aktiv', canDrive: false },
    { id: 'demo-e3', firstName: 'Marco', lastName: 'Keller', email: 'marco@demo.mosaos.ch', role: 'field', teamId: 'demo-t2', status: 'aktiv', canDrive: true }
  ];
  const customers = [
    { id: 'demo-c1', firstName: 'Praxis Muster', lastName: '', type: 'Praxis', address: 'Beispielweg 18, 9999 Musterort', phone: '000 000 00 01', email: 'praxis@beispiel.invalid', defaultSvc: 'unterhalt', defaultPrice: 240, defaultDuration: 120, defaultCrew: 2, paymethod: 'rechnung', calls: [] },
    { id: 'demo-c2', firstName: 'Beispiel Treuhand AG', lastName: '', type: 'Büro', address: 'Musterstrasse 55, 9999 Musterort', phone: '000 000 00 02', email: 'buero@beispiel.invalid', defaultSvc: 'unterhalt', defaultPrice: 180, defaultDuration: 90, defaultCrew: 1, paymethod: 'rechnung', calls: [] },
    { id: 'demo-c3', firstName: 'Musterwohnung', lastName: '', type: 'Privat', address: 'Testgasse 74, 9999 Musterort', phone: '000 000 00 03', email: 'kunde@beispiel.invalid', defaultSvc: 'end', defaultPrice: 680, defaultDuration: 240, defaultCrew: 2, paymethod: 'rechnung', calls: [] }
  ];
  const jobs = {};
  jobs[dateKey] = [
    { id: 'demo-j1', customerId: 'demo-c1', objekt: 'Praxis Muster', ort: customers[0].address, svc: 'unterhalt', price: 240, paymethod: 'rechnung', start: '07:30', end: '09:30', duration: 120, team: 'demo-t1', assigned: ['demo-e1', 'demo-e2'], noteCrew: 'Schlüssel im Schlüsseltresor.', status: 'definitiv' },
    { id: 'demo-j2', customerId: 'demo-c2', objekt: 'Beispiel Treuhand AG', ort: customers[1].address, svc: 'unterhalt', price: 180, paymethod: 'rechnung', start: '10:15', end: '11:45', duration: 90, team: 'demo-t2', assigned: ['demo-e3'], status: 'definitiv' },
    { id: 'demo-j3', customerId: 'demo-c3', objekt: 'Musterwohnung', ort: customers[2].address, svc: 'end', price: 680, paymethod: 'rechnung', start: '13:00', end: '17:00', duration: 240, team: 'demo-t1', assigned: ['demo-e1', 'demo-e2'], noteCrew: 'Wohnungsabgabe morgen um 10:00.', status: 'definitiv' }
  ];
  localStorage.setItem('cc-employees-v1', JSON.stringify(employees));
  localStorage.setItem('cc-teams-v1', JSON.stringify([
    { id: 'demo-t1', name: 'Team Nord', short: 'TN', color: '#E11D2A' },
    { id: 'demo-t2', name: 'Team Stadt', short: 'TS', color: '#3B82F6' }
  ]));
  localStorage.setItem('cc-customers-v1', JSON.stringify(customers));
  localStorage.setItem('cc-plan-jobs-v1', JSON.stringify(jobs));
  localStorage.setItem('cc-users', JSON.stringify([{ id: 'demo-admin', firstname: 'Alex', lastname: 'Demo', email: 'demo@mosaos.ch', role: 'admin' }]));
  localStorage.setItem('cc-currentUser', 'demo-admin');
  localStorage.setItem('cc-company-v1', JSON.stringify({ name: 'Muster Reinigung AG', addr1: 'Beispielweg 10', addr2: '9999 Musterort', country: 'CH', iban: '', mwst: '', contact: 'demo@beispiel.invalid · 000 000 00 00' }));
  localStorage.setItem('cc-features-v1', JSON.stringify({ offerten: true, anrufprotokoll: true, aufgaben: true, email: false, abos: true, berichte: true, zeiten: true, nachkalkulation: true, rechnungen: true }));
  localStorage.setItem('cc-tasks-v1', JSON.stringify([{ id: 'demo-task1', title: 'Schlüssel für Praxis nachbestellen', description: 'Hauswart bis 15 Uhr zurückrufen', assignee: 'demo-admin', dueDate: dateKey, priority: 'hoch', done: false }]));
  localStorage.setItem('cc-tour-nie', '1');
  localStorage.setItem('cc-demo-active', '1');
  localStorage.setItem('cc-demo-date', dateKey);

}());
