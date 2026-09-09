// MosaOS — app-firma-basis.js
//
// Firmen-Stammdaten und Laender-Lokalisierung (Waehrung, Steuer,
// Zahlteil). Frueh geladen, weil chf() und coLocale() ueberall gebraucht
// werden.
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

    // ============ Firma (Stammdaten) — früh definiert, da chf()/Lokalisierung darauf zugreifen ============
    const COMPANY_KEY = 'cc-company-v1';
    const DEFAULT_COMPANY = {
      name: 'Meine Firma',
      addr1: '',
      addr2: '',
      country: 'CH',
      iban: '',
      mwst: '',
      contact: ''
    };
    function loadCompany() {
      try {
        const stored = JSON.parse(localStorage.getItem(COMPANY_KEY)) || {};
        if (stored.name && /tessera/i.test(stored.name)) {
          localStorage.removeItem(COMPANY_KEY);
          return { ...DEFAULT_COMPANY };
        }
        return Object.assign({}, DEFAULT_COMPANY, stored);
      }
      catch { return { ...DEFAULT_COMPANY }; }
    }
    function saveCompany(c) { localStorage.setItem(COMPANY_KEY, JSON.stringify(c)); window.MosaDB?.push('company_profile', c); }

    // ============ Länder-Lokalisierung (Steuer / Währung / Zahlteil / Recht) ============
    // Steuert, dass Offerten, Rechnungen und Belege die Regeln des Firmenlandes nehmen.
    // CH = Swiss-QR-Einzahlschein + MWST 8.1 % + CHF; DE/AT = SEPA-Zahlblock + USt 19/20 % + EUR.
    const LOCALE = {
      CH: { vat: 0.081, cur: 'CHF', vatLabel: 'MWST 8.1%', payment: 'qr',   dateLoc: 'de-CH', vatIdLabel: 'MWST-Nr.',  vatIdEx: 'CHE-123.456.789', geo: 'ch' },
      DE: { vat: 0.19,  cur: 'EUR', vatLabel: 'USt 19%',   payment: 'sepa', dateLoc: 'de-DE', vatIdLabel: 'USt-IdNr.', vatIdEx: 'DE123456789',     geo: 'de' },
      AT: { vat: 0.20,  cur: 'EUR', vatLabel: 'USt 20%',   payment: 'sepa', dateLoc: 'de-AT', vatIdLabel: 'UID-Nr.',   vatIdEx: 'ATU12345678',     geo: 'at' }
    };
    // Vorgeschlagener Hinweis, wenn ein Betrieb nicht steuerpflichtig ist.
    // Frei überschreibbar — die genaue Formulierung ist Sache der
    // Treuhand, nicht der Software.
    const STEUER_HINWEIS = {
      CH: 'Nicht MWST-pflichtig — es wird keine Mehrwertsteuer ausgewiesen.',
      DE: 'Gemäss § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).',
      AT: 'Umsatzsteuerbefreit — Kleinunternehmer gemäss § 6 Abs. 1 Z 27 UStG.'
    };

    // Lokalisierung einer Firma (Fallback CH).
    // Ist der Betrieb nicht steuerpflichtig, wird der Satz hier auf 0
    // gesetzt. Dadurch rechnen ALLE Belege automatisch richtig — die
    // einzelnen PDF-Stellen müssen nur noch die Steuerzeile weglassen.
    function coLocale(c) {
      const land = (((c && c.country) || 'CH') + '').toUpperCase();
      const L = LOCALE[land] || LOCALE.CH;
      const pflichtig = !(c && c.mwstPflichtig === false);
      if (pflichtig) return Object.assign({}, L, { mwstPflichtig: true });
      return Object.assign({}, L, {
        vat: 0,
        mwstPflichtig: false,
        steuerHinweis: (c && c.steuerHinweis) || STEUER_HINWEIS[land] || STEUER_HINWEIS.CH
      });
    }
    function chf(n) { return coLocale(loadCompany()).cur + ' ' + (Number(n) || 0).toFixed(2); }
    function woDefaultRate() {
      try { const p = JSON.parse(localStorage.getItem('cc-prices') || '{}'); if (p.werkstatt_reparatur_price != null) return p.werkstatt_reparatur_price; } catch {}
      return 140;
    }
    // Default-Stundensatz für Rapporte = erster Stunden-Leistungssatz der AKTUELLEN Branche
    // (Handwerk/Garten haben eigene Kataloge — nicht den Werkstatt-Satz borgen).
    function rapDefaultRate() {
      try {
        const vert = MosaVertical.get();
        const svcs = (MosaVertical.preset().services || []);
        const hourly = svcs.find(s => s.unit === 'h') || svcs[0];
        if (hourly) {
          const p = JSON.parse(localStorage.getItem('cc-prices') || '{}');
          const pk = `${vert}_${hourly.key}_price`;
          if (p[pk] != null) return p[pk];
          if (hourly.price != null) return hourly.price;
        }
      } catch {}
      return 95;
    }
    function workOrderTotal(o) {
      const w = (o.works || []).reduce((s, x) => s + (Number(x.hours) || 0) * (Number(x.rate) || 0), 0);
      const p = (o.parts || []).reduce((s, x) => s + (Number(x.qty) || 0) * (Number(x.price) || 0), 0);
      return w + p;
    }
    function workOrderLabel(o) { return [o.plate, o.model].filter(Boolean).join(' · ') || 'Auftrag'; }

    function renderWerkstattplan() {
      const board = document.getElementById('werkstattBoard');
      const subtitle = document.getElementById('werkstattplanSubtitle');
      if (!board) return;
      const all = loadWorkOrders();
      const q = (document.getElementById('werkstattplanSearch')?.value || '').toLowerCase().trim();
      const match = o => !q || workOrderLabel(o).toLowerCase().includes(q) ||
        (o.owner || '').toLowerCase().includes(q) || (o.complaint || '').toLowerCase().includes(q);
      const active = all.filter(o => o.status !== 'abgeschlossen');
      const badge = document.getElementById('werkstattplanNavBadge');
      if (badge) { badge.textContent = active.length; badge.style.display = active.length ? '' : 'none'; }
      if (subtitle) {
        const done = all.length - active.length;
        subtitle.textContent = `${active.length} ${tt('sub.openOrders','offene Aufträge')}${done ? ` · ${done} ${tt('sub.completed','abgeschlossen')}` : ''}`;
      }
      board.innerHTML = WO_COLUMNS.map(col => {
        const cards = all.filter(o => o.status === col.key && match(o));
        const cardHtml = cards.length ? cards.map(o => {
          const total = workOrderTotal(o);
          const next = col.key !== 'abholbereit';
          return `<div onclick="openWorkOrderEditor('${o.id}')" style="cursor:pointer; border:1px solid var(--border); border-left:3px solid ${col.color}; border-radius:10px; padding:11px 12px; background:var(--surface); display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <span style="font-weight:600; font-size:13.5px; color:var(--text);">${escapeHtml(workOrderLabel(o))}</span>
              ${next ? `<button class="btn-icon" title="Weiter in nächste Spalte" onclick="event.stopPropagation(); moveWorkOrder('${o.id}')" style="width:24px;height:24px;flex:none;">→</button>` : ''}
            </div>
            <div style="font-size:12px; color:var(--text-subtle);">${escapeHtml(o.owner || '—')}</div>
            ${o.complaint ? `<div style="font-size:12px; color:var(--text);">${escapeHtml(o.complaint)}</div>` : ''}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
              <span style="font-size:11.5px; color:var(--text-subtle);">${escapeHtml(o.mechanic || '—')}${o.bay ? ' · ' + escapeHtml(o.bay) : ''}</span>
              <span style="font-size:12.5px; font-weight:600; color:var(--text);">${chf(total)}</span>
            </div>
          </div>`;
        }).join('') : `<div style="font-size:12px; color:var(--text-subtle); padding:8px 4px;">—</div>`;
        return `<div style="display:flex; flex-direction:column; gap:10px; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; padding:0 2px;">
            <span style="width:9px; height:9px; border-radius:50%; background:${col.color};"></span>
            <span style="font-weight:600; font-size:13px; color:var(--text);">${col.label}</span>
            <span style="font-size:12px; color:var(--text-subtle);">${cards.length}</span>
          </div>
          ${cardHtml}
        </div>`;
      }).join('');
    }

    function moveWorkOrder(id) {
      const list = loadWorkOrders();
      const o = list.find(x => x.id === id);
      if (!o) return;
      const order = ['angenommen', 'inarbeit', 'wartetteile', 'abholbereit', 'abgeschlossen'];
      const i = order.indexOf(o.status);
      o.status = order[Math.min(i + 1, order.length - 1)];
      saveWorkOrders(list);
      renderWerkstattplan();
      toast(o.status === 'abgeschlossen' ? '✓ Auftrag abgeschlossen' : 'Auftrag verschoben');
    }

    function populateWoVehicleSelect() {
      const sel = document.getElementById('woVehicleSelect');
      if (!sel) return;
      const vs = (typeof loadVehicles === 'function') ? loadVehicles() : [];
      sel.innerHTML = `<option value="">— Fahrzeug wählen oder unten neu erfassen —</option>` +
        vs.map(v => `<option value="${v.id}">${escapeHtml(vehicleLabel(v))}${v.owner ? ' — ' + escapeHtml(v.owner) : ''}</option>`).join('');
    }
    function woFillFromVehicle() {
      const id = document.getElementById('woVehicleSelect').value;
      if (!id) return;
      const v = loadVehicles().find(x => x.id === id);
      if (!v) return;
      document.getElementById('woPlate').value = v.plate || '';
      document.getElementById('woModel').value = v.model || '';
      document.getElementById('woOwner').value = v.owner || '';
    }

    function woRowWork(w) {
      w = w || {};
      const div = document.createElement('div');
      div.className = 'wo-row wo-work';
      div.style.cssText = 'display:grid; grid-template-columns: 1fr 78px 84px 30px; gap:8px; align-items:center;';
      div.innerHTML =
        `<input class="wo-w-title" type="text" placeholder="Arbeit (z. B. Bremsen vorne)" value="${escapeHtml(w.title || '')}" style="${WO_INP}">
         <input class="wo-w-hours" type="number" step="0.25" min="0" placeholder="Std" value="${w.hours != null ? w.hours : ''}" oninput="woRecalcTotal()" style="${WO_INP}">
         <input class="wo-w-rate" type="number" step="1" min="0" placeholder="Satz" value="${w.rate != null ? w.rate : woDefaultRate()}" oninput="woRecalcTotal()" style="${WO_INP}">
         <button class="btn-icon" type="button" title="Entfernen" onclick="this.closest('.wo-row').remove(); woRecalcTotal();" style="width:28px;height:28px;flex:none;">✕</button>`;
      return div;
    }
    function woRowPart(p) {
      p = p || {};
      const div = document.createElement('div');
      div.className = 'wo-row wo-part';
      div.style.cssText = 'display:grid; grid-template-columns: 1fr 78px 84px 30px; gap:8px; align-items:center;';
      div.innerHTML =
        `<input class="wo-p-name" type="text" placeholder="Teil (z. B. Bremsbeläge)" value="${escapeHtml(p.name || '')}" style="${WO_INP}">
         <input class="wo-p-qty" type="number" step="1" min="0" placeholder="Menge" value="${p.qty != null ? p.qty : 1}" oninput="woRecalcTotal()" style="${WO_INP}">
         <input class="wo-p-price" type="number" step="0.05" min="0" placeholder="Preis" value="${p.price != null ? p.price : ''}" oninput="woRecalcTotal()" style="${WO_INP}">
         <button class="btn-icon" type="button" title="Entfernen" onclick="this.closest('.wo-row').remove(); woRecalcTotal();" style="width:28px;height:28px;flex:none;">✕</button>`;
      return div;
    }
    function woServices() { return (window.MosaVertical ? (MosaVertical.preset().services || []) : []); }
    function woServicePrice(s) {
      try { const p = JSON.parse(localStorage.getItem('cc-prices') || '{}'); const pk = `${MosaVertical.get()}_${s.key}_price`; if (p[pk] != null) return p[pk]; } catch {}
      return s.price;
    }
    // Mechaniker-Dropdown aus der Mitarbeiterliste (EMPLOYEES). Legacy-Freitext wird als Option bewahrt.
    function populateWoMechanics(selected) {
      const sel = document.getElementById('woMechanic');
      if (!sel) return;
      const names = (typeof EMPLOYEES !== 'undefined' ? EMPLOYEES : []).map(empName);
      let opts = '<option value="">— ' + (window.MosaVertical ? MosaVertical.t('feldMitarbeiter') : 'Mechaniker') + ' wählen —</option>';
      opts += names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
      // Gespeicherter Wert nicht (mehr) in der Liste (z. B. alter Freitext) → als Option erhalten.
      if (selected && !names.includes(selected)) {
        opts += `<option value="${escapeHtml(selected)}">${escapeHtml(selected)}</option>`;
      }
      sel.innerHTML = opts;
      sel.value = selected || '';
    }
    function populateWoServices() {
      const sel = document.getElementById('woServicePick');
      if (!sel) return;
      const svcs = woServices();
      sel.innerHTML = '<option value="">+ Leistung aus Katalog…</option>' +
        svcs.map(s => `<option value="${s.key}">${escapeHtml(s.title)} · ${s.unit === 'h' ? chf(woServicePrice(s)) + '/h' : chf(woServicePrice(s))}</option>`).join('');
    }
    function woAddService(key) {
      if (!key) return;
      const s = woServices().find(x => x.key === key);
      if (!s) return;
      // Stundenleistung → Std offen (Mechaniker trägt ein); Pauschale → 1 × Preis.
      addWorkRow({ title: s.title, hours: s.unit === 'h' ? '' : 1, rate: woServicePrice(s) });
    }
    function addWorkRow(w) { document.getElementById('woWorks').appendChild(woRowWork(w)); woRecalcTotal(); }
    function addPartRow(p) { document.getElementById('woParts').appendChild(woRowPart(p)); woRecalcTotal(); }
    function collectWorks() {
      return [...document.querySelectorAll('#woWorks .wo-work')].map(r => ({
        title: r.querySelector('.wo-w-title').value.trim(),
        hours: parseFloat(r.querySelector('.wo-w-hours').value) || 0,
        rate: parseFloat(r.querySelector('.wo-w-rate').value) || 0
      })).filter(w => w.title || w.hours);
    }
    function collectParts() {
      return [...document.querySelectorAll('#woParts .wo-part')].map(r => ({
        name: r.querySelector('.wo-p-name').value.trim(),
        qty: parseFloat(r.querySelector('.wo-p-qty').value) || 0,
        price: parseFloat(r.querySelector('.wo-p-price').value) || 0
      })).filter(p => p.name || p.price);
    }
    function woRecalcTotal() {
      const el = document.getElementById('woTotal');
      if (el) el.textContent = chf(workOrderTotal({ works: collectWorks(), parts: collectParts() }));
    }

    function openWorkOrderEditor(id) {
      editingWorkOrderId = id || null;
      const o = id ? loadWorkOrders().find(x => x.id === id) : null;
      populateWoVehicleSelect();
      populateWoServices();
      document.getElementById('woEditorTitle').textContent = o ? `${tt('dyn.woOrder', 'Auftrag')} · ${workOrderLabel(o)}` : tt('dyn.woNew', 'Auftrag annehmen');
      document.getElementById('woVehicleSelect').value = o?.vehicleId || '';
      document.getElementById('woPlate').value = o?.plate || '';
      document.getElementById('woModel').value = o?.model || '';
      document.getElementById('woOwner').value = o?.owner || '';
      document.getElementById('woComplaint').value = o?.complaint || '';
      document.getElementById('woStatus').value = o?.status || 'angenommen';
      populateWoMechanics(o?.mechanic || '');
      document.getElementById('woBay').value = o?.bay || '';
      document.getElementById('woDue').value = o?.due || '';
      document.getElementById('woNote').value = o?.note || '';
      const works = document.getElementById('woWorks'); works.innerHTML = '';
      const parts = document.getElementById('woParts'); parts.innerHTML = '';
      (o?.works && o.works.length ? o.works : [{}]).forEach(w => works.appendChild(woRowWork(w)));
      (o?.parts || []).forEach(p => parts.appendChild(woRowPart(p)));
      document.getElementById('woDeleteBtn').style.display = o ? 'inline-flex' : 'none';
      document.getElementById('woPdfBtn').style.display = o ? 'inline-flex' : 'none';
      woRecalcTotal();
      openModal('workOrderEditor');
    }
    function saveWorkOrder() {
      const plate = document.getElementById('woPlate').value.trim();
      const model = document.getElementById('woModel').value.trim();
      if (!plate && !model) { toast('Kennzeichen oder Fahrzeug erforderlich', 'error'); return; }
      const data = {
        vehicleId: document.getElementById('woVehicleSelect').value || null,
        plate, model,
        owner: document.getElementById('woOwner').value.trim(),
        complaint: document.getElementById('woComplaint').value.trim(),
        status: document.getElementById('woStatus').value,
        mechanic: document.getElementById('woMechanic').value.trim(),
        bay: document.getElementById('woBay').value.trim(),
        due: document.getElementById('woDue').value,
        note: document.getElementById('woNote').value.trim(),
        works: collectWorks(),
        parts: collectParts()
      };
      const list = loadWorkOrders();
      if (editingWorkOrderId) {
        const idx = list.findIndex(x => x.id === editingWorkOrderId);
        if (idx >= 0) list[idx] = { ...list[idx], ...data };
        lastSavedWorkOrderId = editingWorkOrderId;
        toast('✓ Auftrag aktualisiert');
      } else {
        lastSavedWorkOrderId = 'wo' + Date.now();
        list.push({ id: lastSavedWorkOrderId, created: new Date().toISOString(), ...data });
        toast('✓ Auftrag angenommen');
      }
      saveWorkOrders(list);
      closeModal('workOrderEditor');
      editingWorkOrderId = null;
      renderWerkstattplan();
    }
    let lastSavedWorkOrderId = null;
    function deleteWorkOrder() {
      if (!editingWorkOrderId) return;
      const o = loadWorkOrders().find(x => x.id === editingWorkOrderId);
      if (!o) return;
      if (!confirm(`Auftrag "${workOrderLabel(o)}" wirklich löschen?`)) return;
      saveWorkOrders(loadWorkOrders().filter(x => x.id !== editingWorkOrderId));
      window.MosaDB?.remove('work_orders', editingWorkOrderId);
      closeModal('workOrderEditor');
      editingWorkOrderId = null;
      renderWerkstattplan();
      toast('Auftrag gelöscht');
    }

    // Werkstattauftrag → Kostenvoranschlag (Offerte). Speichert den Auftrag, baut daraus
    // eine Offerte (Positionen + Total) und öffnet sie im Offerten-Editor zum Feinschliff.
    function woNum(n) { const v = Number(n) || 0; return Number.isInteger(v) ? String(v) : v.toFixed(2); }
    function workOrderToOffert() {
      const plate = document.getElementById('woPlate').value.trim();
      const model = document.getElementById('woModel').value.trim();
      if (!plate && !model) { toast('Kennzeichen oder Fahrzeug erforderlich', 'error'); return; }
      if (!requirePerm('edit_offerts', 'Offerten')) return;

      // Auftrag zuerst sichern, damit Offerte und Auftrag denselben Stand haben.
      // saveWorkOrder vergibt/merkt die ID in lastSavedWorkOrderId (auch bei neuem Auftrag).
      saveWorkOrder();
      const woId = lastSavedWorkOrderId;

      const owner = document.getElementById('woOwner').value.trim();
      const complaint = document.getElementById('woComplaint').value.trim();
      const works = collectWorks();
      const parts = collectParts();
      const total = workOrderTotal({ works, parts });

      const lines = [];
      lines.push('Kostenvoranschlag');
      lines.push('');
      lines.push('Fahrzeug: ' + [plate, model].filter(Boolean).join(' · '));
      if (complaint) lines.push('Anliegen: ' + complaint);
      if (works.length) {
        lines.push('');
        lines.push('Arbeiten:');
        works.forEach(w => lines.push(`· ${w.title || 'Arbeit'} — ${chf((Number(w.hours) || 0) * (Number(w.rate) || 0))}`));
      }
      if (parts.length) {
        lines.push('');
        lines.push('Teile / Material:');
        parts.forEach(p => lines.push(`· ${p.name || 'Teil'} (${woNum(p.qty)}×) — ${chf((Number(p.qty) || 0) * (Number(p.price) || 0))}`));
      }
      lines.push('');
      lines.push('Gesamtbetrag: ' + chf(total));
      lines.push('');
      lines.push('Dieser Kostenvoranschlag ist unverbindlich. Allfällige Zusatzarbeiten werden vor Ausführung mit Ihnen abgesprochen.');

      const svcKey = (window.MosaVertical && (MosaVertical.preset().services || [])[0]) ? MosaVertical.preset().services[0].key : '';
      const authorName = currentUser ? getUserName(currentUser) : 'Unbekannt';
      const off = {
        id: 'off-' + Date.now(),
        service: svcKey,
        kunde: owner || workOrderLabel({ plate, model }),
        adresse: [plate, model].filter(Boolean).join(' · '),
        preis: total.toFixed(2),
        datum: todayISO(),
        text: lines.join('\n'),
        images: [], history: [],
        status: 'Entwurf',
        createdBy: authorName,
        lastUpdatedBy: authorName,
        fromWorkOrder: woId || null,
        updated: new Date().toISOString()
      };
      const offerts = JSON.parse(localStorage.getItem('cc-offerts') || '[]');
      offerts.unshift(off);
      localStorage.setItem('cc-offerts', JSON.stringify(offerts));

      // saveWorkOrder hat das Auftrags-Modal bereits geschlossen. In die Offerten-Ansicht wechseln und Editor öffnen.
      try { document.querySelector('.nav-item[data-view="offerten"]')?.click(); } catch (e) {}
      openOffertEditor(off.id);
      toast('✓ Kostenvoranschlag erstellt');
    }
