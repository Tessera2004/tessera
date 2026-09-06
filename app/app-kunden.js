// MosaOS — app-kunden.js
//
// Kundenverwaltung.
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

    // ============ KUNDEN ============
    const CUSTOMERS_KEY = 'cc-customers-v1';
    // Kunde = Single Source of Truth. Ehemaliges "Objekt" ist jetzt Teil des Kunden.
    // type: Büro / Praxis / Hotel / Studio / Schule / Kanzlei / Apotheke / Privat / Baustelle
    // defaultSvc: unterhalt / end / fenster / bau / fassade
    // schedule: Klartext wie "Mo–Fr" (Anzeige) — wirklicher Plan kommt aus PLAN_JOB_PATTERNS
    // paymethod: bar / twint / rechnung
    // Leere Demo: keine Kunden vorbelegt.
    const DEFAULT_CUSTOMERS = [];
    function loadCustomers() {
      let list;
      try {
        const v = JSON.parse(localStorage.getItem(CUSTOMERS_KEY));
        if (Array.isArray(v) && v.length > 0) list = v;
      } catch {}
      if (!list) list = JSON.parse(JSON.stringify(DEFAULT_CUSTOMERS));
      // Migration alter Anruf-Einträge (followup/who/kind/summary) ins neue Format
      list.forEach(c => {
        if (!Array.isArray(c.calls)) c.calls = [];
        c.calls.forEach(call => {
          if (call.wer == null && call.who != null) {
            call.wer = call.kind === 'ausgehend' ? `${call.who} (intern)` : 'Unbekannt';
            call.angenommenVon = call.kind === 'eingehend' ? call.who : call.who;
            call.verlangteNach = call.verlangteNach || '—';
          }
          if (call.text == null && call.summary != null) call.text = call.summary;
          if (call.status == null) call.status = call.followup ? 'rueckruf' : 'erledigt';
        });
      });
      return list;
    }
    function callHasRueckruf(call) {
      // unterstützt neues und altes Datenformat
      return call.status === 'rueckruf' || call.followup === true;
    }
    function saveCustomers(list) {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list));
      window.MosaDB?.push('customers', list);
    }
    function customerDisplayName(c) {
      return c.lastName ? `${c.firstName} ${c.lastName}` : c.firstName;
    }
    function customerInitials(c) {
      const full = customerDisplayName(c);
      const parts = full.split(/\s+/).slice(0, 2);
      return parts.map(p => p[0]).join('').toUpperCase();
    }

    let editingCustomerId = null;
    let openCustomerId = null;

    function renderKunden() {
      const grid = document.getElementById('kundenGrid');
      const subtitle = document.getElementById('kundenSubtitle');
      if (!grid) return;
      const list = loadCustomers();
      const q = (document.getElementById('kundenSearch')?.value || '').toLowerCase().trim();
      const filtered = !q ? list : list.filter(c => {
        return customerDisplayName(c).toLowerCase().includes(q) ||
               (c.address || '').toLowerCase().includes(q) ||
               (c.phone || '').toLowerCase().includes(q);
      });
      subtitle.textContent = `${list.length} ${list.length === 1 ? tt('sub.customerSg','Kunde') : tt('sub.customerPl','Kunden')} · ${list.reduce((s,c) => s + (c.calls?.length || 0), 0)} ${tt('sub.callsLogged','Anrufe protokolliert')}`;

      if (filtered.length === 0) {
        grid.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align: center; padding: 40px;">
          <div style="font-size: 14px; color: var(--text-subtle);">${tt('est.noCustomersFound','Keine Kunden gefunden.')}</div>
        </div>`;
        return;
      }

      grid.innerHTML = filtered.map(c => {
        const openCalls = (c.calls || []).filter(callHasRueckruf).length;
        const rueckrufBadge = openCalls > 0
          ? `<span class="kunde-badge"><span class="dot" style="background: var(--warning);"></span>${openCalls} Rückruf${openCalls === 1 ? '' : 'e'} offen</span>`
          : '';
        return `<div class="kunde-card" onclick="openCustomerDetail('${safeAttr(c.id)}')">
          <div class="kunde-avatar">${escapeHtml(customerInitials(c))}</div>
          <div style="flex: 1; min-width: 0;">
            <div class="kunde-name">${escapeHtml(customerDisplayName(c))}</div>
            <div class="kunde-sub">${escapeHtml(c.address || '—')}</div>
            <div class="kunde-meta">${escapeHtml(c.phone || '—')} · ${(c.calls?.length || 0)} Anrufe</div>
          </div>
          ${rueckrufBadge}
        </div>`;
      }).join('');
    }

    function openCustomerEditor(id) {
      editingCustomerId = id || null;
      const list = loadCustomers();
      const c = id ? list.find(x => x.id === id) : null;
      document.getElementById('custEditorTitle').textContent = c ? tt('dyn.custEdit', 'Kunde bearbeiten') : tt('dyn.custNew', 'Neuer Kunde');
      document.getElementById('custFirstname').value = c?.firstName || '';
      document.getElementById('custLastname').value = c?.lastName || '';
      document.getElementById('custAddress').value = c?.address || '';
      document.getElementById('custPhone').value = c?.phone || '';
      document.getElementById('custEmail').value = c?.email || '';
      document.getElementById('custNote').value = c?.note || '';
      document.getElementById('custDeleteBtn').style.display = c ? 'inline-flex' : 'none';
      openModal('customerEditor');
    }

    function saveCustomer() {
      const firstName = document.getElementById('custFirstname').value.trim();
      const lastName = document.getElementById('custLastname').value.trim();
      const address = document.getElementById('custAddress').value.trim();
      const phone = document.getElementById('custPhone').value.trim();
      const email = document.getElementById('custEmail').value.trim();
      const note = document.getElementById('custNote').value.trim();
      if (!firstName) { toast('Name erforderlich', 'error'); return; }

      const list = loadCustomers();
      if (editingCustomerId) {
        const idx = list.findIndex(x => x.id === editingCustomerId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], firstName, lastName, address, phone, email, note };
        }
        toast('✓ Kunde aktualisiert');
      } else {
        const id = 'c' + Date.now();
        list.push({ id, firstName, lastName, address, phone, email, note, calls: [] });
        toast('✓ Kunde angelegt');
      }
      saveCustomers(list);
      protokolliere(editingCustomerId ? 'geaendert' : 'angelegt', 'customers',
                    `${firstName} ${lastName}`.trim());
      closeModal('customerEditor');
      editingCustomerId = null;
      renderKunden();
    }

    function deleteCustomer() {
      if (!editingCustomerId) return;
      const list = loadCustomers();
      const c = list.find(x => x.id === editingCustomerId);
      if (!c) return;
      if (!confirm(`Kunde "${customerDisplayName(c)}" wirklich löschen? Telefon-Historie geht verloren.`)) return;
      const next = list.filter(x => x.id !== editingCustomerId);
      const geloeschteId = editingCustomerId;
      saveCustomers(next);
      closeModal('customerEditor');
      editingCustomerId = null;
      renderKunden();
      // Auf die Datenbank warten: Schlaegt das Loeschen dort fehl (etwa weil
      // die Rolle kein Schreibrecht hat), war der Kunde nach dem naechsten
      // Laden wieder da — und die Meldung hatte "geloescht" behauptet.
      const db = window.MosaDB;
      if (!db) { toast('Kunde gelöscht'); return; }
      db.remove('customers', geloeschteId).then(ok => {
        toast(ok ? 'Kunde gelöscht'
                 : 'Kunde lokal entfernt, aber nicht in der Datenbank. '
                 + 'Er kann beim nächsten Laden zurückkommen.',
              ok ? 'success' : 'error');
      });
    }
