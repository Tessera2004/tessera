/* Beispieldaten fuer Besucher, die ueber ?demo=1 kommen.
   Bestehende lokale Daten werden niemals ueberschrieben. */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (params.get('demo') !== '1') return;
  window.MosaDemo = {
    leave() {
      if (localStorage.getItem('cc-demo-active') !== '1') return;
      [
        'cc-employees-v1', 'cc-teams-v1', 'cc-customers-v1', 'cc-plan-jobs-v1',
        'cc-users', 'cc-currentUser', 'cc-company-v1', 'cc-features-v1',
        'cc-tasks-v1', 'cc-tour-nie', 'cc-demo-active'
      ].forEach((key) => localStorage.removeItem(key));
      location.href = 'onboarding.html';
    }
  };
  const coreKeys = ['cc-employees-v1', 'cc-customers-v1', 'cc-plan-jobs-v1'];
  const hasOwnData = coreKeys.some((key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value.length > 0 : value && Object.keys(value).length > 0;
    } catch { return false; }
  });
  if (hasOwnData) return;
  const dateKey = new Date().toLocaleDateString('sv-SE');
  const employees = [
    { id: 'demo-e1', firstName: 'Nina', lastName: 'Meier', email: 'nina@demo.mosaos.ch', role: 'field', teamId: 'demo-t1', status: 'aktiv', canDrive: true },
    { id: 'demo-e2', firstName: 'Sofia', lastName: 'Rossi', email: 'sofia@demo.mosaos.ch', role: 'field', teamId: 'demo-t1', status: 'aktiv', canDrive: false },
    { id: 'demo-e3', firstName: 'Marco', lastName: 'Keller', email: 'marco@demo.mosaos.ch', role: 'field', teamId: 'demo-t2', status: 'aktiv', canDrive: true }
  ];
  const customers = [
    { id: 'demo-c1', firstName: 'Praxis am Bahnhof', lastName: '', type: 'Praxis', address: 'Bahnhofstrasse 18, 5000 Aarau', phone: '062 555 14 20', email: 'praxis@example.ch', defaultSvc: 'unterhalt', defaultPrice: 240, defaultDuration: 120, defaultCrew: 2, paymethod: 'rechnung', calls: [] },
    { id: 'demo-c2', firstName: 'Müller Treuhand AG', lastName: '', type: 'Büro', address: 'Laurenzenvorstadt 55, 5000 Aarau', phone: '062 555 22 40', email: 'info@example.ch', defaultSvc: 'unterhalt', defaultPrice: 180, defaultDuration: 90, defaultCrew: 1, paymethod: 'rechnung', calls: [] },
    { id: 'demo-c3', firstName: 'Wohnung Russo', lastName: '', type: 'Privat', address: 'Tellistrasse 74, 5000 Aarau', phone: '079 555 31 18', email: 'russo@example.ch', defaultSvc: 'end', defaultPrice: 680, defaultDuration: 240, defaultCrew: 2, paymethod: 'rechnung', calls: [] }
  ];
  const jobs = {};
  jobs[dateKey] = [
    { id: 'demo-j1', customerId: 'demo-c1', objekt: 'Praxis am Bahnhof', ort: customers[0].address, svc: 'unterhalt', price: 240, paymethod: 'rechnung', start: '07:30', end: '09:30', duration: 120, team: 'demo-t1', assigned: ['demo-e1', 'demo-e2'], noteCrew: 'Schlüssel im Schlüsseltresor.', status: 'geplant' },
    { id: 'demo-j2', customerId: 'demo-c2', objekt: 'Müller Treuhand AG', ort: customers[1].address, svc: 'unterhalt', price: 180, paymethod: 'rechnung', start: '10:15', end: '11:45', duration: 90, team: 'demo-t2', assigned: ['demo-e3'], status: 'geplant' },
    { id: 'demo-j3', customerId: 'demo-c3', objekt: 'Wohnung Russo', ort: customers[2].address, svc: 'end', price: 680, paymethod: 'rechnung', start: '13:00', end: '17:00', duration: 240, team: 'demo-t1', assigned: ['demo-e1', 'demo-e2'], noteCrew: 'Wohnungsabgabe morgen um 10:00.', status: 'geplant' }
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
  localStorage.setItem('cc-company-v1', JSON.stringify({ name: 'Muster Reinigung AG', addr1: 'Bahnhofstrasse 10', addr2: '5000 Aarau', country: 'CH', iban: 'CH93 0076 2011 6238 5295 7', mwst: 'CHE-123.456.789', contact: 'demo@mosaos.ch · 062 555 10 10' }));
  localStorage.setItem('cc-features-v1', JSON.stringify({ offerten: true, anrufprotokoll: true, aufgaben: true, email: false, abos: true, berichte: true, zeiten: true, nachkalkulation: true, rechnungen: true }));
  localStorage.setItem('cc-tasks-v1', JSON.stringify([{ id: 'demo-task1', title: 'Schlüssel für Praxis nachbestellen', description: 'Hauswart bis 15 Uhr zurückrufen', assignee: 'demo-admin', dueDate: dateKey, priority: 'hoch', done: false }]));
  localStorage.setItem('cc-tour-nie', '1');
  localStorage.setItem('cc-demo-active', '1');

}());
