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
 *     status      TEXT DEFAULT 'provisorisch', completed_at TIMESTAMPTZ,
 *     invoice_number TEXT, invoice_status TEXT, invoice_created_at TIMESTAMPTZ,
 *     invoice_sent_at TIMESTAMPTZ, invoice_send_error TEXT, receipt_created_at TIMESTAMPTZ,
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
    if (window.MOSAOS_DEMO_MODE) return null;
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
        noteCrew: r.note_crew, seriesId: r.series_id || null, recurring: r.recurring || null,
        status: r.status || 'provisorisch', completedAt: r.completed_at || null,
        pricing: r.details?.pricing || null, crew: r.details?.crew || 1, addons:r.details?.addons || [],
        deadline:r.details?.deadline || '', planning:r.details?.planning || {},actualHours:r.details?.actualHours ?? null,
        invoiceNumber: r.invoice_number || null, invoiceStatus: r.invoice_status || null,
        invoiceCreatedAt: r.invoice_created_at || null, invoiceSentAt: r.invoice_sent_at || null,
        invoiceSendError: r.invoice_send_error || null, receiptCreatedAt: r.receipt_created_at || null });
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
          ort: j.ort || null, svc: j.svc || null, price: j.price ?? null,
          paymethod: j.paymethod || 'rechnung', start_time: j.start || null,
          end_time: j.end || null, duration: j.duration || null,
          team: j.team || null, assigned: j.assigned || [],
          details: {pricing:j.pricing || null,crew:j.crew || 1,addons:j.addons || [],deadline:j.deadline || '',planning:j.planning || {},actualHours:j.actualHours ?? null},
          note_office: j.noteOffice || null, note_crew: j.noteCrew || null,
          series_id: j.seriesId || null, recurring: j.recurring || null,
          status: j.status || 'provisorisch', completed_at: j.completedAt || null,
          invoice_number: j.invoiceNumber || null, invoice_status: j.invoiceStatus || null,
          invoice_created_at: j.invoiceCreatedAt || null, invoice_sent_at: j.invoiceSentAt || null,
          invoice_send_error: j.invoiceSendError || null, receipt_created_at: j.receiptCreatedAt || null,
          updated_at: new Date().toISOString() });
      });
    });
    return rows;
  }

  // ── Merge-Helfer (Login: lokale Daten erhalten + hochladen) ──

  function lsGet(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch { return fallback; }
  }

  const SYNC_QUEUE_KEY = 'mosaos-sync-queue-v1';
  let initBaseline = null;
  function assertUnchanged(key) {
    if (initBaseline && localStorage.getItem(key) !== initBaseline[key]) {
      throw new Error('Während des Ladens wurde lokal weitergearbeitet. Diese Änderungen wurden erhalten; bitte nach der Synchronisierung neu laden.');
    }
  }
  function setSyncState(state, detail) {
    if (state === 'synced' && lsGet(SYNC_QUEUE_KEY, []).length) state = 'pending';
    window._mosaSyncState={state,detail:detail || null};
    window.dispatchEvent(new CustomEvent('mosaos-sync-state', { detail: { state, detail: detail || null } }));
  }
  function enqueue(type, data) {
    const queue = lsGet(SYNC_QUEUE_KEY, []);
    queue.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(), tenantId: window._tenantId || null, type, data, attempts: 0, queuedAt: new Date().toISOString() });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    setSyncState('pending', queue.length);
    return queue[queue.length - 1].id;
  }
  async function dbCall(query) {
    const result = await query;
    if (result?.error) throw result.error;
    return result;
  }

  // Array-Tabelle: Remote-Rows + lokal-nur-vorhandene (per id) zusammenführen,
  // localStorage aktualisieren, die lokalen Neuzugänge nach Supabase pushen.
  async function mergeArray(key, remoteRows, rowToObj, pushType) {
    assertUnchanged(key);
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
    assertUnchanged('cc-plan-jobs-v1');
    const local = lsGet('cc-plan-jobs-v1', {});
    const remoteDict = unflattenJobs(remoteRows || []);
    const remoteIds = new Set((remoteRows || []).map(r => r.id));
    const merged = JSON.parse(JSON.stringify(remoteDict));
    const localOnly = {};
    // Recover series metadata from the old browser cache once. Existing
    // remote schedule fields remain authoritative.
    const localById = new Map(Object.values(local || {}).flat().filter(Boolean).map(j => [j.id, j]));
    Object.entries(merged).forEach(([dk, jobs]) => jobs.forEach(j => {
      const cached = localById.get(j.id);
      if (!j.seriesId && cached?.seriesId && cached?.recurring) {
        j.seriesId = cached.seriesId;
        j.recurring = cached.recurring;
        (localOnly[dk] ||= []).push(j);
      }
    }));
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
    if (initBaseline) return;
    const sb = getSb();
    if (!sb) return;
    const tid = await getTid();
    if (!tid) { window._dbReady = false; return; }

    try {
      await flushQueue();
      if (lsGet(SYNC_QUEUE_KEY, []).length) throw new Error('Ausstehende Änderungen zuerst synchronisieren; lokale Daten bleiben erhalten.');
      const keys=['cc-users','cc-employees-v1','cc-teams-v1','cc-customers-v1','cc-tasks-v1','cc-reports-v1','cc-plan-jobs-v1','cc-company-v1','cc-prices','cc-features-v1','cc-roles-v1','cc-custom-services-v1','cc-vorlagen-v1','cc-zeitfaktoren-v1','cc-vehicles-v1','cc-workorders-v1','cc-tires-v1','cc-baitstations-v1','cc-sites-v1','cc-workreports-v1','cc-pestprotocols-v1'];
      initBaseline=Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)]));
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
      for (const result of [ouR, empR, teamR, custR, jobR, taskR, repR, settR]) {
        if (result.error) throw result.error;
      }

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
      const settP = settR.data?.profile, settPr = settR.data?.prices, settFt = settR.data?.features, settRl = settR.data?.roles, settCs = settR.data?.custom_services, settTp = settR.data?.templates, settTf = settR.data?.time_factors;
      assertUnchanged('cc-company-v1');
      if (settP && Object.keys(settP).length) localStorage.setItem('cc-company-v1', JSON.stringify(settP));
      else { const lp = lsGet('cc-company-v1', {}); if (Object.keys(lp).length) await push('company_profile', lp); }
      assertUnchanged('cc-prices');
      if (settPr && Object.keys(settPr).length) localStorage.setItem('cc-prices', JSON.stringify(settPr));
      else { const lp = lsGet('cc-prices', {}); if (Object.keys(lp).length) await push('company_prices', lp); }
      assertUnchanged('cc-features-v1');
      if (settFt && Object.keys(settFt).length) localStorage.setItem('cc-features-v1', JSON.stringify(settFt));
      else { const lp = lsGet('cc-features-v1', {}); if (Object.keys(lp).length) await push('company_features', lp); }
      assertUnchanged('cc-roles-v1');
      if (Array.isArray(settRl) && settRl.length) localStorage.setItem('cc-roles-v1', JSON.stringify(settRl));
      else { const lp = lsGet('cc-roles-v1', []); if (Array.isArray(lp) && lp.length) await push('company_roles', lp); }
      assertUnchanged('cc-custom-services-v1');
      if (Array.isArray(settCs)) localStorage.setItem('cc-custom-services-v1', JSON.stringify(settCs));
      else { const lp = lsGet('cc-custom-services-v1', []); if (Array.isArray(lp) && lp.length) await push('company_custom_services', lp); }
      // Eigene Textvorlagen und Zeitfaktoren — sonst sieht ein zweites Geraet sie nie
      assertUnchanged('cc-vorlagen-v1');
      if (settTp && Object.keys(settTp).length) localStorage.setItem('cc-vorlagen-v1', JSON.stringify(settTp));
      else { const lp = lsGet('cc-vorlagen-v1', {}); if (Object.keys(lp).length) await push('company_templates', lp); }
      assertUnchanged('cc-zeitfaktoren-v1');
      if (settTf && Object.keys(settTf).length) localStorage.setItem('cc-zeitfaktoren-v1', JSON.stringify(settTf));
      else { const lp = lsGet('cc-zeitfaktoren-v1', {}); if (Object.keys(lp).length) await push('company_time_factors', lp); }

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
      await flushQueue();
      console.log('[MosaDB] Sync OK —', { ou: ouR.data?.length, emp: empR.data?.length,
        cust: custR.data?.length, jobs: jobR.data?.length, tasks: taskR.data?.length,
        reports: repR.data?.length });
    } catch (err) {
      window._dbReady = false;
      setSyncState('error', err.message);
      console.warn('[MosaDB] Sync fehlgeschlagen (offline?):', err.message);
    } finally {
      initBaseline = null;
    }
  }

  // ── Push (fire & forget) ─────────────────────────────────

  async function push(type, data, fromQueue = false) {
    if (window.MOSAOS_DEMO_MODE) return true;
    if (!fromQueue) {
      const id = enqueue(type, data);
      await flushQueue();
      return !lsGet(SYNC_QUEUE_KEY, []).some(item => item.id === id);
    }
    const sb = getSb();
    if (!sb) { if (!fromQueue) enqueue(type, data); return false; }
    const tid = await getTid();
    if (!tid) { if (!fromQueue) enqueue(type, data); return false; }
    setSyncState('syncing');
    try {
      if (type === '__delete__') {
        await dbCall(sb.from(data.table).delete().eq('id', data.id).eq('tenant_id', tid));
      } else if (type === 'office_users') {
        await dbCall(sb.from('office_users').upsert(data.map(u => officeUserToRow(u, tid)), { onConflict: 'id' }));
      } else if (type === 'employees') {
        await dbCall(sb.from('employees').upsert(data.map(e => employeeToRow(e, tid)), { onConflict: 'id' }));
      } else if (type === 'teams') {
        await dbCall(sb.from('teams').upsert(data.map(t => teamToRow(t, tid)), { onConflict: 'id' }));
      } else if (type === 'customers') {
        await dbCall(sb.from('customers').upsert(data.map(c => customerToRow(c, tid)), { onConflict: 'id' }));
      } else if (type === 'plan_jobs') {
        const rows = flattenJobs(data, tid);
        if (rows.length) await dbCall(sb.from('plan_jobs').upsert(rows, { onConflict: 'id' }));
      } else if (type === 'vehicles') {
        await dbCall(sb.from('vehicles').upsert(data.map(v => vehicleToRow(v, tid)), { onConflict: 'id' }));
      } else if (type === 'workorders') {
        await dbCall(sb.from('work_orders').upsert(data.map(o => workOrderToRow(o, tid)), { onConflict: 'id' }));
      } else if (type === 'tires') {
        await dbCall(sb.from('tire_storage').upsert(data.map(t => tireToRow(t, tid)), { onConflict: 'id' }));
      } else if (type === 'sites') {
        await dbCall(sb.from('construction_sites').upsert(data.map(s => siteToRow(s, tid)), { onConflict: 'id' }));
      } else if (type === 'workreports') {
        await dbCall(sb.from('work_reports').upsert(data.map(r => workReportToRow(r, tid)), { onConflict: 'id' }));
      } else if (type === 'baits') {
        await dbCall(sb.from('bait_stations').upsert(data.map(b => baitToRow(b, tid)), { onConflict: 'id' }));
      } else if (type === 'pestprotocols') {
        await dbCall(sb.from('pest_protocols').upsert(data.map(p => pestProtocolToRow(p, tid)), { onConflict: 'id' }));
      } else if (type === 'tasks') {
        await dbCall(sb.from('tasks').upsert(data.map(t => taskToRow(t, tid)), { onConflict: 'id' }));
      } else if (type === 'reports') {
        await dbCall(sb.from('reports').upsert(data.map(r => reportToRow(r, tid)), { onConflict: 'id' }));
      } else if (type === 'report_one') {
        // Einzelner Bericht (mobile.html: ein Protokoll, nicht das ganze Array)
        await dbCall(sb.from('reports').upsert(reportToRow(data, tid), { onConflict: 'id' }));
      } else if (type === 'company_profile' || type === 'company_prices' || type === 'company_features' || type === 'company_roles' || type === 'company_custom_services' || type === 'company_templates' || type === 'company_time_factors') {
        // Lese erst die anderen Felder, damit sie nicht überschrieben werden
        // Only update the requested column; concurrent saves in another section survive.
        const column = {company_profile:'profile',company_prices:'prices',company_features:'features',
          company_roles:'roles',company_custom_services:'custom_services',company_templates:'templates',company_time_factors:'time_factors'}[type];
        const row = {tenant_id:tid,[column]:data,updated_at:new Date().toISOString()};
        await dbCall(sb.from('company_settings').upsert(row, { onConflict: 'tenant_id' }));
      } else {
        throw new Error('Unbekannter Sync-Typ: ' + type);
      }
      setSyncState('synced');
      return true;
    } catch (err) {
      if (!fromQueue) enqueue(type, data);
      setSyncState('error', err.message);
      console.warn('[MosaDB] Push fehlgeschlagen:', type, err.message);
      return false;
    }
  }

  // Failed writes stay in the outbox until explicitly retried. Never report them as saved.
  const MAX_VERSUCHE = 5;
  let queueFlight = null;
  function flushQueue() {
    if (window.MOSAOS_DEMO_MODE) return Promise.resolve();
    if (queueFlight) return queueFlight;
    queueFlight = drainQueue().finally(() => { queueFlight = null; });
    return queueFlight;
  }
  async function drainQueue() {
    while (true) {
      const queue = lsGet(SYNC_QUEUE_KEY, []);
      if (!queue.length) { setSyncState('synced'); return; }
      const item = queue[0];
      const tenantId = await getTid();
      if (!tenantId || item.tenantId !== tenantId) {
        setSyncState('error', 'Zuordnung der ausstehenden Änderungen zum Konto nicht bestätigt. Sicherung exportieren; nichts wurde an einen anderen Betrieb übertragen.');
        return;
      }
      if ((item.attempts || 0) >= MAX_VERSUCHE) {
        setSyncState('error', queue.length + ' Änderung(en) noch nicht gespeichert. Bitte erneut versuchen oder Sicherung exportieren.');
        return;
      }
      const ok = await push(item.type, item.data, true);
      // Re-read: changes added while the network was busy must not be overwritten.
      const latest = lsGet(SYNC_QUEUE_KEY, []);
      const index = latest.findIndex(x => x.id === item.id);
      if (index < 0) continue;
      if (ok) latest.splice(index, 1);
      else latest[index] = {...latest[index],attempts:(item.attempts||0)+1,lastAttemptAt:new Date().toISOString()};
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(latest));
      if (!ok) { setSyncState('error', latest.length + ' Änderung(en) lokal gesichert, aber noch nicht auf dem Server.'); return; }
    }
  }
  function retryQueue() {
    const queue=lsGet(SYNC_QUEUE_KEY,[]).map(item=>({...item,attempts:0}));
    localStorage.setItem(SYNC_QUEUE_KEY,JSON.stringify(queue));
    return flushQueue();
  }
  function exportQueue() {
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),changes:lsGet(SYNC_QUEUE_KEY,[])},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;link.download='MosaOS-nicht-gespeicherte-Aenderungen.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function warteschlangeLeeren() {
    const queue=lsGet(SYNC_QUEUE_KEY,[]);
    if (!queue.length || !confirm('Nicht übertragene Änderungen wirklich verwerfen? Zuerst die Sicherung exportieren.')) return 0;
    exportQueue();
    localStorage.setItem(SYNC_QUEUE_KEY,'[]');
    setSyncState('synced');
    return queue.length;
  }

  // ── Remove ───────────────────────────────────────────────

  async function remove(table, id) {
    return push('__delete__', {table, id});
  }
  window.addEventListener('online', flushQueue);
  window.MosaDB = { init: dbInit, push, remove, flush: retryQueue, exportQueue, leeren: warteschlangeLeeren };
})();
