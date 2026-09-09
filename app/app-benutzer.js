// MosaOS — app-benutzer.js
//
// Benutzer, Rollen und Rechte: wer darf was, Einladungen ins Buero.
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

    // ============ USER / ROLLEN / RECHTE ============
    // Vorgegebene Rollen (nicht löschbar). Eigene Rollen kommen aus cc-roles-v1 dazu.
    const BUILTIN_ROLE_DEFS = {
      admin:       { label: 'Admin',       color: '#7c3aed', perms: ['edit_offerts','delete_offerts','edit_prices','edit_users','edit_objekte','edit_auftrag'], builtin: true },
      disposition: { label: 'Disposition', color: '#0ea5e9', perms: ['edit_offerts','edit_objekte','edit_auftrag'], builtin: true },
      buchhaltung: { label: 'Buchhaltung', color: '#10b981', perms: ['edit_offerts','edit_prices'], builtin: true },
      field:        { label: 'Aussendienst', color: '#14b8a6', perms: [], builtin: true },
      readonly:    { label: 'Read-only',   color: '#f59e0b', perms: [], builtin: true }
    };
    const ALL_PERMISSIONS = [
      { key: 'edit_auftrag',   label: 'Aufträge bearbeiten' },
      { key: 'edit_offerts',   label: 'Offerten schreiben' },
      { key: 'edit_prices',    label: 'Preise ändern' },
      { key: 'edit_objekte',   label: 'Kunden / Objekte bearbeiten' },
      { key: 'edit_users',     label: 'Team & Rollen verwalten' },
      { key: 'delete_offerts', label: 'Löschen' }
    ];
    const ROLES_KEY = 'cc-roles-v1';
    function loadCustomRoles() {
      try { const v = JSON.parse(localStorage.getItem(ROLES_KEY)); if (Array.isArray(v)) return v; } catch {}
      return [];
    }
    function saveCustomRoles(arr) {
      localStorage.setItem(ROLES_KEY, JSON.stringify(arr));
      window.MosaDB?.push('company_roles', arr);
      rebuildRoleDefs();
    }
    let ROLE_DEFS = {};
    function rebuildRoleDefs() {
      ROLE_DEFS = JSON.parse(JSON.stringify(BUILTIN_ROLE_DEFS));
      loadCustomRoles().forEach(r => {
        if (!r.key) return;
        ROLE_DEFS[r.key] = { label: r.label || r.key, color: r.color || '#6b7280', perms: Array.isArray(r.perms) ? r.perms : [], custom: true };
      });
    }
    rebuildRoleDefs();
    const ROLE_DESCRIPTIONS = {
      admin: 'Voller Zugriff — Aufträge, Offerten, Preise, Team verwalten, Löschen.',
      disposition: 'Aufträge anlegen/ändern, Objekte verwalten, Offerten schreiben. Keine Preise, kein Team.',
      buchhaltung: 'Offerten + Preise bearbeiten. Keine Auftragsplanung, kein Team.',
      field: 'Mobile Einsätze sehen und Rapporte erfassen. Keine Büro- oder Finanzänderungen.',
      readonly: 'Nur Ansicht — kann nichts speichern, ändern oder löschen.'
    };
    const ROLE_DESC_KEYS = { admin: 'role.adminDesc', disposition: 'role.dispositionDesc', buchhaltung: 'role.buchhaltungDesc', field: 'role.fieldDesc', readonly: 'role.readonlyDesc' };
    // Übersetztes Rollen-Label (eingebaute Rollen via i18n, eigene Rollen behalten ihren Namen).
    function roleLabel(key) {
      const def = ROLE_DEFS[key];
      if (!def) return key;
      return def.builtin ? tt('role.' + key, def.label) : def.label;
    }
    function permLabel(p) {
      return tt('perm.' + p, ALL_PERMISSIONS.find(x => x.key === p)?.label || p);
    }
    function roleDescription(key) {
      if (ROLE_DESCRIPTIONS[key]) return tt(ROLE_DESC_KEYS[key] || '', ROLE_DESCRIPTIONS[key]);
      const def = ROLE_DEFS[key];
      if (!def) return '';
      if (!def.perms.length) return tt('role.viewOnly', 'Nur Ansicht — kann nichts ändern.');
      return tt('role.mayPrefix', 'Darf: ') + def.perms.map(p => permLabel(p)).join(', ') + '.';
    }

    // --- Rollen-Verwaltung (eigene Rollen anlegen) ---
    const ROLE_COLOR_CHOICES = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#E11D2A', '#EC4899', '#14B8A6', '#6366F1'];
    let editingRoleKey = null;
    let roleEditorColor = ROLE_COLOR_CHOICES[0];

    function renderRolesLegend() {
      const wrap = document.getElementById('rolesLegend');
      if (!wrap) return;
      wrap.innerHTML = Object.entries(ROLE_DEFS).map(([key, def]) => `
        <div class="role-card" data-role-card="${key}">
          <div class="role-card-head"><span class="role-dot" style="background:${def.color};"></span><strong>${escapeHtml(roleLabel(key))}</strong></div>
          <div class="role-card-perms">${escapeHtml(roleDescription(key))}</div>
        </div>`).join('');
    }
    function openRoleManager() {
      if (!requirePerm('edit_users', 'Rollen verwalten')) return;
      renderRoleManager();
      openModal('roleManager');
    }
    function renderRoleManager() {
      const list = document.getElementById('roleManagerList');
      if (!list) return;
      list.innerHTML = Object.entries(ROLE_DEFS).map(([key, def]) => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border:1px solid var(--border); border-radius:10px;">
          <div style="display:flex; align-items:center; gap:10px; min-width:0;">
            <span style="width:12px;height:12px;border-radius:50%;background:${def.color};flex:none;"></span>
            <div style="min-width:0;">
              <div style="font-weight:600;font-size:13.5px;">${escapeHtml(roleLabel(key))} ${def.builtin ? `<span style="font-size:11px;color:var(--text-subtle);font-weight:400;">· ${tt('role.builtin', 'Standard')}</span>` : ''}</div>
              <div style="font-size:12px;color:var(--text-subtle);">${def.perms.length} ${def.perms.length === 1 ? tt('role.right', 'Recht') : tt('role.rights', 'Rechte')}</div>
            </div>
          </div>
          ${def.builtin ? '' : `<button class="btn btn-ghost" style="font-size:12.5px;" onclick="openRoleEditor('${key}')">${tt('common.edit', 'Bearbeiten')}</button>`}
        </div>`).join('');
    }
    function openRoleEditor(key = null) {
      editingRoleKey = key;
      const def = key ? ROLE_DEFS[key] : null;
      document.getElementById('roleEditorTitle').textContent = def ? tt('dyn.roleEdit', 'Rolle bearbeiten') : tt('dyn.roleNew', 'Neue Rolle');
      document.getElementById('roleName').value = def ? def.label : '';
      document.getElementById('roleEditorError').style.display = 'none';
      roleEditorColor = def ? def.color : ROLE_COLOR_CHOICES[0];
      document.getElementById('roleDeleteBtn').style.display = def ? 'inline-flex' : 'none';
      document.getElementById('roleColorChips').innerHTML = ROLE_COLOR_CHOICES.map(c =>
        `<button type="button" class="opt-chip ${c === roleEditorColor ? 'on' : ''}" data-rolecolor="${c}" onclick="selectRoleColor('${c}')" style="padding:6px 10px;"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c};vertical-align:middle;"></span></button>`
      ).join('');
      const perms = def ? def.perms : [];
      document.getElementById('rolePermList').innerHTML = ALL_PERMISSIONS.map(p =>
        `<label style="display:flex;align-items:center;gap:9px;font-size:13.5px;cursor:pointer;">
          <input type="checkbox" data-roleperm="${p.key}" ${perms.includes(p.key) ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent);" /> ${permLabel(p.key)}
        </label>`).join('');
      closeModal('roleManager');
      openModal('roleEditor');
    }
    function selectRoleColor(c) {
      roleEditorColor = c;
      document.querySelectorAll('[data-rolecolor]').forEach(b => b.classList.toggle('on', b.dataset.rolecolor === c));
    }
    function saveRole() {
      const errEl = document.getElementById('roleEditorError');
      const name = document.getElementById('roleName').value.trim();
      errEl.style.display = 'none';
      if (!name) { errEl.textContent = 'Bitte einen Namen eingeben.'; errEl.style.display = 'block'; return; }
      const perms = [...document.querySelectorAll('[data-roleperm]:checked')].map(c => c.dataset.roleperm);
      const custom = loadCustomRoles();
      if (editingRoleKey) {
        const r = custom.find(x => x.key === editingRoleKey);
        if (r) { r.label = name; r.color = roleEditorColor; r.perms = perms; }
      } else {
        custom.push({ key: 'role_' + Date.now(), label: name, color: roleEditorColor, perms });
      }
      saveCustomRoles(custom);
      applyCurrentUserToUI();
      renderTeamGrid();
      renderRolesLegend();
      closeModal('roleEditor');
      toast('✓ Rolle gespeichert');
    }
    function deleteRole() {
      if (!editingRoleKey) return;
      const inUse = loadUsers().filter(u => u.role === editingRoleKey);
      if (inUse.length && !confirm(`${inUse.length} Person(en) haben diese Rolle. Beim Löschen werden sie auf „Read-only" gesetzt. Fortfahren?`)) return;
      saveCustomRoles(loadCustomRoles().filter(x => x.key !== editingRoleKey));
      if (inUse.length) {
        const users = loadUsers();
        users.forEach(u => { if (u.role === editingRoleKey) u.role = 'readonly'; });
        saveUsers(users);
        if (currentUser && currentUser.role === editingRoleKey) currentUser.role = 'readonly';
      }
      applyCurrentUserToUI();
      renderTeamGrid();
      renderRolesLegend();
      closeModal('roleEditor');
      toast('Rolle gelöscht');
    }
    // Feste IDs wie 'u1' waren ein Fehler: office_users.id ist ueber ALLE
    // Betriebe hinweg eindeutig. Legte Betrieb A ein u1 an, konnte Betrieb B
    // nie speichern — der Upsert traf eine fremde Zeile und die
    // Sicherheitsregel lehnte ab ("new row violates row-level security
    // policy"). Sichtbar war davon nichts ausser einer Konsolenmeldung.
    // Jede Anlage bekommt jetzt eine eigene Kennung.
    function neueId(praefix) {
      const zufall = (crypto?.randomUUID) ? crypto.randomUUID().slice(0, 8)
                   : Math.random().toString(36).slice(2, 10);
      return praefix + Date.now().toString(36) + zufall;
    }

    function standardBenutzer() {
      return [
        { id: neueId('u'), firstname: 'Brian',  lastname: 'Knuchel',  email: 'brian@firma.ch',  role: 'admin'       },
        { id: neueId('u'), firstname: 'Sandra', lastname: 'Meier',    email: 'sandra@firma.ch', role: 'disposition' },
        { id: neueId('u'), firstname: 'Markus', lastname: 'Lehmann',  email: 'markus@firma.ch', role: 'buchhaltung' },
        { id: neueId('u'), firstname: 'Lara',   lastname: 'Fischer',  email: 'lara@firma.ch',   role: 'readonly'    }
      ];
    }

    function loadUsers() {
      const raw = localStorage.getItem('cc-users');
      if (!raw) {
        const neu = standardBenutzer();
        localStorage.setItem('cc-users', JSON.stringify(neu));
        return neu.slice();
      }
      try {
        const liste = JSON.parse(raw);
        // Altlast: wer noch u1..u4 hat, bekommt eigene Kennungen. Sonst
        // kollidiert er weiter mit den Zeilen eines anderen Betriebs.
        const alt = liste.filter(u => /^u[1-9]$/.test(u.id));
        if (alt.length) {
          const merker = localStorage.getItem('cc-currentUser');
          alt.forEach(u => {
            const frisch = neueId('u');
            if (merker === u.id) localStorage.setItem('cc-currentUser', frisch);
            u.id = frisch;
          });
          localStorage.setItem('cc-users', JSON.stringify(liste));
          // Die Warteschlange enthaelt noch Eintraege mit den alten IDs. Die
          // koennen nie durchgehen und wuerden bei jedem Laden erneut scheitern.
          try { window.MosaDB?.leeren?.(); } catch {}
        }
        return liste;
      } catch { return standardBenutzer(); }
    }
    function saveUsers(users) { localStorage.setItem('cc-users', JSON.stringify(users)); window.MosaDB?.push('office_users', users); }
    function getUserInitials(u) {
      const a = ((u.firstname || '?').trim()[0]) || '?';
      const b = ((u.lastname || '').trim()[0]) || '';
      return (a + b).toUpperCase();
    }
    function getUserName(u) { return `${u.firstname || ''} ${u.lastname || ''}`.trim(); }
    function getUserColor(u) { return ROLE_DEFS[u.role]?.color || '#6b7280'; }

    let currentUser = null;
    function loadCurrentUser() {
      const users = loadUsers();
      const savedId = localStorage.getItem('cc-currentUser');
      currentUser = users.find(u => u.id === savedId) || users[0];
      applyCurrentUserToUI();
    }
    function setCurrentUser(id) {
      if (window._authLocked) {
        toast('Im angemeldeten Modus ist deine Rolle fest mit deinem Login verknüpft.');
        closeUserMenu();
        return;
      }
      const users = loadUsers();
      const u = users.find(x => x.id === id);
      if (!u) return;
      currentUser = u;
      localStorage.setItem('cc-currentUser', id);
      applyCurrentUserToUI();
      toast(`${tt('common.loggedInAs','Eingeloggt als')} ${getUserName(u)}`);
      closeUserMenu();
    }

    // Verknüpft den Supabase-Login mit einem Büro-Profil/Rolle und sperrt den Umschalter.
    // Ohne Login (lokale Demo) bleibt der Umschalter frei.
    window._authLocked = false;
    function applyAuthProfile() {
      const email = window._authEmail;
      if (!email) { window._authLocked = false; return; }
      window._authLocked = true;
      const users = loadUsers();
      const match = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
      if (match) {
        currentUser = match;
        localStorage.setItem('cc-currentUser', match.id);
      } else {
        // Eingeloggt, aber kein Büro-Profil mit dieser E-Mail → Rolle aus tenant_users
        // (Owner = admin, Eingeladene = ihre Rolle); sonst sichere Read-only-Identität.
        const role = (window._authRole && ROLE_DEFS[window._authRole]) ? window._authRole : 'readonly';
        currentUser = { id: 'auth-user', firstname: email.split('@')[0], lastname: '', email, role };
      }
      applyCurrentUserToUI();
    }
    function applyCurrentUserToUI() {
      if (!currentUser) return;
      const av = document.getElementById('userAvatar');
      av.textContent = getUserInitials(currentUser);
      av.style.background = `linear-gradient(135deg, ${getUserColor(currentUser)}, color-mix(in srgb, ${getUserColor(currentUser)} 70%, black))`;
      document.getElementById('userName').textContent = getUserName(currentUser);
      document.getElementById('userRole').textContent = ROLE_DEFS[currentUser.role]?.label || currentUser.role;
      document.body.classList.toggle('is-readonly', currentUser.role === 'readonly');
      renderUserMenu();
      if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
    }
    function hasPerm(perm) {
      if (!currentUser) return false;
      return ROLE_DEFS[currentUser.role]?.perms.includes(perm) || false;
    }
    function requirePerm(perm, label = 'diese Aktion') {
      if (hasPerm(perm)) return true;
      toast(`✗ ${tt('toastdyn.noPermFor','Keine Berechtigung für')} ${label} (${tt('toastdyn.role','Rolle')}: ${ROLE_DEFS[currentUser.role]?.label})`);
      return false;
    }

    // --- User-Menu (Dropdown in Topbar) ---
    function toggleUserMenu(e) {
      e?.stopPropagation();
      const menu = document.getElementById('userMenu');
      const willOpen = !menu.classList.contains('open');
      menu.classList.toggle('open', willOpen);
      if (willOpen) renderUserMenu();
    }
    function closeUserMenu() {
      document.getElementById('userMenu')?.classList.remove('open');
    }
    document.addEventListener('click', e => {
      const sw = document.getElementById('userSwitcher');
      if (sw && !sw.contains(e.target)) closeUserMenu();
    });

    function renderUserMenu() {
      const list = document.getElementById('userMenuList');
      if (!list) return;
      // Angemeldet: feste Identität, kein Umschalten
      if (window._authLocked && currentUser) {
        const col = getUserColor(currentUser);
        list.innerHTML = `<div class="user-menu-item active" style="cursor:default;">
          <span class="user-avatar" style="background: linear-gradient(135deg, ${col}, color-mix(in srgb, ${col} 70%, black));">${getUserInitials(currentUser)}</span>
          <span style="display:flex; flex-direction:column; line-height:1.2; min-width:0;">
            <span style="font-weight:600; font-size:13px;">${getUserName(currentUser)}</span>
            <span style="font-size:11px; color:var(--text-subtle); overflow:hidden; text-overflow:ellipsis;">${currentUser.email || ''}</span>
          </span>
          <span class="um-role">${ROLE_DEFS[currentUser.role]?.label || currentUser.role}</span>
        </div>`;
        return;
      }
      const users = loadUsers();
      list.innerHTML = users.map(u => {
        const isMe = currentUser && u.id === currentUser.id;
        const col = getUserColor(u);
        return `<button class="user-menu-item ${isMe ? 'active' : ''}" onclick="setCurrentUser('${u.id}')">
          <span class="user-avatar" style="background: linear-gradient(135deg, ${col}, color-mix(in srgb, ${col} 70%, black));">${getUserInitials(u)}</span>
          <span style="display: flex; flex-direction: column; line-height: 1.2;">
            <span style="font-weight: 600; font-size: 13px;">${getUserName(u)}</span>
          </span>
          <span class="um-role">${ROLE_DEFS[u.role]?.label || u.role}</span>
        </button>`;
      }).join('');
    }

    // --- Team-Grid auf Team-View ---
    function renderTeamGrid() {
      const wrap = document.getElementById('teamGrid');
      if (!wrap) return;
      const users = loadUsers();
      const canManage = hasPerm('edit_users');
      document.getElementById('addUserBtn').style.display = canManage ? 'inline-flex' : 'none';
      const invBtn = document.getElementById('inviteBtn');
      if (invBtn) invBtn.style.display = canManage ? 'inline-flex' : 'none';
      const rolesBtn = document.getElementById('manageRolesBtn');
      if (rolesBtn) rolesBtn.style.display = canManage ? 'inline-flex' : 'none';
      renderRolesLegend();
      renderInvites();
      wrap.innerHTML = users.map(u => {
        const isMe = currentUser && u.id === currentUser.id;
        const col = getUserColor(u);
        const def = ROLE_DEFS[u.role];
        const perms = def.perms;
        const lines = [
          ['edit_auftrag',  'Aufträge bearbeiten'],
          ['edit_offerts',  'Offerten schreiben'],
          ['edit_prices',   'Preise ändern'],
          ['edit_users',    'Team verwalten'],
          ['delete_offerts','Löschen']
        ];
        const permsHtml = lines.map(([p, lbl]) => {
          const allowed = perms.includes(p);
          return `<div class="perm-line ${allowed ? 'allowed' : ''}">
            <svg class="perm-icon" viewBox="0 0 24 24" fill="none" stroke="${allowed ? '#10b981' : '#9ca3af'}" stroke-width="2.5">
              ${allowed ? '<polyline points="20 6 9 17 4 12"/>' : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'}
            </svg>
            ${lbl}
          </div>`;
        }).join('');
        const onclick = canManage ? `openUserEditor('${u.id}')` : '';
        return `<div class="team-card" ${onclick ? `onclick="${onclick}"` : 'style="cursor: default;"'}>
          ${isMe ? '<span class="team-current-badge">Du</span>' : ''}
          <div class="team-card-head">
            <div class="team-avatar" style="background: linear-gradient(135deg, ${col}, color-mix(in srgb, ${col} 70%, black));">${getUserInitials(u)}</div>
            <div>
              <div class="team-name">${getUserName(u)}</div>
              <div class="team-email">${u.email || ''}</div>
            </div>
          </div>
          <span class="team-role-badge role-${u.role}">${roleLabel(u.role)}</span>
          <div class="perms-list">${permsHtml}</div>
        </div>`;
      }).join('');
    }

    // --- Mitarbeiter einladen (Supabase invites → Trigger ordnet beim Registrieren zu) ---
    let inviteRole = 'readonly';
    function selectInviteRole(btn, role) {
      document.querySelectorAll('#inviteRoleChips [data-invrole]').forEach(c => c.classList.remove('on'));
      btn.classList.add('on');
      inviteRole = role;
    }
    function renderInviteRoleChips() {
      const wrap = document.getElementById('inviteRoleChips');
      if (!wrap) return;
      wrap.innerHTML = Object.keys(ROLE_DEFS).map(key =>
        `<button type="button" class="opt-chip ${key === inviteRole ? 'on' : ''}" data-invrole="${key}" onclick="selectInviteRole(this,'${key}')">${escapeHtml(roleLabel(key))}</button>`
      ).join('');
    }
    function openInviteModal(vorbelegt) {
      if (!requirePerm('edit_users', 'das Team verwalten')) return;
      ['inviteFirstname', 'inviteLastname', 'inviteEmail'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
      document.getElementById('inviteError').style.display = 'none';
      const result = document.getElementById('inviteResult');
      const resultInput = document.getElementById('inviteCreatedLink');
      const sendBtn = document.getElementById('inviteSendBtn');
      if (result) result.style.display = 'none';
      if (resultInput) resultInput.value = '';
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Einladung erstellen'; }
      inviteRole = 'readonly';
      // Aus der Mitarbeiterliste heraus wird mit Name, Mail und Rolle "field"
      // vorbelegt: Mitarbeitende brauchen einen Zugang fuer die Feld-App,
      // sonst sehen sie ihre Einsaetze auf dem Handy nicht.
      if (vorbelegt) {
        const f = document.getElementById('inviteFirstname');
        const l = document.getElementById('inviteLastname');
        const m = document.getElementById('inviteEmail');
        if (f) f.value = vorbelegt.firstname || '';
        if (l) l.value = vorbelegt.lastname || '';
        if (m) m.value = vorbelegt.email || '';
        if (vorbelegt.role) inviteRole = vorbelegt.role;
      }
      renderInviteRoleChips();
      openModal('inviteUser');
    }

    // Zugang fuer einen Mitarbeitenden aus der Mitarbeiterliste
    function inviteEmployee(id) {
      // Mitarbeitende stehen in EMPLOYEES; empById kennt den Zugriff bereits.
      const e = (typeof empById === 'function') ? empById(id)
              : (typeof EMPLOYEES !== 'undefined' ? EMPLOYEES.find(x => x.id === id) : null);
      if (!e) return;
      const mail = (e.email || '').trim();
      if (!mail) {
        toast('Für diese Person ist keine E-Mail hinterlegt. '
            + 'Trage sie beim Mitarbeitenden ein, dann kannst du den Zugang verschicken.', 'error');
        return;
      }
      // Die Felder heissen firstName/lastName (grosses N), nicht firstname.
      const teile = (e.name || '').trim().split(/\s+/);
      openInviteModal({
        firstname: e.firstName || e.firstname || teile[0] || '',
        lastname:  e.lastName  || e.lastname  || teile.slice(1).join(' ') || '',
        email: mail, role: 'field'
      });
    }
    // Baut den Einladungs-Link (zeigt auf accept-invite.html, gleicher Ordner wie app.html)
    function inviteLink(email, token) {
      const base = location.origin + location.pathname.replace(/[^/]*$/, 'accept-invite.html');
      const co = (typeof loadCompany === 'function' ? (loadCompany().name || '') : '');
      const q = new URLSearchParams({ email });
      if (co) q.set('firma', co);
      if (token) q.set('token', token);
      return base + '?' + q.toString();
    }
    async function copyCreatedInviteLink() {
      const input = document.getElementById('inviteCreatedLink');
      if (!input?.value) return;
      try {
        await navigator.clipboard.writeText(input.value);
        toast('✓ Einladungslink kopiert');
      } catch {
        input.focus();
        input.select();
        toast('Link ist markiert — jetzt kopieren.', 'error');
      }
    }
    async function sendInvite() {
      const errEl = document.getElementById('inviteError');
      const email = (document.getElementById('inviteEmail').value || '').trim().toLowerCase();
      const fn = document.getElementById('inviteFirstname').value.trim();
      const ln = document.getElementById('inviteLastname').value.trim();
      errEl.style.display = 'none';
      if (!email || !/.+@.+\..+/.test(email)) { errEl.textContent = 'Bitte eine gültige E-Mail eingeben.'; errEl.style.display = 'block'; return; }
      const sb = getSupabase();
      if (!sb) { errEl.textContent = 'Keine Verbindung. Bitte zuerst oben rechts anmelden.'; errEl.style.display = 'block'; return; }
      const tid = await loadTenantId();
      if (!tid) { errEl.textContent = 'Du bist nicht angemeldet — Einladen geht nur eingeloggt.'; errEl.style.display = 'block'; return; }
      const btn = document.getElementById('inviteSendBtn');
      let created = false;
      btn.disabled = true; btn.textContent = 'Erstelle …';
      try {
        const token = (await sb.auth.getSession()).data.session?.access_token;
        const response = await fetch((window.SUPA_URL || '') + '/functions/v1/create-invite', {
          method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role: inviteRole, firstname: fn, lastname: ln })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.token) { errEl.textContent = result.error || 'Einladung konnte nicht erstellt werden.'; errEl.style.display = 'block'; }
        else {
          const link = inviteLink(email, result.token);
          const resultBox = document.getElementById('inviteResult');
          const resultInput = document.getElementById('inviteCreatedLink');
          if (resultInput) resultInput.value = link;
          if (resultBox) resultBox.style.display = 'block';
          created = true;
          try {
            await navigator.clipboard.writeText(link);
            toast(tt('toastdyn.inviteCopiedPre','✓ Einladung erstellt — Link kopiert! An ') + email + tt('toastdyn.inviteCopiedPost',' senden.'));
          } catch {
            if (resultInput) { resultInput.focus(); resultInput.select(); }
            toast('✓ Einladung erstellt — Link unten kopieren.');
          }
          renderInvites();
        }
      } catch { errEl.textContent = 'Fehlgeschlagen (Internet?).'; errEl.style.display = 'block'; }
      finally {
        btn.disabled = created;
        btn.textContent = created ? 'Einladung erstellt' : 'Einladung erstellen';
      }
    }
    async function renderInvites() {
      const sec = document.getElementById('invitesSection');
      const list = document.getElementById('invitesList');
      if (!sec || !list) return;
      const sb = getSupabase();
      const tid = sb ? await loadTenantId() : null;
      if (!tid) { sec.style.display = 'none'; return; }
      let rows = [];
      try {
        const { data } = await sb.from('invites').select('*').is('accepted_at', null).order('created_at', { ascending: false });
        rows = data || [];
      } catch { sec.style.display = 'none'; return; }
      if (!rows.length) { sec.style.display = 'none'; return; }
      sec.style.display = 'block';
      list.innerHTML = rows.map(r => {
        const name = [r.firstname, r.lastname].filter(Boolean).join(' ');
        const roleLbl = ROLE_DEFS[r.role]?.label || r.role;
        const when = r.created_at ? formatDateDE(r.created_at.slice(0, 10)) : '';
        return `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border:1px solid var(--border); border-radius:10px; background:var(--surface);">
          <div style="min-width:0;">
            <div style="font-weight:600; font-size:13.5px;">${escapeHtml(r.email)}</div>
            <div style="font-size:12px; color:var(--text-subtle);">${escapeHtml(name)}${name ? ' · ' : ''}${roleLbl} · eingeladen ${when}</div>
          </div>
          <div style="display:flex; gap:6px; flex:0 0 auto;">
            <button class="btn btn-ghost" style="color:var(--danger);" onclick="revokeInvite('${r.id}')">Zurückziehen</button>
          </div>
        </div>`;
      }).join('');
    }
    async function revokeInvite(id) {
      if (!confirm('Einladung zurückziehen?')) return;
      const sb = getSupabase();
      if (!sb) return;
      try { await sb.from('invites').delete().eq('id', id); } catch {}
      toast('Einladung zurückgezogen');
      renderInvites();
    }

    // --- User-Editor-Modal ---
    let editingUserId = null;
    let editingUserRole = 'admin';

    function openUserEditor(id = null) {
      if (!requirePerm('edit_users', 'das Team verwalten')) return;
      editingUserId = id;
      const users = loadUsers();
      if (id) {
        const u = users.find(x => x.id === id);
        if (!u) return;
        document.getElementById('userModalTitle').textContent = tt('dyn.userEdit', 'Mitarbeiter bearbeiten');
        document.getElementById('userFirstname').value = u.firstname || '';
        document.getElementById('userLastname').value = u.lastname || '';
        document.getElementById('userEmail').value = u.email || '';
        editingUserRole = u.role || 'admin';
        // Self-Delete oder letzten Admin nicht löschen
        const adminCount = users.filter(x => x.role === 'admin').length;
        const isLastAdmin = u.role === 'admin' && adminCount <= 1;
        const isSelf = u.id === currentUser?.id;
        document.getElementById('userDeleteBtn').style.display = (isLastAdmin || isSelf) ? 'none' : 'inline-flex';
      } else {
        document.getElementById('userModalTitle').textContent = tt('dyn.userNew', 'Neuer Mitarbeiter');
        document.getElementById('userFirstname').value = '';
        document.getElementById('userLastname').value = '';
        document.getElementById('userEmail').value = '';
        editingUserRole = 'admin';
        document.getElementById('userDeleteBtn').style.display = 'none';
      }
      // Rolle-Chips dynamisch rendern (Builtin + eigene Rollen)
      renderUserRoleChips();
      document.getElementById('userRoleHint').textContent = roleDescription(editingUserRole);
      openModal('userEditor');
    }
    function renderUserRoleChips() {
      const wrap = document.getElementById('userRoleChips');
      if (!wrap) return;
      wrap.innerHTML = Object.keys(ROLE_DEFS).map(key =>
        `<button type="button" class="opt-chip ${key === editingUserRole ? 'on' : ''}" data-role="${key}" onclick="selectUserRole(this,'${key}')">${escapeHtml(roleLabel(key))}</button>`
      ).join('');
    }
    function selectUserRole(el, role) {
      editingUserRole = role;
      document.querySelectorAll('#userRoleChips [data-role]').forEach(c => c.classList.toggle('on', c === el));
      document.getElementById('userRoleHint').textContent = roleDescription(role);
    }
    async function manageAuthenticatedMember(email, action, role) {
      if (!email || !window._authEmail) return true;
      const sb = getSupabase(); const session = sb ? (await sb.auth.getSession()).data.session : null;
      if (!session) return false;
      const response = await fetch((window.SUPA_URL || '') + '/functions/v1/manage-member', {
        method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action, role })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok && result.error !== 'USER_NOT_FOUND') { toast('Rolle konnte serverseitig nicht gespeichert werden: ' + (result.error || response.status)); return false; }
      return true;
    }
    async function saveUser() {
      const fn = document.getElementById('userFirstname').value.trim();
      const ln = document.getElementById('userLastname').value.trim();
      if (!fn || !ln) { toast('Vor- und Nachname angeben'); return; }
      const users = loadUsers();
      if (editingUserId) {
        const idx = users.findIndex(x => x.id === editingUserId);
        if (idx >= 0) {
          users[idx] = { ...users[idx],
            firstname: fn, lastname: ln,
            email: document.getElementById('userEmail').value.trim(),
            role: editingUserRole
          };
          if (currentUser?.id === editingUserId) currentUser = users[idx];
        }
        toast('✓ Mitarbeiter aktualisiert');
      } else {
        users.push({
          id: 'u-' + Date.now(),
          firstname: fn, lastname: ln,
          email: document.getElementById('userEmail').value.trim(),
          role: editingUserRole
        });
        toast('✓ Mitarbeiter hinzugefügt');
      }
      saveUsers(users);
      await manageAuthenticatedMember(document.getElementById('userEmail').value.trim(), 'updateRole', editingUserRole);
      applyCurrentUserToUI();
      renderTeamGrid();
      closeModal('userEditor');
    }
    async function deleteUser() {
      if (!editingUserId) return;
      const users = loadUsers();
      const u = users.find(x => x.id === editingUserId);
      if (!u) return;
      if (u.id === currentUser?.id) { toast('Du kannst dich nicht selbst löschen'); return; }
      const adminCount = users.filter(x => x.role === 'admin').length;
      if (u.role === 'admin' && adminCount <= 1) { toast('Letzter Admin kann nicht gelöscht werden'); return; }
      if (!confirm(`Mitarbeiter "${getUserName(u)}" wirklich löschen?`)) return;
      if (!await manageAuthenticatedMember(u.email, 'remove')) return;
      const next = users.filter(x => x.id !== editingUserId);
      saveUsers(next);
      window.MosaDB?.remove('office_users', editingUserId);
      renderTeamGrid();
      closeModal('userEditor');
      toast('✓ Mitarbeiter gelöscht');
    }

    // Init nach DOM-Setup
    loadCurrentUser();
