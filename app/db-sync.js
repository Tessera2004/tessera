/*
 * MosaOS — Supabase Sync Layer
 * Write-Through-Cache: localStorage = primärer Cache, Supabase = Backend.
 *
 * dbInit()            Beim Login: zieht alle Mandantendaten → localStorage
 * MosaDB.push(t, d)   Fire-and-forget Upsert nach Supabase (blockiert UI nicht)
 * MosaDB.remove(t, i) Löscht einen Datensatz aus Supabase
 *
 * ============================================================
 *  EINMALIG IM SUPABASE SQL-EDITOR AUSFÜHREN
 * ============================================================
 *
 *   -- Büro-Mitarbeiter (Login-Nutzer / Rollen)
 *   CREATE TABLE IF NOT EXISTS office_users (
 *     id          TEXT PRIMARY KEY,
 *     tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     firstname   TEXT, lastname TEXT, email TEXT,
 *     role        TEXT DEFAULT 'readonly',
 *     updated_at  TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE office_users ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "ou_tenant" ON office_users;
 *   CREATE POLICY "ou_tenant" ON office_users FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Reinigungskräfte (Felddienst)
 *   CREATE TABLE IF NOT EXISTS employees (
 *     id          TEXT PRIMARY KEY,
 *     tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     first_name  TEXT, last_name TEXT, email TEXT, role TEXT, team_id TEXT,
 *     status      TEXT DEFAULT 'aktiv',
 *     can_drive   BOOLEAN DEFAULT false,
 *     photo       TEXT,
 *     updated_at  TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "emp_tenant" ON employees;
 *   CREATE POLICY "emp_tenant" ON employees FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Teams
 *   CREATE TABLE IF NOT EXISTS teams (
 *     id          TEXT PRIMARY KEY,
 *     tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     name TEXT, short TEXT, color TEXT,
 *     updated_at  TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "teams_tenant" ON teams;
 *   CREATE POLICY "teams_tenant" ON teams FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Kunden
 *   CREATE TABLE IF NOT EXISTS customers (
 *     id          TEXT PRIMARY KEY,
 *     tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     first_name  TEXT, last_name TEXT, address TEXT,
 *     phone TEXT, email TEXT, note TEXT,
 *     calls       JSONB DEFAULT '[]',
 *     updated_at  TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "cust_tenant" ON customers;
 *   CREATE POLICY "cust_tenant" ON customers FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Aufträge (manuell geplante Jobs, flach nach Datum)
 *   CREATE TABLE IF NOT EXISTS plan_jobs (
 *     id          TEXT PRIMARY KEY,
 *     tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     date_key    TEXT NOT NULL,
 *     customer_id TEXT, objekt TEXT, ort TEXT, svc TEXT,
 *     price       NUMERIC, paymethod TEXT DEFAULT 'rechnung',
 *     start_time  TEXT, end_time TEXT, duration INTEGER,
 *     team TEXT, assigned JSONB DEFAULT '[]',
 *     note_office TEXT, note_crew TEXT,
 *     status      TEXT DEFAULT 'geplant',
 *     updated_at  TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE plan_jobs ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "pj_tenant" ON plan_jobs;
 *   CREATE POLICY "pj_tenant" ON plan_jobs FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Aufgaben
 *   CREATE TABLE IF NOT EXISTS tasks (
 *     id            TEXT PRIMARY KEY,
 *     tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     title         TEXT NOT NULL, description TEXT,
 *     assignee      TEXT, due_date TEXT,
 *     priority      TEXT DEFAULT 'normal',
 *     done          BOOLEAN DEFAULT false,
 *     completed_at  TIMESTAMPTZ,
 *     contact_email TEXT, contact_phone TEXT,
 *     link_label    TEXT, link_type TEXT,
 *     source_mail   JSONB,
 *     created_at    TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at    TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "tasks_tenant" ON tasks;
 *   CREATE POLICY "tasks_tenant" ON tasks FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Berichte / Nachweise / Abnahmeprotokolle (inkl. Unterschrift)
 *   CREATE TABLE IF NOT EXISTS reports (
 *     id            TEXT PRIMARY KEY,
 *     tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     objekt        TEXT, employee TEXT,
 *     date          TEXT, time TEXT,
 *     status        TEXT DEFAULT 'vollstaendig',
 *     note          TEXT,
 *     photos        JSONB DEFAULT '[]',
 *     signature_img TEXT,
 *     tasks         JSONB DEFAULT '[]',
 *     photo_count   INTEGER,
 *     is_protocol   BOOLEAN DEFAULT false,
 *     signed        BOOLEAN DEFAULT false,
 *     created_at    TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at    TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "rep_tenant" ON reports;
 *   CREATE POLICY "rep_tenant" ON reports FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Fahrzeuge (branchen-eigenes Modul: Auto-Werkstatt)
 *   CREATE TABLE IF NOT EXISTS vehicles (
 *     id           TEXT PRIMARY KEY,
 *     tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     plate        TEXT, model TEXT, owner TEXT,
 *     km           TEXT, next_service TEXT, note TEXT,
 *     updated_at   TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "veh_tenant" ON vehicles;
 *   CREATE POLICY "veh_tenant" ON vehicles FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Werkstattaufträge (Kernablauf Auto-Werkstatt: Auftragsboard)
 *   CREATE TABLE IF NOT EXISTS work_orders (
 *     id           TEXT PRIMARY KEY,
 *     tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     vehicle_id   TEXT,
 *     plate        TEXT, model TEXT, owner TEXT,
 *     complaint    TEXT,
 *     status       TEXT DEFAULT 'angenommen',
 *     mechanic     TEXT, bay TEXT, due TEXT, note TEXT,
 *     works        JSONB DEFAULT '[]',
 *     parts        JSONB DEFAULT '[]',
 *     created_at   TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at   TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "wo_tenant" ON work_orders;
 *   CREATE POLICY "wo_tenant" ON work_orders FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Reifeneinlagerung / Reifenhotel (Auto-Werkstatt)
 *   CREATE TABLE IF NOT EXISTS tire_storage (
 *     id           TEXT PRIMARY KEY,
 *     tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     vehicle_id   TEXT,
 *     owner        TEXT, plate TEXT,
 *     season       TEXT, rim TEXT, qty INTEGER,
 *     dim          TEXT, tread TEXT, location TEXT, since TEXT, note TEXT,
 *     updated_at   TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE tire_storage ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "tire_tenant" ON tire_storage;
 *   CREATE POLICY "tire_tenant" ON tire_storage FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Köderstellen / Monitoring (Schädlingsbekämpfung)
 *   CREATE TABLE IF NOT EXISTS bait_stations (
 *     id           TEXT PRIMARY KEY,
 *     tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     customer_id  TEXT, objekt_name TEXT,
 *     number       TEXT, location TEXT, type TEXT, agent TEXT,
 *     status       TEXT DEFAULT 'ok',
 *     last_check   TEXT, interval_days INTEGER, note TEXT,
 *     updated_at   TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE bait_stations ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "bait_tenant" ON bait_stations;
 *   CREATE POLICY "bait_tenant" ON bait_stations FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Behandlungs-/Kontrollprotokolle (HACCP-Nachweis, Schädlingsbekämpfung)
 *   CREATE TABLE IF NOT EXISTS pest_protocols (
 *     id           TEXT PRIMARY KEY,
 *     tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     customer_id  TEXT, objekt_name TEXT,
 *     date         TEXT, technician TEXT, pest_type TEXT,
 *     measure      TEXT, agent TEXT, amount TEXT, findings TEXT,
 *     recheck      TEXT, signed BOOLEAN DEFAULT false, note TEXT,
 *     created_at   TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at   TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE pest_protocols ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "pest_tenant" ON pest_protocols;
 *   CREATE POLICY "pest_tenant" ON pest_protocols FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Baustellen / Projekte (Handwerk)
 *   CREATE TABLE IF NOT EXISTS construction_sites (
 *     id           TEXT PRIMARY KEY,
 *     tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     customer_id  TEXT, objekt_name TEXT,
 *     title        TEXT, address TEXT, type TEXT, monteur TEXT,
 *     status       TEXT DEFAULT 'angefragt', budget NUMERIC, note TEXT,
 *     created_at   TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at   TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE construction_sites ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "site_tenant" ON construction_sites;
 *   CREATE POLICY "site_tenant" ON construction_sites FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Arbeitsrapporte / Regie (Handwerk)
 *   CREATE TABLE IF NOT EXISTS work_reports (
 *     id           TEXT PRIMARY KEY,
 *     tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *     site_id      TEXT, site_title TEXT, customer_id TEXT, objekt_name TEXT,
 *     date         TEXT, monteur TEXT,
 *     works        JSONB DEFAULT '[]',
 *     material     JSONB DEFAULT '[]',
 *     note         TEXT, signed BOOLEAN DEFAULT false,
 *     created_at   TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at   TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "wr_tenant" ON work_reports;
 *   CREATE POLICY "wr_tenant" ON work_reports FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 *   -- Firmenprofil + Preise (1 Zeile pro Mandant)
 *   CREATE TABLE IF NOT EXISTS company_settings (
 *     tenant_id   UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
 *     profile     JSONB DEFAULT '{}',
 *     prices      JSONB DEFAULT '{}',
 *     features    JSONB DEFAULT '{}',
 *     roles       JSONB DEFAULT '[]',
 *     updated_at  TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "cs_tenant" ON company_settings;
 *   CREATE POLICY "cs_tenant" ON company_settings FOR ALL TO authenticated
 *     USING  (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()))
 *     WITH CHECK (tenant_id=(SELECT tenant_id FROM tenant_users WHERE user_id=auth.uid()));
 *
 * ============================================================
 */

(function () {
  'use strict';

  function getSb() {
    // Nutze denselben Client wie app.html (gemeinsame Auth-Session)
    if (typeof window.getSupabase === 'function') {
      try { const c = window.getSupabase(); if (c) return c; } catch {}
    }
    return window._sbClient || window.SB || null;
  }

  async function getTid() {
    if (window._tenantId) return window._tenantId;
    const sb = getSb();
    if (!sb) return null;
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return null;
      const { data } = await sb.from('tenant_users').select('tenant_id')
        .eq('user_id', session.user.id).single();
      if (data?.tenant_id) window._tenantId = data.tenant_id;
    } catch {}
    return window._tenantId || null;
  }

  // ── Format-Konverter DB → App ────────────────────────────

  function rowToOfficeUser(r) {
    return { id: r.id, firstname: r.firstname, lastname: r.lastname, email: r.email, role: r.role };
  }

  function rowToEmployee(r) {
    return { id: r.id, firstName: r.first_name, lastName: r.last_name,
      email: r.email || null, role: r.role, teamId: r.team_id, status: r.status || 'aktiv',
      canDrive: r.can_drive || false, photo: r.photo || null };
  }

  function rowToTeam(r) {
    return { id: r.id, name: r.name, short: r.short, color: r.color };
  }

  function rowToCustomer(r) {
    return { id: r.id, firstName: r.first_name, lastName: r.last_name,
      address: r.address, phone: r.phone, email: r.email,
      note: r.note, calls: r.calls || [] };
  }

  function rowToTask(r) {
    return { id: r.id, title: r.title, desc: r.description, assignee: r.assignee,
      dueDate: r.due_date, prio: r.priority, done: r.done || false,
      completedAt: r.completed_at, contactEmail: r.contact_email,
      contactPhone: r.contact_phone, linkLabel: r.link_label,
      linkType: r.link_type, sourceMail: r.source_mail, created: r.created_at };
  }

  function rowToReport(r) {
    return { id: r.id, objekt: r.objekt, employee: r.employee, date: r.date,
      time: r.time, status: r.status || 'vollstaendig', note: r.note,
      photos: r.photos || [], signatureImg: r.signature_img,
      tasks: r.tasks || [], photoCount: r.photo_count,
      isProtocol: r.is_protocol || false, signed: r.signed || false };
  }

  function rowToVehicle(r) {
    return { id: r.id, plate: r.plate, model: r.model, owner: r.owner,
      km: r.km, nextService: r.next_service, note: r.note };
  }

  function rowToWorkOrder(r) {
    return { id: r.id, vehicleId: r.vehicle_id, plate: r.plate, model: r.model,
      owner: r.owner, complaint: r.complaint, status: r.status || 'angenommen',
      mechanic: r.mechanic, bay: r.bay, due: r.due, note: r.note,
      works: r.works || [], parts: r.parts || [], created: r.created_at };
  }

  function rowToTire(r) {
    return { id: r.id, vehicleId: r.vehicle_id, owner: r.owner, plate: r.plate,
      season: r.season, rim: r.rim, qty: r.qty, dim: r.dim, tread: r.tread,
      location: r.location, since: r.since, note: r.note };
  }

  function rowToSite(r) {
    return { id: r.id, customerId: r.customer_id, objektName: r.objekt_name,
      title: r.title, address: r.address, type: r.type, monteur: r.monteur,
      status: r.status || 'angefragt', budget: r.budget, note: r.note, created: r.created_at };
  }
  function rowToWorkReport(r) {
    return { id: r.id, siteId: r.site_id, siteTitle: r.site_title, customerId: r.customer_id,
      objektName: r.objekt_name, date: r.date, monteur: r.monteur,
      works: r.works || [], material: r.material || [], note: r.note,
      signed: r.signed || false, created: r.created_at };
  }

  function rowToBait(r) {
    return { id: r.id, customerId: r.customer_id, objektName: r.objekt_name,
      number: r.number, location: r.location, type: r.type, agent: r.agent,
      status: r.status || 'ok', lastCheck: r.last_check, interval: r.interval_days, note: r.note };
  }
  function rowToPestProtocol(r) {
    return { id: r.id, customerId: r.customer_id, objektName: r.objekt_name,
      date: r.date, technician: r.technician, pestType: r.pest_type,
      measure: r.measure, agent: r.agent, amount: r.amount, findings: r.findings,
      recheck: r.recheck, signed: r.signed || false, note: r.note, created: r.created_at };
  }

  function unflattenJobs(rows) {
    const dict = {};
    (rows || []).forEach(r => {
      if (!dict[r.date_key]) dict[r.date_key] = [];
      dict[r.date_key].push({ id: r.id, customerId: r.customer_id, objekt: r.objekt,
        ort: r.ort, svc: r.svc, price: r.price, paymethod: r.paymethod || 'rechnung',
        start: r.start_time, end: r.end_time, duration: r.duration, team: r.team,
        assigned: r.assigned || [], noteOffice: r.note_office,
        noteCrew: r.note_crew, status: r.status || 'geplant' });
    });
    return dict;
  }

  // ── Format-Konverter App → DB ────────────────────────────

  function officeUserToRow(u, tid) {
    return { id: u.id, tenant_id: tid, firstname: u.firstname, lastname: u.lastname,
      email: u.email || null, role: u.role || 'readonly',
      updated_at: new Date().toISOString() };
  }

  function employeeToRow(e, tid) {
    return { id: e.id, tenant_id: tid, first_name: e.firstName, last_name: e.lastName,
      email: e.email || null, role: e.role || null, team_id: e.teamId || null, status: e.status || 'aktiv',
      can_drive: e.canDrive || false, photo: e.photo || null,
      updated_at: new Date().toISOString() };
  }

  function teamToRow(t, tid) {
    return { id: t.id, tenant_id: tid, name: t.name, short: t.short || null,
      color: t.color || null, updated_at: new Date().toISOString() };
  }

  function customerToRow(c, tid) {
    return { id: c.id, tenant_id: tid, first_name: c.firstName, last_name: c.lastName,
      address: c.address || null, phone: c.phone || null, email: c.email || null,
      note: c.note || null, calls: c.calls || [],
      updated_at: new Date().toISOString() };
  }

  function taskToRow(t, tid) {
    return { id: t.id, tenant_id: tid, title: t.title, description: t.desc || null,
      assignee: t.assignee || null, due_date: t.dueDate || null,
      priority: t.prio || 'normal', done: t.done || false,
      completed_at: t.completedAt || null, contact_email: t.contactEmail || null,
      contact_phone: t.contactPhone || null, link_label: t.linkLabel || null,
      link_type: t.linkType || null, source_mail: t.sourceMail || null,
      updated_at: new Date().toISOString() };
  }

  function reportToRow(r, tid) {
    return { id: r.id, tenant_id: tid, objekt: r.objekt || null,
      employee: r.employee || null, date: r.date || null, time: r.time || null,
      status: r.status || 'vollstaendig', note: r.note || null,
      photos: r.photos || [], signature_img: r.signatureImg || null,
      tasks: r.tasks || [], photo_count: r.photoCount || null,
      is_protocol: r.isProtocol || false, signed: r.signed || false,
      updated_at: new Date().toISOString() };
  }

  function vehicleToRow(v, tid) {
    return { id: v.id, tenant_id: tid, plate: v.plate || null, model: v.model || null,
      owner: v.owner || null, km: v.km || null, next_service: v.nextService || null,
      note: v.note || null, updated_at: new Date().toISOString() };
  }

  function workOrderToRow(o, tid) {
    return { id: o.id, tenant_id: tid, vehicle_id: o.vehicleId || null,
      plate: o.plate || null, model: o.model || null, owner: o.owner || null,
      complaint: o.complaint || null, status: o.status || 'angenommen',
      mechanic: o.mechanic || null, bay: o.bay || null, due: o.due || null,
      note: o.note || null, works: o.works || [], parts: o.parts || [],
      updated_at: new Date().toISOString() };
  }

  function tireToRow(t, tid) {
    return { id: t.id, tenant_id: tid, vehicle_id: t.vehicleId || null,
      owner: t.owner || null, plate: t.plate || null, season: t.season || null,
      rim: t.rim || null, qty: t.qty || null, dim: t.dim || null, tread: t.tread || null,
      location: t.location || null, since: t.since || null, note: t.note || null,
      updated_at: new Date().toISOString() };
  }

  function siteToRow(s, tid) {
    return { id: s.id, tenant_id: tid, customer_id: s.customerId || null, objekt_name: s.objektName || null,
      title: s.title || null, address: s.address || null, type: s.type || null, monteur: s.monteur || null,
      status: s.status || 'angefragt', budget: s.budget || null, note: s.note || null,
      updated_at: new Date().toISOString() };
  }
  function workReportToRow(r, tid) {
    return { id: r.id, tenant_id: tid, site_id: r.siteId || null, site_title: r.siteTitle || null,
      customer_id: r.customerId || null, objekt_name: r.objektName || null,
      date: r.date || null, monteur: r.monteur || null,
      works: r.works || [], material: r.material || [],
      note: r.note || null, signed: !!r.signed, updated_at: new Date().toISOString() };
  }

  function baitToRow(b, tid) {
    return { id: b.id, tenant_id: tid, customer_id: b.customerId || null, objekt_name: b.objektName || null,
      number: b.number || null, location: b.location || null, type: b.type || null, agent: b.agent || null,
      status: b.status || 'ok', last_check: b.lastCheck || null, interval_days: b.interval || null,
      note: b.note || null, updated_at: new Date().toISOString() };
  }
  function pestProtocolToRow(p, tid) {
    return { id: p.id, tenant_id: tid, customer_id: p.customerId || null, objekt_name: p.objektName || null,
      date: p.date || null, technician: p.technician || null, pest_type: p.pestType || null,
      measure: p.measure || null, agent: p.agent || null, amount: p.amount || null, findings: p.findings || null,
      recheck: p.recheck || null, signed: !!p.signed, note: p.note || null, updated_at: new Date().toISOString() };
  }

  function flattenJobs(dict, tid) {
    const rows = [];
    Object.entries(dict || {}).forEach(([dateKey, jobs]) => {
      (jobs || []).forEach(j => {
        if (!j.id) return;
        rows.push({ id: j.id, tenant_id: tid, date_key: dateKey,
          customer_id: j.customerId || null, objekt: j.objekt || null,
          ort: j.ort || null, svc: j.svc || null, price: j.price || null,
          paymethod: j.paymethod || 'rechnung', start_time: j.start || null,
          end_time: j.end || null, duration: j.duration || null,
          team: j.team || null, assigned: j.assigned || [],
          note_office: j.noteOffice || null, note_crew: j.noteCrew || null,
          status: j.status || 'geplant', updated_at: new Date().toISOString() });
      });
    });
    return rows;
  }

  // ── Merge-Helfer (Login: lokale Daten erhalten + hochladen) ──

  function lsGet(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch { return fallback; }
  }

  // Array-Tabelle: Remote-Rows + lokal-nur-vorhandene (per id) zusammenführen,
  // localStorage aktualisieren, die lokalen Neuzugänge nach Supabase pushen.
  async function mergeArray(key, remoteRows, rowToObj, pushType) {
    let local = lsGet(key, []);
    if (!Array.isArray(local)) local = [];
    const remote = (remoteRows || []).map(rowToObj);
    const remoteIds = new Set(remote.map(r => r.id));
    const localOnly = local.filter(l => l && l.id && !remoteIds.has(l.id));
    const merged = remote.concat(localOnly);
    if (merged.length) localStorage.setItem(key, JSON.stringify(merged));
    if (localOnly.length) { try { await push(pushType, localOnly); } catch {} }
  }

  // plan_jobs ist ein Dict { dateKey: [jobs] } — gleiche Logik per Job-id.
  async function mergeJobs(remoteRows) {
    const local = lsGet('cc-plan-jobs-v1', {});
    const remoteDict = unflattenJobs(remoteRows || []);
    const remoteIds = new Set((remoteRows || []).map(r => r.id));
    const merged = JSON.parse(JSON.stringify(remoteDict));
    const localOnly = {};
    Object.entries(local || {}).forEach(([dk, jobs]) => {
      (jobs || []).forEach(j => {
        if (j && j.id && !remoteIds.has(j.id)) {
          (merged[dk] = merged[dk] || []).push(j);
          (localOnly[dk] = localOnly[dk] || []).push(j);
        }
      });
    });
    if (Object.keys(merged).length) localStorage.setItem('cc-plan-jobs-v1', JSON.stringify(merged));
    if (Object.keys(localOnly).length) { try { await push('plan_jobs', localOnly); } catch {} }
  }

  // ── dbInit ───────────────────────────────────────────────

  async function dbInit() {
    const sb = getSb();
    if (!sb) return;
    const tid = await getTid();
    if (!tid) { window._dbReady = false; return; }

    try {
      const [ouR, empR, teamR, custR, jobR, taskR, repR, settR] = await Promise.all([
        sb.from('office_users').select('*').eq('tenant_id', tid),
        sb.from('employees').select('*').eq('tenant_id', tid),
        sb.from('teams').select('*').eq('tenant_id', tid),
        sb.from('customers').select('*').eq('tenant_id', tid),
        sb.from('plan_jobs').select('*').eq('tenant_id', tid),
        sb.from('tasks').select('*').eq('tenant_id', tid),
        sb.from('reports').select('*').eq('tenant_id', tid),
        sb.from('company_settings').select('*').eq('tenant_id', tid).maybeSingle()
      ]);

      // Merge: Remote + lokal-nur-vorhandene Datensätze; lokale werden hochgeladen.
      // So gehen lokal (im Demo-Modus) angelegte Daten beim Login nicht verloren,
      // sondern landen in Supabase und damit auf allen Geräten / in der Mobile-App.
      await mergeArray('cc-users', ouR.data, rowToOfficeUser, 'office_users');
      await mergeArray('cc-employees-v1', empR.data, rowToEmployee, 'employees');
      await mergeArray('cc-teams-v1', teamR.data, rowToTeam, 'teams');
      await mergeArray('cc-customers-v1', custR.data, rowToCustomer, 'customers');
      await mergeArray('cc-tasks-v1', taskR.data, rowToTask, 'tasks');
      await mergeArray('cc-reports-v1', repR.data, rowToReport, 'reports');
      await mergeJobs(jobR.data);

      // Firmen-Einstellungen: Remote anwenden, fehlende Teile aus lokal hochladen
      const settP = settR.data?.profile, settPr = settR.data?.prices, settFt = settR.data?.features, settRl = settR.data?.roles;
      if (settP && Object.keys(settP).length) localStorage.setItem('cc-company-v1', JSON.stringify(settP));
      else { const lp = lsGet('cc-company-v1', {}); if (Object.keys(lp).length) await push('company_profile', lp); }
      if (settPr && Object.keys(settPr).length) localStorage.setItem('cc-prices', JSON.stringify(settPr));
      else { const lp = lsGet('cc-prices', {}); if (Object.keys(lp).length) await push('company_prices', lp); }
      if (settFt && Object.keys(settFt).length) localStorage.setItem('cc-features-v1', JSON.stringify(settFt));
      else { const lp = lsGet('cc-features-v1', {}); if (Object.keys(lp).length) await push('company_features', lp); }
      if (Array.isArray(settRl) && settRl.length) localStorage.setItem('cc-roles-v1', JSON.stringify(settRl));
      else { const lp = lsGet('cc-roles-v1', []); if (Array.isArray(lp) && lp.length) await push('company_roles', lp); }

      // Fahrzeuge separat & resilient laden: fehlt die Tabelle (Branche nutzt das Modul nicht),
      // darf das den restlichen Sync NICHT brechen.
      try {
        const vehR = await sb.from('vehicles').select('*').eq('tenant_id', tid);
        if (!vehR.error) await mergeArray('cc-vehicles-v1', vehR.data, rowToVehicle, 'vehicles');
      } catch {}
      try {
        const woR = await sb.from('work_orders').select('*').eq('tenant_id', tid);
        if (!woR.error) await mergeArray('cc-workorders-v1', woR.data, rowToWorkOrder, 'workorders');
      } catch {}
      try {
        const tireR = await sb.from('tire_storage').select('*').eq('tenant_id', tid);
        if (!tireR.error) await mergeArray('cc-tires-v1', tireR.data, rowToTire, 'tires');
      } catch {}
      try {
        const baitR = await sb.from('bait_stations').select('*').eq('tenant_id', tid);
        if (!baitR.error) await mergeArray('cc-baitstations-v1', baitR.data, rowToBait, 'baits');
      } catch {}
      try {
        const siteR = await sb.from('construction_sites').select('*').eq('tenant_id', tid);
        if (!siteR.error) await mergeArray('cc-sites-v1', siteR.data, rowToSite, 'sites');
      } catch {}
      try {
        const wrR = await sb.from('work_reports').select('*').eq('tenant_id', tid);
        if (!wrR.error) await mergeArray('cc-workreports-v1', wrR.data, rowToWorkReport, 'workreports');
      } catch {}
      try {
        const pestR = await sb.from('pest_protocols').select('*').eq('tenant_id', tid);
        if (!pestR.error) await mergeArray('cc-pestprotocols-v1', pestR.data, rowToPestProtocol, 'pestprotocols');
      } catch {}

      window._dbReady = true;
      console.log('[MosaDB] Sync OK —', { ou: ouR.data?.length, emp: empR.data?.length,
        cust: custR.data?.length, jobs: jobR.data?.length, tasks: taskR.data?.length,
        reports: repR.data?.length });
    } catch (err) {
      console.warn('[MosaDB] Sync fehlgeschlagen (offline?):', err.message);
    }
  }

  // ── Push (fire & forget) ─────────────────────────────────

  async function push(type, data) {
    const sb = getSb();
    if (!sb) return;
    const tid = await getTid();
    if (!tid) return;
    try {
      if (type === 'office_users') {
        await sb.from('office_users').upsert(data.map(u => officeUserToRow(u, tid)), { onConflict: 'id' });
      } else if (type === 'employees') {
        await sb.from('employees').upsert(data.map(e => employeeToRow(e, tid)), { onConflict: 'id' });
      } else if (type === 'teams') {
        await sb.from('teams').upsert(data.map(t => teamToRow(t, tid)), { onConflict: 'id' });
      } else if (type === 'customers') {
        await sb.from('customers').upsert(data.map(c => customerToRow(c, tid)), { onConflict: 'id' });
      } else if (type === 'plan_jobs') {
        const rows = flattenJobs(data, tid);
        if (rows.length) await sb.from('plan_jobs').upsert(rows, { onConflict: 'id' });
      } else if (type === 'vehicles') {
        await sb.from('vehicles').upsert(data.map(v => vehicleToRow(v, tid)), { onConflict: 'id' });
      } else if (type === 'workorders') {
        await sb.from('work_orders').upsert(data.map(o => workOrderToRow(o, tid)), { onConflict: 'id' });
      } else if (type === 'tires') {
        await sb.from('tire_storage').upsert(data.map(t => tireToRow(t, tid)), { onConflict: 'id' });
      } else if (type === 'sites') {
        await sb.from('construction_sites').upsert(data.map(s => siteToRow(s, tid)), { onConflict: 'id' });
      } else if (type === 'workreports') {
        await sb.from('work_reports').upsert(data.map(r => workReportToRow(r, tid)), { onConflict: 'id' });
      } else if (type === 'baits') {
        await sb.from('bait_stations').upsert(data.map(b => baitToRow(b, tid)), { onConflict: 'id' });
      } else if (type === 'pestprotocols') {
        await sb.from('pest_protocols').upsert(data.map(p => pestProtocolToRow(p, tid)), { onConflict: 'id' });
      } else if (type === 'tasks') {
        await sb.from('tasks').upsert(data.map(t => taskToRow(t, tid)), { onConflict: 'id' });
      } else if (type === 'reports') {
        await sb.from('reports').upsert(data.map(r => reportToRow(r, tid)), { onConflict: 'id' });
      } else if (type === 'report_one') {
        // Einzelner Bericht (mobile.html: ein Protokoll, nicht das ganze Array)
        await sb.from('reports').upsert(reportToRow(data, tid), { onConflict: 'id' });
      } else if (type === 'company_profile' || type === 'company_prices' || type === 'company_features' || type === 'company_roles') {
        // Lese erst die anderen Felder, damit sie nicht überschrieben werden
        const { data: cur } = await sb.from('company_settings').select('profile,prices,features,roles')
          .eq('tenant_id', tid).maybeSingle();
        const row = { tenant_id: tid,
          profile:  type === 'company_profile'  ? data : (cur?.profile  || {}),
          prices:   type === 'company_prices'   ? data : (cur?.prices   || {}),
          features: type === 'company_features' ? data : (cur?.features || {}),
          roles:    type === 'company_roles'    ? data : (cur?.roles    || []),
          updated_at: new Date().toISOString() };
        await sb.from('company_settings').upsert(row, { onConflict: 'tenant_id' });
      }
    } catch (err) {
      console.warn('[MosaDB] Push fehlgeschlagen:', type, err.message);
    }
  }

  // ── Remove ───────────────────────────────────────────────

  async function remove(table, id) {
    const sb = getSb();
    if (!sb) return;
    const tid = await getTid();
    if (!tid) return;
    try {
      await sb.from(table).delete().eq('id', id).eq('tenant_id', tid);
    } catch (err) {
      console.warn('[MosaDB] Remove fehlgeschlagen:', table, id, err.message);
    }
  }

  window.MosaDB = { init: dbInit, push, remove };
})();
