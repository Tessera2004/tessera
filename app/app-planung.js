// MosaOS — app-planung.js
//
// Routenplanung: Tagesansicht, Tages-Crew, selbst angelegte Auftraege,
// Job-Editor.
//
// Teil der frueheren app.html. Die Datei wurde am 6. September 2026
// aufgeteilt: 9'559 Zeilen in einer Datei bedeuteten, dass jeder, der
// hier etwas sucht, alles laden muss.
//
// WICHTIG: Diese Dateien sind gewoehnliche Skripte, keine Module. Sie
// teilen sich denselben globalen Namensraum und werden in der Reihenfolge
// geladen, die in app.html steht. Beim Verschieben von Code darauf achten:
// Funktionen werden nur noch innerhalb ihrer eigenen Datei nach oben
// gezogen. Was beim Laden ausgefuehrt wird, darf nichts aus einer spaeter
// geladenen Datei aufrufen. Die Einrueckung von vier Leerzeichen ist
// absichtlich stehengeblieben - mehrzeilige Textbausteine wuerden sich
// sonst inhaltlich aendern.

    // ============ ROUTENPLANUNG (Single-Day) ============
    // Einzel-Mitarbeiter (Quelle der Wahrheit). Teams sind Gruppen davon.
    const EMPLOYEES_KEY = 'cc-employees-v1';
    // Leere Demo: jeder Tester startet mit sauberem System und legt eigene Daten an.
    const DEFAULT_EMPLOYEES = [];
    let EMPLOYEES = (() => {
      try {
        const v = JSON.parse(localStorage.getItem(EMPLOYEES_KEY));
        if (Array.isArray(v)) return v;
      } catch {}
      return JSON.parse(JSON.stringify(DEFAULT_EMPLOYEES));
    })();
    function saveEmployees() {
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(EMPLOYEES));
      window.MosaDB?.push('employees', EMPLOYEES);
    }
    function empName(e) { return `${e.firstName} ${e.lastName}`; }
    function empShort(e) { return `${e.firstName[0]}. ${e.lastName}`; }
    function empById(id) { return EMPLOYEES.find(e => e.id === id); }
    function empsByTeam(teamId) { return EMPLOYEES.filter(e => e.teamId === teamId); }
    function rebuildTeamMembers() {
      PLAN_TEAMS.forEach(t => {
        const emps = empsByTeam(t.id);
        t.members = emps;
        t.canDrive = emps.some(e => e.canDrive);
      });
    }

    // Teams: leer-startend, vom Nutzer selbst angelegt/benannt. In localStorage.
    const TEAMS_KEY = 'cc-teams-v1';
    let PLAN_TEAMS = (() => {
      try { const v = JSON.parse(localStorage.getItem(TEAMS_KEY)); if (Array.isArray(v)) return v; } catch {}
      return []; // keine Vorgaben — jede Firma benennt ihre Teams selbst
    })();
    const TEAM_COLORS = ['#E11D2A', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6'];
    function teamInitials(name) {
      const w = (name || '').trim().split(/\s+/).filter(Boolean);
      const letters = w.length >= 2 ? (w[0][0] + w[1][0]) : (name || '').trim().slice(0, 2);
      return (letters || 'T').toUpperCase();
    }
    function saveTeams() {
      const arr = PLAN_TEAMS.map(t => ({ id: t.id, name: t.name, short: t.short, color: t.color }));
      localStorage.setItem(TEAMS_KEY, JSON.stringify(arr));
      window.MosaDB?.push('teams', arr);
    }
    function addTeam(name, color) {
      const id = 't' + Date.now();
      PLAN_TEAMS.push({ id, name: name || 'Neues Team', short: teamInitials(name || 'Team'), color: color || TEAM_COLORS[PLAN_TEAMS.length % TEAM_COLORS.length] });
      saveTeams(); rebuildTeamMembers();
      return id;
    }
    function renameTeam(id, name, color) {
      const t = PLAN_TEAMS.find(x => x.id === id);
      if (!t) return;
      if (name != null && name.trim()) { t.name = name.trim(); t.short = teamInitials(name); }
      if (color) t.color = color;
      saveTeams();
    }
    function deleteTeam(id) {
      PLAN_TEAMS = PLAN_TEAMS.filter(t => t.id !== id);
      EMPLOYEES.forEach(e => { if (e.teamId === id) e.teamId = null; });
      saveEmployees(); saveTeams(); rebuildTeamMembers();
      window.MosaDB?.remove('teams', id);
    }
    // Abgeleitet: members + canDrive aus EMPLOYEES
    rebuildTeamMembers();

    // dayOffset = Tage relativ zu HEUTE (-7 = vor 1 Woche, 0 = heute, +7 = in 1 Woche)
    // Job-Daten werden über dayOffset → "Tagesmuster" gemappt damit egal welche Woche es Inhalte gibt
    const PLAN_JOB_PATTERNS = {
      // 0=Mo, 1=Di, 2=Mi, 3=Do, 4=Fr, 5=Sa, 6=So
      // customerId verweist auf einen Kunden (Adresse/Tel/Notizen/Default-Preis/Zahlart kommen von dort).
      // Felder wie objekt, ort, svc, price, paymethod, noteCrew, noteOffice können überschrieben werden.
      // Wenn customerId fehlt → "Walk-In"-Job mit manuell gepflegtem objekt-Text (z.B. Baustelle / Umzug).
      // Leere Demo: noch keine Aufträge geplant. Tester legt eigene an.
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    // Job-Overrides aus localStorage (User-Änderungen pro Datum + jobIndex)
    const PLAN_OVERRIDES_KEY = 'cc-plan-overrides-v1';
    function loadPlanOverrides() {
      try { return JSON.parse(localStorage.getItem(PLAN_OVERRIDES_KEY)) || {}; }
      catch { return {}; }
    }
    function savePlanOverrides(data) {
      localStorage.setItem(PLAN_OVERRIDES_KEY, JSON.stringify(data));
    }
    function setJobOverride(dateKey, jobIdx, patch) {
      const all = loadPlanOverrides();
      if (!all[dateKey]) all[dateKey] = {};
      all[dateKey][jobIdx] = { ...(all[dateKey][jobIdx] || {}), ...patch };
      savePlanOverrides(all);
    }

    // ============ Tages-Crew (per-day Mitarbeiter-Auswahl & Team-Zuordnung) ============
    const DAYCREW_KEY = 'cc-daycrews-v1';
    function loadDayCrews() {
      try { return JSON.parse(localStorage.getItem(DAYCREW_KEY)) || {}; }
      catch { return {}; }
    }
    function saveDayCrews(d) { localStorage.setItem(DAYCREW_KEY, JSON.stringify(d)); }
    function getDayCrew(dateKey) {
      const all = loadDayCrews();
      return all[dateKey] || null; // null = keine Anpassung → Stamm-Team-Zuordnung
    }
    function setDayCrew(dateKey, data) {
      const all = loadDayCrews();
      if (!data) delete all[dateKey];
      else all[dateKey] = data;
      saveDayCrews(all);
    }
    // B2 — die Tages-Crew soll taeglich auf die Stammzuordnung zurueckfallen.
    // getDayCrew(datum) === null bedeutet genau das. Ein Tag, an dem schon
    // geplant wurde, wird aber nicht einfach umgeworfen: dort sind Leute
    // konkret auf Einsaetze gesetzt.
    function tagAlsGeplant(dateKey) {
      const jobs = loadPlanJobs()[dateKey] || [];
      return jobs.some(j => (j.assigned && j.assigned.length) || j.team);
    }

    function tagesCrewZuruecksetzen() {
      if (!requirePerm('edit_auftrag', 'die Tages-Crew')) return;
      const datum = isoDate(planCurrentDate);
      if (!getDayCrew(datum)) {
        toast(tt('plan.dayAlreadyDefault', 'Dieser Tag folgt bereits der Stammzuordnung.'));
        return;
      }
      if (tagAlsGeplant(datum) &&
          !confirm(tt('plan.resetPlannedAsk',
            'An diesem Tag sind schon Einsätze zugeteilt. Die Tages-Crew trotzdem auf die Stammzuordnung zurücksetzen?'))) return;
      setDayCrew(datum, null);
      rebuildTeamMembers();
      if (typeof renderPlanung === 'function') renderPlanung();
      protokolliere('geaendert', 'teams', tt('plan.dayCrew', 'Tages-Crew') + ' ' + datum);
      toast(tt('plan.dayReset', '✓ Tag folgt wieder der Stammzuordnung'));
    }

    // ============ Selbst angelegte Aufträge (pro Datum) ============
    const PLAN_JOBS_KEY = 'cc-plan-jobs-v1';
    const AUFTRAGSSTATUS = ['provisorisch', 'definitiv', 'beendet'];
    function normalisiereAuftragsstatus(status, dateKey) {
      const raw = String(status || '').toLowerCase();
      if (['provisorisch', 'provisional', 'draft'].includes(raw)) return 'provisorisch';
      if (['beendet', 'erledigt', 'abgeschlossen', 'completed'].includes(raw)) return 'beendet';
      if (raw === 'definitiv') return 'definitiv';
      // Altbestand kannte nur "geplant"/leer. Vergangene Termine waren bisher
      // abrechenbar und werden deshalb beendet, heutige/kuenftige definitiv.
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      return dateKey && dateKey < today ? 'beendet' : 'definitiv';
    }
    function istDefinitiverFeldeinsatz(job) { return normalisiereAuftragsstatus(job?.status, job?._dateKey || job?.date) === 'definitiv'; }
    function istAuftragBeendet(job) { return normalisiereAuftragsstatus(job?.status, job?._dateKey || job?.date) === 'beendet'; }
    function loadPlanJobs() {
      try {
        const all = JSON.parse(localStorage.getItem(PLAN_JOBS_KEY)) || {};
        Object.entries(all).forEach(([dateKey, jobs]) => {
          if (Array.isArray(jobs)) jobs.forEach(j => { j.status = normalisiereAuftragsstatus(j.status, dateKey); });
        });
        return all;
      }
      catch { return {}; }
    }
    function savePlanJobsAll(d) {
      localStorage.setItem(PLAN_JOBS_KEY, JSON.stringify(d));
      return window.MosaDB?.push('plan_jobs', d) || Promise.resolve(false);
    }
    function addPlanJob(dateKey, job) {
      const all = loadPlanJobs();
      if (!all[dateKey]) all[dateKey] = [];
      all[dateKey].push(job);
      savePlanJobsAll(all);
    }
    // Alle Einsaetze flach mit ihrem Datum — loadPlanJobs() liefert eine
    // Karte nach Datum, keine Liste.
    function allePlanJobs() {
      const all = loadPlanJobs();
      return Object.entries(all).flatMap(([datum, arr]) =>
        (Array.isArray(arr) ? arr : []).map(j => ({ ...j, date: j.date || datum })));
    }
    function updatePlanJob(dateKey, jobId, patch) {
      const all = loadPlanJobs();
      const arr = all[dateKey] || [];
      const i = arr.findIndex(j => j.id === jobId);
      if (i >= 0) { arr[i] = { ...arr[i], ...patch }; return savePlanJobsAll(all); }
      return Promise.resolve(false);
    }
    function deletePlanJob(dateKey, jobId) {
      const all = loadPlanJobs();
      if (all[dateKey]) {
        all[dateKey] = all[dateKey].filter(j => j.id !== jobId);
        if (!all[dateKey].length) delete all[dateKey];
        savePlanJobsAll(all);
        window.MosaDB?.remove('plan_jobs', jobId);
      }
    }

    // Mitarbeiter eines Teams an einem bestimmten Tag (Tages-Crew überschreibt Stamm)
    function teamMembersOnDay(teamId, dateKey) {
      const dc = getDayCrew(dateKey);
      if (!dc) return EMPLOYEES.filter(e => e.teamId === teamId);
      const absent = new Set(dc.absent || []);
      const ass = dc.assignments || {};
      return EMPLOYEES.filter(e => {
        if (absent.has(e.id)) return false;
        const dayTeam = ass[e.id] || e.teamId;
        return dayTeam === teamId;
      });
    }
    function empDayTeam(empId, dateKey) {
      const dc = getDayCrew(dateKey);
      if (!dc) return (empById(empId) || {}).teamId;
      if ((dc.absent || []).includes(empId)) return null;
      return (dc.assignments || {})[empId] || (empById(empId) || {}).teamId;
    }
    function empIsAbsent(empId, dateKey) {
      const dc = getDayCrew(dateKey);
      return !!(dc && (dc.absent || []).includes(empId));
    }

    let planCurrentDate = new Date();
    planCurrentDate.setHours(0,0,0,0);

    function isoDate(d) {
      // Lokales Datum (NICHT UTC) — sonst Off-by-one in CH-Zeitzone
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    function fmtDayHeader(d) {
      return d.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    function startOfWeek(d) {
      const c = new Date(d);
      const day = c.getDay(); // 0=So, 1=Mo
      const diff = day === 0 ? -6 : 1 - day;
      c.setDate(c.getDate() + diff);
      c.setHours(0,0,0,0);
      return c;
    }
    function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
    function isSameDay(a, b) { return a.toDateString() === b.toDateString(); }
    function getJobsForDate(d) {
      // Wochentag → Pattern (so können wir egal welche Woche Inhalte zeigen)
      // Mo=1..So=0 → 0..6
      const dow = (d.getDay() + 6) % 7; // 0=Mo
      const dateKey = isoDate(d);
      const overrides = loadPlanOverrides()[dateKey] || {};
      const customers = loadCustomers();
      const patternJobs = (PLAN_JOB_PATTERNS[dow] || []).map((j, i) => {
        const ov = overrides[i] || {};
        // 1) Kunden-Defaults zuerst (wenn customerId vorhanden) — Pattern kann überschreiben, Override gewinnt am Ende
        let base = {};
        const custId = ov.customerId !== undefined ? ov.customerId : j.customerId;
        const cust = custId ? customers.find(c => c.id === custId) : null;
        if (cust) {
          base = {
            objekt: customerDisplayName(cust),
            ort: cust.address || '',
            svc: cust.defaultSvc || 'unterhalt',
            price: cust.defaultPrice || 0,
            duration: cust.defaultDuration || 60,
            crew: cust.defaultCrew || 1,
            paymethod: cust.paymethod || 'rechnung',
            noteCrew: cust.noteCrew || '',
            noteOffice: cust.noteOffice || ''
          };
        }
        const merged = { ...base, ...j, ...ov, customerId: custId };
        merged.status = normalisiereAuftragsstatus(merged.status, dateKey);
        // Customer-Objekt mitliefern (für UI), aber NICHT in localStorage zurückschreiben
        merged._customer = cust || null;

        const team = PLAN_TEAMS.find(t => t.id === merged.team);
        if (merged.status === 'provisorisch') {
          merged.assigned = [];
          merged.team = null;
        } else if (!merged.assigned || !Array.isArray(merged.assigned) || merged.assigned.length === 0) {
          // Team zugewiesen → GANZES Team arbeitet den Auftrag (bleibt für den Tag stabil,
          // wird NICHT durch defaultCrew auf 1 zugeschnitten). Tages-Crew/Abwesenheit zählt.
          const teamEmps = team ? teamMembersOnDay(team.id, dateKey) : [];
          merged.assigned = teamEmps.map(e => e.id);
        } else {
          // Falls assigned bereits gesetzt: abwesende Mitarbeiter rausfiltern
          merged.assigned = merged.assigned.filter(id => !empIsAbsent(id, dateKey));
        }
        merged.crew = merged.assigned.length;
        // Defaults für neue Felder
        if (merged.paymethod == null) merged.paymethod = 'rechnung';
        if (merged.price == null) merged.price = 0;
        if (merged.noteOffice == null) merged.noteOffice = '';
        if (merged.noteCrew == null) merged.noteCrew = '';

        merged._idx = i;
        merged._dateKey = dateKey;
        return merged;
      });

      // Selbst angelegte Aufträge (cc-plan-jobs-v1) anhängen
      const addedJobs = (loadPlanJobs()[dateKey] || []).map((j) => {
        const cust = j.customerId ? customers.find(c => c.id === j.customerId) : null;
        const merged = { ...j, status: normalisiereAuftragsstatus(j.status, dateKey), customerId: j.customerId || null, _customer: cust || null, _added: true, _jobId: j.id, _dateKey: dateKey };
        const team = PLAN_TEAMS.find(t => t.id === merged.team);
        if (merged.status === 'provisorisch') {
          merged.assigned = [];
          merged.team = null;
        } else if (!merged.assigned || !Array.isArray(merged.assigned) || merged.assigned.length === 0) {
          // Team zugewiesen → ganzes Team (stabil für den Tag), nicht auf crew zugeschnitten
          const teamEmps = team ? teamMembersOnDay(team.id, dateKey) : [];
          merged.assigned = teamEmps.map(e => e.id);
        } else {
          merged.assigned = merged.assigned.filter(id => !empIsAbsent(id, dateKey));
        }
        merged.crew = merged.assigned.length;
        if (merged.paymethod == null) merged.paymethod = 'rechnung';
        if (merged.price == null) merged.price = 0;
        if (merged.noteOffice == null) merged.noteOffice = '';
        if (merged.noteCrew == null) merged.noteCrew = '';
        if (merged.svc == null) merged.svc = 'unterhalt';
        return merged;
      });

      const result = patternJobs.concat(addedJobs);
      // _idx = Position im zurückgegebenen Array (Job-Editor lädt per Position)
      result.forEach((j, idx) => { j._idx = idx; });
      return result;
    }
    function getTeamById(id) { return PLAN_TEAMS.find(t => t.id === id); }

    function parseHM(s) { const [h,m] = s.split(':').map(Number); return h*60 + m; }
    function fmtHM(min) { const h = String(Math.floor(min/60)).padStart(2,'0'); const m = String(min%60).padStart(2,'0'); return `${h}:${m}`; }

    // Teilverfügbarkeit pro Team: berechnet wann/wieviele Personen frei sind
    function teamFreeFrom(team, jobs) {
      const size = team.members.length;
      const teamJobs = jobs.filter(j => j.team === team.id)
        .sort((a,b) => parseHM(a.start) - parseHM(b.start));
      if (teamJobs.length === 0) return { free: true, label: 'Ganzer Tag frei', count: 0, size };

      // Belegung pro Minute → wieviele Personen sind gerade gebunden?
      const events = [];
      teamJobs.forEach(j => {
        const s = parseHM(j.start);
        const e = s + j.duration;
        events.push({ t: s, d: +Math.min(j.crew, size) });
        events.push({ t: e, d: -Math.min(j.crew, size) });
      });
      events.sort((a,b) => a.t - b.t || a.d - b.d);

      // Intervalle mit konstanter Auslastung erzeugen
      let cur = 0;
      const intervals = [];
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        cur += ev.d;
        const nextT = i+1 < events.length ? events[i+1].t : ev.t;
        if (nextT > ev.t) intervals.push({ from: ev.t, to: nextT, busy: cur });
      }

      // Jetzt finden: ab wann sind alle / einige frei?
      const lastBusy = Math.max(...teamJobs.map(j => parseHM(j.start) + j.duration));
      // Aktuell freie Slots (= Personen, die jetzt NICHT auf Job sind)
      // Wir geben den ersten Zeitpunkt, ab dem ≥1 Person frei wird, und ab wann ALLE frei sind.
      let firstPartialFree = null;     // ab wann ist mind. 1 Person zusätzlich frei
      let allFreeFrom = lastBusy;
      // Falls Crew < size: Team hat schon jetzt freie Leute
      const startBusy = intervals.length > 0 ? intervals[0].busy : 0;
      const peakBusy = Math.max(...intervals.map(iv => iv.busy));

      if (size > 1 && peakBusy < size) {
        // Team ist nie voll ausgelastet → X frei den ganzen Tag, Y arbeitet bis lastBusy
        const freeNow = size - peakBusy;
        return {
          free: false,
          partial: true,
          size,
          count: teamJobs.length,
          label: `zu ${freeNow} frei den ganzen Tag · ${peakBusy} auf Job bis ${fmtHM(lastBusy)}`,
          lastObjekt: teamJobs[teamJobs.length-1].objekt
        };
      }

      return {
        free: false,
        partial: false,
        size,
        count: teamJobs.length,
        label: `${size > 1 ? 'voll gebunden bis' : 'frei ab'} ${fmtHM(lastBusy)}`,
        lastObjekt: teamJobs[teamJobs.length-1].objekt
      };
    }

    function renderDaySwitcher() {
      const wrap = document.getElementById('daySwitcher');
      if (!wrap) return;
      const weekStart = startOfWeek(planCurrentDate);
      const today = new Date(); today.setHours(0,0,0,0);
      const dows = [tt('wiz.dMo','Mo'),tt('wiz.dDi','Di'),tt('wiz.dMi','Mi'),tt('wiz.dDo','Do'),tt('wiz.dFr','Fr'),tt('wiz.dSa','Sa'),tt('wiz.dSo','So')];
      wrap.innerHTML = Array.from({length: 7}, (_, i) => {
        const d = addDays(weekStart, i);
        const isActive = isSameDay(d, planCurrentDate);
        const isToday = isSameDay(d, today);
        const count = getJobsForDate(d).length;
        return `<button class="day-pill ${isActive ? 'is-active' : ''} ${isToday ? 'is-today' : ''}"
          onclick="planSetDate('${isoDate(d)}')">
          <span class="dow">${dows[i]}</span>
          <span class="dom">${d.getDate()}.</span>
          <span class="cnt">${count > 0 ? count + ' Einsätze' : 'frei'}</span>
        </button>`;
      }).join('');
    }

    // Mitarbeiter-Tagestimeline: berechnet Belegungs- und Frei-Intervalle aus den Jobs
    function employeeTimeline(empId, jobs) {
      const myJobs = jobs.filter(j => j.assigned.includes(empId))
        .sort((a,b) => parseHM(a.start) - parseHM(b.start));
      if (myJobs.length === 0) {
        return { busy: false, totalMin: 0, jobs: [], nextFreeMin: null, intervals: [] };
      }
      // Intervalle zusammenfassen (überlappende mergen)
      const busy = myJobs.map(j => ({
        from: parseHM(j.start),
        to: parseHM(j.start) + j.duration,
        job: j
      })).sort((a,b) => a.from - b.from);
      // Merge
      const merged = [];
      busy.forEach(iv => {
        if (merged.length && iv.from <= merged[merged.length-1].to) {
          merged[merged.length-1].to = Math.max(merged[merged.length-1].to, iv.to);
          merged[merged.length-1].jobs.push(iv.job);
        } else {
          merged.push({ from: iv.from, to: iv.to, jobs: [iv.job] });
        }
      });
      const totalMin = merged.reduce((s, m) => s + (m.to - m.from), 0);
      const lastEnd = merged[merged.length - 1].to;
      return {
        busy: true,
        totalMin,
        jobs: myJobs,
        intervals: merged,
        nextFreeMin: lastEnd
      };
    }

    // Wer arbeitet mit empId an einem konkreten Job?
    function coworkersForJob(job, selfId) {
      return job.assigned.filter(id => id !== selfId).map(id => {
        const e = empById(id);
        return e ? empShort(e) : '?';
      }).join(', ');
    }

    // Aktuelle Stunde/Minute (nur wenn der angezeigte Tag = heute)
    function nowMinIfToday() {
      const today = new Date(); today.setHours(0,0,0,0);
      if (!isSameDay(planCurrentDate, today)) return null;
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    }

    function renderTeamStatus() {
      const grid = document.getElementById('teamStatusGrid');
      const summary = document.getElementById('teamStatusSummary');
      const dayLabel = document.getElementById('dayLabel');
      if (!grid) return;
      const today = new Date(); today.setHours(0,0,0,0);
      dayLabel.textContent = isSameDay(planCurrentDate, today)
        ? tt('date.today','heute') : planCurrentDate.toLocaleDateString(dateLocale(), { weekday:'long', day:'numeric', month:'long' });

      const jobs = getJobsForDate(planCurrentDate).filter(istDefinitiverFeldeinsatz);
      const nowMin = nowMinIfToday();
      const totalJobs = jobs.length;

      // Pro Mitarbeiter Timeline berechnen
      const empRows = EMPLOYEES.map(emp => {
        const tl = employeeTimeline(emp.id, jobs);
        return { emp, tl };
      });

      const empsWorking = empRows.filter(r => r.tl.busy).length;
      const empsFree = EMPLOYEES.length - empsWorking;

      summary.textContent = `${totalJobs} ${tt('plan.jobs','Einsätze')} · ${empsWorking} ${tt('plan.staffWorking','Mitarbeiter im Einsatz')} · ${empsFree} ${tt('plan.free','frei')}`;

      // Sortieren: zuerst die, die JETZT auf Job sind, dann die mit Job heute, dann die freien
      empRows.sort((a, b) => {
        const aBusy = a.tl.busy ? 1 : 0;
        const bBusy = b.tl.busy ? 1 : 0;
        if (aBusy !== bBusy) return bBusy - aBusy;
        if (a.tl.busy && b.tl.busy) {
          return a.tl.intervals[0].from - b.tl.intervals[0].from;
        }
        return empName(a.emp).localeCompare(empName(b.emp));
      });

      grid.innerHTML = empRows.map(({ emp, tl }) => {
        const teamColor = (getTeamById(emp.teamId) || {}).color || 'var(--brand-primary)';
        const initials = (emp.firstName[0] + emp.lastName[0]).toUpperCase();
        const driveBadge = emp.canDrive
          ? '<span class="emp-status-drive">Fahrer</span>'
          : '<span class="emp-status-passenger">Beifahrer</span>';

        if (!tl.busy) {
          return `<div class="emp-status-card is-free">
            <div class="emp-status-avatar" style="border-color: ${teamColor};">${initials}</div>
            <div class="emp-status-body">
              <div class="emp-status-name">${empName(emp)} ${driveBadge}</div>
              <div class="emp-status-line">
                <span class="esi-tag is-free">✓ frei den ganzen Tag</span>
              </div>
            </div>
          </div>`;
        }

        // Status-Beschreibung mit Intervallen
        const lineParts = [];
        const isOnNow = nowMin != null && tl.intervals.some(iv => nowMin >= iv.from && nowMin < iv.to);
        const curInterval = isOnNow ? tl.intervals.find(iv => nowMin >= iv.from && nowMin < iv.to) : null;

        if (curInterval) {
          const job = curInterval.jobs[0];
          const co = coworkersForJob(job, emp.id);
          lineParts.push(`<span class="esi-tag is-now">● jetzt: ${job.objekt}${co ? ` mit ${co}` : ' allein'} bis ${fmtHM(curInterval.to)}</span>`);
        }

        // Erstes/nächstes Intervall (wenn nicht aktuell)
        tl.intervals.forEach((iv, i) => {
          if (curInterval === iv) return;
          if (nowMin != null && iv.to <= nowMin) return; // vorbei
          const job = iv.jobs[0];
          const co = coworkersForJob(job, emp.id);
          lineParts.push(`<span class="esi-tag is-busy">${fmtHM(iv.from)}–${fmtHM(iv.to)} · ${job.objekt}${co ? ` mit ${co}` : ''}</span>`);
        });

        // Frei ab
        const nextFreeLbl = tl.nextFreeMin != null
          ? (nowMin != null && nowMin >= tl.nextFreeMin
              ? '<span class="esi-tag is-free">✓ jetzt frei</span>'
              : `<span class="esi-tag is-free-from">frei ab ${fmtHM(tl.nextFreeMin)}</span>`)
          : '';
        lineParts.push(nextFreeLbl);

        // Gesamtarbeitszeit
        const h = Math.floor(tl.totalMin / 60);
        const m = tl.totalMin % 60;
        const totalLbl = `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'min' : ''}`.trim();

        const cls = isOnNow ? 'is-busy' : 'is-scheduled';
        return `<div class="emp-status-card ${cls}">
          <div class="emp-status-avatar" style="border-color: ${teamColor};">${initials}</div>
          <div class="emp-status-body">
            <div class="emp-status-name">${empName(emp)} ${driveBadge}<span class="emp-status-total">${totalLbl} heute</span></div>
            <div class="emp-status-line">${lineParts.join(' ')}</div>
          </div>
        </div>`;
      }).join('');
    }

    function renderDayTimeline() {
      const wrap = document.getElementById('dayTimeline');
      if (!wrap) return;
      const jobs = getJobsForDate(planCurrentDate).sort((a,b) => parseHM(a.start) - parseHM(b.start));
      const subtitle = document.getElementById('planSubtitle');
      const weekNo = getWeekNumber(planCurrentDate);
      subtitle.textContent = `${fmtDayHeader(planCurrentDate)} · ${tt('date.cw','KW')} ${weekNo} · ${jobs.length} ${tt('plan.jobs','Einsätze')} · ${PLAN_TEAMS.length} ${tt('plan.teams','Teams')}`;

      if (jobs.length === 0) {
        wrap.innerHTML = `<div style="padding: 60px 24px; text-align: center; color: var(--text-subtle);">
          <div style="margin-bottom: 12px; display:flex; justify-content:center;"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-subtle);opacity:.6;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div style="font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 4px;">${tt('est.noJobsPlanned','Keine Einsätze geplant')}</div>
          <div style="font-size: 13px;">Klick auf „+ Neuer Auftrag" oben rechts, um etwas anzulegen.</div>
        </div>`;
        return;
      }

      // Gruppieren nach Stunden-Slots (06:00, 07:00, ...)
      const today = new Date(); today.setHours(0,0,0,0);
      const isCurrentDay = isSameDay(planCurrentDate, today);
      const nowHour = new Date().getHours();

      const minStartHour = Math.min(...jobs.map(j => Math.floor(parseHM(j.start)/60)));
      const maxEndHour   = Math.max(...jobs.map(j => Math.ceil((parseHM(j.start) + j.duration)/60)));
      const startHour = Math.max(6, minStartHour);
      const endHour = Math.min(22, maxEndHour);

      const rows = [];
      for (let h = startHour; h <= endHour; h++) {
        const hourJobs = jobs.filter(j => Math.floor(parseHM(j.start)/60) === h);
        const isNow = isCurrentDay && h === nowHour;
        const cells = hourJobs.length > 0 ? hourJobs.map(j => {
          const team = getTeamById(j.team);
          const endMin = parseHM(j.start) + j.duration;
          const dh = Math.floor(j.duration/60);
          const dm = j.duration % 60;
          const durStr = (dh > 0 ? dh + 'h ' : '') + (dm > 0 ? dm + 'min' : '');
          const assignedNames = j.assigned.map(id => {
            const e = empById(id);
            return e ? empShort(e) : '?';
          }).join(', ');
          const statusLabel = j.status === 'provisorisch' ? tt('job.statusProvisional','Provisorisch') : j.status === 'beendet' ? tt('job.statusFinished','Beendet') : tt('job.statusDefinitive','Definitiv');
          return `<div class="job-card svc-${j.svc}" data-job-status="${j.status}" onclick="openJobEditor('${j._dateKey}', ${j._idx})" title="Klicken zum Bearbeiten">
            <div class="jteam" style="background: ${team ? team.color : '#9CA3AF'};">${team ? team.short : '–'}</div>
            <div class="jbody">
              <div class="jname">${j.objekt} <span class="badge badge-neutral" style="font-size:10px;margin-left:5px;">${statusLabel}</span></div>
              <div class="jmeta">${j.ort}</div>
              <div class="jassigned">${assignedNames || (j.status === 'provisorisch' ? `<em>${tt('job.notFieldYet','Noch kein Feldeinsatz')}</em>` : `<em style="color: var(--danger);">${tt('est.noStaffAssigned','Keine Mitarbeiter zugewiesen')}</em>`)}</div>
            </div>
            <div class="jright">
              <div class="jdur">${j.start} – ${fmtHM(endMin)}</div>
              <div>${durStr.trim()}</div>
            </div>
          </div>`;
        }).join('') : '<div class="timeline-empty">— frei —</div>';

        rows.push(`<div class="timeline-row ${isNow ? 'is-now' : ''}">
          <div class="timeline-hour ${isNow ? 'is-now' : ''}">${String(h).padStart(2,'0')}:00</div>
          <div class="timeline-events">${cells}</div>
        </div>`);
      }
      wrap.innerHTML = rows.join('');
    }

    function getWeekNumber(d) {
      const date = new Date(d.getTime());
      date.setHours(0,0,0,0);
      date.setDate(date.getDate() + 3 - (date.getDay()+6)%7);
      const week1 = new Date(date.getFullYear(),0,4);
      return 1 + Math.round(((date - week1)/86400000 - 3 + (week1.getDay()+6)%7)/7);
    }

    function planSetDate(isoStr) {
      // Lokal parsen (Y, M, D) statt new Date(isoStr) (=UTC) → kein Tag-Versatz
      const [y, m, d] = String(isoStr).split('-').map(Number);
      planCurrentDate = new Date(y, m - 1, d);
      planCurrentDate.setHours(0,0,0,0);
      renderPlanung();
    }
    function planShiftWeek(dir) {
      planCurrentDate = addDays(planCurrentDate, dir * 7);
      renderPlanung();
    }
    function planGoToday() {
      planCurrentDate = new Date();
      planCurrentDate.setHours(0,0,0,0);
      renderPlanung();
      toast('Heute angezeigt');
    }
    function renderPlanung() {
      renderDaySwitcher();
      renderDayCrewCard();
      renderTeamStatus();
      renderDayTimeline();
      renderPlanStatus();
    }

    // Keine künstlichen "gesparten" Minuten anzeigen: Status folgt ausschliesslich den echten Einsätzen.
    function renderPlanStatus() {
      const jobs = getJobsForDate(planCurrentDate);
      const label = document.getElementById('planStatusLabel');
      const text = document.getElementById('planStatusText');
      const conflicts = document.getElementById('planConflictBtn');
      const optimize = document.getElementById('autoPlanBtn');
      if (!label || !text || !conflicts) return;
      if (!jobs.length) {
        label.textContent = tt('plan.readyStatus', 'Tagesplanung bereit');
        text.textContent = tt('plan.readyEmpty', 'Lege deinen ersten Einsatz an – dann wird die Tagesplanung hier angezeigt.');
        conflicts.style.display = 'none';
        if (optimize) optimize.style.display = 'none';
        return;
      }
      label.textContent = tt('plan.activeStatus', 'Tagesplanung aktiv');
      text.textContent = tt('plan.activeText', '{count} Einsätze geplant. Routenoptimierung bei Bedarf starten.').replace('{count}', jobs.length);
      conflicts.style.display = '';
      if (optimize) optimize.style.display = '';
    }

    // ============ Tages-Crew-Karte (oben in Routenplanung) ============
    function renderDayCrewCard() {
      const wrap = document.getElementById('daycrewTeams');
      const absWrap = document.getElementById('daycrewAbsent');
      const sumEl = document.getElementById('daycrewSummary');
      const dayLbl = document.getElementById('daycrewDayLabel');
      const resetBtn = document.getElementById('daycrewResetBtn');
      if (!wrap) return;
      const today = new Date(); today.setHours(0,0,0,0);
      dayLbl.textContent = isSameDay(planCurrentDate, today)
        ? tt('date.today','heute') : planCurrentDate.toLocaleDateString(dateLocale(), { weekday:'long', day:'numeric', month:'long' });
      const dateKey = isoDate(planCurrentDate);
      const dc = getDayCrew(dateKey);
      resetBtn.style.display = dc ? '' : 'none';

      const absent = EMPLOYEES.filter(e => empIsAbsent(e.id, dateKey));
      const present = EMPLOYEES.filter(e => !empIsAbsent(e.id, dateKey));
      sumEl.textContent = dc
        ? `${present.length} anwesend · ${absent.length} abwesend · angepasst für diesen Tag`
        : `${EMPLOYEES.length} Mitarbeiter · Stamm-Team-Zuordnung`;

      wrap.innerHTML = PLAN_TEAMS.map(team => {
        const members = teamMembersOnDay(team.id, dateKey);
        if (members.length === 0) {
          return `<div class="daycrew-team is-empty">
            <span class="daycrew-team-dot" style="background:${team.color};"></span>
            <span class="daycrew-team-name">${team.name}</span>
            <span class="daycrew-team-empty">— niemand heute —</span>
          </div>`;
        }
        const chips = members.map(e => {
          const driver = e.canDrive ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:4px;opacity:.6;"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><line x1="12" y1="14.4" x2="12" y2="21"/><line x1="14.1" y1="13.2" x2="19.8" y2="16.5"/><line x1="9.9" y1="13.2" x2="4.2" y2="16.5"/></svg>' : '';
          return `<span class="daycrew-chip" style="border-color:${team.color}33;">${driver}${empName(e)}</span>`;
        }).join('');
        return `<div class="daycrew-team">
          <span class="daycrew-team-dot" style="background:${team.color};"></span>
          <span class="daycrew-team-name">${team.name} <span class="daycrew-team-count">· ${members.length}</span></span>
          <div class="daycrew-team-chips">${chips}</div>
        </div>`;
      }).join('');

      if (absent.length > 0) {
        absWrap.innerHTML = `<span class="daycrew-absent-label">Abwesend:</span> ` +
          absent.map(e => `<span class="daycrew-chip is-absent">${empName(e)}</span>`).join('');
      } else {
        absWrap.innerHTML = '';
      }
    }

    function resetDayCrew() {
      const dateKey = isoDate(planCurrentDate);
      setDayCrew(dateKey, null);
      renderPlanung();
      toast('Tages-Crew zurückgesetzt');
    }

    // ============ Tages-Crew-Modal ============
    function openDayCrewModal() {
      const dateKey = isoDate(planCurrentDate);
      const today = new Date(); today.setHours(0,0,0,0);
      document.getElementById('dayCrewModalDate').textContent = isSameDay(planCurrentDate, today)
        ? tt('date.today','heute') : planCurrentDate.toLocaleDateString(dateLocale(), { weekday:'long', day:'numeric', month:'long' });
      renderDayCrewPicker(dateKey);
      openModal('dayCrew');
    }

    function renderDayCrewPicker(dateKey) {
      const wrap = document.getElementById('dayCrewPicker');
      const teamOpts = PLAN_TEAMS.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
      wrap.innerHTML = EMPLOYEES.map(e => {
        const present = !empIsAbsent(e.id, dateKey);
        const teamId = empDayTeam(e.id, dateKey) || e.teamId;
        const teamColor = (PLAN_TEAMS.find(t => t.id === teamId) || {}).color || '#999';
        const driver = e.canDrive ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><line x1="12" y1="14.4" x2="12" y2="21"/><line x1="14.1" y1="13.2" x2="19.8" y2="16.5"/><line x1="9.9" y1="13.2" x2="4.2" y2="16.5"/></svg>' : '';
        const driverTitle = e.canDrive ? 'Fahrer' : 'kein Führerschein';
        return `<div class="daycrew-row ${present ? '' : 'is-absent'}" data-emp="${e.id}">
          <label class="daycrew-presence">
            <input type="checkbox" data-presence ${present ? 'checked' : ''} onchange="dayCrewRowToggle('${e.id}')" />
            <span>anwesend</span>
          </label>
          <div class="daycrew-row-name">
            <span class="daycrew-row-icon" title="${driverTitle}">${driver}</span>
            <span>${empName(e)}</span>
            <span class="daycrew-row-role">${e.role || ''}</span>
          </div>
          <div class="daycrew-row-team">
            <span class="daycrew-team-dot" data-teamdot style="background:${teamColor};"></span>
            <select data-team onchange="dayCrewRowTeamChange('${e.id}')" ${present ? '' : 'disabled'}>
              ${PLAN_TEAMS.map(t => `<option value="${t.id}" ${t.id === teamId ? 'selected' : ''}>${t.name}</option>`).join('')}
            </select>
          </div>
        </div>`;
      }).join('');
    }

    function dayCrewRowToggle(empId) {
      const row = document.querySelector(`.daycrew-row[data-emp="${empId}"]`);
      if (!row) return;
      const present = row.querySelector('[data-presence]').checked;
      row.classList.toggle('is-absent', !present);
      row.querySelector('[data-team]').disabled = !present;
    }
    function dayCrewRowTeamChange(empId) {
      const row = document.querySelector(`.daycrew-row[data-emp="${empId}"]`);
      if (!row) return;
      const teamId = row.querySelector('[data-team]').value;
      const color = (PLAN_TEAMS.find(t => t.id === teamId) || {}).color || '#999';
      row.querySelector('[data-teamdot]').style.background = color;
    }
    function dayCrewMarkAllPresent() {
      document.querySelectorAll('#dayCrewPicker .daycrew-row').forEach(row => {
        const cb = row.querySelector('[data-presence]');
        if (!cb.checked) { cb.checked = true; dayCrewRowToggle(row.dataset.emp); }
      });
    }
    function saveDayCrewEdit() {
      const dateKey = isoDate(planCurrentDate);
      const absent = [];
      const assignments = {};
      let anyDeviation = false;
      document.querySelectorAll('#dayCrewPicker .daycrew-row').forEach(row => {
        const empId = row.dataset.emp;
        const present = row.querySelector('[data-presence]').checked;
        const teamId = row.querySelector('[data-team]').value;
        const stamm = (empById(empId) || {}).teamId;
        if (!present) { absent.push(empId); anyDeviation = true; }
        else if (teamId !== stamm) { assignments[empId] = teamId; anyDeviation = true; }
      });
      setDayCrew(dateKey, anyDeviation ? { absent, assignments } : null);
      closeModal('dayCrew');
      // Job-Overrides bereinigen, damit auto-assign neu greift (nur für diesen Tag)
      const all = loadPlanOverrides();
      if (all[dateKey]) {
        Object.keys(all[dateKey]).forEach(k => {
          if (all[dateKey][k].assigned) delete all[dateKey][k].assigned;
        });
        savePlanOverrides(all);
      }
      renderPlanung();
      toast(anyDeviation ? '✓ Tages-Crew gespeichert' : 'Auf Standard-Team-Zuordnung zurückgesetzt');
    }

    // ============ Job-Editor ============
    let editingJob = null; // { dateKey, idx }

    function openJobEditor(dateKey, idx) {
      const jobs = getJobsForDate(new Date(dateKey));
      const j = jobs[idx];
      if (!j) return;
      editingJob = { dateKey, idx, added: !!j._added, jobId: j._jobId || null, seriesId: j.seriesId || null };
      const resetBtn = document.getElementById('jobEditResetBtn');
      if (resetBtn) resetBtn.textContent = j.seriesId ? tt('common.delete', 'Löschen') : (j._added ? tt('dyn.deleteOrder', 'Auftrag löschen') : tt('job.resetDefault', 'Auf Standard zurücksetzen'));

      // Serien-Banner
      const banner = document.getElementById('jobEditSeriesBanner');
      if (j.seriesId) {
        const members = findSeriesJobs(j.seriesId, null);
        const future = members.filter(m => m.dateKey >= dateKey).length;
        const lbl = REPEAT_LABELS_DE[j.recurring] ? repeatLabel(j.recurring).replace(/^./, c => c.toUpperCase()) : tt('date.recurring','Wiederkehrende');
        document.getElementById('jobEditSeriesInfo').textContent = `${lbl} ${tt('date.series','Serie')} · ${members.length} ${tt('date.appointments','Termine')} (${future} ${tt('date.fromHere','ab hier')})`;
        document.getElementById('jobEditSeriesScope').value = 'this';
        banner.style.display = 'block';
      } else {
        banner.style.display = 'none';
      }
      document.getElementById('jobEditorTitle').textContent = j.objekt;
      document.getElementById('jobEditorSubtitle').textContent = `${j.ort} · ${fmtDayHeader(new Date(dateKey))}`;
      document.getElementById('jobEditStart').value = j.start;
      document.getElementById('jobEditDuration').value = j.duration;
      document.getElementById('jobEditPrice').value = j.price || 0;
      document.getElementById('jobEditStatus').value = j.status || 'provisorisch';
      document.getElementById('jobEditNoteOffice').value = j.noteOffice || '';
      document.getElementById('jobEditNoteCrew').value = j.noteCrew || '';

      renderJobCustomerCard(j);
      setJobPaymethod(j.paymethod || 'rechnung');
      renderJobPhoneLog(j);
      renderEmployeePicker(j.assigned);
      openModal('jobEditor');
    }

    function renderJobCustomerCard(j) {
      const wrap = document.getElementById('jobEditCustomerCard');
      const c = j._customer;
      if (!c) {
        // Walk-In / kein Kunde verknüpft
        wrap.innerHTML = `
          <div class="je-cc-icon">📍</div>
          <div class="je-cc-body">
            <div class="je-cc-name">${j.objekt}</div>
            <div class="je-cc-meta">${j.ort || tt('est.noAddress','Keine Adresse')} · <em>${tt('est.noCustomerSingle','Kein Kunde im Stamm — Einzeleinsatz')}</em></div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="closeModal('jobEditor'); switchView('kunden');">Kunde anlegen</button>
        `;
        return;
      }
      const openCalls = (c.calls || []).filter(x => x.followup).length;
      const followupBadge = openCalls > 0
        ? `<span class="je-cc-warn">${openCalls} Rückruf${openCalls === 1 ? '' : 'e'} offen</span>`
        : '';
      const noteLine = c.note ? `<div class="je-cc-note">${c.note}</div>` : '';
      wrap.innerHTML = `
        <div class="je-cc-icon" style="background: var(--brand-primary-soft); color: var(--brand-primary);">${customerInitials(c)}</div>
        <div class="je-cc-body">
          <div class="je-cc-name">${customerDisplayName(c)} ${followupBadge}</div>
          <div class="je-cc-meta">
            <span>📍 ${c.address || '—'}</span>
            <span>·</span>
            <span>${c.phone ? `<a href="tel:${c.phone}">${c.phone}</a>` : '—'}</span>
            <span>·</span>
            <span>🏷 ${c.type || '—'}</span>
          </div>
          ${noteLine}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="closeModal('jobEditor'); openCustomerDetail('${c.id}');">Kunden öffnen</button>
      `;
    }

    function setJobPaymethod(pm) {
      const wrap = document.getElementById('jobEditPaymethod');
      wrap.dataset.value = pm;
      wrap.querySelectorAll('button').forEach(b => {
        b.classList.toggle('is-active', b.dataset.pm === pm);
      });
      const documentBtn = document.getElementById('jobEditInvoiceBtn');
      if (documentBtn) documentBtn.textContent = pm === 'rechnung'
        ? tt('job.pmInvoice','Rechnung') : tt('m.receiptTitle','Quittung');
    }

    function renderJobPhoneLog(j) {
      const wrap = document.getElementById('jobEditPhoneLog');
      const c = j._customer;
      if (!c || !c.calls || c.calls.length === 0) {
        wrap.innerHTML = '';
        return;
      }
      const sorted = c.calls.slice().sort((a,b) => b.ts.localeCompare(a.ts));
      const last3 = sorted.slice(0, 3);
      const more = sorted.length > 3 ? `<button class="btn btn-ghost btn-sm" onclick="closeModal('jobEditor'); openCustomerDetail('${c.id}');">Alle ${sorted.length} Anrufe ansehen →</button>` : '';
      wrap.innerHTML = `
        <div class="je-phone-head">Letzte Anrufe (${c.calls.length})</div>
        ${last3.map(call => {
          const d = new Date(call.ts);
          const dateStr = d.toLocaleDateString(dateLocale(), { day: '2-digit', month: 'short' });
          const isRr = callHasRueckruf(call);
          const fup = isRr ? '<span class="je-phone-fup">Rückruf offen</span>' : '';
          const wer = call.wer || call.who || '—';
          const text = call.text || call.summary || '';
          return `<div class="je-phone-row ${isRr ? 'is-followup' : ''}">
            <span class="je-phone-when">${dateStr} · ${wer}</span>
            <span class="je-phone-text">${text}</span>
            ${fup}
          </div>`;
        }).join('')}
        ${more}
      `;
    }

    function renderEmployeePicker(selectedIds) {
      const wrap = document.getElementById('jobEditEmployees');
      const selSet = new Set(selectedIds || []);
      const rowsHtml = (members) => members.map(e => {
        const isOn = selSet.has(e.id);
        const icon = e.canDrive ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><line x1="12" y1="14.4" x2="12" y2="21"/><line x1="14.1" y1="13.2" x2="19.8" y2="16.5"/><line x1="9.9" y1="13.2" x2="4.2" y2="16.5"/></svg>' : '';
        const title = e.canDrive ? 'Fahrer' : 'braucht Mitfahrgelegenheit';
        return `<label class="emp-picker-row ${isOn ? 'is-on' : ''}">
          <input type="checkbox" data-emp="${e.id}" ${isOn ? 'checked' : ''} onchange="empPickerChanged()" />
          <span class="emp-picker-icon" title="${title}">${icon}</span>
          <span class="emp-picker-name">${empName(e)}</span>
        </label>`;
      }).join('');

      let html = PLAN_TEAMS.map(team => {
        const members = team.members;
        const allSelected = members.length > 0 && members.every(e => selSet.has(e.id));
        return `<div class="emp-picker-team">
          <div class="emp-picker-head">
            <span class="emp-picker-dot" style="background: ${team.color};"></span>
            <span class="emp-picker-teamname">${team.name}</span>
            <button type="button" class="emp-picker-all" onclick="empPickerToggleTeam('${team.id}')">${allSelected ? 'Team abwählen' : 'Ganzes Team'}</button>
          </div>
          <div class="emp-picker-rows">${rowsHtml(members)}</div>
        </div>`;
      }).join('');

      // Mitarbeiter ohne (gültiges) Team
      const teamIds = new Set(PLAN_TEAMS.map(t => t.id));
      const ohneTeam = EMPLOYEES.filter(e => !e.teamId || !teamIds.has(e.teamId));
      if (ohneTeam.length) {
        html += `<div class="emp-picker-team">
          <div class="emp-picker-head">
            <span class="emp-picker-dot" style="background: #9CA3AF;"></span>
            <span class="emp-picker-teamname">Ohne Team</span>
          </div>
          <div class="emp-picker-rows">${rowsHtml(ohneTeam)}</div>
        </div>`;
      }
      if (!html) html = `<div style="color:var(--text-subtle);font-size:13px;padding:8px;">${tt('est.noStaffYetPick','Noch keine Mitarbeiter. Lege erst Mitarbeiter an.')}</div>`;
      wrap.innerHTML = html;
      updateAssignedCount();
    }

    function empPickerChanged() {
      // Re-render Row-Klassen + Count
      const checks = document.querySelectorAll('#jobEditEmployees input[type=checkbox]');
      checks.forEach(c => {
        c.closest('.emp-picker-row').classList.toggle('is-on', c.checked);
      });
      updateAssignedCount();
    }

    function empPickerToggleTeam(teamId) {
      const team = getTeamById(teamId);
      const allOn = team.members.every(e => {
        const c = document.querySelector(`#jobEditEmployees input[data-emp="${e.id}"]`);
        return c && c.checked;
      });
      team.members.forEach(e => {
        const c = document.querySelector(`#jobEditEmployees input[data-emp="${e.id}"]`);
        if (c) c.checked = !allOn;
      });
      empPickerChanged();
    }

    function updateAssignedCount() {
      const n = document.querySelectorAll('#jobEditEmployees input[type=checkbox]:checked').length;
      const fahrer = Array.from(document.querySelectorAll('#jobEditEmployees input[type=checkbox]:checked'))
        .filter(c => {
          const e = empById(c.dataset.emp);
          return e && e.canDrive;
        }).length;
      const el = document.getElementById('jobEditAssignedCount');
      const fHint = fahrer === 0 && n > 0 ? ' · kein Fahrer dabei' : '';
      el.textContent = `(${n} ausgewählt${fHint})`;
      el.style.color = fahrer === 0 && n > 0 ? 'var(--warning)' : 'var(--text-subtle)';
    }

    async function saveJobEdit() {
      if (!editingJob) return;
      const start = document.getElementById('jobEditStart').value;
      const duration = parseInt(document.getElementById('jobEditDuration').value, 10);
      const price = parseFloat(document.getElementById('jobEditPrice').value) || 0;
      const paymethod = document.getElementById('jobEditPaymethod').dataset.value || 'rechnung';
      const oldJobs = getJobsForDate(new Date(editingJob.dateKey + 'T00:00:00'));
      const oldJob = oldJobs[editingJob.idx];
      const status = document.getElementById('jobEditStatus')?.value || oldJob?.status || 'provisorisch';
      const noteOffice = document.getElementById('jobEditNoteOffice').value.trim();
      const noteCrew = document.getElementById('jobEditNoteCrew').value.trim();
      const assigned = Array.from(document.querySelectorAll('#jobEditEmployees input[type=checkbox]:checked'))
        .map(c => c.dataset.emp);
      if (!start || !duration || duration < 15) {
        toast('Bitte gültige Zeit und Dauer (≥15 min) eingeben', 'error');
        return;
      }
      if (status !== 'provisorisch' && assigned.length === 0) {
        toast('Mindestens 1 Mitarbeiter zuweisen', 'error');
        return;
      }
      if (oldJob?.status === 'beendet' && status !== 'beendet') {
        toast(tt('job.finishedLocked','Ein beendeter Auftrag kann nicht zurückgesetzt werden.'), 'error');
        return;
      }
      if (oldJob?.status === 'beendet' && (paymethod !== (oldJob.paymethod || 'rechnung') || price !== Number(oldJob.price || 0))) {
        toast(tt('job.finishedBillingLocked','Preis und Zahlart eines beendeten Auftrags bleiben unverändert.'), 'error');
        return;
      }
      if (oldJob?.status === 'provisorisch' && status === 'beendet') {
        toast(tt('job.makeDefinitiveFirst','Auftrag zuerst auf Definitiv setzen.'), 'error');
        return;
      }
      const firstEmp = empById(assigned[0]);
      const teamId = firstEmp ? firstEmp.teamId : editingJob.team;
      const isCompletion = oldJob?.status === 'definitiv' && status === 'beendet';
      const patch = { start, duration, team: status === 'provisorisch' ? null : teamId,
        assigned: status === 'provisorisch' ? [] : assigned, price, paymethod, noteOffice, noteCrew, status };
      if (isCompletion) {
        patch.completedAt = new Date().toISOString();
        patch.invoiceStatus = paymethod === 'rechnung' ? (oldJob.invoiceStatus || 'pending') : null;
      }
      const scope = editingJob.seriesId ? (document.getElementById('jobEditSeriesScope').value || 'this') : 'this';
      if (isCompletion && scope !== 'this') {
        toast(tt('job.finishSingleOnly','Ein Serien-Termin wird einzeln beendet.'), 'error');
        return;
      }
      const completedDateKey = editingJob.dateKey;
      let msg = '✓ Einsatz aktualisiert';
      if (editingJob.added) {
        if (editingJob.seriesId && scope !== 'this') {
          await patchSeries(editingJob.seriesId, scope === 'future' ? editingJob.dateKey : null, patch);
          msg = scope === 'future' ? '✓ Diesen + künftige Termine aktualisiert' : '✓ Ganze Serie aktualisiert';
        } else {
          await updatePlanJob(editingJob.dateKey, editingJob.jobId, patch);
        }
      } else {
        setJobOverride(editingJob.dateKey, editingJob.idx, patch);
      }
      closeModal('jobEditor');
      editingJob = null;
      renderPlanung();
      toast(msg);
      if (isCompletion) {
        const updated = { ...oldJob, ...patch, _dateKey: completedDateKey };
        await handleCompletedJob(updated, completedDateKey);
      }
    }

    async function generateInvoiceForCurrentJob() {
      if (!editingJob) return;
      const jobs = getJobsForDate(new Date(editingJob.dateKey));
      const j = jobs[editingJob.idx];
      if (!j) { toast('Einsatz nicht gefunden', 'error'); return; }
      // aktuelle (evtl. ungespeicherte) Zahlart aus dem Editor berücksichtigen
      const pm = document.getElementById('jobEditPaymethod')?.dataset.value || j.paymethod || 'rechnung';
      if (!istAuftragBeendet(j)) { toast(tt('job.documentAfterFinish','Rechnung oder Quittung erst nach Abschluss erstellen.'), 'error'); return; }
      if (pm === 'rechnung') generateInvoiceForJob({ ...j, paymethod: pm }, editingJob.dateKey);
      else {
        const receipt = generateReceiptForJob({ ...j, paymethod: pm }, editingJob.dateKey);
        if (receipt && j._added) await updatePlanJob(editingJob.dateKey, j._jobId || j.id, { receiptCreatedAt: new Date().toISOString() });
      }
    }

    function resetJobEdit() {
      if (!editingJob) return;
      // Selbst angelegter Auftrag → löschen. Pattern-Job → auf Standard zurücksetzen.
      if (editingJob.added) {
        const scope = editingJob.seriesId ? (document.getElementById('jobEditSeriesScope').value || 'this') : 'this';
        if (editingJob.seriesId && scope !== 'this') {
          deleteSeries(editingJob.seriesId, scope === 'future' ? editingJob.dateKey : null);
          toast(scope === 'future' ? 'Serie ab diesem Termin beendet' : 'Ganze Serie gelöscht');
        } else {
          deletePlanJob(editingJob.dateKey, editingJob.jobId);
          toast('Auftrag gelöscht');
        }
        closeModal('jobEditor');
        editingJob = null;
        renderPlanung();
        return;
      }
      const all = loadPlanOverrides();
      if (all[editingJob.dateKey]) {
        delete all[editingJob.dateKey][editingJob.idx];
        if (Object.keys(all[editingJob.dateKey]).length === 0) delete all[editingJob.dateKey];
        savePlanOverrides(all);
      }
      closeModal('jobEditor');
      editingJob = null;
      renderPlanung();
      toast('Auf Standard zurückgesetzt');
    }
