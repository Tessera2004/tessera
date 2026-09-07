// MosaOS — app-fahrzeuge.js
//
// Auto-Werkstatt: Reifenhotel und Fahrzeugakte.
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

    // ============ REIFENHOTEL (Reifeneinlagerung, Auto-Werkstatt) ============
    const TIRES_KEY = 'cc-tires-v1';
    const TIRE_SEASONS = { winter: { label: 'Winter', color: '#2563eb' }, sommer: { label: 'Sommer', color: '#d97706' }, ganzjahres: { label: 'Ganzjahres', color: '#64748b' } };
    let editingTireId = null;
    function loadTires() {
      try { const v = JSON.parse(localStorage.getItem(TIRES_KEY)); if (Array.isArray(v)) return v; } catch {}
      return [];
    }
    function saveTires(list) {
      localStorage.setItem(TIRES_KEY, JSON.stringify(list));
      window.MosaDB?.push('tires', list);
    }
    function renderReifen() {
      const grid = document.getElementById('reifenGrid');
      const subtitle = document.getElementById('reifenSubtitle');
      if (!grid) return;
      const list = loadTires();
      const q = (document.getElementById('reifenSearch')?.value || '').toLowerCase().trim();
      const filtered = !q ? list : list.filter(t =>
        (t.owner || '').toLowerCase().includes(q) || (t.plate || '').toLowerCase().includes(q) ||
        (t.location || '').toLowerCase().includes(q) || (t.dim || '').toLowerCase().includes(q));
      if (subtitle) subtitle.textContent = `${list.length} ${list.length === 1 ? tt('sub.setSg','Satz') : tt('sub.setPl','Sätze')} ${tt('sub.stored','eingelagert')}`;
      const badge = document.getElementById('reifenNavBadge');
      if (badge) { badge.textContent = list.length; badge.style.display = list.length ? '' : 'none'; }
      if (filtered.length === 0) {
        grid.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align: center; padding: 40px;">
          <div style="font-size: 14px; color: var(--text-subtle);">${tt('est.noTires','Noch keine Reifen eingelagert.')}</div>
        </div>`;
        return;
      }
      grid.innerHTML = filtered.map(t => {
        const s = TIRE_SEASONS[t.season] || TIRE_SEASONS.ganzjahres;
        return `<div class="kunde-card" onclick="openTireEditor('${t.id}')" style="border-left:3px solid ${s.color};">
          <div class="kunde-avatar" style="background:${s.color}22; color:${s.color};">${(t.qty || 4)}×</div>
          <div style="flex: 1; min-width: 0;">
            <div class="kunde-name">${escapeHtml(t.owner || t.plate || 'Einlagerung')}</div>
            <div class="kunde-sub">${escapeHtml(s.label)} · ${escapeHtml(t.dim || '—')} · ${escapeHtml(t.rim || '')}</div>
            <div class="kunde-meta">${escapeHtml(t.plate || '—')}${t.location ? ' · 📍 ' + escapeHtml(t.location) : ''}</div>
          </div>
          ${t.location ? `<span class="kunde-badge"><span class="dot" style="background:${s.color};"></span>${escapeHtml(t.location)}</span>` : ''}
        </div>`;
      }).join('');
    }
    function populateTireVehicleSelect() {
      const sel = document.getElementById('tireVehicleSelect');
      if (!sel) return;
      const vs = (typeof loadVehicles === 'function') ? loadVehicles() : [];
      sel.innerHTML = `<option value="">— Fahrzeug wählen oder unten neu —</option>` +
        vs.map(v => `<option value="${v.id}">${escapeHtml(vehicleLabel(v))}${v.owner ? ' — ' + escapeHtml(v.owner) : ''}</option>`).join('');
    }
    function tireFillFromVehicle() {
      const id = document.getElementById('tireVehicleSelect').value;
      if (!id) return;
      const v = loadVehicles().find(x => x.id === id);
      if (!v) return;
      document.getElementById('tirePlate').value = v.plate || '';
      document.getElementById('tireOwner').value = v.owner || '';
    }
    function openTireEditor(id) {
      editingTireId = id || null;
      const t = id ? loadTires().find(x => x.id === id) : null;
      populateTireVehicleSelect();
      document.getElementById('tireEditorTitle').textContent = t ? tt('dyn.tireEdit', 'Einlagerung bearbeiten') : tt('dyn.tireNew', 'Neue Einlagerung');
      document.getElementById('tireVehicleSelect').value = t?.vehicleId || '';
      document.getElementById('tireOwner').value = t?.owner || '';
      document.getElementById('tirePlate').value = t?.plate || '';
      document.getElementById('tireSeason').value = t?.season || 'winter';
      document.getElementById('tireRim').value = t?.rim || 'alu';
      document.getElementById('tireQty').value = t?.qty || 4;
      document.getElementById('tireDim').value = t?.dim || '';
      document.getElementById('tireTread').value = t?.tread || '';
      document.getElementById('tireLocation').value = t?.location || '';
      document.getElementById('tireSince').value = t?.since || '';
      document.getElementById('tireNote').value = t?.note || '';
      document.getElementById('tireDeleteBtn').style.display = t ? 'inline-flex' : 'none';
      document.getElementById('tirePdfBtn').style.display = t ? 'inline-flex' : 'none';
      openModal('tireEditor');
    }
    function saveTire() {
      const owner = document.getElementById('tireOwner').value.trim();
      const plate = document.getElementById('tirePlate').value.trim();
      if (!owner && !plate) { toast('Kunde oder Kennzeichen erforderlich', 'error'); return; }
      const data = {
        vehicleId: document.getElementById('tireVehicleSelect').value || null,
        owner, plate,
        season: document.getElementById('tireSeason').value,
        rim: document.getElementById('tireRim').value,
        qty: parseInt(document.getElementById('tireQty').value) || 4,
        dim: document.getElementById('tireDim').value.trim(),
        tread: document.getElementById('tireTread').value.trim(),
        location: document.getElementById('tireLocation').value.trim(),
        since: document.getElementById('tireSince').value,
        note: document.getElementById('tireNote').value.trim()
      };
      const list = loadTires();
      if (editingTireId) {
        const idx = list.findIndex(x => x.id === editingTireId);
        if (idx >= 0) list[idx] = { ...list[idx], ...data };
        toast('✓ Einlagerung aktualisiert');
      } else {
        list.push({ id: 'tr' + Date.now(), ...data });
        toast('✓ Reifen eingelagert');
      }
      saveTires(list);
      closeModal('tireEditor');
      editingTireId = null;
      renderReifen();
    }
    function deleteTire() {
      if (!editingTireId) return;
      const t = loadTires().find(x => x.id === editingTireId);
      if (!t) return;
      if (!confirm(`Einlagerung "${t.owner || t.plate}" auslagern / löschen?`)) return;
      saveTires(loadTires().filter(x => x.id !== editingTireId));
      window.MosaDB?.remove('tire_storage', editingTireId);
      closeModal('tireEditor');
      editingTireId = null;
      renderReifen();
      toast('Ausgelagert');
    }

    // ============ FAHRZEUGE (branchen-eigenes Modul: Auto-Werkstatt) ============
    const VEHICLES_KEY = 'cc-vehicles-v1';
    let editingVehicleId = null;
    function loadVehicles() {
      try { const v = JSON.parse(localStorage.getItem(VEHICLES_KEY)); if (Array.isArray(v)) return v; } catch {}
      return [];
    }
    function saveVehicles(list) {
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(list));
      window.MosaDB?.push('vehicles', list);   // Backend-Sync wie andere Tabellen (Tabelle: siehe db-sync.js)
    }
    function vehicleLabel(v) {
      return [v.plate, v.model].filter(Boolean).join(' · ') || 'Fahrzeug';
    }
    // MFK-/Service-Fälligkeit: überfällig = rot, in ≤30 Tagen = orange, sonst neutral.
    function serviceBadge(v) {
      if (!v.nextService) return '';
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const due = new Date(v.nextService + 'T00:00:00');
      const days = Math.round((due - today) / 86400000);
      let color = 'var(--text-subtle)', text = 'Service ' + v.nextService;
      if (days < 0) { color = 'var(--danger)'; text = 'MFK/Service überfällig'; }
      else if (days <= 30) { color = 'var(--warning)'; text = `Service in ${days} T.`; }
      return `<span class="kunde-badge"><span class="dot" style="background:${color};"></span>${text}</span>`;
    }
    function renderFahrzeuge() {
      const grid = document.getElementById('fahrzeugeGrid');
      const subtitle = document.getElementById('fahrzeugeSubtitle');
      if (!grid) return;
      const list = loadVehicles();
      const q = (document.getElementById('fahrzeugeSearch')?.value || '').toLowerCase().trim();
      const filtered = !q ? list : list.filter(v =>
        (v.plate || '').toLowerCase().includes(q) ||
        (v.model || '').toLowerCase().includes(q) ||
        (v.owner || '').toLowerCase().includes(q));
      if (subtitle) subtitle.textContent = `${list.length} ${list.length === 1 ? tt('sub.vehicleSg','Fahrzeug') : tt('sub.vehiclePl','Fahrzeuge')} ${tt('sub.inFile','in der Akte')}`;
      const badge = document.getElementById('fahrzeugeNavBadge');
      if (badge) { badge.textContent = list.length; badge.style.display = list.length ? '' : 'none'; }

      if (filtered.length === 0) {
        grid.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align: center; padding: 40px;">
          <div style="font-size: 14px; color: var(--text-subtle);">${tt('est.noVehicles','Noch keine Fahrzeuge erfasst.')}</div>
        </div>`;
        return;
      }
      grid.innerHTML = filtered.map(v => {
        const initials = (v.plate || v.model || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
        const svc = serviceBadge(v);
        return `<div class="kunde-card" onclick="openVehicleEditor('${v.id}')">
          <div class="kunde-avatar">${initials}</div>
          <div style="flex: 1; min-width: 0;">
            <div class="kunde-name">${escapeHtml(vehicleLabel(v))}</div>
            <div class="kunde-sub">${escapeHtml(v.owner || '—')}</div>
            <div class="kunde-meta">${escapeHtml(v.km ? v.km + ' km' : '—')}${v.note ? ' · ' + escapeHtml(v.note) : ''}</div>
          </div>
          ${svc}
        </div>`;
      }).join('');
    }
    function openVehicleEditor(id) {
      editingVehicleId = id || null;
      const v = id ? loadVehicles().find(x => x.id === id) : null;
      document.getElementById('vehEditorTitle').textContent = v ? tt('dyn.vehEdit', 'Fahrzeug bearbeiten') : tt('dyn.vehNew', 'Neues Fahrzeug');
      document.getElementById('vehPlate').value = v?.plate || '';
      document.getElementById('vehKm').value = v?.km || '';
      document.getElementById('vehModel').value = v?.model || '';
      document.getElementById('vehOwner').value = v?.owner || '';
      document.getElementById('vehNextService').value = v?.nextService || '';
      document.getElementById('vehNote').value = v?.note || '';
      document.getElementById('vehDeleteBtn').style.display = v ? 'inline-flex' : 'none';
      renderVehicleHistory(v);
      openModal('vehicleEditor');
    }
    // Service-Historie: alle (auch abgeschlossene) Werkstattaufträge dieses Fahrzeugs.
    function renderVehicleHistory(v) {
      const wrap = document.getElementById('vehHistoryWrap');
      const box = document.getElementById('vehHistory');
      if (!wrap || !box) return;
      if (!v) { wrap.style.display = 'none'; return; }
      const samePlate = (p) => p && v.plate && p.replace(/\s/g, '').toLowerCase() === v.plate.replace(/\s/g, '').toLowerCase();
      const orders = (typeof loadWorkOrders === 'function' ? loadWorkOrders() : []).filter(o =>
        (o.vehicleId && o.vehicleId === v.id) || samePlate(o.plate));
      const tires = (typeof loadTires === 'function' ? loadTires() : []).filter(t =>
        (t.vehicleId && t.vehicleId === v.id) || samePlate(t.plate));
      if (!orders.length && !tires.length) { wrap.style.display = 'none'; return; }
      orders.sort((a, b) => (b.created || '').localeCompare(a.created || ''));
      const statusLabel = { angenommen: 'Angenommen', inarbeit: 'In Arbeit', wartetteile: 'Wartet auf Teile', abholbereit: 'Abholbereit', abgeschlossen: 'Abgeschlossen' };
      wrap.style.display = '';
      const orderHtml = orders.map(o => {
        const date = o.created ? o.created.slice(0, 10) : '—';
        return `<div onclick="closeModal('vehicleEditor'); openWorkOrderEditor('${o.id}');" style="cursor:pointer; border:1px solid var(--border); border-radius:8px; padding:9px 11px; display:flex; justify-content:space-between; align-items:center; gap:10px; background:var(--surface);">
          <div style="min-width:0;">
            <div style="font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(o.complaint || 'Auftrag')}</div>
            <div style="font-size:11.5px; color:var(--text-subtle);">${date} · ${statusLabel[o.status] || o.status || ''}</div>
          </div>
          <span style="font-size:13px; font-weight:600; color:var(--text); white-space:nowrap;">${chf(workOrderTotal(o))}</span>
        </div>`;
      }).join('');
      // Eingelagerte Reifen (Reifenhotel) dieses Fahrzeugs.
      const tireHtml = tires.map(t => {
        const info = [t.season, t.qty ? t.qty + '×' : '', t.dim, t.location ? 'Platz ' + t.location : ''].filter(Boolean).join(' · ');
        return `<div onclick="closeModal('vehicleEditor'); openTireEditor('${t.id}');" style="cursor:pointer; border:1px solid var(--border); border-radius:8px; padding:9px 11px; display:flex; justify-content:space-between; align-items:center; gap:10px; background:var(--surface);">
          <div style="min-width:0;">
            <div style="font-size:13px; color:var(--text);">Reifeneinlagerung</div>
            <div style="font-size:11.5px; color:var(--text-subtle); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(info || '—')}</div>
          </div>
          <span style="font-size:11.5px; color:var(--text-subtle); white-space:nowrap;">${t.since ? 'seit ' + t.since : ''}</span>
        </div>`;
      }).join('');
      box.innerHTML = orderHtml + tireHtml;
    }
    function saveVehicle() {
      const plate = document.getElementById('vehPlate').value.trim();
      const model = document.getElementById('vehModel').value.trim();
      if (!plate && !model) { toast('Kennzeichen oder Modell erforderlich', 'error'); return; }
      const data = {
        plate, model,
        km: document.getElementById('vehKm').value.trim(),
        owner: document.getElementById('vehOwner').value.trim(),
        nextService: document.getElementById('vehNextService').value,
        note: document.getElementById('vehNote').value.trim()
      };
      const list = loadVehicles();
      if (editingVehicleId) {
        const idx = list.findIndex(x => x.id === editingVehicleId);
        if (idx >= 0) list[idx] = { ...list[idx], ...data };
        toast('✓ Fahrzeug aktualisiert');
      } else {
        list.push({ id: 'v' + Date.now(), ...data });
        toast('✓ Fahrzeug angelegt');
      }
      saveVehicles(list);
      closeModal('vehicleEditor');
      editingVehicleId = null;
      renderFahrzeuge();
    }
    function deleteVehicle() {
      if (!editingVehicleId) return;
      const v = loadVehicles().find(x => x.id === editingVehicleId);
      if (!v) return;
      if (!confirm(`Fahrzeug "${vehicleLabel(v)}" wirklich löschen?`)) return;
      saveVehicles(loadVehicles().filter(x => x.id !== editingVehicleId));
      window.MosaDB?.remove('vehicles', editingVehicleId);
      closeModal('vehicleEditor');
      editingVehicleId = null;
      renderFahrzeuge();
      toast('Fahrzeug gelöscht');
    }

    function openCustomerDetail(id) {
      openCustomerId = id;
      const list = loadCustomers();
      const c = list.find(x => x.id === id);
      if (!c) return;
      document.getElementById('custDetailTitle').textContent = customerDisplayName(c);
      document.getElementById('custDetailSubtitle').textContent = c.note || c.address || '';
      document.getElementById('custDetailInfo').innerHTML = `
        <div class="cust-info-row"><span>Adresse</span><strong>${c.address || '—'}</strong></div>
        <div class="cust-info-row"><span>Telefon</span><strong>${c.phone ? `<a href="tel:${c.phone}">${c.phone}</a>` : '—'}</strong></div>
        <div class="cust-info-row"><span>E-Mail</span><strong>${c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : '—'}</strong></div>
        <div class="cust-info-row"><span>Notiz</span><strong>${c.note || '—'}</strong></div>
      `;
      renderCustomerOfferts(c);
      renderCallLog(c);
      openModal('customerDetail');
    }

    function renderCustomerOfferts(c) {
      const wrap = document.getElementById('custOffertLog');
      if (!wrap) return;
      const name = customerDisplayName(c).trim().toLowerCase();
      const offers = JSON.parse(localStorage.getItem('cc-offerts') || '[]')
        .filter(o => o.customerId === c.id || (!o.customerId && ((o.kunde || '').trim().toLowerCase() === name || (c.address && o.adresse === c.address))))
        .sort((a, b) => String(b.updated || b.datum || '').localeCompare(String(a.updated || a.datum || '')));
      wrap.innerHTML = offers.length ? offers.map(o => `<button type="button" class="cust-offert-item" onclick="closeModal('customerDetail');openOffertEditor('${o.id}')">
        <span><strong>${escapeHtml(serviceTitle(o.service))}</strong><small>${escapeHtml(formatDateDE(o.datum))} · ${escapeHtml(o.status || 'Entwurf')}</small></span>
        <b>${Number(o.preis || 0).toFixed(2)} ${coLocale(loadCompany()).cur}</b><span aria-hidden="true">→</span>
      </button>`).join('') : '<div class="cust-offert-empty">Noch keine Offerte für diesen Kunden gespeichert.</div>';
    }

    function openOffertForCurrentCustomer() {
      const customerId = openCustomerId;
      closeModal('customerDetail');
      openOffertEditor();
      if (customerId) offKundeWaehlen(customerId);
    }

    function editCurrentCustomer() {
      if (!openCustomerId) return;
      closeModal('customerDetail');
      openCustomerEditor(openCustomerId);
    }

    function renderCallLog(c) {
      const wrap = document.getElementById('custCallLog');
      const calls = (c.calls || []).slice().sort((a,b) => b.ts.localeCompare(a.ts));
      if (calls.length === 0) {
        wrap.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-subtle); font-size: 13px;">${tt('est.noCallsHint','Noch keine Anrufe notiert. Klick oben auf „+ Anruf vermerken" um den ersten einzutragen.')}</div>`;
        return;
      }
      wrap.innerHTML = calls.map((call, i) => {
        const d = new Date(call.ts);
        const dateStr = d.toLocaleDateString(dateLocale(), { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const isRueckruf = callHasRueckruf(call);
        const statusBadge = isRueckruf
          ? `<button class="call-badge call-badge-btn" onclick="event.stopPropagation(); markCallErledigt(${i})" title="Als erledigt markieren"><span class="dot" style="background: var(--warning);"></span>Rückruf offen — Klick = erledigt</button>`
          : `<span class="call-badge call-badge-ok"><span class="dot" style="background: var(--success);"></span>erledigt</span>`;
        const wer = call.wer || '—';
        const verlangteNach = call.verlangteNach || '—';
        const angenommenVon = call.angenommenVon || '—';
        const text = call.text || call.summary || '';
        const taskBtnLabel = isRueckruf ? '⏰ Rückruf-Aufgabe' : '+ Aufgabe daraus';
        const callArgs = `${JSON.stringify(c.id)}, ${JSON.stringify(call.wer || verlangteNach || '')}, ${JSON.stringify(text)}, ${isRueckruf ? 'true' : 'false'}`;
        return `<div class="call-item ${isRueckruf ? 'is-followup' : ''}">
          <div class="call-head">
            <span class="call-when">${dateStr} · ${timeStr}</span>
            ${statusBadge}
          </div>
          <div class="call-rows">
            <div><span class="call-lbl">Wer hat angerufen:</span> <strong>${wer}</strong></div>
            <div><span class="call-lbl">Verlangte nach:</span> <strong>${verlangteNach}</strong></div>
            <div><span class="call-lbl">Wer hat angenommen:</span> <strong>${angenommenVon}</strong></div>
          </div>
          ${text ? `<div class="call-summary">„${text}"</div>` : ''}
          <div style="margin-top:8px; display:flex; justify-content:flex-end;">
            <button class="btn btn-ghost btn-sm" onclick='createTaskFromCall(${callArgs})'>${taskBtnLabel}</button>
          </div>
        </div>`;
      }).join('');
    }

    function markCallErledigt(idx) {
      if (!openCustomerId) return;
      const list = loadCustomers();
      const c = list.find(x => x.id === openCustomerId);
      if (!c) return;
      const sorted = c.calls.slice().sort((a,b) => b.ts.localeCompare(a.ts));
      const target = sorted[idx];
      if (!target) return;
      const realIdx = c.calls.indexOf(target);
      if (realIdx < 0) return;
      c.calls[realIdx].status = 'erledigt';
      c.calls[realIdx].followup = false; // alt-Feld auch räumen
      saveCustomers(list);
      renderCallLog(c);
      renderKunden();
      toast('✓ Rückruf als erledigt markiert');
    }

    function addCallLog() {
      // Aufruf aus dem Kunden-Detail: Kunde fest vorausgewählt
      openCallModal(openCustomerId || null);
    }
