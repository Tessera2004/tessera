// MosaOS — app-routen.js
//
// Routenoptimierung, Auftrag speichern, Berichte, Dashboard,
// Zeiterfassung, Nachkalkulation, Abo-Vertraege.
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

    // ============ Routenoptimierung pro Team ============
    const GEO_KEY = 'cc-geocache-v1';
    function loadGeoCache() { try { return JSON.parse(localStorage.getItem(GEO_KEY)) || {}; } catch { return {}; } }
    function saveGeoCache(c) { localStorage.setItem(GEO_KEY, JSON.stringify(c)); }
    async function geocodeAddress(address) {
      if (!address || !address.trim()) return null;
      const cache = loadGeoCache();
      const key = address.trim().toLowerCase();
      if (cache[key] !== undefined) return cache[key]; // kann auch null sein (nicht gefunden)
      try {
        const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ch&q=' + encodeURIComponent(address);
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        const coord = (data && data[0]) ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
        cache[key] = coord; saveGeoCache(cache);
        return coord;
      } catch (e) { return null; }
    }
    function haversineKm(a, b) {
      if (!a || !b) return 0;
      const R = 6371, toRad = x => x * Math.PI / 180;
      const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    }
    // In-Memory-Cache für OSRM-Fahrzeiten (wird in runAutoPlan vorgebefüllt)
    const _travelCache = {};
    function _travelKey(a, b) { return `${a.lat.toFixed(4)},${a.lon.toFixed(4)};${b.lat.toFixed(4)},${b.lon.toFixed(4)}`; }
    function travelMinutes(a, b) {
      if (!a || !b) return 8;
      const k = _travelKey(a, b);
      if (_travelCache[k] !== undefined) return _travelCache[k];
      return Math.round(haversineKm(a, b) / 60 * 60) + 3; // Fallback: 60 km/h Durchschnitt
    }
    // OSRM Table API: echte Auto-Fahrzeiten für alle Koordinaten-Paare auf einmal
    async function prefetchTravelTimes(coords) {
      const valid = coords.filter(Boolean);
      if (valid.length < 2) return;
      try {
        const wps = valid.map(c => `${c.lon},${c.lat}`).join(';');
        const res = await fetch(`https://router.project-osrm.org/table/v1/driving/${wps}?annotations=duration`);
        const data = await res.json();
        if (data.code === 'Ok' && data.durations) {
          for (let i = 0; i < valid.length; i++)
            for (let j = 0; j < valid.length; j++)
              if (i !== j) _travelCache[_travelKey(valid[i], valid[j])] = Math.round(data.durations[i][j] / 60) + 3;
        }
      } catch { /* Netz-Fehler → Fallback in travelMinutes() */ }
    }
    function permute(arr) {
      if (arr.length <= 1) return [arr];
      const res = [];
      for (let i = 0; i < arr.length; i++) {
        const rest = arr.slice(0, i).concat(arr.slice(i + 1));
        for (const p of permute(rest)) res.push([arr[i]].concat(p));
      }
      return res;
    }
    function greedyNN(jobs) {
      const remaining = jobs.slice().sort((a, b) => (a.deadlineMin ?? 1e9) - (b.deadlineMin ?? 1e9));
      const order = [remaining.shift()];
      while (remaining.length) {
        const last = order[order.length - 1];
        remaining.sort((a, b) => travelMinutes(last.coord, a.coord) - travelMinutes(last.coord, b.coord));
        order.push(remaining.shift());
      }
      return order;
    }
    // C2 — Bisher zaehlte nur der Weg zwischen den Einsaetzen. Die Anfahrt vom
    // Betrieb zum ersten Einsatz fiel unter den Tisch, obwohl sie die
    // Reihenfolge sehr wohl beeinflusst: der naechstgelegene Einsatz gehoert
    // nach vorne. startCoord = Koordinaten des Depots, oder null.
    // Woher die Teams morgens losfahren. Eigene Angabe schlaegt die
    // Firmenadresse; ohne beides wird wie bisher ohne Startpunkt gerechnet.
    function routenStartAdresse() {
      const f = ladeZeitfaktoren();
      if (f.startAdresse) return f.startAdresse;
      const co = loadCompany();
      return [co.addr1, co.addr2].filter(Boolean).join(', ') || null;
    }

    function optimizeTeamOrder(jobs, startCoord) {
      const n = jobs.length;
      if (n <= 1) {
        const hin = (startCoord && jobs[0]) ? travelMinutes(startCoord, jobs[0].coord) : 0;
        return { order: jobs.slice(), travel: hin, lateness: 0 };
      }
      const t0 = Math.min(...jobs.map(j => parseHM(j.start)));
      const evaluate = (order) => {
        let t = t0, travel = 0, lateness = 0;
        for (let i = 0; i < order.length; i++) {
          if (i === 0 && startCoord) {
            const hin = travelMinutes(startCoord, order[0].coord);
            travel += hin;   // Anfahrt zaehlt zum Fahrweg, verschiebt aber
                             // nicht den ersten Start - dort wird losgefahren
          }
          if (i > 0) { const tt = travelMinutes(order[i - 1].coord, order[i].coord); t += tt; travel += tt; }
          const end = t + (order[i].duration || 60);
          if (order[i].deadlineMin != null && end > order[i].deadlineMin) lateness += (end - order[i].deadlineMin);
          t = end;
        }
        return { travel, lateness };
      };
      const candidates = (n <= 7) ? permute(jobs) : [greedyNN(jobs)];
      let best = null, bestScore = Infinity;
      for (const ord of candidates) {
        const { travel, lateness } = evaluate(ord);
        const score = lateness * 100000 + travel; // Übergabe-Termine zuerst, dann Fahrweg minimieren
        if (score < bestScore) { bestScore = score; best = { order: ord, travel, lateness }; }
      }
      return best;
    }

    async function runAutoPlan() {
      const btn = document.getElementById('autoPlanBtn');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Berechne Routen…';
      try {
        const dateKey = isoDate(planCurrentDate);
        const allJobs = getJobsForDate(planCurrentDate).filter(istDefinitiverFeldeinsatz);
        if (allJobs.length === 0) { toast('Keine Einsätze an diesem Tag'); return; }

        // Auto-Zuweisung: Jobs ohne Team auf verfügbare Teams verteilen (Load-Balancing)
        const teamsAvail = PLAN_TEAMS.filter(t => EMPLOYEES.some(e => e.teamId === t.id));
        const unassigned = allJobs.filter(j => !j.team);
        if (teamsAvail.length > 0 && unassigned.length > 0) {
          // Aktuelle Gesamtdauer pro Team (für gleichmässige Verteilung)
          const teamLoad = {};
          teamsAvail.forEach(t => {
            teamLoad[t.id] = allJobs.filter(j => j.team === t.id).reduce((s, j) => s + (j.duration || 60), 0);
          });
          unassigned.forEach(j => {
            const pick = teamsAvail.reduce((a, b) => teamLoad[a.id] <= teamLoad[b.id] ? a : b);
            teamLoad[pick.id] += (j.duration || 60);
            // Zuweisung dauerhaft speichern
            if (j._added) updatePlanJob(dateKey, j._jobId, { team: pick.id });
            else setJobOverride(dateKey, j._idx, { team: pick.id });
            j.team = pick.id; // in-memory für nachfolgende Gruppierung
          });
        }

        // C2 — Startpunkt der Routen: die Adresse aus den Einstellungen
        let startCoord = null;
        const startAdresse = routenStartAdresse();
        if (startAdresse) {
          try { startCoord = await geocodeAddress(startAdresse); } catch {}
        }

        // nach Team gruppieren
        const byTeam = {};
        allJobs.forEach(j => { const k = j.team || '_none'; (byTeam[k] = byTeam[k] || []).push(j); });

        let travelBefore = 0, travelAfter = 0, optimizedTeams = 0, lateWarn = false;
        for (const teamId of Object.keys(byTeam)) {
          const jobs = byTeam[teamId];
          // Adressen geocoden (Nominatim: max 1/s → kleine Pause bei neuen Adressen)
          for (const j of jobs) {
            const cache = loadGeoCache();
            const wasCached = cache[(j.ort || '').trim().toLowerCase()] !== undefined;
            j.coord = await geocodeAddress(j.ort);
            j.deadlineMin = j.deadline ? parseHM(j.deadline) : null;
            if (!wasCached && j.ort) await new Promise(r => setTimeout(r, 1100));
          }
          // Echte Auto-Fahrzeiten per OSRM vorberechnen (driving mode, reale Strecke)
          await prefetchTravelTimes(jobs.map(j => j.coord));

          // Fahrzeit VORHER (aktuelle Reihenfolge nach Startzeit)
          const before = jobs.slice().sort((a, b) => parseHM(a.start) - parseHM(b.start));
          if (startCoord && before[0]) travelBefore += travelMinutes(startCoord, before[0].coord);
          for (let i = 1; i < before.length; i++) travelBefore += travelMinutes(before[i - 1].coord, before[i].coord);

          const opt = optimizeTeamOrder(jobs, startCoord);
          travelAfter += opt.travel;
          if (opt.lateness > 0) lateWarn = true;

          // Neue Startzeiten entlang optimierter Reihenfolge setzen
          let t = Math.min(...jobs.map(j => parseHM(j.start)));
          opt.order.forEach((j, i) => {
            if (i > 0) t += travelMinutes(opt.order[i - 1].coord, j.coord);
            const start = fmtHM(t);
            if (j._added) updatePlanJob(dateKey, j._jobId, { start });
            else setJobOverride(dateKey, j._idx, { start });
            t += (j.duration || 60);
          });
          if (jobs.length >= 2) optimizedTeams++;
        }

        renderPlanung();
        const saved = Math.max(0, Math.round(travelBefore - travelAfter));
        let msg = optimizedTeams > 0
          ? `✓ ${optimizedTeams} Route${optimizedTeams > 1 ? 'n' : ''} optimiert` + (saved > 0 ? ` · ~${saved} min Fahrzeit gespart` : '')
          : '✓ Routen aktualisiert';
        if (lateWarn) msg += ' · Übergabe-Termine knapp';
        toast(msg);
      } catch (e) {
        toast(tt('toastdyn.optFailed','Optimierung fehlgeschlagen') + ': ' + e.message, 'error');
      } finally {
        btn.innerHTML = original; btn.disabled = false;
      }
    }

    // ============ Neuer Auftrag speichern ============
    function saveAuftrag() {
      closeModal('newAuftrag');
      toast(`${tt('toastdyn.new','Neues')} ${VT('objekt')} ${tt('toastdyn.created','angelegt')}`);
    }

    // ============ Klickbare Objekt-Karten ============
    document.querySelectorAll('.objekt-card').forEach(card => {
      card.addEventListener('click', () => {
        const name = card.querySelector('.objekt-name').textContent;
        const addr = card.querySelector('.objekt-addr').textContent;
        const metas = card.querySelectorAll('.objekt-meta span');
        document.getElementById('detailName').textContent = name;
        document.getElementById('detailAddr').textContent = addr;
        document.getElementById('detailFreq').textContent = metas[0]?.textContent.replace('', '') || '—';
        document.getElementById('detailDur').textContent = metas[1]?.textContent.replace('⏱ ', '') || '—';
        document.getElementById('detailEmp').textContent = metas[2]?.textContent.replace('👥 ', '') || '—';
        openModal('objektDetail');
      });
    });

    // ============ Klickbare Mitarbeiter-Karten ============
    document.querySelectorAll('.emp-card').forEach(card => {
      card.addEventListener('click', () => {
        const name = card.querySelector('.emp-name').textContent;
        toast(tt('toastdyn.profileOfPre','Profil von ') + name + tt('toastdyn.profileOfPost',' — Modul kommt im nächsten Schritt'));
      });
    });

    // ============ Berichte / Nachweise (mit Fotos) ============
    const REPORTS_KEY = 'cc-reports-v1';
    function loadReports() {
      try { const v = JSON.parse(localStorage.getItem(REPORTS_KEY)); if (Array.isArray(v)) return v; } catch {}
      return [];
    }
    function saveReports(arr) { localStorage.setItem(REPORTS_KEY, JSON.stringify(arr)); window.MosaDB?.push('reports', arr); }
    const REPORT_STATUS = {
      vollstaendig: { cls: 'badge-success', col: 'var(--success)', label: 'Vollständig' },
      fotofehlt:    { cls: 'badge-warning', col: 'var(--warning)', label: 'Foto fehlt' },
      reklamation:  { cls: 'badge-danger',  col: 'var(--danger)',  label: 'Reklamation' }
    };
    function reportDateLabel(r) {
      if (!r.date) return '';
      try {
        const d = new Date(r.date + 'T00:00:00');
        return d.toLocaleDateString(dateLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch { return r.date; }
    }
    function renderBerichte() {
      const list = document.getElementById('reportList');
      if (!list) return;
      const reports = loadReports().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      if (reports.length === 0) {
        list.innerHTML = `<div class="card" style="text-align: center; padding: 40px; color: var(--text-subtle);">${tt('est.noBerichteHint','Noch keine Berichte. Klick oben rechts auf „Bericht erfassen", um einen Foto-Nachweis anzulegen.')}</div>`;
        return;
      }
      list.innerHTML = reports.map(r => {
        const st = REPORT_STATUS[r.status] || REPORT_STATUS.vollstaendig;
        const photos = r.photos || [];
        const thumbs = photos.slice(0, 4).map((p, i) => {
          const more = (i === 3 && photos.length > 4) ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.55);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;">+${photos.length - 4}</div>` : '';
          const src = safeImageUrl(p);
          return src ? `<div class="report-photo" style="position:relative;overflow:hidden;"><img src="${safeAttr(src)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">${more}</div>` : '';
        }).join('');
        const empty = photos.length === 0 ? '<span style="font-size:12px;color:var(--text-subtle);">keine Fotos</span>' : '';
        const meta = [r.employee, reportDateLabel(r), r.time, r.note].filter(Boolean).join(' · ');
        return `<div class="report-card" onclick="openReportDetail('${r.id}')" style="cursor:pointer;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <strong style="font-size: 14px;">${escapeHtml(r.objekt || ('Ohne ' + VT('objekt')))}</strong>
              <span class="badge ${st.cls}"><span class="dot" style="background: ${st.col}"></span>${st.label}</span>
            </div>
            <div style="font-size: 12.5px; color: var(--text-muted);">${escapeHtml(meta)}</div>
          </div>
          <div class="report-photos">${thumbs}${empty}</div>
        </div>`;
      }).join('');
    }
    document.querySelector('.nav-item[data-view="berichte"]')?.addEventListener('click', () => {
      setTimeout(renderBerichte, 50);
    });
    renderBerichte();

    // ============ Geführter Start (Erste Schritte) ============
    // Zeigt einem neuen/leeren Konto 3 konkrete Schritte. Hakt sich automatisch ab,
    // sobald Daten da sind; ist alles erledigt ODER weggeklickt → Karte verschwindet.
    const FIRST_STEPS_DISMISS_KEY = 'cc-firststeps-dismissed';
    function dismissFirstSteps() {
      try { localStorage.setItem(FIRST_STEPS_DISMISS_KEY, '1'); } catch (e) {}
      const c = document.getElementById('firstSteps'); if (c) c.style.display = 'none';
    }
    function renderFirstSteps() {
      const card = document.getElementById('firstSteps');
      const list = document.getElementById('firstStepsList');
      if (!card || !list) return;
      let dismissed = false;
      try { dismissed = localStorage.getItem(FIRST_STEPS_DISMISS_KEY) === '1'; } catch (e) {}
      const hasEmp = (typeof EMPLOYEES !== 'undefined') && EMPLOYEES.length > 0;
      const hasCust = (typeof loadCustomers === 'function') && loadCustomers().length > 0;
      let hasJob = false;
      try { hasJob = Object.values(loadPlanJobs()).some(a => Array.isArray(a) && a.length); } catch (e) {}
      if (dismissed || (hasEmp && hasCust && hasJob)) { card.style.display = 'none'; return; }
      const empTerm = (typeof VT === 'function') ? VT('feldMitarbeiter') : 'Mitarbeiter';
      const steps = [
        { done: hasEmp, label: tt('fs.stepEmployee', 'Ersten {x} anlegen').replace('{x}', empTerm), action: "navTo('mitarbeiter')" },
        { done: hasCust, label: tt('fs.stepCustomer', 'Ersten Kunden anlegen'), action: "navTo('kunden')" },
        { done: hasJob, label: tt('fs.stepJob', 'Ersten Auftrag planen'), action: "openModal('newAuftrag')" }
      ];
      list.innerHTML = steps.map(s => `
        <div class="first-step ${s.done ? 'is-done' : ''}">
          <span class="first-step-dot">
            ${s.done ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </span>
          <span class="first-step-label">${escapeHtml(s.label)}</span>
          ${s.done
            ? `<span class="first-step-done">${escapeHtml(tt('fs.done', 'Erledigt'))}</span>`
            : `<button class="btn btn-primary first-step-action" onclick="${s.action}">${escapeHtml(tt('fs.do', 'Los'))}</button>`}
        </div>`).join('');
      card.style.display = 'block';
    }

    // ============ Dashboard (Zahlen aus echten Daten) ============
    // Begrüssung: Tageszeit + echter Vorname des eingeloggten Nutzers (nicht hartkodiert),
    // in der aktuellen App-Sprache.
    function renderDashGreeting() {
      const el = document.getElementById('dashGreeting');
      if (!el) return;
      const h = new Date().getHours();
      const key = h < 11 ? 'dash.greet.morning' : (h < 18 ? 'dash.greet.day' : 'dash.greet.evening');
      const fallback = h < 11 ? 'Guten Morgen' : (h < 18 ? 'Guten Tag' : 'Guten Abend');
      let vorname = '';
      try { if (currentUser) vorname = (currentUser.firstname || '').trim(); } catch (e) {}
      el.textContent = tt(key, fallback) + (vorname ? ', ' + vorname : '');
    }

    let dashboardActivityExpanded = false;
    function toggleDashboardActivity() {
      dashboardActivityExpanded = !dashboardActivityExpanded;
      renderDashboard();
    }

    function renderDashboard() {
      renderDashGreeting();
      renderFirstSteps();
      const aktiv = EMPLOYEES.filter(e => e.status !== 'abwesend').length;
      const total = EMPLOYEES.length;
      const kunden = (typeof loadCustomers === 'function') ? loadCustomers().length : 0;
      const reports = loadReports();
      let hasJob = false;
      try { hasJob = Object.values(loadPlanJobs()).some(a => Array.isArray(a) && a.length); } catch (e) {}
      const isNewWorkspace = total === 0 && kunden === 0 && !hasJob;
      const dataArea = document.getElementById('dashDataArea');
      if (dataArea) dataArea.style.display = isNewWorkspace ? 'none' : '';
      const focus = document.getElementById('dashBranchFocus');
      if (focus) {
        const vert = window.MosaVertical?.get?.() || 'reinigung';
        const focusByVertical = {
          reinigung: ['planung', tt('nav.planung', 'Routenplanung')],
          werkstatt: ['werkstattplan', tt('nav.werkstattplan', 'Werkstattplan')],
          schaedling: ['koederstellen', tt('nav.koederstellen', 'Köderstellen')],
          handwerk: ['baustellen', tt('nav.baustellen', 'Baustellen')],
          garten: ['baustellen', tt('nav.baustellen', 'Gartenprojekte')]
        };
        const [view, label] = focusByVertical[vert] || focusByVertical.reinigung;
        focus.style.display = isNewWorkspace ? 'none' : 'flex';
        focus.innerHTML = `<div><div class="dash-branch-kicker">${escapeHtml(tt('dash.focus.kicker', 'HEUTE IM FOKUS'))}</div><div class="dash-branch-title">${escapeHtml(label)}</div><div class="dash-branch-desc">${escapeHtml(tt('dash.focus.desc', 'Direkt zu deinem wichtigsten Arbeitsbereich.'))}</div></div><button class="btn btn-secondary" onclick="navTo('${view}')">${escapeHtml(tt('dash.focus.open', 'Öffnen'))} →</button>`;
      }
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('kpiReiniger', total === 0 ? '0' : (aktiv === total ? String(total) : `${aktiv}/${total}`));
      set('kpiReinigerMeta', total === 0 ? tt('dash.kpiNoneYet','noch keine erfasst') : (total - aktiv > 0 ? `${total - aktiv} ${tt('sub.absent','abwesend')}` : tt('dash.kpiAllActive','alle aktiv')));
      set('kpiKunden', kunden);
      set('kpiBerichte', reports.length);
      const reklamationen = reports.filter(r => r.status === 'reklamation').length;
      set('kpiBerichteMeta', reklamationen > 0 ? `${reklamationen} ${tt('dash.kpiComplaint','Reklamation')}` : tt('dash.kpiPhotoProof','Foto-Nachweise'));
      // Hero passt sich an: leeres System vs. eingerichtet
      const eyebrow = document.getElementById('dashHeroEyebrow');
      const title = document.getElementById('dashHeroTitle');
      const sub = document.getElementById('dashHeroSub');
      if (isNewWorkspace) {
        if (eyebrow) eyebrow.textContent = tt('dash.heroReady','Bereit zum Start');
        if (title) title.textContent = tt('dash.heroWelcomeTitle','Willkommen bei deinem Cockpit.');
        if (sub) sub.textContent = tt('dash.heroOnboard','Lege deine Mitarbeiter, Kunden und den ersten Auftrag an — in wenigen Minuten läuft alles.');
      } else {
        if (eyebrow) eyebrow.textContent = `${aktiv} ${VT('feldMitarbeiterPlural')} ${tt('sub.active','aktiv')}`;
        if (title) title.textContent = tt('dash.heroDayTitle','Dein Tag im Überblick.');
        if (sub) sub.textContent = `${total} ${tt('dash.heroMetaEmployees','Mitarbeiter')} · ${kunden} ${tt('dash.heroMetaCustomers','Kunden')} · ${reports.length} ${tt('dash.heroMetaReports','Berichte erfasst.')}`;
      }
      // Aktivitäts-Feed
      const actEl = document.getElementById('dashActivity');
      if (actEl) {
        // B4 — jede Art bekommt ihr eigenes Symbol, nicht ueberall der Haken
        const S = (d) => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">${d}</svg>`;
        const SYMBOLE = {
          erledigt:  S('<polyline points="20 6 9 17 4 12"/>'),
          vergeben:  S('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),
          abnahme:   S('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
          auftrag:   S('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
          anruf:     S('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'),
          offerte:   S('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>')
        };
        const FARBEN = {
          erledigt: 'var(--success)', vergeben: 'var(--accent)', abnahme: 'var(--success)',
          auftrag: 'var(--brand-primary)', anruf: 'var(--warning, #D97706)', offerte: 'var(--text-muted)'
        };
        const ART_LABEL = {
          erledigt: 'Erledigt', vergeben: 'Aufgabe', abnahme: 'Abnahme',
          auftrag: 'Auftrag', anruf: 'Anruf', offerte: 'Offerte'
        };
        const merke = (art, ts, text, meta) => events.push({
          ts, text, meta: meta || '', icon: SYMBOLE[art], col: FARBEN[art], label: ART_LABEL[art] || art
        });

        const events = [];
        reports.forEach(r => {
          if (r.isProtocol) merke('abnahme', r.date + (r.time ? 'T' + r.time : ''),
            `${tt('act.handover','Abnahme')}: ${r.objekt || tt('act.job','Einsatz')}`,
            r.signed ? tt('act.signed','Unterschrift erhalten') : (r.note || ''));
        });
        TASKS.forEach(t => {
          if (t.done && t.completedAt) {
            merke('erledigt', t.completedAt, t.title, taskAssigneeLabel(t.assignee));
          } else if (t.assignee && (t.created || t.createdAt)) {
            merke('vergeben', t.created || t.createdAt,
              `${tt('act.assigned','Aufgabe vergeben')}: ${t.title}`, taskAssigneeLabel(t.assignee));
          }
        });
        // Angelegte Auftraege und protokollierte Anrufe gehoeren auch in den Verlauf
        try {
          allePlanJobs().forEach(t => {
            if (t.createdAt) merke('auftrag', t.createdAt,
              `${tt('act.newJob','Auftrag angelegt')}: ${t.objekt || t.ort || ''}`, t.date || '');
          });
          loadCustomers().forEach(c => (c.calls || []).forEach(a => {
            if (a.ts) merke('anruf', a.ts,
              `${tt('act.call','Anruf')}: ${customerDisplayName(c)}`, a.text || a.verlangteNach || '');
          }));
          JSON.parse(localStorage.getItem('cc-offerts') || '[]').forEach(o => {
            const ts = o.updated || (o.datum ? o.datum + 'T12:00:00' : '');
            if (ts) merke('offerte', ts, `Offerte für ${o.kunde || 'Kunde'}`,
              `${serviceTitle(o.service)}${o.preis ? ' · ' + Number(o.preis).toFixed(2) + ' ' + coLocale(loadCompany()).cur : ''}`);
          });
        } catch {}
        events.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
        const top = events.slice(0, dashboardActivityExpanded ? 30 : 6);
        actEl.innerHTML = top.length
          ? top.map(ev => `<div class="activity-item"><div class="act-icon" style="background:${ev.col}1a;color:${ev.col}" aria-hidden="true">${ev.icon}</div><div class="act-body"><div class="act-kind" style="color:${ev.col}">${escapeHtml(ev.label)}</div><div class="act-text">${escapeHtml(ev.text)}</div>${ev.meta ? `<div class="act-meta">${escapeHtml(ev.meta)}</div>` : ''}</div><time class="act-time">${formatActivityTime(ev.ts)}</time></div>`).join('')
          : `<div style="text-align:center;padding:24px;color:var(--text-subtle);font-size:13px;">${tt('dash.noActivity','Noch keine Aktivität.')}</div>`;
        const more = document.getElementById('dashActivityMore');
        if (more) {
          more.style.display = events.length > 6 ? '' : 'none';
          more.textContent = dashboardActivityExpanded ? 'Weniger anzeigen' : `Alle Aktivitäten anzeigen (${Math.min(events.length, 30)})`;
        }
      }
    }

    function formatActivityTime(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
      const today = new Date();
      const sameDay = date.toDateString() === today.toDateString();
      return sameDay
        ? date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
        : date.toLocaleDateString([], { day:'2-digit', month:'2-digit' });
    }
    document.querySelector('.nav-item[data-view="dashboard"]')?.addEventListener('click', () => {
      setTimeout(renderDashboard, 50);
    });
    renderDashboard();

    // ============ Zeiterfassung (Liste aus Mitarbeitern) ============
    // renderZeiten() und zugehöriger Nav-Listener sind weiter unten definiert (Supabase-Version)

    // ============ Soll-Ist-Nachkalkulation ============
    const IST_KEY = 'cc-ist-hours-v1';
    function loadIstHours() {
      try { return JSON.parse(localStorage.getItem(IST_KEY)) || {}; } catch { return {}; }
    }
    function saveIstHours(o) { localStorage.setItem(IST_KEY, JSON.stringify(o)); }
    // Stabiler Schlüssel pro Job: Datum + Objekt + Startzeit
    function nkJobKey(j) { return (j._dateKey || '') + '|' + (j.objekt || '?') + '|' + (j.start || ''); }
    function nkGetIst(j) { const v = loadIstHours()[nkJobKey(j)]; return (v == null ? null : Number(v)); }
    function nkSetIst(key, val) {
      const o = loadIstHours();
      const h = parseFloat(String(val).replace(',', '.'));
      if (val === '' || isNaN(h) || h < 0) { delete o[key]; } else { o[key] = h; }
      saveIstHours(o);
    }

    function nkMonthDefault() {
      const d = planCurrentDate || new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }
    function fmtH(h) { return (Math.round(h * 10) / 10).toFixed(1) + ' h'; }

    function nkCollectJobs(ym) {
      const [y, m] = ym.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      const out = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        getJobsForDate(new Date(d)).filter(istAuftragBeendet).forEach(j => out.push(j));
      }
      // Nach Datum + Startzeit sortieren
      out.sort((a, b) => (a._dateKey || '').localeCompare(b._dateKey || '') || String(a.start).localeCompare(String(b.start)));
      return out;
    }

    function renderNachkalkulation() {
      const monthInput = document.getElementById('nkMonth');
      const body = document.getElementById('nkBody');
      if (!monthInput || !body) return;
      if (!monthInput.value) monthInput.value = nkMonthDefault();
      const ym = monthInput.value;

      const jobs = nkCollectJobs(ym);
      if (jobs.length === 0) {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:28px; color:var(--text-subtle);">${tt('est.noPlannedJobsMonth','Keine geplanten Einsätze in diesem Monat.')}</td></tr>`;
        document.getElementById('nkSoll').textContent = '0.0 h';
        document.getElementById('nkIst').textContent = '0.0 h';
        document.getElementById('nkDiff').textContent = '0.0 h';
        document.getElementById('nkRate').textContent = '– CHF';
        document.getElementById('nkIstMeta').textContent = tt('nk.istMeta', 'erfasst');
        document.getElementById('nkDiffMeta').textContent = tt('nk.diffMeta', 'Ist − Soll');
        document.getElementById('nkRateMeta').textContent = tt('nk.rateMeta', 'Umsatz ÷ Ist-Stunden');
        return;
      }

      let sumSoll = 0, sumIst = 0, sumPriceWithIst = 0, erfasst = 0, ueber = 0;
      const rows = jobs.map(j => {
        const sollH = (j.duration || 0) / 60;
        const price = Number(j.price || 0);
        const ist = nkGetIst(j);
        const key = nkJobKey(j);
        sumSoll += sollH;

        const dLabel = (() => {
          const parts = (j._dateKey || '').split('-');
          return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' : (j._dateKey || '');
        })();
        const kunde = j._customer ? customerDisplayName(j._customer) : (j.objekt || '—');

        let deltaCell = '<span style="color:var(--text-subtle);">—</span>';
        let rateCell = '<span style="color:var(--text-subtle);">—</span>';
        let statusCell = '<span class="badge badge-neutral" style="background:var(--surface-2); color:var(--text-subtle);">' + tt('sub.open', 'offen') + '</span>';

        if (ist != null) {
          erfasst++;
          sumIst += ist;
          sumPriceWithIst += price;
          const delta = ist - sollH;
          const cls = delta > 0.001 ? 'nk-pos' : (delta < -0.001 ? 'nk-neg' : '');
          const sign = delta > 0 ? '+' : '';
          deltaCell = `<span class="${cls}">${sign}${(Math.round(delta * 10) / 10).toFixed(1)}</span>`;
          const effRate = ist > 0 ? price / ist : 0;
          rateCell = ist > 0 ? effRate.toFixed(0) + '.–' : '—';
          // Status: Toleranz 10 %
          const tol = sollH * 0.1;
          if (delta <= tol) {
            statusCell = '<span class="badge badge-success">' + tt('nk.inBudget', 'Im Budget') + '</span>';
          } else if (delta <= sollH * 0.25) {
            statusCell = '<span class="badge badge-warning">' + tt('nk.tight', 'Knapp') + '</span>';
          } else {
            statusCell = '<span class="badge badge-danger">' + tt('nk.overBudget', 'Über Budget') + '</span>';
            ueber++;
          }
        }

        return `<tr>
          <td>${dLabel}</td>
          <td><strong>${escapeHtml(j.objekt || '—')}</strong>${kunde && kunde !== j.objekt ? `<br/><span style="font-size:12px;color:var(--text-subtle);">${escapeHtml(kunde)}</span>` : ''}</td>
          <td style="text-align:right;">${(Math.round(sollH * 10) / 10).toFixed(1)}</td>
          <td style="text-align:right;"><input class="nk-ist-input${ist != null ? ' filled' : ''}" type="number" min="0" step="0.25" value="${ist != null ? ist : ''}" placeholder="–" data-key="${escapeHtml(key)}" /></td>
          <td style="text-align:right;">${deltaCell}</td>
          <td style="text-align:right;">${price ? price.toFixed(0) + '.–' : '—'}</td>
          <td style="text-align:right;">${rateCell}</td>
          <td>${statusCell}</td>
        </tr>`;
      }).join('');

      body.innerHTML = rows;

      // Eingaben verdrahten
      body.querySelectorAll('.nk-ist-input').forEach(inp => {
        inp.addEventListener('change', () => {
          nkSetIst(inp.dataset.key, inp.value);
          renderNachkalkulation();
        });
      });

      // Summen
      const diff = sumIst - sumSoll;
      document.getElementById('nkSoll').textContent = fmtH(sumSoll);
      document.getElementById('nkIst').textContent = fmtH(sumIst);
      document.getElementById('nkIstMeta').textContent = tt('nk.recordedOf', '{n} von {t} Einsätzen erfasst').replace('{n}', erfasst).replace('{t}', jobs.length);
      const diffEl = document.getElementById('nkDiff');
      diffEl.textContent = (diff > 0 ? '+' : '') + fmtH(diff).replace(' h', '') + ' h';
      diffEl.style.color = diff > 0.05 ? 'var(--danger)' : (diff < -0.05 ? 'var(--success)' : 'var(--text)');
      document.getElementById('nkDiffMeta').textContent = ueber > 0 ? (ueber === 1 ? tt('nk.overBudgetOne', '{n} Einsatz über Budget') : tt('nk.overBudgetMany', '{n} Einsätze über Budget')).replace('{n}', ueber) : tt('nk.diffMeta', 'Ist − Soll');
      const rateEl = document.getElementById('nkRate');
      if (sumIst > 0) {
        rateEl.textContent = (sumPriceWithIst / sumIst).toFixed(0) + '.– CHF';
        document.getElementById('nkRateMeta').textContent = tt('nk.effPerHour', 'effektiv pro Ist-Stunde');
      } else {
        rateEl.textContent = '– CHF';
        document.getElementById('nkRateMeta').textContent = tt('nk.enterIst', 'Ist-Stunden eintragen');
      }
    }

    document.querySelector('.nav-item[data-view="nachkalkulation"]')?.addEventListener('click', () => {
      setTimeout(renderNachkalkulation, 50);
    });

    // ============ Abo-Verträge (Serien-Übersicht) ============
    let _abosGeprueft = false;
    function openAboWizard() {
      openModal('newAuftrag');
      setTimeout(() => {
        const repeat = document.getElementById('wizRepeat');
        if (repeat) {
          repeat.value = 'weekly';
          repeat.dispatchEvent(new Event('change', { bubbles: true }));
        }
        wizKundeZuruecksetzen();
      }, 0);
    }
    function renderAbos() {
      const list = document.getElementById('aboList');
      if (!list) return;
      if (!_abosGeprueft) { _abosGeprueft = true; abosNachfuellen(); }
      const series = getAllSeries();
      const today = isoDate(new Date());
      if (series.length === 0) {
        list.innerHTML = `<div class="card" style="text-align:center; padding:48px 24px; color:var(--text-subtle); border-style:dashed;">
          ${tt('est.noAbosHint','Noch keine Abo-Verträge. Lege einen Auftrag mit Wiederholung an — er erscheint dann hier.')}</div>`;
        return;
      }
      // aktive (mit künftigen Terminen) zuerst
      series.sort((a, b) => {
        const an = a.dates.filter(d => d >= today)[0] || '9999';
        const bn = b.dates.filter(d => d >= today)[0] || '9999';
        return an.localeCompare(bn);
      });
      list.innerHTML = series.map(s => {
        const future = s.dates.filter(d => d >= today);
        const next = future[0] || null;
        const teamName = s.team ? ((PLAN_TEAMS.find(t => t.id === s.team) || {}).name || '—') : 'noch nicht zugewiesen';
        const customerName = s.customer || (s.customerId ? customerDisplayName(loadCustomers().find(c => c.id === s.customerId) || {}) : '') || 'Kein Kunde verknüpft';
        const intervalLbl = REPEAT_LABELS_DE[s.recurring] ? repeatLabel(s.recurring).replace(/^./, c => c.toUpperCase()) : tt('date.series','Serie');
        const nextLbl = next
          ? new Date(next + 'T00:00:00').toLocaleDateString(dateLocale(), { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) + ' · ' + (s.start || '')
          : '<span style="color:var(--text-subtle);">keine künftigen Termine</span>';
        const status = future.length > 0
          ? `<span class="badge badge-success">aktiv</span>`
          : `<span class="badge badge-muted">Keine weiteren Termine geplant</span>`;
        return `<div class="card" style="padding:16px 20px; display:grid; grid-template-columns:1fr auto; gap:14px; align-items:center;">
          <div style="min-width:0;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
              <span style="font-weight:600; font-size:14.5px;">${escapeHtml(s.objekt || '—')}</span>
              ${status}
            </div>
            <div style="font-size:12.5px; color:var(--text-subtle);">
              ${escapeHtml(customerName)} · ${intervalLbl} · ${future.length} künftige / ${s.dates.length} total · Team: ${escapeHtml(teamName)}
              ${s.price ? '· ' + Number(s.price).toFixed(0) + '.– CHF/Termin' : ''}
            </div>
            <div style="font-size:12.5px; color:var(--text-muted); margin-top:3px;">Nächster: ${nextLbl}</div>
          </div>
          <div style="display:flex; gap:8px;">
            ${next ? `<button class="btn btn-ghost btn-sm" onclick="aboGoToNext('${s.seriesId}')">Im Planer öffnen</button>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="aboVerlaengernKlick('${s.seriesId}')">${tt('abo.extend', 'Verlängern')}</button>
            ${future.length > 0 ? `<button class="btn btn-secondary btn-sm" onclick="aboEndSeries('${s.seriesId}')">Serie beenden</button>` : ''}
          </div>
        </div>`;
      }).join('');
    }

    function aboGoToNext(seriesId) {
      const s = getAllSeries().find(x => x.seriesId === seriesId);
      if (!s) return;
      const today = isoDate(new Date());
      const next = s.dates.filter(d => d >= today)[0] || s.dates[s.dates.length - 1];
      planSetDate(next);
      navTo('planung');
    }
    // C6 — Ein Abo legt beim Anlegen eine feste Zahl Termine an und laeuft
    // dann aus. Niemand traegt nach, das Abo steht eines Tages auf "beendet",
    // obwohl der Vertrag weiterlaeuft. Darum: verlaengern.
    const ABO_HORIZONT_TAGE = 56;   // acht Wochen im Voraus

    function aboVerlaengern(seriesId, anzahl = 8, still = false, bisDatum = null) {
      if (!hasPerm('edit_auftrag')) return 0;
      const alle = loadPlanJobs();
      let vorlage = null, letztesDatum = null;
      Object.keys(alle).sort().forEach(dk => {
        (alle[dk] || []).forEach(j => {
          if (j.seriesId === seriesId) { vorlage = j; letztesDatum = dk; }
        });
      });
      if (!vorlage || !['weekly', 'biweekly', 'monthly'].includes(vorlage.recurring)) return 0;

      const basis = new Date(letztesDatum + 'T00:00:00');
      let angelegt = 0;
      for (let i = 1; i <= anzahl; i++) {
        const dk = isoDate(nextRepeatDate(basis, vorlage.recurring, i));
        if (bisDatum && dk > bisDatum) break;
        if ((alle[dk] || []).some(j => j.seriesId === seriesId)) continue;   // schon da
        (alle[dk] ||= []).push({
          ...vorlage,
          id: 'j' + Date.now() + '-v' + i,
          date: dk,
          status: 'definitiv',
          completedAt: null,
          invoiceNumber: null,
          invoiceStatus: null,
          invoiceCreatedAt: null,
          invoiceSentAt: null,
          invoiceSendError: null,
          receiptCreatedAt: null,
          createdAt: new Date().toISOString().slice(0, 16)
        });
        angelegt++;
      }
      if (angelegt) {
        savePlanJobsAll(alle);
        if (!still) protokolliere('angelegt', 'plan_jobs',
          `${vorlage.objekt || ''} · ${angelegt}× ${tt('abo.extended', 'verlängert')}`);
      }
      return angelegt;
    }

    function aboVerlaengernKlick(seriesId) {
      if (!requirePerm('edit_auftrag', 'Abo verlängern')) return;
      const n = aboVerlaengern(seriesId, 8);
      renderAbos();
      toast(n ? `✓ ${n} ${tt('abo.newDates', 'neue Termine angelegt')}`
              : tt('abo.nothingToDo', 'Es sind schon Termine vorhanden.'));
    }

    // Beim Oeffnen der Abo-Seite alles nachfuellen, was den Horizont
    // unterschreitet — so steht ein laufender Vertrag nie ploetzlich leer da.
    function abosNachfuellen() {
      if (!hasPerm('edit_auftrag')) return 0;
      const heute = new Date();
      const horizont = new Date(heute);
      horizont.setDate(horizont.getDate() + ABO_HORIZONT_TAGE);
      const grenze = isoDate(horizont);
      let gesamt = 0;
      getAllSeries().forEach(s => {
        const kuenftig = s.dates.filter(d => d >= isoDate(heute));
        if (!kuenftig.length) return;                       // beendet: in Ruhe lassen
        if (kuenftig[kuenftig.length - 1] >= grenze) return; // reicht weit genug
        gesamt += aboVerlaengern(s.seriesId, 8, true, grenze);
      });
      return gesamt;
    }

    function aboEndSeries(seriesId) {
      if (!requirePerm('edit_auftrag', 'Abo beenden')) return;
      const s = getAllSeries().find(x => x.seriesId === seriesId);
      if (!s) return;
      const today = isoDate(new Date());
      const future = s.dates.filter(d => d >= today).length;
      if (!confirm(`Abo „${s.objekt}" beenden?\n${future} künftige Termine werden aus dem Planer entfernt. Vergangene Termine bleiben für die Abrechnung erhalten.`)) return;
      deleteSeries(seriesId, today);
      renderAbos();
      toast(`✓ ${tt('toastdyn.subPre','Abo')} „${s.objekt}" ${tt('toastdyn.subEnded','beendet')} — ${future} ${tt('toastdyn.datesRemoved','Termine entfernt')}`);
    }

    document.querySelector('.nav-item[data-view="abos"]')?.addEventListener('click', () => {
      setTimeout(renderAbos, 50);
    });
