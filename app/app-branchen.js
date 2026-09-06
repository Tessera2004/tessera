// MosaOS — app-branchen.js
//
// Branchen-eigene Module: Handwerk (Baustellen, Rapporte),
// Schaedlingsbekaempfung (Koederstellen, Protokolle), Werkstattplan.
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

    // ============ HANDWERK: Baustellen (Board) + Rapporte (Regie) ============
    // ── Baustellen / Projekte ──
    const SITES_KEY = 'cc-sites-v1';
    const SITE_COLUMNS = [
      { key: 'angefragt',     label: 'Angefragt',     color: '#64748b' },
      { key: 'offeriert',     label: 'Offeriert',     color: '#2563eb' },
      { key: 'inarbeit',      label: 'In Arbeit',     color: '#d97706' },
      { key: 'abgeschlossen', label: 'Abgeschlossen', color: '#16a34a' }
    ];
    let editingSiteId = null;
    function loadSites() { try { const v = JSON.parse(localStorage.getItem(SITES_KEY)); if (Array.isArray(v)) return v; } catch {} return []; }
    function saveSites(list) { localStorage.setItem(SITES_KEY, JSON.stringify(list)); window.MosaDB?.push('sites', list); }
    function siteLabel(s) { return s.title || pestCustomerName(s.customerId, s.objektName); }
    function renderBaustellen() {
      const board = document.getElementById('baustellenBoard');
      const subtitle = document.getElementById('baustellenSubtitle');
      if (!board) return;
      const all = loadSites();
      const q = (document.getElementById('baustellenSearch')?.value || '').toLowerCase().trim();
      const match = s => !q || siteLabel(s).toLowerCase().includes(q) ||
        pestCustomerName(s.customerId, s.objektName).toLowerCase().includes(q) || (s.address || '').toLowerCase().includes(q);
      const active = all.filter(s => s.status !== 'abgeschlossen');
      const badge = document.getElementById('baustellenNavBadge');
      if (badge) { badge.textContent = active.length; badge.style.display = active.length ? '' : 'none'; }
      if (subtitle) subtitle.textContent = `${active.length} ${tt('sub.open','offen')} · ${all.length} ${tt('sub.total','gesamt')}`;
      const addBtn = document.getElementById('baustellenAddBtn');
      if (addBtn) addBtn.textContent = (window.MosaVertical && MosaVertical.get() === 'garten') ? '+ ' + tt('site.addBtnGarten', 'Gartenprojekt') : '+ ' + tt('site.addBtn', 'Baustelle');
      board.innerHTML = SITE_COLUMNS.map(col => {
        const cards = all.filter(s => s.status === col.key && match(s));
        const cardHtml = cards.length ? cards.map(s => {
          const next = col.key !== 'abgeschlossen';
          return `<div onclick="openSiteEditor('${s.id}')" style="cursor:pointer; border:1px solid var(--border); border-left:3px solid ${col.color}; border-radius:10px; padding:11px 12px; background:var(--surface); display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <span style="font-weight:600; font-size:13.5px; color:var(--text);">${escapeHtml(siteLabel(s))}</span>
              ${next ? `<button class="btn-icon" title="Weiter" onclick="event.stopPropagation(); moveSite('${s.id}')" style="width:24px;height:24px;flex:none;">→</button>` : ''}
            </div>
            <div style="font-size:12px; color:var(--text-subtle);">${escapeHtml(pestCustomerName(s.customerId, s.objektName))}</div>
            ${s.address ? `<div style="font-size:11.5px; color:var(--text-subtle);">${escapeHtml(s.address)}</div>` : ''}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
              <span style="font-size:11.5px; color:var(--text-subtle);">${escapeHtml(s.monteur || '—')}${s.type ? ' · ' + escapeHtml(s.type) : ''}</span>
              ${s.budget ? `<span style="font-size:12.5px; font-weight:600; color:var(--text);">${chf(s.budget)}</span>` : ''}
            </div>
          </div>`;
        }).join('') : `<div style="font-size:12px; color:var(--text-subtle); padding:8px 4px;">—</div>`;
        return `<div style="display:flex; flex-direction:column; gap:10px; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; padding:0 2px;">
            <span style="width:9px; height:9px; border-radius:50%; background:${col.color};"></span>
            <span style="font-weight:600; font-size:13px; color:var(--text);">${col.label}</span>
            <span style="font-size:12px; color:var(--text-subtle);">${cards.length}</span>
          </div>${cardHtml}
        </div>`;
      }).join('');
    }
    function moveSite(id) {
      const list = loadSites();
      const s = list.find(x => x.id === id);
      if (!s) return;
      const order = SITE_COLUMNS.map(c => c.key);
      s.status = order[Math.min(order.indexOf(s.status) + 1, order.length - 1)];
      saveSites(list);
      renderBaustellen();
      toast(s.status === 'abgeschlossen' ? '✓ Baustelle abgeschlossen' : 'Baustelle verschoben');
    }
    function siteFillFromCustomer() {
      const id = document.getElementById('siteCustomer').value;
      if (!id || typeof loadCustomers !== 'function') return;
      const c = loadCustomers().find(x => x.id === id);
      if (c && !document.getElementById('siteAddress').value) document.getElementById('siteAddress').value = c.address || '';
    }
    function openSiteEditor(id) {
      editingSiteId = id || null;
      const s = id ? loadSites().find(x => x.id === id) : null;
      document.getElementById('siteCustomer').innerHTML = pestCustomerOptions(s?.customerId || '');
      const wt = window.MosaVertical ? MosaVertical.t('feldMitarbeiter') : 'Monteur';
      document.getElementById('siteMonteurLabel').textContent = 'Verantwortl. ' + wt;
      document.getElementById('siteEditorTitle').textContent = s ? siteLabel(s) : tt('dyn.siteNew', 'Neue Baustelle');
      document.getElementById('siteTitle').value = s?.title || '';
      document.getElementById('siteAddress').value = s?.address || '';
      document.getElementById('siteType').value = s?.type || '';
      document.getElementById('siteMonteur').value = s?.monteur || '';
      document.getElementById('siteStatus').value = s?.status || 'angefragt';
      document.getElementById('siteBudget').value = s?.budget || '';
      document.getElementById('siteNote').value = s?.note || '';
      document.getElementById('siteDeleteBtn').style.display = s ? 'inline-flex' : 'none';
      openModal('siteEditor');
    }
    function saveSite() {
      const customerId = document.getElementById('siteCustomer').value || null;
      const title = document.getElementById('siteTitle').value.trim();
      if (!customerId && !title) { toast('Kunde oder Bezeichnung erforderlich', 'error'); return; }
      const data = {
        customerId, objektName: pestCustomerName(customerId, ''),
        title, address: document.getElementById('siteAddress').value.trim(),
        type: document.getElementById('siteType').value.trim(),
        monteur: document.getElementById('siteMonteur').value.trim(),
        status: document.getElementById('siteStatus').value,
        budget: parseFloat(document.getElementById('siteBudget').value) || 0,
        note: document.getElementById('siteNote').value.trim()
      };
      const list = loadSites();
      if (editingSiteId) {
        const idx = list.findIndex(x => x.id === editingSiteId);
        if (idx >= 0) list[idx] = { ...list[idx], ...data };
        toast('✓ Baustelle aktualisiert');
      } else { list.push({ id: 'st' + Date.now(), created: new Date().toISOString(), ...data }); toast('✓ Baustelle angelegt'); }
      saveSites(list);
      closeModal('siteEditor');
      editingSiteId = null;
      renderBaustellen();
    }
    function deleteSite() {
      if (!editingSiteId) return;
      const s = loadSites().find(x => x.id === editingSiteId);
      if (!s) return;
      if (!confirm(`Baustelle "${siteLabel(s)}" löschen?`)) return;
      saveSites(loadSites().filter(x => x.id !== editingSiteId));
      window.MosaDB?.remove('construction_sites', editingSiteId);
      closeModal('siteEditor');
      editingSiteId = null;
      renderBaustellen();
      toast('Baustelle gelöscht');
    }

    // ── Arbeitsrapporte (Regie: Stunden + Material) — eindeutige Namen (Kollision mit Berichte-Modul vermeiden) ──
    const WORKREPORTS_KEY = 'cc-workreports-v1';
    let editingRapId = null;
    function loadRapporte() { try { const v = JSON.parse(localStorage.getItem(WORKREPORTS_KEY)); if (Array.isArray(v)) return v; } catch {} return []; }
    function saveRapporte(list) { localStorage.setItem(WORKREPORTS_KEY, JSON.stringify(list)); window.MosaDB?.push('workreports', list); }
    function rapportTotal(r) {
      const w = (r.works || []).reduce((s, x) => s + (Number(x.hours) || 0) * (Number(x.rate) || 0), 0);
      const m = (r.material || []).reduce((s, x) => s + (Number(x.qty) || 0) * (Number(x.price) || 0), 0);
      return w + m;
    }
    function renderRapporte() {
      const box = document.getElementById('rapporteList');
      const subtitle = document.getElementById('rapporteSubtitle');
      if (!box) return;
      const list = loadRapporte().slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const q = (document.getElementById('rapporteSearch')?.value || '').toLowerCase().trim();
      const filtered = !q ? list : list.filter(r =>
        (r.siteTitle || '').toLowerCase().includes(q) || (r.objektName || '').toLowerCase().includes(q) ||
        (r.monteur || '').toLowerCase().includes(q));
      const sum = list.reduce((s, r) => s + rapportTotal(r), 0);
      if (subtitle) subtitle.textContent = `${list.length} ${tt('sub.reports','Rapporte')} · ${chf(sum)} ${tt('sub.tmTotal','Regie gesamt')}`;
      const badge = document.getElementById('rapporteNavBadge');
      if (badge) { badge.textContent = list.length; badge.style.display = list.length ? '' : 'none'; }
      if (filtered.length === 0) {
        box.innerHTML = `<div class="card" style="text-align: center; padding: 40px;"><div style="font-size: 14px; color: var(--text-subtle);">${tt('est.noReports','Noch keine Rapporte.')}</div></div>`;
        return;
      }
      box.innerHTML = filtered.map(r => {
        const hrs = (r.works || []).reduce((s, x) => s + (Number(x.hours) || 0), 0);
        return `<div class="card" onclick="openRapEditor('${r.id}')" style="cursor:pointer; padding:14px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
            <div style="min-width:0;">
              <div style="font-weight:600; font-size:14px; color:var(--text);">${escapeHtml(r.siteTitle || r.objektName || 'Rapport')}</div>
              <div style="font-size:12.5px; color:var(--text-subtle); margin-top:2px;">${r.date || '—'} · ${escapeHtml(r.monteur || '—')} · ${hrs} h${(r.material || []).length ? ' · ' + r.material.length + ' Material' : ''}</div>
            </div>
            <div style="text-align:right; flex:none;">
              <div style="font-size:14px; font-weight:700; color:var(--text);">${chf(rapportTotal(r))}</div>
              ${r.signed === true || r.signed === 'true' ? `<span class="kunde-badge" style="margin-top:6px;"><span class="dot" style="background:#16a34a;"></span>unterschrieben</span>` : ''}
            </div>
          </div>
        </div>`;
      }).join('');
    }
    function rapRow(kind, d) {
      d = d || {};
      const div = document.createElement('div');
      div.className = 'rap-row rap-' + kind;
      div.style.cssText = 'display:grid; grid-template-columns: 1fr 78px 84px 30px; gap:8px; align-items:center;';
      if (kind === 'work') {
        div.innerHTML =
          `<input class="rw-title" type="text" placeholder="Arbeit (z. B. Leitung verlegt)" value="${escapeHtml(d.title || '')}" style="${WO_INP}">
           <input class="rw-hours" type="number" step="0.25" min="0" placeholder="Std" value="${d.hours != null ? d.hours : ''}" oninput="rapRecalcTotal()" style="${WO_INP}">
           <input class="rw-rate" type="number" step="1" min="0" placeholder="Satz" value="${d.rate != null ? d.rate : rapDefaultRate()}" oninput="rapRecalcTotal()" style="${WO_INP}">
           <button class="btn-icon" type="button" onclick="this.closest('.rap-row').remove(); rapRecalcTotal();" style="width:28px;height:28px;flex:none;">✕</button>`;
      } else {
        div.innerHTML =
          `<input class="rm-name" type="text" placeholder="Material (z. B. Kupferrohr 15mm)" value="${escapeHtml(d.name || '')}" style="${WO_INP}">
           <input class="rm-qty" type="number" step="1" min="0" placeholder="Menge" value="${d.qty != null ? d.qty : 1}" oninput="rapRecalcTotal()" style="${WO_INP}">
           <input class="rm-price" type="number" step="0.05" min="0" placeholder="Preis" value="${d.price != null ? d.price : ''}" oninput="rapRecalcTotal()" style="${WO_INP}">
           <button class="btn-icon" type="button" onclick="this.closest('.rap-row').remove(); rapRecalcTotal();" style="width:28px;height:28px;flex:none;">✕</button>`;
      }
      return div;
    }
    function addRapWorkRow(d) { document.getElementById('rapWorks').appendChild(rapRow('work', d)); rapRecalcTotal(); }
    function addRapMatRow(d) { document.getElementById('rapMaterial').appendChild(rapRow('mat', d)); rapRecalcTotal(); }
    function collectRapWorks() {
      return [...document.querySelectorAll('#rapWorks .rap-work')].map(r => ({
        title: r.querySelector('.rw-title').value.trim(),
        hours: parseFloat(r.querySelector('.rw-hours').value) || 0,
        rate: parseFloat(r.querySelector('.rw-rate').value) || 0
      })).filter(w => w.title || w.hours);
    }
    function collectRapMaterial() {
      return [...document.querySelectorAll('#rapMaterial .rap-mat')].map(r => ({
        name: r.querySelector('.rm-name').value.trim(),
        qty: parseFloat(r.querySelector('.rm-qty').value) || 0,
        price: parseFloat(r.querySelector('.rm-price').value) || 0
      })).filter(m => m.name || m.price);
    }
    function rapRecalcTotal() {
      const el = document.getElementById('rapTotal');
      if (el) el.textContent = chf(rapportTotal({ works: collectRapWorks(), material: collectRapMaterial() }));
    }
    function populateRapSite(sel) {
      const el = document.getElementById('rapSite');
      if (!el) return;
      const sites = loadSites();
      el.innerHTML = `<option value="">— Baustelle wählen —</option>` +
        sites.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${escapeHtml(siteLabel(s))}</option>`).join('');
    }
    function rapFillFromSite() {
      const id = document.getElementById('rapSite').value;
      const s = loadSites().find(x => x.id === id);
      if (s) document.getElementById('rapCustomer').value = pestCustomerName(s.customerId, s.objektName);
    }
    function openRapEditor(id) {
      editingRapId = id || null;
      const r = id ? loadRapporte().find(x => x.id === id) : null;
      populateRapSite(r?.siteId || '');
      document.getElementById('rapMonteurLabel').textContent = window.MosaVertical ? MosaVertical.t('feldMitarbeiter') : 'Monteur';
      document.getElementById('rapportEditorTitle').textContent = r ? tt('dyn.rapEdit', 'Rapport bearbeiten') : tt('dyn.rapNew', 'Neuer Rapport');
      document.getElementById('rapCustomer').value = r?.objektName || '';
      document.getElementById('rapDate').value = r?.date || new Date().toISOString().slice(0, 10);
      document.getElementById('rapMonteur').value = r?.monteur || '';
      document.getElementById('rapNote').value = r?.note || '';
      document.getElementById('rapSigned').value = (r?.signed === true || r?.signed === 'true') ? 'true' : 'false';
      const works = document.getElementById('rapWorks'); works.innerHTML = '';
      const mat = document.getElementById('rapMaterial'); mat.innerHTML = '';
      (r?.works && r.works.length ? r.works : [{}]).forEach(w => works.appendChild(rapRow('work', w)));
      (r?.material || []).forEach(m => mat.appendChild(rapRow('mat', m)));
      document.getElementById('rapDeleteBtn').style.display = r ? 'inline-flex' : 'none';
      document.getElementById('rapPdfBtn').style.display = r ? 'inline-flex' : 'none';
      rapRecalcTotal();
      openModal('rapportEditor');
    }
    function saveRap() {
      const siteId = document.getElementById('rapSite').value || null;
      const objektName = document.getElementById('rapCustomer').value.trim();
      const date = document.getElementById('rapDate').value;
      if (!siteId && !objektName) { toast('Baustelle oder Kunde erforderlich', 'error'); return; }
      if (!date) { toast('Datum erforderlich', 'error'); return; }
      const s = siteId ? loadSites().find(x => x.id === siteId) : null;
      const data = {
        siteId, siteTitle: s ? siteLabel(s) : objektName,
        customerId: s?.customerId || null, objektName,
        date, monteur: document.getElementById('rapMonteur').value.trim(),
        works: collectRapWorks(), material: collectRapMaterial(),
        note: document.getElementById('rapNote').value.trim(),
        signed: document.getElementById('rapSigned').value === 'true'
      };
      const list = loadRapporte();
      if (editingRapId) {
        const idx = list.findIndex(x => x.id === editingRapId);
        if (idx >= 0) list[idx] = { ...list[idx], ...data };
        toast('✓ Rapport aktualisiert');
      } else { list.push({ id: 'wr' + Date.now(), created: new Date().toISOString(), ...data }); toast('✓ Rapport erfasst'); }
      saveRapporte(list);
      closeModal('rapportEditor');
      editingRapId = null;
      renderRapporte();
    }
    function deleteRap() {
      if (!editingRapId) return;
      if (!confirm('Rapport wirklich löschen?')) return;
      saveRapporte(loadRapporte().filter(x => x.id !== editingRapId));
      window.MosaDB?.remove('work_reports', editingRapId);
      closeModal('rapportEditor');
      editingRapId = null;
      renderRapporte();
      toast('Rapport gelöscht');
    }

    // ============ SCHÄDLINGSBEKÄMPFUNG: Köderstellen + Protokolle ============
    function pestCustomerName(id, fallback) {
      if (typeof loadCustomers === 'function' && id) {
        const c = loadCustomers().find(x => x.id === id);
        if (c) return customerDisplayName(c);
      }
      return fallback || '—';
    }
    function pestCustomerOptions(selectedId) {
      const cs = (typeof loadCustomers === 'function') ? loadCustomers() : [];
      return `<option value="">— Objekt / Kunde wählen —</option>` +
        cs.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${escapeHtml(customerDisplayName(c))}${c.address ? ' — ' + escapeHtml(c.address) : ''}</option>`).join('');
    }
    function pestDaysUntil(dateStr) {
      if (!dateStr) return null;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return Math.round((new Date(dateStr + 'T00:00:00') - today) / 86400000);
    }

    // ── Köderstellen (Monitoring) ──
    const BAIT_KEY = 'cc-baitstations-v1';
    const BAIT_STATUS = {
      ok:          { label: 'In Ordnung',       color: '#16a34a' },
      angenommen:  { label: 'Köder angenommen', color: '#d97706' },
      befall:      { label: 'Befall',           color: '#dc2626' },
      leer:        { label: 'Leer / nachfüllen',color: '#64748b' },
      beschaedigt: { label: 'Beschädigt',       color: '#dc2626' }
    };
    let editingBaitId = null;
    let koederFilter = 'alle';
    function loadBaits() { try { const v = JSON.parse(localStorage.getItem(BAIT_KEY)); if (Array.isArray(v)) return v; } catch {} return []; }
    function saveBaits(list) { localStorage.setItem(BAIT_KEY, JSON.stringify(list)); window.MosaDB?.push('baits', list); }
    function baitNextDue(b) {
      if (!b.lastCheck) return null;
      const iv = parseInt(b.interval) || 60;
      const d = new Date(b.lastCheck + 'T00:00:00'); d.setDate(d.getDate() + iv);
      return d.toISOString().slice(0, 10);
    }
    function baitIsDue(b) { const due = baitNextDue(b); if (!due) return false; const n = pestDaysUntil(due); return n != null && n <= 0; }
    function setKoederFilter(f) {
      koederFilter = f;
      document.querySelectorAll('#koederFilter [data-f]').forEach(btn => btn.classList.toggle('is-active', btn.getAttribute('data-f') === f));
      renderKoederstellen();
    }
    function renderKoederstellen() {
      const grid = document.getElementById('koederGrid');
      const subtitle = document.getElementById('koederSubtitle');
      if (!grid) return;
      const list = loadBaits();
      const q = (document.getElementById('koederSearch')?.value || '').toLowerCase().trim();
      let filtered = list.filter(b => {
        const name = pestCustomerName(b.customerId, b.objektName).toLowerCase();
        return !q || name.includes(q) || (b.number || '').toLowerCase().includes(q) ||
          (b.location || '').toLowerCase().includes(q) || (b.agent || '').toLowerCase().includes(q);
      });
      if (koederFilter === 'befall') filtered = filtered.filter(b => b.status === 'befall' || b.status === 'angenommen');
      else if (koederFilter === 'faellig') filtered = filtered.filter(baitIsDue);
      const befallN = list.filter(b => b.status === 'befall').length;
      const faelligN = list.filter(baitIsDue).length;
      if (subtitle) subtitle.textContent = `${list.length} ${tt('sub.stations','Stationen')} · ${befallN} ${tt('sub.infest','Befall')} · ${faelligN} ${tt('sub.checkDue','Kontrolle fällig')}`;
      const badge = document.getElementById('koederNavBadge');
      if (badge) { const warn = befallN + faelligN; badge.textContent = warn; badge.style.display = warn ? '' : 'none'; }
      if (filtered.length === 0) {
        grid.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align: center; padding: 40px;"><div style="font-size: 14px; color: var(--text-subtle);">${tt('est.noBaitStations','Keine Köderstellen.')}</div></div>`;
        return;
      }
      grid.innerHTML = filtered.map(b => {
        const s = BAIT_STATUS[b.status] || BAIT_STATUS.ok;
        const due = baitNextDue(b);
        const dueN = due ? pestDaysUntil(due) : null;
        const dueTxt = due ? (dueN <= 0 ? `Kontrolle überfällig` : `Kontrolle in ${dueN} T.`) : 'Noch nicht kontrolliert';
        const dueColor = (dueN != null && dueN <= 0) ? 'var(--danger)' : 'var(--text-subtle)';
        return `<div class="kunde-card" onclick="openBaitEditor('${b.id}')" style="border-left:3px solid ${s.color};">
          <div class="kunde-avatar" style="background:${s.color}22; color:${s.color};">${escapeHtml(b.number || '#')}</div>
          <div style="flex: 1; min-width: 0;">
            <div class="kunde-name">${escapeHtml(pestCustomerName(b.customerId, b.objektName))}</div>
            <div class="kunde-sub">${escapeHtml(b.type || '—')}${b.location ? ' · ' + escapeHtml(b.location) : ''}</div>
            <div class="kunde-meta" style="color:${dueColor};">${dueTxt}${b.agent ? ' · ' + escapeHtml(b.agent) : ''}</div>
          </div>
          <span class="kunde-badge"><span class="dot" style="background:${s.color};"></span>${escapeHtml(s.label)}</span>
        </div>`;
      }).join('');
    }
    function populateBaitCustomer(sel) { const el = document.getElementById('baitCustomer'); if (el) el.innerHTML = pestCustomerOptions(sel); }
    function baitFillFromCustomer() { /* Objektname wird beim Speichern aus der Auswahl übernommen */ }
    function openBaitEditor(id) {
      editingBaitId = id || null;
      const b = id ? loadBaits().find(x => x.id === id) : null;
      populateBaitCustomer(b?.customerId || '');
      document.getElementById('baitEditorTitle').textContent = b ? `${tt('dyn.baitStation', 'Köderstelle')} ${b.number || ''}`.trim() : tt('dyn.baitNew', 'Neue Köderstelle');
      document.getElementById('baitNumber').value = b?.number || '';
      document.getElementById('baitLocation').value = b?.location || '';
      document.getElementById('baitType').value = b?.type || 'Köderbox';
      document.getElementById('baitAgent').value = b?.agent || '';
      document.getElementById('baitStatus').value = b?.status || 'ok';
      document.getElementById('baitLastCheck').value = b?.lastCheck || '';
      document.getElementById('baitInterval').value = b?.interval || 60;
      document.getElementById('baitNote').value = b?.note || '';
      document.getElementById('baitDeleteBtn').style.display = b ? 'inline-flex' : 'none';
      openModal('baitEditor');
    }
    function saveBait() {
      const customerId = document.getElementById('baitCustomer').value || null;
      const number = document.getElementById('baitNumber').value.trim();
      if (!customerId && !number) { toast('Objekt oder Nummer erforderlich', 'error'); return; }
      const data = {
        customerId, objektName: pestCustomerName(customerId, ''),
        number,
        location: document.getElementById('baitLocation').value.trim(),
        type: document.getElementById('baitType').value,
        agent: document.getElementById('baitAgent').value.trim(),
        status: document.getElementById('baitStatus').value,
        lastCheck: document.getElementById('baitLastCheck').value,
        interval: parseInt(document.getElementById('baitInterval').value) || 60,
        note: document.getElementById('baitNote').value.trim()
      };
      const list = loadBaits();
      if (editingBaitId) {
        const idx = list.findIndex(x => x.id === editingBaitId);
        if (idx >= 0) list[idx] = { ...list[idx], ...data };
        toast('✓ Köderstelle aktualisiert');
      } else { list.push({ id: 'b' + Date.now(), ...data }); toast('✓ Köderstelle angelegt'); }
      saveBaits(list);
      closeModal('baitEditor');
      editingBaitId = null;
      renderKoederstellen();
    }
    function deleteBait() {
      if (!editingBaitId) return;
      const b = loadBaits().find(x => x.id === editingBaitId);
      if (!b) return;
      if (!confirm(`Köderstelle ${b.number || ''} löschen?`)) return;
      saveBaits(loadBaits().filter(x => x.id !== editingBaitId));
      window.MosaDB?.remove('bait_stations', editingBaitId);
      closeModal('baitEditor');
      editingBaitId = null;
      renderKoederstellen();
      toast('Köderstelle gelöscht');
    }

    // ── Behandlungs-/Kontrollprotokolle (HACCP-Nachweis) ──
    const PEST_KEY = 'cc-pestprotocols-v1';
    let editingPestId = null;
    function loadPestProtocols() { try { const v = JSON.parse(localStorage.getItem(PEST_KEY)); if (Array.isArray(v)) return v; } catch {} return []; }
    function savePestProtocols(list) { localStorage.setItem(PEST_KEY, JSON.stringify(list)); window.MosaDB?.push('pestprotocols', list); }
    function renderPestProtocols() {
      const box = document.getElementById('protokolleList');
      const subtitle = document.getElementById('protokolleSubtitle');
      if (!box) return;
      const list = loadPestProtocols().slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const q = (document.getElementById('protokolleSearch')?.value || '').toLowerCase().trim();
      const filtered = !q ? list : list.filter(p =>
        pestCustomerName(p.customerId, p.objektName).toLowerCase().includes(q) ||
        (p.pestType || '').toLowerCase().includes(q) || (p.technician || '').toLowerCase().includes(q) ||
        (p.agent || '').toLowerCase().includes(q));
      const openRecheck = list.filter(p => { const n = pestDaysUntil(p.recheck); return n != null && n >= 0 && n <= 14; }).length;
      if (subtitle) subtitle.textContent = `${list.length} ${tt('sub.protocols','Protokolle')}${openRecheck ? ` · ${openRecheck} ${tt('sub.recheckSoon','Nachkontrolle bald')}` : ''}`;
      const badge = document.getElementById('protokolleNavBadge');
      if (badge) { badge.textContent = list.length; badge.style.display = list.length ? '' : 'none'; }
      if (filtered.length === 0) {
        box.innerHTML = `<div class="card" style="text-align: center; padding: 40px;"><div style="font-size: 14px; color: var(--text-subtle);">${tt('est.noProtocols','Noch keine Protokolle.')}</div></div>`;
        return;
      }
      box.innerHTML = filtered.map(p => {
        const befall = p.pestType && p.pestType !== 'Kein Befall';
        const recheckN = pestDaysUntil(p.recheck);
        const recheckTxt = p.recheck ? (recheckN < 0 ? `Nachkontrolle überfällig` : `Nachkontrolle ${p.recheck}`) : '';
        const recheckColor = (recheckN != null && recheckN < 0) ? 'var(--danger)' : 'var(--text-subtle)';
        return `<div class="card" onclick="openPestProtocolEditor('${p.id}')" style="cursor:pointer; padding:14px 16px; border-left:3px solid ${befall ? '#dc2626' : '#16a34a'};">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
            <div style="min-width:0;">
              <div style="font-weight:600; font-size:14px; color:var(--text);">${escapeHtml(pestCustomerName(p.customerId, p.objektName))}</div>
              <div style="font-size:12.5px; color:var(--text-subtle); margin-top:2px;">${p.date || '—'} · ${escapeHtml(p.technician || '—')} · ${escapeHtml(p.pestType || '—')}</div>
              ${p.measure || p.agent ? `<div style="font-size:12.5px; color:var(--text); margin-top:4px;">${escapeHtml(p.measure || '')}${p.agent ? ' — ' + escapeHtml(p.agent) + (p.amount ? ' (' + escapeHtml(p.amount) + ')' : '') : ''}</div>` : ''}
              ${p.findings ? `<div style="font-size:12px; color:var(--text-subtle); margin-top:3px;">Befund: ${escapeHtml(p.findings)}</div>` : ''}
            </div>
            <div style="text-align:right; flex:none;">
              ${p.signed === true || p.signed === 'true' ? `<span class="kunde-badge"><span class="dot" style="background:#16a34a;"></span>unterschrieben</span>` : ''}
              ${recheckTxt ? `<div style="font-size:11.5px; color:${recheckColor}; margin-top:6px;">${recheckTxt}</div>` : ''}
            </div>
          </div>
        </div>`;
      }).join('');
    }
    function populatePestCustomer(sel) { const el = document.getElementById('pestCustomer'); if (el) el.innerHTML = pestCustomerOptions(sel); }
    function pestFillFromCustomer() { /* Objektname beim Speichern übernommen */ }
    function openPestProtocolEditor(id) {
      editingPestId = id || null;
      const p = id ? loadPestProtocols().find(x => x.id === id) : null;
      populatePestCustomer(p?.customerId || '');
      document.getElementById('pestProtoTitle').textContent = p ? 'Protokoll bearbeiten' : 'Neues Protokoll';
      document.getElementById('pestDate').value = p?.date || new Date().toISOString().slice(0, 10);
      document.getElementById('pestTechnician').value = p?.technician || '';
      document.getElementById('pestType').value = p?.pestType || '';
      document.getElementById('pestMeasure').value = p?.measure || '';
      document.getElementById('pestAgent').value = p?.agent || '';
      document.getElementById('pestAmount').value = p?.amount || '';
      document.getElementById('pestFindings').value = p?.findings || '';
      document.getElementById('pestRecheck').value = p?.recheck || '';
      document.getElementById('pestSigned').value = (p?.signed === true || p?.signed === 'true') ? 'true' : 'false';
      document.getElementById('pestNote').value = p?.note || '';
      document.getElementById('pestDeleteBtn').style.display = p ? 'inline-flex' : 'none';
      document.getElementById('pestPdfBtn').style.display = p ? 'inline-flex' : 'none';
      openModal('pestProtocolEditor');
    }
    function savePestProtocol() {
      const customerId = document.getElementById('pestCustomer').value || null;
      const date = document.getElementById('pestDate').value;
      if (!customerId) { toast('Objekt / Kunde wählen', 'error'); return; }
      if (!date) { toast('Datum erforderlich', 'error'); return; }
      const data = {
        customerId, objektName: pestCustomerName(customerId, ''),
        date,
        technician: document.getElementById('pestTechnician').value.trim(),
        pestType: document.getElementById('pestType').value,
        measure: document.getElementById('pestMeasure').value.trim(),
        agent: document.getElementById('pestAgent').value.trim(),
        amount: document.getElementById('pestAmount').value.trim(),
        findings: document.getElementById('pestFindings').value.trim(),
        recheck: document.getElementById('pestRecheck').value,
        signed: document.getElementById('pestSigned').value === 'true',
        note: document.getElementById('pestNote').value.trim()
      };
      const list = loadPestProtocols();
      if (editingPestId) {
        const idx = list.findIndex(x => x.id === editingPestId);
        if (idx >= 0) list[idx] = { ...list[idx], ...data };
        toast('✓ Protokoll aktualisiert');
      } else { list.push({ id: 'pp' + Date.now(), created: new Date().toISOString(), ...data }); toast('✓ Protokoll erfasst'); }
      savePestProtocols(list);
      closeModal('pestProtocolEditor');
      editingPestId = null;
      renderPestProtocols();
    }
    function deletePestProtocol() {
      if (!editingPestId) return;
      if (!confirm('Protokoll wirklich löschen?')) return;
      savePestProtocols(loadPestProtocols().filter(x => x.id !== editingPestId));
      window.MosaDB?.remove('pest_protocols', editingPestId);
      closeModal('pestProtocolEditor');
      editingPestId = null;
      renderPestProtocols();
      toast('Protokoll gelöscht');
    }

    // ============ WERKSTATTPLAN (Kernablauf Auto-Werkstatt: Auftragsboard) ============
    const WORKORDERS_KEY = 'cc-workorders-v1';
    const WO_COLUMNS = [
      { key: 'angenommen',  label: 'Angenommen',       color: '#64748b' },
      { key: 'inarbeit',    label: 'In Arbeit',        color: '#d97706' },
      { key: 'wartetteile', label: 'Wartet auf Teile', color: '#dc2626' },
      { key: 'abholbereit', label: 'Abholbereit',      color: '#16a34a' }
    ];
    const WO_INP = 'padding:9px 10px; border:1px solid var(--border-strong); border-radius:8px; background:var(--surface); color:var(--text); font-size:13px; font-family:inherit; width:100%;';
    let editingWorkOrderId = null;

    function loadWorkOrders() {
      try { const v = JSON.parse(localStorage.getItem(WORKORDERS_KEY)); if (Array.isArray(v)) return v; } catch {}
      return [];
    }
    function saveWorkOrders(list) {
      localStorage.setItem(WORKORDERS_KEY, JSON.stringify(list));
      window.MosaDB?.push('workorders', list);
    }
