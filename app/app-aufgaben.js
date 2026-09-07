// MosaOS — app-aufgaben.js
//
// Anrufprotokoll, Aufgaben-Modul und Monatsbericht.
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

    // ============ ANRUFPROTOKOLL (zentral) ============
    const LOOSE_CALLS_KEY = 'cc-loose-calls-v1';
    function loadLooseCalls() {
      try { return JSON.parse(localStorage.getItem(LOOSE_CALLS_KEY)) || []; }
      catch { return []; }
    }
    function saveLooseCalls(arr) {
      localStorage.setItem(LOOSE_CALLS_KEY, JSON.stringify(arr));
    }
    // Liefert alle Anrufe (Kunden-gebunden + lose) als flache Liste, neueste zuerst
    function loadAllCalls() {
      const out = [];
      loadCustomers().forEach(c => {
        (c.calls || []).forEach((call, i) => {
          out.push({ ...call, _customer: c, _origin: 'customer', _idxInCustomer: i });
        });
      });
      loadLooseCalls().forEach(call => {
        out.push({ ...call, _customer: null, _origin: 'loose' });
      });
      out.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
      return out;
    }

    let callModalTarget = null; // { customerId } oder null = freier Kontakt
    function openCallModal(preselectCustomerId) {
      callModalTarget = preselectCustomerId ? { customerId: preselectCustomerId } : null;
      // Reset Felder
      const customers = loadCustomers();
      const sel = document.getElementById('callCustomerSelect');
      sel.innerHTML = '<option value="">— Anderer Kontakt (kein Kunde) —</option>' +
        customers.map(c => `<option value="${c.id}">${customerDisplayName(c)}</option>`).join('');
      sel.value = preselectCustomerId || '';
      document.getElementById('callDate').value = new Date().toISOString().slice(0, 16);
      document.getElementById('callWer').value = '';
      document.getElementById('callWerNummer').value = '';
      document.getElementById('callVerlangteNach').value = '';
      document.getElementById('callAngenommenVon').value = getCurrentUserName ? getCurrentUserName() : '';
      document.getElementById('callText').value = '';
      document.getElementById('callRueckruf').checked = false;
      const alsAufgabe = document.getElementById('callAlsAufgabe');
      if (alsAufgabe) {
        alsAufgabe.checked = false;
        const wer = document.getElementById('callAufgabeWer');
        wer.parentElement.style.display = 'none';
        wer.innerHTML = `<option value="">${tt('task.nobody','— niemand —')}</option>`
          + loadUsers().map(u => `<option value="${u.id}">${escapeHtml(u.firstname + ' ' + u.lastname)}</option>`).join('');
      }
      onCallCustomerChange();
      openModal('callEntry');
    }

    function onCallCustomerChange() {
      const sel = document.getElementById('callCustomerSelect');
      const isLoose = !sel.value;
      // Nur wenn kein Kunde: Telefonnummer-Feld aktivieren
      document.getElementById('callWerNummerWrap').style.display = isLoose ? 'block' : 'none';
      document.getElementById('callCustomerHint').textContent = isLoose
        ? 'Kein Kunde im Stamm — der Anruf wird im allgemeinen Protokoll gespeichert.'
        : 'Anruf wird im Profil dieses Kunden gespeichert.';
    }

    function saveCallEntry() {
      const customerId = document.getElementById('callCustomerSelect').value;
      const ts = document.getElementById('callDate').value || new Date().toISOString().slice(0, 16);
      const wer = document.getElementById('callWer').value.trim();
      const werNummer = document.getElementById('callWerNummer').value.trim();
      const verlangteNach = document.getElementById('callVerlangteNach').value.trim();
      const angenommenVon = document.getElementById('callAngenommenVon').value.trim();
      const text = document.getElementById('callText').value.trim();
      const isRueckruf = document.getElementById('callRueckruf').checked;
      if (!wer) { toast('Bitte ausfüllen: Wer hat angerufen', 'error'); return; }
      if (!text) { toast('Bitte ausfüllen: Was wurde gesagt', 'error'); return; }

      const entry = {
        ts, wer, verlangteNach, angenommenVon, text,
        status: isRueckruf ? 'rueckruf' : 'erledigt'
      };

      if (customerId) {
        const list = loadCustomers();
        const c = list.find(x => x.id === customerId);
        if (!c) { toast('Kunde nicht gefunden', 'error'); return; }
        if (!Array.isArray(c.calls)) c.calls = [];
        c.calls.push(entry);
        saveCustomers(list);
        // Wenn gerade ein Kunden-Detail offen war, dort auch neu rendern
        if (openCustomerId === customerId) renderCallLog(c);
      } else {
        const loose = loadLooseCalls();
        loose.push({ ...entry, id: 'lc' + Date.now(), externalContact: werNummer || '' });
        saveLooseCalls(loose);
      }
      // B9 — aus dem Anruf direkt eine Aufgabe machen
      if (document.getElementById('callAlsAufgabe')?.checked) {
        const kunde = customerId ? loadCustomers().find(x => x.id === customerId) : null;
        const wem = document.getElementById('callAufgabeWer')?.value || null;
        TASKS.push({
          id: 'tk' + Date.now(),
          title: (verlangteNach ? `${tt('call.callbackFor','Rückruf an')} ${wer} (${verlangteNach})` : `${tt('call.callbackFor','Rückruf an')} ${wer}`),
          note: text,
          assignee: wem || null,
          prio: isRueckruf ? 'hoch' : 'normal',
          done: false,
          created: new Date().toISOString(),
          contactPhone: werNummer || kunde?.phone || null,
          linkLabel: kunde ? customerDisplayName(kunde) : (wer || ''),
          linkType: 'anruf'
        });
        saveTasks(TASKS);
        toast(tt('call.taskCreated', '✓ Aufgabe aus Anruf erstellt'));
      }

      closeModal('callEntry');
      renderKunden();
      renderAnrufprotokoll();
      toast('✓ Anruf vermerkt');
    }

    // ============ AUFGABEN-MODUL ============
    const TASKS_KEY = 'cc-tasks-v1';
    // Leere Demo: keine Aufgaben vorbelegt.
    const DEFAULT_TASKS = [];
    function loadTasks() {
      try {
        const v = JSON.parse(localStorage.getItem(TASKS_KEY));
        if (Array.isArray(v)) return v;
      } catch {}
      localStorage.setItem(TASKS_KEY, JSON.stringify(DEFAULT_TASKS));
      return JSON.parse(JSON.stringify(DEFAULT_TASKS));
    }
    function saveTasks(arr) { localStorage.setItem(TASKS_KEY, JSON.stringify(arr)); window.MosaDB?.push('tasks', arr); }
    let TASKS = loadTasks();

    let nurMeineAufgaben = false;
    function toggleNurMeine() {
      nurMeineAufgaben = !nurMeineAufgaben;
      const b = document.getElementById('taskNurMeine');
      if (b) b.classList.toggle('is-active', nurMeineAufgaben);
      renderAufgaben();
    }

    // Die Synchronisierung meldet Fehler ueber ein Ereignis — bisher hoerte
    // niemand zu. Wer keine Konsole offen hatte, merkte nicht, dass nichts
    // gespeichert wurde (etwa weil eine Datenbankregel das Schreiben ablehnt).
    (() => {
      let zuletztGemeldet = 0;
      window.addEventListener('mosaos-sync-state', (e) => {
        const { state, detail } = e.detail || {};
        if (state !== 'error') return;
        // Hoechstens alle 30 Sekunden melden, sonst ueberdeckt es alles.
        if (Date.now() - zuletztGemeldet < 30000) return;
        zuletztGemeldet = Date.now();
        const text = String(detail || '');
        const rechte = /row-level security|permission denied|violates/i.test(text);
        toast(rechte
          ? 'Änderungen werden nicht gespeichert: Die Datenbank lehnt das Schreiben ab. '
            + 'Deine Rolle hat dort keine Schreibrechte — siehe scripts/rolle-pruefen.sql.'
          : 'Änderungen konnten nicht gespeichert werden: ' + text.slice(0, 90),
          'error');
      });
    })();

    function taskAssigneeLabel(uid) {
      const u = loadUsers().find(x => x.id === uid);
      return u ? `${u.firstname} ${u.lastname}` : '— niemand —';
    }
    function taskAssigneeInitials(uid) {
      const u = loadUsers().find(x => x.id === uid);
      return u ? ((u.firstname[0] || '?') + (u.lastname[0] || '')).toUpperCase() : '?';
    }
    function isOverdue(t) {
      if (t.done || !t.dueDate) return false;
      return t.dueDate < isoDate(new Date());
    }
    function updateAufgabenBadge() {
      const offen = TASKS.filter(t => !t.done).length;
      const b = document.getElementById('aufgabenNavBadge');
      if (b) {
        b.textContent = offen;
        b.style.display = offen > 0 ? '' : 'none';
      }
    }

    function renderAufgaben() {
      const wrap = document.getElementById('taskList');
      if (!wrap) return;
      const users = loadUsers();
      // Assignee-Filter Dropdown füllen
      const assSel = document.getElementById('taskAssigneeFilter');
      if (assSel && assSel.options.length <= 1) {
        users.forEach(u => {
          const opt = document.createElement('option');
          opt.value = u.id;
          opt.textContent = `${u.firstname} ${u.lastname}`;
          assSel.appendChild(opt);
        });
      }

      const filter = (document.querySelector('#taskFilter .is-active')?.dataset.f) || 'alle';
      const assFilter = assSel?.value || '';
      const q = (document.getElementById('taskSearch')?.value || '').toLowerCase().trim();

      let filtered = TASKS.slice();
      if (filter === 'erledigt') filtered = filtered.filter(t => t.done);
      else if (filter === 'dringend') filtered = filtered.filter(t => !t.done && t.prio === 'dringend');
      else if (filter === 'normal') filtered = filtered.filter(t => !t.done && t.prio !== 'dringend');
      else filtered = filtered.filter(t => !t.done);

      if (assFilter) filtered = filtered.filter(t => t.assignee === assFilter);
      // "Nur meine" hat Vorrang vor der Personenauswahl: Wer den Knopf drueckt,
      // will seine eigenen Aufgaben sehen, egal was im Auswahlfeld steht.
      if (nurMeineAufgaben && currentUser) filtered = filtered.filter(t => t.assignee === currentUser.id);
      if (q) {
        filtered = filtered.filter(t =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.desc || '').toLowerCase().includes(q) ||
          taskAssigneeLabel(t.assignee).toLowerCase().includes(q)
        );
      }
      // Sortierung: Erledigte ans Ende; sonst: überfällig → dringend → fällig-Datum
      filtered.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const ao = isOverdue(a) ? 0 : 1;
        const bo = isOverdue(b) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        const pOrder = { dringend: 0, normal: 1, niedrig: 2 };
        const ap = pOrder[a.prio] ?? 1;
        const bp = pOrder[b.prio] ?? 1;
        if (ap !== bp) return ap - bp;
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      });

      const offen = TASKS.filter(t => !t.done).length;
      const dringend = TASKS.filter(t => !t.done && t.prio === 'dringend').length;
      const ueberfaellig = TASKS.filter(isOverdue).length;
      const sub = document.getElementById('aufgabenSubtitle');
      if (sub) sub.textContent = `${offen} ${tt('sub.open','offen')} · ${dringend} ${tt('sub.urgent','dringend')} · ${ueberfaellig} ${tt('sub.overdue','überfällig')}`;

      if (filtered.length === 0) {
        wrap.innerHTML = `<div class="card" style="padding: 40px; text-align: center; color: var(--text-subtle);">${tt('est.noTasks','Keine Aufgaben.')}</div>`;
        updateAufgabenBadge();
        return;
      }

      wrap.innerHTML = filtered.map(t => {
        const prioBadge = t.prio === 'dringend'
          ? '<span class="task-prio task-prio-dringend">Dringend</span>'
          : t.prio === 'niedrig'
            ? '<span class="task-prio task-prio-niedrig">Niedrig</span>'
            : '<span class="task-prio task-prio-normal">Normal</span>';
        const overdue = isOverdue(t);
        const dueLbl = t.dueDate
          ? `<span class="task-due ${overdue ? 'is-overdue' : ''}">${new Date(t.dueDate).toLocaleDateString(dateLocale(), { day:'2-digit', month:'short', year:'numeric' })}${overdue ? ` · ${tt('sub.overdue','überfällig')}` : ''}</span>`
          : '';
        const linkLbl = t.linkLabel ? `<span class="task-link">🔗 ${t.linkLabel}</span>` : '';
        const contactBtns = [];
        if (t.contactEmail) contactBtns.push(`<a class="task-contact-btn" href="mailto:${t.contactEmail}" onclick="event.stopPropagation()" title="${t.contactEmail}">📧 Mail</a>`);
        if (t.contactPhone) contactBtns.push(`<a class="task-contact-btn" href="tel:${t.contactPhone.replace(/\s/g,'')}" onclick="event.stopPropagation()" title="${t.contactPhone}">Anrufen</a>`);
        const contactRow = contactBtns.length ? `<div class="task-contact-row">${contactBtns.join('')}</div>` : '';
        return `<div class="task-item ${t.done ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}">
          <label class="task-check">
            <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTaskDone('${t.id}')" />
          </label>
          <div class="task-body" onclick="${isQuestion(t) ? `openQuestionModal('${t.id}')` : `openTaskModal('${t.id}')`}">
            <div class="task-row1">
              <span class="task-title">${t.title}</span>
              ${prioBadge}
            </div>
            ${t.desc ? `<div class="task-desc">${t.desc}</div>` : ''}
            <div class="task-row2">
              <span class="task-assignee" title="Zuständig">
                <span class="task-avatar">${taskAssigneeInitials(t.assignee)}</span>
                ${taskAssigneeLabel(t.assignee)}
              </span>
              ${dueLbl}
              ${linkLbl}
            </div>
            ${contactRow}
          </div>
        </div>`;
      }).join('');
      updateAufgabenBadge();
    }

    function setTaskFilter(f) {
      document.querySelectorAll('#taskFilter button').forEach(b => {
        b.classList.toggle('is-active', b.dataset.f === f);
      });
      renderAufgaben();
    }

    function toggleTaskDone(id) {
      const t = TASKS.find(x => x.id === id);
      if (!t) return;
      if (isQuestion(t)) {
        openQuestionModal(id);
        return;
      }
      t.done = !t.done;
      t.completedAt = t.done ? new Date().toISOString() : null;
      saveTasks(TASKS);
      renderAufgaben();
      toast(t.done ? '✓ Aufgabe erledigt' : 'Wieder offen');
    }

    let editingTaskId = null;
    let taskLinkContext = null;

    function openTaskModal(id, linkContext) {
      editingTaskId = id;
      taskLinkContext = linkContext || null;
      const users = loadUsers();
      const assSel = document.getElementById('taskAssignee');
      assSel.innerHTML = users.map(u => `<option value="${u.id}">${u.firstname} ${u.lastname} · ${ROLE_DEFS[u.role]?.label || u.role}</option>`).join('');

      const linkInfo = document.getElementById('taskLinkInfo');
      const linkLabel = document.getElementById('taskLinkLabel');

      if (id) {
        const t = TASKS.find(x => x.id === id);
        if (!t) return;
        document.getElementById('taskModalTitle').textContent = tt('dyn.taskEdit', 'Aufgabe bearbeiten');
        document.getElementById('taskTitle').value = t.title || '';
        document.getElementById('taskDesc').value = t.desc || '';
        document.getElementById('taskAssignee').value = t.assignee || users[0].id;
        document.getElementById('taskDueDate').value = t.dueDate || '';
        setTaskPrio(t.prio || 'normal');
        document.getElementById('taskDeleteBtn').style.display = '';
        if (t.linkLabel) {
          linkInfo.style.display = '';
          linkLabel.textContent = t.linkLabel;
        } else {
          linkInfo.style.display = 'none';
        }
        document.getElementById('taskContactEmail').value = t.contactEmail || '';
        document.getElementById('taskContactPhone').value = t.contactPhone || '';
      } else {
        document.getElementById('taskModalTitle').textContent = tt('dyn.taskNew', 'Neue Aufgabe');
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDesc').value = linkContext?.desc || '';
        const preAssignee = linkContext?.assignee && users.find(u => u.id === linkContext.assignee) ? linkContext.assignee : users[0].id;
        document.getElementById('taskAssignee').value = preAssignee;
        // Default Fälligkeit: in 3 Tagen (Folgeaufgaben aus Rückrufen: morgen)
        const dueInDays = (linkContext && Number.isFinite(linkContext.dueInDays)) ? linkContext.dueInDays : 3;
        const d = new Date(); d.setDate(d.getDate() + dueInDays);
        document.getElementById('taskDueDate').value = isoDate(d);
        setTaskPrio(linkContext?.prio || 'normal');
        document.getElementById('taskDeleteBtn').style.display = 'none';
        if (linkContext?.label) {
          linkInfo.style.display = '';
          linkLabel.textContent = linkContext.label;
          if (!document.getElementById('taskTitle').value) {
            document.getElementById('taskTitle').value = linkContext.title || '';
          }
        } else {
          linkInfo.style.display = 'none';
        }
        // Pre-fill contact from context (mail sender or customer)
        document.getElementById('taskContactEmail').value = linkContext?.contactEmail || linkContext?.sourceMail?.from || '';
        document.getElementById('taskContactPhone').value = linkContext?.contactPhone || '';
      }
      openModal('taskEditor');
    }

    function setTaskPrio(p) {
      const wrap = document.getElementById('taskPrioPicker');
      wrap.dataset.value = p;
      wrap.querySelectorAll('button').forEach(b => {
        b.classList.toggle('is-active', b.dataset.prio === p);
      });
    }

    function saveTask() {
      const title = document.getElementById('taskTitle').value.trim();
      if (!title) { toast('Bitte Titel eingeben', 'error'); return; }
      const data = {
        title,
        desc: document.getElementById('taskDesc').value.trim(),
        assignee: document.getElementById('taskAssignee').value,
        dueDate: document.getElementById('taskDueDate').value || null,
        prio: document.getElementById('taskPrioPicker').dataset.value || 'normal',
        contactEmail: document.getElementById('taskContactEmail')?.value.trim() || null,
        contactPhone: document.getElementById('taskContactPhone')?.value.trim() || null
      };
      if (editingTaskId) {
        const i = TASKS.findIndex(x => x.id === editingTaskId);
        if (i >= 0) TASKS[i] = { ...TASKS[i], ...data };
      } else {
        const newT = {
          id: 'tk' + Date.now(),
          ...data,
          done: false,
          created: new Date().toISOString()
        };
        if (taskLinkContext?.label) {
          newT.linkLabel = taskLinkContext.label;
          newT.linkType = taskLinkContext.type || 'sonstiges';
        }
        if (taskLinkContext?.sourceMail) newT.sourceMail = taskLinkContext.sourceMail;
        TASKS.push(newT);
      }
      saveTasks(TASKS);
      protokolliere(editingTaskId ? 'geaendert' : 'angelegt', 'tasks', data.title || '');
      closeModal('taskEditor');
      editingTaskId = null;
      taskLinkContext = null;
      renderAufgaben();
      toast('✓ Aufgabe gespeichert');
    }

    function deleteTask() {
      if (!editingTaskId) return;
      if (!confirm('Aufgabe wirklich löschen?')) return;
      TASKS = TASKS.filter(t => t.id !== editingTaskId);
      saveTasks(TASKS);
      window.MosaDB?.remove('tasks', editingTaskId);
      closeModal('taskEditor');
      editingTaskId = null;
      renderAufgaben();
      toast('Gelöscht');
    }

    // Offene Fragen sind bewusst auf dem Dashboard sichtbar. Technisch nutzen
    // sie die synchronisierte Aufgaben-Tabelle, damit sie auf allen Geräten
    // erscheinen und denselben Verantwortlichen-/Fälligkeitsmechanismus haben.
    let editingQuestionId = null;
    function isQuestion(task) {
      return task?.linkType === 'frage' || task?.sourceMail?.question === true;
    }

    function openQuestionModal(id) {
      editingQuestionId = id || null;
      const users = loadUsers();
      const sel = document.getElementById('questionAssignee');
      sel.innerHTML = users.length
        ? users.map(u => `<option value="${u.id}">${escapeHtml(`${u.firstname} ${u.lastname}`.trim())}</option>`).join('')
        : '<option value="">Noch niemand erfasst</option>';
      const q = id ? TASKS.find(t => t.id === id && isQuestion(t)) : null;
      if (id && !q) return;
      const due = new Date(); due.setDate(due.getDate() + 2);
      document.getElementById('questionModalTitle').textContent = q ? 'Frage beantworten' : 'Offene Frage anlegen';
      document.getElementById('questionTitle').value = q?.title || '';
      document.getElementById('questionContext').value = q?.desc || '';
      document.getElementById('questionAssignee').value = q?.assignee || users[0]?.id || '';
      document.getElementById('questionDue').value = q?.dueDate || due.toISOString().slice(0, 10);
      document.getElementById('questionAnswer').value = q?.sourceMail?.answer || '';
      document.getElementById('questionDeleteBtn').style.display = q ? '' : 'none';
      openModal('questionEditor');
    }

    function saveQuestion() {
      const title = document.getElementById('questionTitle').value.trim();
      if (!title) { toast('Bitte eine Frage eingeben', 'error'); return; }
      const answer = document.getElementById('questionAnswer').value.trim();
      const existing = editingQuestionId ? TASKS.find(t => t.id === editingQuestionId) : null;
      const now = new Date().toISOString();
      const data = {
        title,
        desc: document.getElementById('questionContext').value.trim(),
        assignee: document.getElementById('questionAssignee').value || null,
        dueDate: document.getElementById('questionDue').value || null,
        prio: 'normal',
        linkType: 'frage',
        linkLabel: 'Offene Frage',
        done: !!answer,
        completedAt: answer ? (existing?.completedAt || now) : null,
        sourceMail: {
          ...(existing?.sourceMail || {}),
          question: true,
          answer,
          answeredAt: answer ? now : null,
          answeredBy: answer ? getCurrentUserName() : null
        }
      };
      if (existing) Object.assign(existing, data);
      else TASKS.push({ id: 'q' + Date.now(), ...data, created: now });
      saveTasks(TASKS);
      protokolliere(existing ? 'geaendert' : 'angelegt', 'tasks', `Frage: ${title}`);
      closeModal('questionEditor');
      editingQuestionId = null;
      renderAufgaben();
      if (typeof renderDashboard === 'function') renderDashboard();
      toast(answer ? 'Antwort gespeichert' : 'Frage gespeichert');
    }

    function deleteQuestion() {
      if (!editingQuestionId) return;
      const q = TASKS.find(t => t.id === editingQuestionId);
      if (!q || !confirm(`Frage „${q.title}“ löschen?`)) return;
      TASKS = TASKS.filter(t => t.id !== editingQuestionId);
      saveTasks(TASKS);
      window.MosaDB?.remove('tasks', editingQuestionId);
      closeModal('questionEditor');
      editingQuestionId = null;
      renderAufgaben();
      if (typeof renderDashboard === 'function') renderDashboard();
      toast('Frage gelöscht');
    }

    function renderDashboardQuestions() {
      const wrap = document.getElementById('dashQuestions');
      if (!wrap) return;
      const open = TASKS.filter(t => isQuestion(t) && !t.done)
        .sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')));
      wrap.innerHTML = open.length ? open.slice(0, 6).map(q => {
        const overdue = q.dueDate && q.dueDate < new Date().toISOString().slice(0, 10);
        return `<button type="button" class="dashboard-question ${overdue ? 'is-overdue' : ''}" onclick="openQuestionModal('${q.id}')">
          <span class="dashboard-question-mark" aria-hidden="true">?</span>
          <span><strong>${escapeHtml(q.title)}</strong>${q.desc ? `<small>${escapeHtml(q.desc)}</small>` : ''}</span>
          <span class="dashboard-question-meta">${escapeHtml(taskAssigneeLabel(q.assignee))}${q.dueDate ? ` · ${new Date(q.dueDate + 'T12:00:00').toLocaleDateString(dateLocale(), {day:'2-digit', month:'2-digit'})}` : ''}</span>
        </button>`;
      }).join('') : '<div class="dashboard-question-empty"><strong>Alles geklärt</strong><span>Momentan wartet keine offene Frage auf eine Antwort.</span></div>';
    }

    // Re-render bei Nav auf "aufgaben"
    document.querySelector('.nav-item[data-view="aufgaben"]')?.addEventListener('click', () => {
      setTimeout(renderAufgaben, 50);
    });
    renderAufgaben();

    function renderAnrufprotokoll() {
      const wrap = document.getElementById('anrufList');
      if (!wrap) return;
      const all = loadAllCalls();
      const filter = (document.querySelector('#anrufFilter .is-active')?.dataset.f) || 'alle';
      const sort = document.getElementById('anrufSort')?.value || 'neu';
      const q = (document.getElementById('anrufSearch')?.value || '').toLowerCase().trim();
      let filtered = all;
      if (filter === 'offen') filtered = filtered.filter(callHasRueckruf);
      else if (filter === 'erledigt') filtered = filtered.filter(c => !callHasRueckruf(c));
      else if (filter === 'mitkunde') filtered = filtered.filter(c => !!c._customer);
      else if (filter === 'ohnekunde') filtered = filtered.filter(c => !c._customer);
      if (q) {
        filtered = filtered.filter(call => {
          const kundeName = call._customer ? customerDisplayName(call._customer).toLowerCase() : '';
          const kundenAdr = call._customer?.address?.toLowerCase() || '';
          const kundenTel = call._customer?.phone?.toLowerCase() || '';
          const wer = (call.wer || '').toLowerCase();
          const verlangteNach = (call.verlangteNach || '').toLowerCase();
          const text = (call.text || call.summary || '').toLowerCase();
          const externalContact = (call.externalContact || '').toLowerCase();
          return kundeName.includes(q) || kundenAdr.includes(q) || kundenTel.includes(q) ||
                 wer.includes(q) || verlangteNach.includes(q) || text.includes(q) ||
                 externalContact.includes(q);
        });
      }
      // Sortierung anwenden
      if (sort === 'alt') filtered.sort((a, b) => a.ts.localeCompare(b.ts));
      else if (sort === 'kunde') filtered.sort((a, b) => {
        const an = a._customer ? customerDisplayName(a._customer) : '~';
        const bn = b._customer ? customerDisplayName(b._customer) : '~';
        return an.localeCompare(bn);
      });
      else filtered.sort((a, b) => b.ts.localeCompare(a.ts));

      const subtitle = document.getElementById('anrufSubtitle');
      const offen = all.filter(callHasRueckruf).length;
      const searchHint = q ? ` · ${filtered.length} ${tt('sub.hitsFor','Treffer für')} „${q}"` : '';
      subtitle.textContent = `${all.length} ${tt('sub.callsTotal','Anrufe gesamt')} · ${offen} ${offen === 1 ? tt('sub.callbackSg','Rückruf') : tt('sub.callbackPl','Rückrufe')} ${tt('sub.open','offen')}${searchHint}`;
      if (filtered.length === 0) {
        wrap.innerHTML = `<div class="card" style="padding: 40px; text-align: center; color: var(--text-subtle);">${tt('est.noCalls','Keine Anrufe.')}</div>`;
        return;
      }
      wrap.innerHTML = filtered.map(call => {
        const d = new Date(call.ts);
        const dateStr = d.toLocaleDateString(dateLocale(), { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const isRr = callHasRueckruf(call);
        const statusBadge = isRr
          ? `<span class="call-badge"><span class="dot" style="background: var(--warning);"></span>Rückruf offen</span>`
          : `<span class="call-badge call-badge-ok"><span class="dot" style="background: var(--success);"></span>erledigt</span>`;
        const kundeLabel = call._customer
          ? `<a href="#" onclick="event.preventDefault(); openCustomerDetail('${call._customer.id}'); return false;" class="anruf-kunde-link">👤 ${customerDisplayName(call._customer)}</a>`
          : `<span class="anruf-kunde-loose">${call.externalContact || 'Kein Kunde'}</span>`;
        return `<div class="anruf-item ${isRr ? 'is-followup' : ''}">
          <div class="anruf-head">
            <span class="anruf-when">${dateStr} · ${timeStr}</span>
            ${kundeLabel}
            ${statusBadge}
          </div>
          <div class="call-rows">
            <div><span class="call-lbl">Wer hat angerufen:</span> <strong>${call.wer || '—'}</strong></div>
            <div><span class="call-lbl">Verlangte nach:</span> <strong>${call.verlangteNach || '—'}</strong></div>
            <div><span class="call-lbl">Wer hat angenommen:</span> <strong>${call.angenommenVon || '—'}</strong></div>
          </div>
          <div class="call-summary">„${call.text || call.summary || ''}"</div>
          <div class="anruf-actions">
            <button class="btn btn-ghost btn-sm" onclick='createTaskFromCall(${JSON.stringify(call._customer?.id || null)}, ${JSON.stringify(call.wer || "")}, ${JSON.stringify(call.text || call.summary || "")}, ${isRr ? 'true' : 'false'})'>${isRr ? '⏰ Rückruf-Aufgabe' : '+ Aufgabe daraus machen'}</button>
          </div>
        </div>`;
      }).join('');
    }

    function createTaskFromCall(custId, wer, text, isCallback) {
      const customers = loadCustomers();
      const cust = custId ? customers.find(c => c.id === custId) : null;
      const kunde = cust ? customerDisplayName(cust) : (wer || 'Unbekannt');
      openTaskModal(null, {
        type: 'anruf',
        label: `Anruf ${cust ? '· ' + customerDisplayName(cust) : ''}${wer ? ' · ' + wer : ''}`,
        title: isCallback ? `Zurückrufen: ${kunde}` : `Rückruf an ${kunde}`,
        desc: text || '',
        contactPhone: cust?.phone || '',
        contactEmail: cust?.email || '',
        // Folgeaufgabe aus offenem Rückruf: morgen fällig + dringend (Erinnerung)
        dueInDays: isCallback ? 1 : 3,
        prio: isCallback ? 'dringend' : 'normal'
      });
    }

    function setAnrufFilter(f) {
      document.querySelectorAll('#anrufFilter button').forEach(b => {
        b.classList.toggle('is-active', b.dataset.f === f);
      });
      renderAnrufprotokoll();
    }

    // B3 — Historie: wer hat wann was geloescht oder geaendert.
    // Haengt sich an MosaDB.remove, damit keine der Loeschstellen vergessen
    // wird, wenn spaeter eine dazukommt.
    const HISTORIE_KEY = 'cc-historie-v1';
    const HISTORIE_MAX = 300;

    const TABELLEN_NAMEN = {
      tasks: 'Aufgabe', plan_jobs: 'Auftrag', customers: 'Kunde',
      employees: 'Mitarbeiter', office_users: 'Büro-Benutzer', teams: 'Team',
      work_reports: 'Rapport', work_orders: 'Arbeitsschein', reports: 'Bericht',
      construction_sites: 'Baustelle', vehicles: 'Fahrzeug',
      tire_storage: 'Reifeneinlagerung', bait_stations: 'Köderstation',
      pest_protocols: 'Schädlingsprotokoll', company_prices: 'Preisliste',
      company_custom_services: 'Eigene Leistung', offerts: 'Offerte',
      company_profile: 'Firmeneinstellungen', company_templates: 'Dokumentvorlagen',
      company_time_factors: 'Planungseinstellungen'
    };

    function ladeHistorie() {
      try { const v = JSON.parse(localStorage.getItem(HISTORIE_KEY)); return Array.isArray(v) ? v : []; }
      catch { return []; }
    }

    // Die Loeschstellen entfernen den Eintrag, bevor MosaDB.remove laeuft —
    // der Name waere dann schon weg. Darum fuehrt jedes Speichern einen
    // Namensspeicher mit, aus dem wir ihn nachher noch holen koennen.
    const NAMEN_CACHE = {};
    function namenMerken(tabelle, daten) {
      const nimm = (e) => e.title || e.objekt || e.name
        || (e.firstName ? `${e.firstName} ${e.lastName || ''}`.trim() : null)
        || (e.firstname ? `${e.firstname} ${e.lastname || ''}`.trim() : null)
        || e.ort || null;
      const eintragen = (e) => {
        if (e && e.id) { const n = nimm(e); if (n) (NAMEN_CACHE[tabelle] ||= {})[e.id] = n; }
      };
      if (Array.isArray(daten)) daten.forEach(eintragen);
      else if (daten && typeof daten === 'object') {
        // plan_jobs kommt als Karte nach Datum
        Object.values(daten).forEach(v => Array.isArray(v) ? v.forEach(eintragen) : eintragen(v));
      }
    }

    // Aus einer ID einen lesbaren Namen machen — "tkX" hilft niemandem
    function bezeichnungFuer(tabelle, id) {
      let name = null;
      try {
        if (tabelle === 'tasks') name = TASKS.find(t => t.id === id)?.title;
        else if (tabelle === 'customers') {
          const c = loadCustomers().find(x => x.id === id);
          name = c ? customerDisplayName(c) : null;
        } else if (tabelle === 'plan_jobs') {
          const j = allePlanJobs().find(x => x.id === id);
          name = j ? (j.objekt || j.ort) : null;
        } else if (tabelle === 'employees' || tabelle === 'office_users') {
          const u = loadUsers().find(x => x.id === id);
          name = u ? `${u.firstname} ${u.lastname}` : null;
        }
      } catch {}
      // Meist ist der Eintrag schon geloescht — dann traegt der Speicher
      // aus dem letzten Sichern den Namen noch.
      return name || NAMEN_CACHE[tabelle]?.[id] || id;
    }

    const LETZTER_AUDIT = {};
    function protokolliere(aktion, tabelle, bezeichnung, automatisch) {
      if (!automatisch) LETZTER_AUDIT[tabelle] = Date.now();
      const profil = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : {};
      const liste = ladeHistorie();
      liste.unshift({
        ts: new Date().toISOString(),
        aktion,                                   // geloescht | geaendert | angelegt
        tabelle,
        was: TABELLEN_NAMEN[tabelle] || tabelle,
        bezeichnung: bezeichnung || '',
        wer: getCurrentUserName(),
        werId: (typeof currentUserId !== 'undefined') ? currentUserId : (profil.id || null),
        werEmail: profil.email || window._authEmail || '',
        werRolle: profil.role || '',
        profil: {
          id: profil.id || null,
          name: getCurrentUserName(),
          email: profil.email || window._authEmail || '',
          role: profil.role || ''
        }
      });
      localStorage.setItem(HISTORIE_KEY, JSON.stringify(liste.slice(0, HISTORIE_MAX)));
      if (document.getElementById('historieListe')) renderHistorie();
    }

    // MosaDB.remove umhuellen — jede Loeschung landet automatisch im Protokoll
    (function historieAnhaengen() {
      const anbinden = () => {
        if (!window.MosaDB || window.MosaDB.__historie) return false;
        const originalPush = window.MosaDB.push;
        window.MosaDB.push = function (tabelle, daten) {
          try { namenMerken(tabelle, daten); } catch {}
          const result = originalPush ? originalPush.apply(this, arguments) : undefined;
          // Bereiche ohne eigenes Protokoll werden zentral erfasst. Explizite,
          // genauere Eintraege derselben Aktion gewinnen und verhindern Duplikate.
          setTimeout(() => {
            if (Date.now() - (LETZTER_AUDIT[tabelle] || 0) < 500) return;
            let label = '';
            try {
              const items = Array.isArray(daten) ? daten : (daten && typeof daten === 'object' ? Object.values(daten) : []);
              const last = items[items.length - 1];
              label = last && typeof last === 'object'
                ? (last.name || last.title || last.objekt || last.number || last.email || '')
                : '';
              if (!label && Array.isArray(daten)) label = `${daten.length} Einträge`;
            } catch {}
            protokolliere('geaendert', tabelle, label, true);
          }, 80);
          return result;
        };
        const original = window.MosaDB.remove;
        window.MosaDB.remove = function (tabelle, id) {
          try { protokolliere('geloescht', tabelle, bezeichnungFuer(tabelle, id)); } catch {}
          return original ? original.apply(this, arguments) : undefined;
        };
        window.MosaDB.__historie = true;
        return true;
      };
      if (!anbinden()) {
        // db-sync.js kommt erst spaeter — kurz nachfassen
        let versuche = 0;
        const t = setInterval(() => { if (anbinden() || ++versuche > 40) clearInterval(t); }, 250);
      }
    })();

    function zeitfaktorenFormularFuellen() {
      const f = ladeZeitfaktoren();
      const setz = (id, w) => { const e = document.getElementById(id); if (e) e.value = w; };
      setz('calcProQm', f.proQm);
      setz('calcProRaum', f.proRaum);
      setz('calcBauProQm', f.bauProQm);
      setz('calcStartAdresse', f.startAdresse || '');
      zeitfaktorenBeispiel();
    }

    // Zeigt sofort, was die Faktoren fuer eine typische Wohnung bedeuten
    function zeitfaktorenBeispiel() {
      const el = document.getElementById('calcBeispiel');
      if (!el) return;
      const proQm = parseFloat(document.getElementById('calcProQm')?.value) || 0;
      const proRaum = parseFloat(document.getElementById('calcProRaum')?.value) || 0;
      const min = Math.round(80 * proQm + 3 * proRaum);
      el.textContent = `${tt('calc.example', 'Beispiel')}: 80 m², 3 ${tt('calc.rooms', 'Zimmer')} → `
        + `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
    }

    function zeitfaktorenSpeichern() {
      if (!requirePerm('edit_prices', 'Zeitberechnung')) return;
      const zahl = (id, standard) => {
        const z = parseFloat(document.getElementById(id)?.value);
        return (Number.isFinite(z) && z >= 0) ? z : standard;
      };
      speichereZeitfaktoren({
        proQm: zahl('calcProQm', ZEITFAKTOREN_STANDARD.proQm),
        proRaum: zahl('calcProRaum', ZEITFAKTOREN_STANDARD.proRaum),
        bauProQm: zahl('calcBauProQm', ZEITFAKTOREN_STANDARD.bauProQm),
        startAdresse: (document.getElementById('calcStartAdresse')?.value || '').trim()
      });
      zeitfaktorenBeispiel();
      protokolliere('geaendert', 'company_time_factors', tt('calc.title', 'Zeitberechnung'));
      toast(tt('calc.saved', '✓ Gespeichert'));
    }

    // Die Vorlagenfelder: welches war zuletzt angeklickt, dorthin kommt der Baustein
    const VORLAGEN_FELDER = ['tplOfferteEinleitung', 'tplOfferteSchluss',
                             'tplRechnungText', 'tplRechnungBedingungen'];
    let letztesVorlagenFeld = 'tplOfferteEinleitung';

    // Einen Baustein an der Schreibmarke einfuegen. Die geschweiften Klammern
    // sind fuer den Benutzer kryptisch, darum tippt er sie nie selbst.
    function bausteinEinfuegen(baustein) {
      const feld = document.getElementById(letztesVorlagenFeld);
      if (!feld) return;
      const a = feld.selectionStart ?? feld.value.length;
      const e = feld.selectionEnd ?? feld.value.length;
      feld.value = feld.value.slice(0, a) + baustein + feld.value.slice(e);
      const neu = a + baustein.length;
      feld.focus();
      feld.setSelectionRange(neu, neu);
      vorlagenVorschau();
    }

    // Zeigt mit Beispieldaten, was aus den Bausteinen wird
    function vorlagenVorschau() {
      const el = document.getElementById('tplVorschau');
      if (!el) return;
      const co = loadCompany();
      const beispiel = {
        kunde: 'Lisa Berger',
        adresse: 'Seestrasse 4, 5000 Aarau',
        preis: '450.00 ' + coLocale(co).cur,
        datum: formatDateDE(todayISO()),
        gueltig: formatDateDE(validUntilISO(30)),
        firma: co.name || 'Deine Firma',
        leistung: tt('tpl.exampleService', 'Unterhaltsreinigung')
      };
      const fuellen = (t) => Object.entries(beispiel)
        .reduce((x, [k, v]) => x.split('{' + k + '}').join(v), String(t || ''));

      const hol = (id) => (document.getElementById(id)?.value || '').trim();
      const einleitung = hol('tplOfferteEinleitung');
      const schluss = hol('tplOfferteSchluss');
      const rText = hol('tplRechnungText');
      const rBed = hol('tplRechnungBedingungen');

      if (!einleitung && !schluss && !rText && !rBed) {
        el.innerHTML = `<span class="template-preview-empty">${tt('tpl.previewEmpty',
          'Noch nichts hinterlegt — es gelten die Standardtexte.')}</span>`;
        return;
      }
      const block = (titel, zeilen) => zeilen
        ? `<div class="template-preview-block"><strong>${escapeHtml(titel)}</strong>
             <div>${escapeHtml(fuellen(zeilen)).replace(/\n/g, '<br>')}</div></div>` : '';
      el.innerHTML =
        block(tt('tpl.previewQuote', 'Offerte'),
              [einleitung, schluss].filter(Boolean).join('\n\n…\n\n'))
      + block(tt('tpl.previewInvoice', 'Rechnung'),
              [rText, rBed].filter(Boolean).join('\n\n…\n\n'));
    }

    function vorlagenFormularFuellen() {
      const v = ladeVorlagen();
      const setz = (id, w) => { const e = document.getElementById(id); if (e) e.value = w || ''; };
      setz('tplOfferteEinleitung', v.offerteEinleitung);
      setz('tplOfferteSchluss', v.offerteSchluss);
      setz('tplRechnungText', v.rechnungText);
      setz('tplRechnungBedingungen', v.rechnungBedingungen);
      VORLAGEN_FELDER.forEach(id => {
        const f = document.getElementById(id);
        if (!f || f.dataset.verdrahtet) return;
        f.dataset.verdrahtet = '1';
        f.addEventListener('focus', () => { letztesVorlagenFeld = id; });
        f.addEventListener('input', vorlagenVorschau);
      });
      vorlagenVorschau();
    }

    function vorlagenSpeichern() {
      if (!requirePerm('edit_offerts', 'Vorlagen')) return;
      const hol = (id) => (document.getElementById(id)?.value || '').trim();
      speichereVorlagen({
        offerteEinleitung: hol('tplOfferteEinleitung'),
        offerteSchluss: hol('tplOfferteSchluss'),
        rechnungText: hol('tplRechnungText'),
        rechnungBedingungen: hol('tplRechnungBedingungen')
      });
      protokolliere('geaendert', 'company_templates', tt('tpl.title', 'Eigene Vorlagen'));
      toast(tt('tpl.saved', '✓ Vorlagen gespeichert'));
    }

    function renderHistorie() {
      const el = document.getElementById('historieListe');
      if (!el) return;
      const eintraege = ladeHistorie().slice(0, 50);
      if (!eintraege.length) {
        el.innerHTML = `<div style="text-align:center; padding:22px; color:var(--text-subtle); font-size:13px;">${tt('hist.empty','Noch nichts protokolliert.')}</div>`;
        return;
      }
      const FARBE = { geloescht: 'var(--danger)', geaendert: 'var(--accent)', angelegt: 'var(--success)' };
      el.innerHTML = eintraege.map(e => {
        const wann = e.ts ? new Date(e.ts).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' }) : '';
        return `<div class="activity-item">
          <div class="act-icon" style="background:${FARBE[e.aktion] || 'var(--text-muted)'}1a; color:${FARBE[e.aktion] || 'var(--text-muted)'}; font-size:10px; font-weight:700;">
            ${escapeHtml((e.wer || '?').split(/\s+/).map(t => t[0] || '').join('').slice(0, 2).toUpperCase())}
          </div>
          <div class="act-body">
            <div class="act-text">${escapeHtml(e.wer)} ${tt('hist.' + e.aktion, e.aktion)} ${escapeHtml(e.was)}${e.bezeichnung ? ' · ' + escapeHtml(e.bezeichnung) : ''}</div>
            <div class="act-meta">${escapeHtml(wann)}${e.werRolle ? ' · ' + escapeHtml(ROLE_DEFS[e.werRolle]?.label || e.werRolle) : ''}${e.werEmail ? ' · ' + escapeHtml(e.werEmail) : ''}</div>
          </div>
        </div>`;
      }).join('');
    }

    function historieLeeren() {
      if (!requirePerm('edit_users', 'Historie')) return;
      if (!confirm(tt('hist.clearAsk', 'Die ganze Historie löschen?'))) return;
      localStorage.removeItem(HISTORIE_KEY);
      renderHistorie();
      toast(tt('hist.cleared', 'Historie geleert'));
    }

    function getCurrentUserName() {
      try {
        const cu = users.find(u => u.id === currentUserId);
        return cu ? `${cu.firstName} ${cu.lastName}` : 'Brian K.';
      } catch { return 'Brian K.'; }
    }

    // Re-render bei Nav auf "kunden"
    document.querySelector('.nav-item[data-view="kunden"]')?.addEventListener('click', () => {
      setTimeout(renderKunden, 50);
    });
    renderKunden();

    document.querySelector('.nav-item[data-view="fahrzeuge"]')?.addEventListener('click', () => {
      setTimeout(renderFahrzeuge, 50);
    });
    renderFahrzeuge();

    document.querySelector('.nav-item[data-view="werkstattplan"]')?.addEventListener('click', () => {
      setTimeout(renderWerkstattplan, 50);
    });
    renderWerkstattplan();

    document.querySelector('.nav-item[data-view="reifen"]')?.addEventListener('click', () => {
      setTimeout(renderReifen, 50);
    });
    renderReifen();

    document.querySelector('.nav-item[data-view="koederstellen"]')?.addEventListener('click', () => {
      setTimeout(renderKoederstellen, 50);
    });
    renderKoederstellen();

    document.querySelector('.nav-item[data-view="protokolle"]')?.addEventListener('click', () => {
      setTimeout(renderPestProtocols, 50);
    });
    renderPestProtocols();

    document.querySelector('.nav-item[data-view="baustellen"]')?.addEventListener('click', () => {
      setTimeout(renderBaustellen, 50);
    });
    renderBaustellen();

    document.querySelector('.nav-item[data-view="rapporte"]')?.addEventListener('click', () => {
      setTimeout(renderRapporte, 50);
    });
    renderRapporte();

    // ============ MONATSBERICHT CSV ============
    function exportMonatsberichtCSV() {
      // Welcher Monat?
      const now = new Date();
      const monthLabel = now.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' });
      const ask = prompt(tt('csv.prompt', 'Monat exportieren? Format: YYYY-MM (z.B. {ex})\n\nLeer lassen = aktueller Monat ({m})').replace('{ex}', `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`).replace('{m}', monthLabel), '');
      let yyyymm;
      if (ask === null) return;
      if (!ask.trim()) {
        yyyymm = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      } else {
        if (!/^\d{4}-\d{2}$/.test(ask.trim())) { toast('Ungültiges Format. Bitte YYYY-MM', 'error'); return; }
        yyyymm = ask.trim();
      }
      const [yy, mm] = yyyymm.split('-').map(Number);
      const start = new Date(yy, mm - 1, 1);
      const end = new Date(yy, mm, 0); // letzter Tag des Monats

      // Alle Jobs des Monats sammeln
      const rows = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = isoDate(d);
        const jobs = getJobsForDate(new Date(d));
        jobs.forEach(j => {
          const empNames = j.assigned.map(id => {
            const e = empById(id);
            return e ? empName(e) : id;
          }).join(', ');
          rows.push({
            datum: dateKey,
            startzeit: j.start,
            dauer_min: j.duration,
            objekt: j.objekt || '',
            kunde: j._customer ? customerDisplayName(j._customer) : '— (Walk-In)',
            adresse: j.ort || '',
            leistung: j.svc || '',
            mitarbeiter: empNames,
            anzahl_mitarbeiter: j.assigned.length,
            preis_chf: (j.price || 0).toFixed(2).replace('.', ','),
            zahlart: j.paymethod || 'rechnung',
            notiz_buero: (j.noteOffice || '').replace(/[\r\n]+/g, ' ')
          });
        });
      }

      if (rows.length === 0) {
        toast(`${tt('toastdyn.noJobsInMonthPre','Keine Einsätze im Monat ')}${yyyymm}${tt('toastdyn.noJobsInMonthPost',' gefunden')}`, 'error');
        return;
      }

      // CSV bauen (Semikolon — Schweizer/DE-Excel kompatibel)
      const headers = [tt('csv.hDate','Datum'), tt('csv.hStart','Startzeit'), tt('csv.hDuration','Dauer (min)'), tt('csv.hObject','Objekt/Auftrag'), tt('csv.hCustomer','Kunde'), tt('csv.hAddress','Adresse'), tt('csv.hService','Leistung'), tt('csv.hStaff','Mitarbeiter'), tt('csv.hStaffCount','Anzahl MA'), tt('csv.hPrice','Preis (CHF)'), tt('csv.hPayment','Zahlart'), tt('csv.hNoteOffice','Notiz Büro')];
      const escape = (v) => {
        const s = String(v == null ? '' : v);
        if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };
      const lines = [headers.join(';')];
      let sumNetto = 0;
      rows.forEach(r => {
        lines.push([
          r.datum, r.startzeit, r.dauer_min, r.objekt, r.kunde, r.adresse,
          r.leistung, r.mitarbeiter, r.anzahl_mitarbeiter, r.preis_chf,
          r.zahlart, r.notiz_buero
        ].map(escape).join(';'));
        sumNetto += parseFloat(String(r.preis_chf).replace(',', '.')) || 0;
      });
      // Summenzeile
      lines.push('');
      lines.push(['', '', '', '', '', '', '', '', tt('csv.sumNet', 'SUMME NETTO:'), sumNetto.toFixed(2).replace('.', ','), '', ''].map(escape).join(';'));
      const csvL = coLocale(loadCompany());
      const mwst = sumNetto * csvL.vat;
      // Ohne Steuerpflicht keine Steuerzeile, sondern der Hinweis
      lines.push(csvL.mwstPflichtig
        ? ['', '', '', '', '', '', '', '', csvL.vatLabel + ':', mwst.toFixed(2).replace('.', ','), '', ''].map(escape).join(';')
        : ['', '', '', '', '', '', '', '', csvL.steuerHinweis, '', '', ''].map(escape).join(';'));
      lines.push(['', '', '', '', '', '', '', '', tt('csv.grossTotal', 'BRUTTO TOTAL:'), (sumNetto + mwst).toFixed(2).replace('.', ','), '', ''].map(escape).join(';'));

      // BOM für Excel-Kompatibilität (Umlaute)
      const csv = '\uFEFF' + lines.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Monatsbericht_${yyyymm}_CleanCockpit.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(`✓ ${rows.length} ${tt('toastdyn.jobsExported','Einsätze exportiert')} · CHF ${sumNetto.toFixed(2)} ${tt('toastdyn.net','netto')}`);
    }
