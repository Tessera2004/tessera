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

      if (ouR.data?.length)
        localStorage.setItem('cc-users', JSON.stringify(ouR.data.map(rowToOfficeUser)));
      if (empR.data?.length)
        localStorage.setItem('cc-employees-v1', JSON.stringify(empR.data.map(rowToEmployee)));
      if (teamR.data?.length)
        localStorage.setItem('cc-teams-v1', JSON.stringify(teamR.data.map(rowToTeam)));
      if (custR.data?.length)
        localStorage.setItem('cc-customers-v1', JSON.stringify(custR.data.map(rowToCustomer)));
      if (jobR.data?.length)
        localStorage.setItem('cc-plan-jobs-v1', JSON.stringify(unflattenJobs(jobR.data)));
      if (taskR.data?.length)
        localStorage.setItem('cc-tasks-v1', JSON.stringify(taskR.data.map(rowToTask)));
      if (repR.data?.length)
        localStorage.setItem('cc-reports-v1', JSON.stringify(repR.data.map(rowToReport)));
      if (settR.data) {
        const p = settR.data.profile;
        const pr = settR.data.prices;
        const ft = settR.data.features;
        const rl = settR.data.roles;
        if (p && Object.keys(p).length) localStorage.setItem('cc-company-v1', JSON.stringify(p));
        if (pr && Object.keys(pr).length) localStorage.setItem('cc-prices', JSON.stringify(pr));
        if (ft && Object.keys(ft).length) localStorage.setItem('cc-features-v1', JSON.stringify(ft));
        if (Array.isArray(rl) && rl.length) localStorage.setItem('cc-roles-v1', JSON.stringify(rl));
      }

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
