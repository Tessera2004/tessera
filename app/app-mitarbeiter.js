// MosaOS — app-mitarbeiter.js
//
// Mitarbeiter und Teams, Erscheinungsbild, Modals, Meldungen (toast).
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

    // ============ MITARBEITER (Reiniger) ============
    let editingMitId = null;
    // ============ Bild-Helfer (verkleinert Fotos vor dem Speichern) ============
    function ccResizeImage(file, maxSize, quality) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) { reject(new Error('Kein Bild')); return; }
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            let { width, height } = img;
            if (width > height && width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
            else if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality || 0.82));
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // ============ Mitarbeiter-Foto ============
    let mitPhotoData = null;
    function renderMitPhotoPreview() {
      const prev = document.getElementById('mitPhotoPreview');
      const rm = document.getElementById('mitPhotoRemove');
      if (!prev) return;
      if (mitPhotoData) {
        prev.innerHTML = `<img src="${mitPhotoData}" alt="" style="width:100%;height:100%;object-fit:cover;" />`;
        if (rm) rm.style.display = 'inline-flex';
      } else {
        prev.innerHTML = '👤';
        if (rm) rm.style.display = 'none';
      }
    }
    function onMitPhotoSelected(ev) {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      ccResizeImage(file, 256, 0.85).then(data => {
        mitPhotoData = data;
        renderMitPhotoPreview();
      }).catch(() => toast('Bild konnte nicht geladen werden', 'error'));
      ev.target.value = '';
    }
    function clearMitPhoto() {
      mitPhotoData = null;
      renderMitPhotoPreview();
    }

    function renderMitarbeiter() {
      const grid = document.getElementById('mitGrid');
      const sub = document.getElementById('mitSubtitle');
      if (!grid) return;
      const aktiv = EMPLOYEES.filter(e => e.status !== 'abwesend').length;
      const abw = EMPLOYEES.length - aktiv;
      sub.textContent = `${EMPLOYEES.length} ${VT('feldMitarbeiterPlural')} · ${aktiv} ${tt('sub.active','aktiv')} · ${abw} ${tt('sub.absent','abwesend')}`;
      if (EMPLOYEES.length === 0) {
        grid.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-subtle);">${tt('est.noStaffHint','Noch keine Mitarbeiter. Klick oben rechts auf „+ Mitarbeiter hinzufügen".')}</div>`;
        return;
      }
      grid.innerHTML = EMPLOYEES.map(e => {
        const team = PLAN_TEAMS.find(t => t.id === e.teamId);
        const teamColor = team ? team.color : 'var(--border)';
        const teamName = team ? team.name : '— kein Team —';
        const initials = (e.firstName[0] + e.lastName[0]).toUpperCase();
        const isAbw = e.status === 'abwesend';
        const statusBadge = isAbw
          ? '<span class="badge badge-muted">Abwesend</span>'
          : '<span class="badge badge-success"><span class="dot" style="background: var(--success)"></span>Aktiv</span>';
        const driveLine = e.canDrive
          ? '<div class="emp-driver is-driver">Fahrer · Führerschein</div>'
          : '<div class="emp-driver is-passenger">Braucht Mitfahrgelegenheit</div>';
        const avatarInner = e.photo
          ? `<img src="${e.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
          : initials;
        return `<div class="emp-card" onclick="openMitarbeiterModal('${e.id}')" style="cursor: pointer;">
          <div class="emp-head">
            <div class="emp-avatar" style="background: var(--bg-subtle, #F3F4F6); color: var(--text); border: 2px solid ${teamColor}; overflow: hidden;">${avatarInner}</div>
            <div style="min-width: 0; flex: 1;">
              <div class="emp-name">${empName(e)}</div>
              <div class="emp-role">${e.role || VT('rolle')} · ${teamName}</div>
            </div>
            ${statusBadge}
          </div>
          ${driveLine}
          ${hasPerm('edit_users') ? `<button class="btn btn-secondary" style="margin-top:10px; width:100%;"
             onclick="event.stopPropagation(); inviteEmployee('${e.id}')"
             title="${e.email ? 'Zugang zur Feld-App verschicken' : 'Zuerst eine E-Mail hinterlegen'}">
             ${e.email ? tt('team.inviteField', 'Zugang zur App senden')
                       : tt('team.needMail', 'E-Mail fehlt')}
           </button>` : ''}
        </div>`;
      }).join('');
    }
    function openMitarbeiterModal(id) {
      editingMitId = id || null;
      const e = id ? empById(id) : null;
      // Team-Dropdown füllen (kein Team + bestehende + neues Team anlegen)
      const teamSel = document.getElementById('mitTeam');
      teamSel.innerHTML = '<option value="">— kein Team —</option>'
        + PLAN_TEAMS.map(t => `<option value="${t.id}">${t.name}</option>`).join('')
        + '<option value="__new__">➕ Neues Team anlegen…</option>';
      document.getElementById('mitModalTitle').textContent = e ? tt('dyn.userEdit', 'Mitarbeiter bearbeiten') : tt('dyn.userNew', 'Neuer Mitarbeiter');
      document.getElementById('mitFirstname').value = e?.firstName || '';
      document.getElementById('mitLastname').value = e?.lastName || '';
      document.getElementById('mitEmail').value = e?.email || '';
      document.getElementById('mitRole').value = e?.role || VT('rolle');
      document.getElementById('mitTeam').value = e?.teamId || (PLAN_TEAMS[0] ? PLAN_TEAMS[0].id : '');
      document.getElementById('mitStatus').value = e?.status || 'aktiv';
      document.getElementById('mitCanDrive').checked = !!e?.canDrive;
      document.getElementById('mitDeleteBtn').style.display = e ? 'inline-flex' : 'none';
      mitPhotoData = e?.photo || null;
      renderMitPhotoPreview();
      openModal('mitarbeiterEditor');
    }
    function fillMitTeamSelect(selectedId) {
      const sel = document.getElementById('mitTeam');
      if (!sel) return;
      sel.innerHTML = '<option value="">— kein Team —</option>'
        + PLAN_TEAMS.map(t => `<option value="${t.id}">${t.name}</option>`).join('')
        + '<option value="__new__">➕ Neues Team anlegen…</option>';
      if (selectedId != null) sel.value = selectedId;
    }
    function mitTeamChanged() {
      const sel = document.getElementById('mitTeam');
      if (sel.value !== '__new__') return;
      const name = prompt('Name des neuen Teams (z. B. „Team Anna" oder „Auto 1"):');
      if (name && name.trim()) {
        const id = addTeam(name.trim());
        fillMitTeamSelect(id);
      } else {
        sel.value = '';
      }
    }
    // ============ Teams verwalten ============
    let teamManagerFromWizard = false;
    function openTeamManager(focusNew, fromWizard) {
      teamManagerFromWizard = !!fromWizard;
      renderTeamManager();
      openModal('teamManager');
      if (focusNew) setTimeout(() => document.getElementById('newTeamName')?.focus(), 60);
    }
    function renderTeamManager() {
      const wrap = document.getElementById('teamManagerList');
      if (!wrap) return;
      if (PLAN_TEAMS.length === 0) {
        wrap.innerHTML = `<div style="color:var(--text-subtle);font-size:13px;padding:8px 0;">${tt('est.noTeams','Noch keine Teams. Lege unten dein erstes Team an.')}</div>`;
        return;
      }
      wrap.innerHTML = PLAN_TEAMS.map(t => {
        const count = empsByTeam(t.id).length;
        const dots = TEAM_COLORS.map(c =>
          `<button type="button" class="team-color-swatch ${t.color === c ? 'is-selected' : ''}" title="Teamfarbe ${c}" aria-label="Teamfarbe ${c}" aria-pressed="${t.color === c}" onclick="setTeamColor('${t.id}','${c}')" style="--team-color:${c}">${t.color === c ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</button>`
        ).join('');
        return `<div class="team-manager-card" style="--team-color:${t.color}">
          <div class="team-manager-head">
            <span class="team-manager-color" aria-hidden="true"></span>
            <input type="text" value="${escapeHtml(t.name)}" aria-label="Teamname" onchange="renameTeamFromManager('${t.id}', this.value)" />
            <span class="team-manager-count">${count} ${count === 1 ? 'Person' : 'Personen'}</span>
            <button type="button" class="team-manager-delete" onclick="deleteTeamFromManager('${t.id}')" title="Team löschen" aria-label="Team löschen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
          <div class="team-color-picker"><span>Teamfarbe</span><div>${dots}<label class="team-custom-color" title="Eigene Farbe wählen"><input type="color" value="${t.color}" onchange="setTeamColor('${t.id}',this.value)" /><span>Eigene</span></label></div></div>
        </div>`;
      }).join('');
    }
    function addTeamFromManager() {
      const inp = document.getElementById('newTeamName');
      const n = (inp.value || '').trim();
      if (!n) { toast('Bitte Teamname eingeben', 'error'); return; }
      const id = addTeam(n); inp.value = '';
      renderTeamManager(); refreshAfterTeamChange();
      populateWizardTeams(id);
      if (typeof protokolliere === 'function') protokolliere('angelegt', 'teams', n);
      toast('✓ Team angelegt');
    }
    function renameTeamFromManager(id, name) {
      if (name && name.trim()) { renameTeam(id, name.trim()); refreshAfterTeamChange(); if (typeof protokolliere === 'function') protokolliere('geaendert', 'teams', name.trim()); }
    }
    function setTeamColor(id, color) {
      const t = PLAN_TEAMS.find(x => x.id === id);
      renameTeam(id, null, color);
      if (typeof protokolliere === 'function') protokolliere('geaendert', 'teams', `${t?.name || 'Team'} · Farbe`);
      renderTeamManager(); refreshAfterTeamChange();
    }
    function deleteTeamFromManager(id) {
      const t = PLAN_TEAMS.find(x => x.id === id);
      if (!t) return;
      if (!confirm(`Team „${t.name}" löschen? Mitarbeiter bleiben bestehen, verlieren aber die Team-Zuordnung.`)) return;
      deleteTeam(id);
      if (typeof protokolliere === 'function') protokolliere('geloescht', 'teams', t.name);
      renderTeamManager(); refreshAfterTeamChange();
      toast('Team gelöscht');
    }
    function refreshAfterTeamChange() {
      if (typeof renderMitarbeiter === 'function') renderMitarbeiter();
      if (typeof renderPlanung === 'function') renderPlanung();
    }

    function wizardTeamChanged() {
      const sel = document.getElementById('wizardTeamSelect');
      if (!sel || sel.value !== '__new__') return;
      sel.value = '';
      openTeamManager(true, true);
    }

    function saveMitarbeiter() {
      const firstName = document.getElementById('mitFirstname').value.trim();
      const lastName = document.getElementById('mitLastname').value.trim();
      if (!firstName || !lastName) { toast('Vor- und Nachname erforderlich', 'error'); return; }
      const data = {
        firstName,
        lastName,
        email: (document.getElementById('mitEmail').value || '').trim().toLowerCase() || null,
        role: document.getElementById('mitRole').value,
        teamId: document.getElementById('mitTeam').value,
        status: document.getElementById('mitStatus').value,
        canDrive: document.getElementById('mitCanDrive').checked,
        photo: mitPhotoData || null
      };
      const wurdeBearbeitet = !!editingMitId;
      if (editingMitId) {
        const idx = EMPLOYEES.findIndex(e => e.id === editingMitId);
        if (idx >= 0) EMPLOYEES[idx] = { ...EMPLOYEES[idx], ...data };
        toast('✓ Mitarbeiter aktualisiert');
      } else {
        EMPLOYEES.push({ id: 'e' + Date.now(), ...data });
        toast('✓ Mitarbeiter angelegt');
      }
      saveEmployees();
      if (typeof protokolliere === 'function') protokolliere(wurdeBearbeitet ? 'geaendert' : 'angelegt', 'employees', `${firstName} ${lastName}`);
      rebuildTeamMembers();
      closeModal('mitarbeiterEditor');
      editingMitId = null;
      renderMitarbeiter();
      renderPlanung();
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof renderZeiten === 'function') renderZeiten();
    }
    function deleteMitarbeiter() {
      if (!editingMitId) return;
      const e = empById(editingMitId);
      if (!e) return;
      if (!confirm(`„${empName(e)}" wirklich löschen?`)) return;
      EMPLOYEES = EMPLOYEES.filter(x => x.id !== editingMitId);
      saveEmployees();
      window.MosaDB?.remove('employees', editingMitId);
      rebuildTeamMembers();
      closeModal('mitarbeiterEditor');
      editingMitId = null;
      renderMitarbeiter();
      renderPlanung();
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof renderZeiten === 'function') renderZeiten();
      toast('Mitarbeiter gelöscht');
    }
    document.querySelector('.nav-item[data-view="mitarbeiter"]')?.addEventListener('click', () => {
      setTimeout(renderMitarbeiter, 50);
    });
    renderMitarbeiter();

    // Anrufprotokoll
    document.querySelector('.nav-item[data-view="anrufprotokoll"]')?.addEventListener('click', () => {
      setTimeout(renderAnrufprotokoll, 50);
    });
    function updateAnrufBadge() {
      const offen = loadAllCalls().filter(callHasRueckruf).length;
      const badge = document.getElementById('anrufNavBadge');
      if (!badge) return;
      badge.textContent = offen;
      badge.style.display = offen > 0 ? 'inline-flex' : 'none';
    }
    updateAnrufBadge();
    renderAnrufprotokoll();
    // Wrap existing renderKunden to keep badge in sync after Anruf hinzufügen / Status ändern
    const _origRenderKunden = renderKunden;
    renderKunden = function() { _origRenderKunden.apply(this, arguments); updateAnrufBadge(); };

    // Erst-Render falls Planung direkt geöffnet wird
    renderPlanung();
    // Re-Render bei Nav auf "planung"
    document.querySelector('.nav-item[data-view="planung"]')?.addEventListener('click', () => {
      setTimeout(renderPlanung, 50);
    });

    // ============ Skin & Theme ============
    // Skins: 'buero' (neuer Standard, dunkel & ruhig) | 'calm' | 'standard'.
    // 'buero' erzwingt data-theme="dark", damit die Dark-Regeln greifen und
    // die Büro-Tokens sie zu warmem, ruhigem Dunkel verfeinern.
    const savedTheme = localStorage.getItem('cc-theme') || 'light';
    // Einmalige Migration: alte gespeicherte Skins (calm/standard) einmal auf
    // den neuen Büro-Standard heben. Danach zählt wieder die eigene Wahl.
    if (!localStorage.getItem('cc-skin-v2')) {
      localStorage.setItem('cc-skin', 'buero');
      localStorage.setItem('cc-skin-v2', '1');
    }
    const savedSkin  = localStorage.getItem('cc-skin')  || 'buero';

    function applySkin(skin) {
      const root = document.documentElement;
      if (skin === 'buero') {
        root.setAttribute('data-skin', 'buero');
        root.setAttribute('data-theme', 'dark');   // Büro ist immer dunkel
      } else if (skin === 'calm') {
        root.setAttribute('data-skin', 'calm');
        root.setAttribute('data-theme', savedTheme);
      } else {
        root.removeAttribute('data-skin');
        root.setAttribute('data-theme', savedTheme);
      }
    }
    applySkin(savedSkin);

    // Header-Knopf: Standard ⇄ Büro (ruhig & dunkel).
    function toggleSkin() {
      const cur  = localStorage.getItem('cc-skin') || 'buero';
      const next = cur === 'buero' ? 'standard' : 'buero';
      localStorage.setItem('cc-skin', next);
      applySkin(next);
      toast(next === 'buero' ? 'Büro-Ansicht (ruhig & dunkel)' : 'Standard-Ansicht');
    }

    function toggleTheme() {
      // In der Büro-Ansicht ist Dunkel fix — Hell/Dunkel-Umschalter wirkt nur sonst.
      if ((localStorage.getItem('cc-skin') || 'buero') === 'buero') {
        toast('Büro-Ansicht ist immer dunkel');
        return;
      }
      const now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', now);
      localStorage.setItem('cc-theme', now);
      toast(now === 'dark' ? 'Dark Mode aktiviert' : 'Light Mode aktiviert');
    }

    // ============ Modals ============
    let modalAusloeser = null;
    function openModal(id) {
      const backdrop = document.getElementById('modal-' + id);
      if (!backdrop) return;
      modalAusloeser = document.activeElement;
      const dialog = backdrop.querySelector('.modal');
      const title = backdrop.querySelector('.modal-title');
      backdrop.classList.add('open');
      document.body.classList.add('modal-open');
      if (dialog) {
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        if (title) {
          if (!title.id) title.id = 'modal-title-' + id;
          dialog.setAttribute('aria-labelledby', title.id);
        }
      }
      if (id === 'newAuftrag') {
        populateWizardTeams();
        setupWizardForVertical();
        wizKundeZuruecksetzen();
        const wd = document.getElementById('wizDate');
        if (wd && !wd.value) wd.value = isoDate(planCurrentDate);
      }
      requestAnimationFrame(() => {
        const focusTarget = backdrop.querySelector('[autofocus], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
        focusTarget?.focus({ preventScroll: true });
      });
    }

    function populateWizardTeams(selectedId) {
      const sel = document.getElementById('wizardTeamSelect');
      if (!sel) return;
      // Erstes Option (Auto) behalten, Rest neu
      const auto = '<option value="">Auto-Zuweisung (empfohlen)</option>';
      const opts = PLAN_TEAMS.map(t => {
        const drv = t.canDrive ? 'fährt' : 'braucht Fahrer';
        return `<option value="${t.id}">${t.name} (${t.members.length} Pers., ${drv})</option>`;
      }).join('');
      sel.innerHTML = auto + opts + '<option value="__new__">+ Neues Team anlegen…</option>';
      if (selectedId && PLAN_TEAMS.some(t => t.id === selectedId)) sel.value = selectedId;
    }
    function closeModal(id) {
      const backdrop = document.getElementById('modal-' + id);
      if (!backdrop) return;
      backdrop.classList.remove('open');
      if (!document.querySelector('.modal-backdrop.open')) document.body.classList.remove('modal-open');
      if (modalAusloeser && document.contains(modalAusloeser)) modalAusloeser.focus({ preventScroll: true });
    }

    document.addEventListener('keydown', e => {
      const offene = Array.from(document.querySelectorAll('.modal-backdrop.open'));
      if (!offene.length) return;
      const top = offene[offene.length - 1];
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal(top.id.replace(/^modal-/, ''));
      }
      if (e.key === 'Tab') {
        const focusable = Array.from(top.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // ============ Toast notifications ============
    function toast(msg, type = 'success') {
      // i18n: deutscher Quell-String = Key (`toast:<de>`); Deutsch nutzt Fallback, andere Sprachen übersetzen.
      // Konkatenierte/interpolierte Toasts (mit dynamischem Teil) matchen nicht → bleiben vorerst deutsch.
      if (typeof msg === 'string') msg = tt('toast:' + msg, msg);
      const c = document.getElementById('toasts');
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = `
        <div class="toast-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div>${msg}</div>
      `;
      c.appendChild(t);
      setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(20px)';
        t.style.transition = 'all 0.2s';
        setTimeout(() => t.remove(), 200);
      }, 2800);
    }
