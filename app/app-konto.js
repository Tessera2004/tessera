// MosaOS — app-konto.js
//
// Anmeldung und Mandant, Rechnungen, Mail-Ansicht und der Start der App.
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

    // ============================================================
    // E-MAIL POSTFACH
    // ============================================================

    const MAIL_ACCOUNTS_KEY = 'cc-mail-accounts-v1';
    const MAIL_CACHE_KEY    = 'cc-mail-cache-v1';
    function loadMailAccounts() { try { const v = JSON.parse(localStorage.getItem(MAIL_ACCOUNTS_KEY)); return Array.isArray(v) ? v : []; } catch { return []; } }
    function saveMailAccounts(a) { localStorage.setItem(MAIL_ACCOUNTS_KEY, JSON.stringify(a)); }
    function loadMailCache() { try { return JSON.parse(localStorage.getItem(MAIL_CACHE_KEY)) || {}; } catch { return {}; } }
    function saveMailCache(c) { localStorage.setItem(MAIL_CACHE_KEY, JSON.stringify(c)); }

    // ── Mock-Mails (Demo-Betrieb bis echte Keys hinterlegt sind) ──
    const MOCK_MAILS = [
      { id:'mock-1', accountId:'demo', from:'patrizia.russo@bluewin.ch', fromName:'Patrizia Russo', to:'info@mosaos.ch',
        subject:'Endabgabe Wohnung — DRINGEND bis Freitag',
        date:'2026-06-22T11:47:00', isRead:false, labels:['inbox'],
        snippet:'Ich muss meine Wohnung am Freitag abgeben und benötige dringend eine Endabgabereinigung für Donnerstag…',
        body:'Guten Tag\n\nIch muss meine Wohnung am Freitag 26. Juni um 10:00 Uhr abgeben und benötige dringend eine Endabgabereinigung für Donnerstag den 25. Juni.\n\nDie Wohnung hat 3.5 Zimmer, ca. 82 m², Bahnhofstrasse 44, 3. OG, 5000 Aarau.\n\nIst das möglich? Was kostet das ungefähr?\n\nFreundliche Grüsse\nPatrizia Russo\nTel: 079 234 56 78' },
      { id:'mock-2', accountId:'demo', from:'mueller.hans@muellertreuhand.ch', fromName:'Hans Müller', to:'info@mosaos.ch',
        subject:'RE: Offerte Büroreinigung Hauptstrasse 12',
        date:'2026-06-22T09:14:00', isRead:false, labels:['inbox'],
        snippet:'Danke für das schnelle Angebot. Wir würden gerne annehmen, haben aber noch eine Frage zu den Samstagszeiten…',
        body:'Guten Tag\n\nVielen Dank für das schnelle Angebot. Wir würden gerne annehmen, haben aber noch eine Frage.\n\nKönnen Sie auch samstags reinigen? Unser Büro hat am Samstag keine Mitarbeiter vor Ort, daher wäre ein eigener Schlüssel nötig.\n\nMit freundlichen Grüssen\nHans Müller\nMüller Treuhand AG, Aarau' },
      { id:'mock-3', accountId:'demo', from:'roger.flueckiger@gmx.ch', fromName:'Roger Flückiger', to:'info@mosaos.ch',
        subject:'Bewerbung als Reinigungsfachkraft',
        date:'2026-06-21T15:33:00', isRead:false, labels:['inbox'],
        snippet:'Ich bewerbe mich als Reinigungsfachkraft — 5 Jahre Erfahrung, flexibel, eigenes Auto…',
        body:'Sehr geehrte Damen und Herren\n\nIch bewerbe mich als Reinigungsfachkraft. 5 Jahre Erfahrung in der Gebäudereinigung, flexibel einsetzbar, eigenes Auto vorhanden.\n\nLebenslauf sende ich gerne auf Anfrage.\n\nFreundliche Grüsse\nRoger Flückiger\nTel: 079 876 54 32' },
      { id:'mock-4', accountId:'demo', from:'monika.schmidt@hotmail.com', fromName:'Monika Schmidt', to:'info@mosaos.ch',
        subject:'Beschwerde — Qualität letzte Reinigung',
        date:'2026-06-20T18:22:00', isRead:true, labels:['inbox'],
        snippet:'Leider war der Boden nach der Reinigung vom Dienstag noch nicht sauber — Ecken wurden nicht berücksichtigt…',
        body:'Guten Tag\n\nLeider war der Boden in unserem Büro nach der Reinigung vom Dienstag (18.06.) noch nicht sauber. Die Ecken und der Bereich unter den Schreibtischen wurden nicht berücksichtigt.\n\nIch erwarte eine Nachbesserung oder eine Gutschrift für den nächsten Einsatz.\n\nMit freundlichem Gruss\nMonika Schmidt\nSchmidt & Partner GmbH' },
      { id:'mock-5', accountId:'demo', from:'stefan.weber@weberimmobilien.ch', fromName:'Stefan Weber', to:'info@mosaos.ch',
        subject:'Anfrage Hauswartung MFH Solothurnstrasse',
        date:'2026-06-19T10:05:00', isRead:true, labels:['inbox'],
        snippet:'Wir suchen für ein Mehrfamilienhaus (24 Einheiten) einen zuverlässigen Hauswart- und Reinigungsservice…',
        body:'Guten Tag\n\nWir suchen für ein Mehrfamilienhaus (24 Einheiten) an der Solothurnstrasse 88, 5000 Aarau einen Hauswart- und Reinigungsservice.\n\nGewünschte Leistungen: wöchentliche Treppenhausreinigung, Aussenanlage, Winterdienst.\n\nBitte senden Sie uns eine unverbindliche Offerte.\n\nMit freundlichen Grüssen\nStefan Weber\nWeber Immobilien AG' },
      { id:'mock-6', accountId:'demo', from:'nicole.baumann@sunrise.ch', fromName:'Nicole Baumann', to:'info@mosaos.ch',
        subject:'Kündigung Reinigungsabo per Ende Juli',
        date:'2026-06-18T14:11:00', isRead:true, labels:['inbox'],
        snippet:'Hiermit kündige ich unser Reinigungsabo (K-0042) per Ende Juli 2026. Wir ziehen in neue Räumlichkeiten…',
        body:'Guten Tag\n\nHiermit kündige ich unser monatliches Reinigungsabo (Kundennummer K-0042) per Ende Juli 2026. Wir ziehen in neue Räumlichkeiten, die bereits einen Hausdienst haben.\n\nVielen Dank für die gute Zusammenarbeit.\n\nFreundliche Grüsse\nNicole Baumann' },
      { id:'mock-7', accountId:'demo', from:'thomas.keller@kellerbau.ch', fromName:'Thomas Keller', to:'info@mosaos.ch',
        subject:'Baureinigung Neubau Aarau-West — Anfrage',
        date:'2026-06-17T08:44:00', isRead:true, labels:['inbox'],
        snippet:'Wir schliessen im August einen Neubau mit 16 Wohneinheiten ab und suchen einen Partner für die Baureinigung…',
        body:'Sehr geehrte Damen und Herren\n\nWir schliessen im August einen Neubau mit 16 Wohneinheiten in Aarau-West ab und suchen einen Partner für die Baureinigung.\n\nBauvolumen: ca. 3\'200 m² Wohnfläche\nGeplanter Reinigungseinsatz: 18.–22. August 2026\n\nBitte nehmen Sie für eine Besichtigung Kontakt auf.\n\nMit freundlichen Grüssen\nThomas Keller\nKeller Bau AG' },
      { id:'mock-8', accountId:'demo', from:'dr.sommer@sommer-partner.ch', fromName:'Dr. Andrea Sommer', to:'info@mosaos.ch',
        subject:'Vielen Dank — hervorragende Arbeit!',
        date:'2026-06-16T16:58:00', isRead:true, labels:['inbox'],
        snippet:'Ich möchte mich herzlich für die tolle Arbeit bei der letzten Reinigung bedanken — absolut tadellos…',
        body:'Guten Tag\n\nIch möchte mich herzlich für die tolle Arbeit bei der letzten Reinigung (Freitag, 14. Juni) bedanken. Das Büro war absolut tadellos — das Team war pünktlich und diskret.\n\nWir sind rundum zufrieden und freuen uns auf die weitere Zusammenarbeit!\n\nHerzliche Grüsse\nDr. Andrea Sommer\nSommer & Partner Rechtsanwälte' },
    ];

    let mailCurrentFilter = 'all';
    let mailSelectedId = null;

    function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function getAllMails() {
      const cache = loadMailCache();
      // Echtes Produktverhalten: Ohne angebundenes Postfach keine erfundenen Kundennachrichten.
      // Mock-Mails können nur bewusst für interne Präsentationen eingeschaltet werden.
      let all = window.MOSAOS_DEMO_MAILS === true ? MOCK_MAILS.slice() : [];
      for (const acc of loadMailAccounts()) {
        if (cache[acc.id]) all = all.concat(cache[acc.id]);
      }
      return all.sort((a,b) => new Date(b.date) - new Date(a.date));
    }

    function mailHasTask(mailId) { return TASKS.some(t => t.sourceMail?.id === mailId); }

    function fmtMailTime(d) {
      const dt = new Date(d), now = new Date();
      const yest = new Date(now); yest.setDate(now.getDate()-1);
      if (dt.toDateString() === now.toDateString()) return dt.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});
      if (dt.toDateString() === yest.toDateString()) return 'Gestern';
      return dt.toLocaleDateString(dateLocale(),{day:'2-digit',month:'short'});
    }
    function fmtMailFull(d) {
      return new Date(d).toLocaleString('de-CH',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
    }

    // ── Provider-Karten (wiederverwendet in Leerzustand + Modal) ──
    function renderMailProviderGrid(targetId) {
      const el = document.getElementById(targetId);
      if (!el) return;
      const cfg = window.MOSAOS_MAIL || {};
      const providers = [
        { type:'gmail',   name:'Gmail',         sub:'Google Workspace & Gmail',
          icon:`<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#EA4335" d="M1 6.5l11 7 11-7V18a2 2 0 01-2 2H3a2 2 0 01-2-2V6.5z"/><path fill="#4285F4" d="M23 5.5L12 12.5 1 5.5A2 2 0 013 4h18a2 2 0 012 1.5z"/></svg>`,
          bg:'#fff', border:'1px solid #e5e7eb',
          ready:!!cfg.gmail?.clientId },
        { type:'outlook', name:'Outlook',        sub:'Microsoft 365 & Outlook.com',
          icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#0078D4"/><path fill="white" d="M13 5h7v5h-7zM13 11h7v5h-7zM13 17h7v3h-7zM4 5h8v15H4z"/><circle fill="#0078D4" cx="8" cy="12" r="2.5"/></svg>`,
          bg:'#0078D4', border:'none',
          ready:!!cfg.outlook?.clientId },
        { type:'icloud',  name:'iCloud Mail',    sub:'Apple iCloud (IMAP via Proxy)',
          icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#1d9bf0"/><path fill="white" d="M18 14a4 4 0 00-3-3.87V10a5 5 0 00-10 0v.13A4 4 0 006 18h12a4 4 0 000-4z"/></svg>`,
          bg:'#1d9bf0', border:'none',
          ready:!!cfg.imap?.proxyUrl },
        { type:'imap',    name:'Webmail / IMAP', sub:'Beliebiger IMAP-Server',
          icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#6366f1"/><path fill="white" d="M4 8h16v10H4zM4 8l8 6 8-6"/></svg>`,
          bg:'#6366f1', border:'none',
          ready:!!cfg.imap?.proxyUrl },
      ];
      el.innerHTML = providers.map(p => `
        <div class="mail-provider-card${p.ready ? '' : ' is-disabled'}" ${p.ready ? `onclick="connectProvider('${p.type}')"` : 'aria-disabled="true"'}>
          <div class="mail-provider-icon" style="background:${p.bg};${p.border?'border:'+p.border+';':''}">
            ${p.icon}
          </div>
          <div>
            <div class="mail-provider-name">${p.name}</div>
            <div class="mail-provider-sub">${p.sub}</div>
            <span class="mail-provider-badge ${p.ready ? 'ready' : 'needs-key'}">${p.ready ? '✓ Bereit' : 'In Vorbereitung'}</span>
          </div>
        </div>`).join('');
    }

    // ── Hauptansicht rendern ──
    function renderMailView() {
      const accounts = loadMailAccounts();
      const allMails = getAllMails();
      const unread = allMails.filter(m => !m.isRead).length;

      const sub = document.getElementById('mailSubtitle');
      if (sub) sub.textContent = accounts.length
        ? `${accounts.length} ${tt('sub.connected','verbunden')} · ${allMails.length} ${tt('sub.mails','Mails')} · ${unread} ${tt('sub.unread','ungelesen')}`
        : tt('mail.emptyTitle', 'Kein Postfach verbunden');
      const cfg = window.MOSAOS_MAIL || {};
      const mailAvailable = !!(cfg.gmail?.clientId || cfg.outlook?.clientId || cfg.imap?.proxyUrl);
      const connectButton = document.getElementById('mailConnectButton');
      if (connectButton && !accounts.length) {
        connectButton.disabled = !mailAvailable;
        connectButton.textContent = mailAvailable ? '+ ' + tt('mail.connect', 'Postfach verbinden') : 'Mail-Anbindung in Vorbereitung';
      }
      const emptyDescription = document.getElementById('mailEmptyDescription');
      if (emptyDescription && !accounts.length && !mailAvailable) {
        emptyDescription.textContent = 'Die Mail-Anbindung wird vorbereitet. Einsatzplanung, Kunden, Aufgaben, Offerten und Rechnungen kannst du bereits nutzen.';
      }

      // Nav-Badge
      const badge = document.getElementById('mailNavBadge');
      if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? '' : 'none'; }

      // Account-Leiste
      const bar = document.getElementById('mailAccountBar');
      if (bar) {
        let pills = '';
        accounts.forEach(a => {
          const clr = a.provider==='gmail' ? '#ea4335' : a.provider==='outlook' ? '#0078d4' : a.provider==='icloud' ? '#1d9bf0' : '#6366f1';
          pills += `<span class="mail-account-pill"><span class="pdot" style="background:${clr};"></span>${_esc(a.email)} <button onclick="disconnectMailAccount('${a.id}')" style="margin-left:5px;background:none;border:none;color:var(--text-subtle);cursor:pointer;font-size:11px;padding:0;">✕</button></span>`;
        });
        bar.innerHTML = pills + `<button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="openModal('mailConnect')">+ Hinzufügen</button>`;
        bar.style.display = accounts.length ? 'flex' : 'none';
      }

      // Leerzustand vs. Inbox
      const empty = document.getElementById('mailEmptyState');
      const inbox = document.getElementById('mailInboxWrap');
      empty.style.display = accounts.length ? 'none' : '';
      inbox.style.display = accounts.length ? '' : 'none';

      renderMailProviderGrid('mailProviderGridEmpty');
      renderMailProviderGrid('mailProviderGridModal');
      renderMailList();
    }

    function setMailFilter(f) {
      mailCurrentFilter = f;
      document.querySelectorAll('.mail-filter-tabs button').forEach(b => b.classList.toggle('is-active', b.dataset.mf === f));
      renderMailList();
    }

    function renderMailList() {
      const wrap = document.getElementById('mailList');
      if (!wrap) return;
      const q = (document.getElementById('mailSearch')?.value || '').toLowerCase().trim();
      let mails = getAllMails();
      if (mailCurrentFilter === 'unread') mails = mails.filter(m => !m.isRead);
      else if (mailCurrentFilter === 'tasks') mails = mails.filter(m => mailHasTask(m.id));
      if (q) mails = mails.filter(m =>
        m.subject.toLowerCase().includes(q) ||
        (m.fromName||'').toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        (m.snippet||'').toLowerCase().includes(q)
      );
      if (!mails.length) {
        wrap.innerHTML = `<div style="padding:32px 20px;text-align:center;color:var(--text-subtle);font-size:13px;">${tt('est.noMails','Keine Mails gefunden.')}</div>`;
        return;
      }
      wrap.innerHTML = mails.map(m => {
        const hasTask = mailHasTask(m.id);
        return `<div class="mail-item${!m.isRead?' is-unread':''}${mailSelectedId===m.id?' is-selected':''}" onclick="selectMail('${m.id}')">
          <div class="mail-unread-dot" style="visibility:${m.isRead?'hidden':'visible'};"></div>
          <div class="mail-item-body">
            <div class="mail-item-from">${_esc(m.fromName||m.from)}</div>
            <div class="mail-item-subject">${_esc(m.subject)}</div>
            <div class="mail-item-snippet">${_esc(m.snippet||'')}</div>
          </div>
          <div class="mail-item-meta">
            <span class="mail-item-date">${fmtMailTime(m.date)}</span>
            ${hasTask ? '<span class="mail-task-chip">✓ Aufgabe</span>' : ''}
          </div>
        </div>`;
      }).join('');
    }

    function selectMail(id) {
      mailSelectedId = id;
      // Als gelesen markieren (Demo)
      const mi = MOCK_MAILS.findIndex(m => m.id === id);
      if (mi >= 0) MOCK_MAILS[mi].isRead = true;
      renderMailList();
      showMailDetail(id);
      // Badge aktualisieren
      const u = getAllMails().filter(m => !m.isRead).length;
      const b = document.getElementById('mailNavBadge');
      if (b) { b.textContent = u; b.style.display = u > 0 ? '' : 'none'; }
      const s = document.getElementById('mailSubtitle');
      if (s) s.textContent = `${tt('sub.demoAccount','Demo-Konto')} · ${getAllMails().length} ${tt('sub.mails','Mails')} · ${u} ${tt('sub.unread','ungelesen')}`;
    }

    function showMailDetail(id) {
      const mail = getAllMails().find(m => m.id === id);
      const content = document.getElementById('mailDetailContent');
      const placeholder = document.getElementById('mailDetailPlaceholder');
      if (!content || !mail) return;
      placeholder.style.display = 'none';
      content.style.display = '';
      const hasTask = mailHasTask(id);
      const users = loadUsers();
      const userOpts = users.map(u => `<option value="${safeAttr(u.id)}">${escapeHtml(u.firstname)} ${escapeHtml(u.lastname)}</option>`).join('');
      content.innerHTML = `
        <div class="mail-detail-inner">
          <div class="mail-detail-subject">${_esc(mail.subject)}</div>
          <div class="mail-detail-meta">
            <div><strong>Von:</strong> ${_esc(mail.fromName||mail.from)} &lt;${_esc(mail.from)}&gt;</div>
            <div><strong>An:</strong> ${_esc(mail.to||'—')}</div>
            <div><strong>Datum:</strong> ${fmtMailFull(mail.date)}</div>
          </div>
          <div class="mail-detail-body">${_esc(mail.body||mail.snippet||'')}</div>
          <div class="mail-detail-actions">
            ${hasTask
              ? `<span style="font-size:13px;color:var(--accent);font-weight:600;">✓ Aufgabe bereits erstellt</span>`
              : `<div class="mail-to-task-row">
                   <select id="mailTaskAssignee" class="mail-task-assignee-sel" title="Zuweisen an">${userOpts}</select>
                   <button class="btn btn-accent" onclick="mailToTask('${id}')">→ Als Aufgabe</button>
                 </div>`}
            <button class="btn btn-secondary" onclick="startMailReply('${id}')">↩ Antworten</button>
          </div>
          <div id="mailReplyPanel" style="display:none;"></div>
        </div>`;
    }

    function mailToTask(mailId) {
      const mail = getAllMails().find(m => m.id === mailId);
      if (!mail) return;
      const assignee = document.getElementById('mailTaskAssignee')?.value || null;
      openTaskModal(null, {
        title: mail.subject,
        desc: `Von: ${mail.fromName||mail.from} <${mail.from}>\nDatum: ${fmtMailFull(mail.date)}\n\n${mail.body||mail.snippet}`,
        label: `✉️ ${mail.fromName||mail.from} · ${fmtMailTime(mail.date)}`,
        type: 'mail',
        assignee,
        sourceMail: { id:mail.id, from:mail.from, fromName:mail.fromName, subject:mail.subject, date:mail.date }
      });
    }

    // ── Reply ──
    function startMailReply(mailId) {
      const mail = getAllMails().find(m => m.id === mailId);
      const panel = document.getElementById('mailReplyPanel');
      if (!mail || !panel) return;
      const reSubject = mail.subject.startsWith('Re:') ? mail.subject : 'Re: ' + mail.subject;
      panel.style.display = '';
      panel.innerHTML = `
        <div class="mail-reply-panel">
          <div class="mail-reply-header">Antwort verfassen</div>
          <div class="mail-reply-meta">
            <div><strong>An:</strong> ${_esc(mail.fromName||mail.from)} &lt;${_esc(mail.from)}&gt;</div>
            <div><strong>Betreff:</strong> ${_esc(reSubject)}</div>
          </div>
          <textarea id="mailReplyBody" class="mail-reply-textarea" placeholder="Antwort schreiben…"></textarea>
          <div class="mail-reply-footer">
            <button class="btn btn-secondary" onclick="cancelMailReply()">Abbrechen</button>
            <button class="btn btn-accent" id="mailReplySendBtn" onclick="sendMailReply('${mailId}')">Senden ↗</button>
          </div>
        </div>`;
      setTimeout(() => document.getElementById('mailReplyBody')?.focus(), 40);
    }

    function cancelMailReply() {
      const panel = document.getElementById('mailReplyPanel');
      if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
    }

    async function sendMailReply(mailId) {
      const mail = getAllMails().find(m => m.id === mailId);
      const bodyEl = document.getElementById('mailReplyBody');
      const body = bodyEl?.value.trim();
      if (!body) { toast('Bitte Antwort eingeben', 'error'); bodyEl?.focus(); return; }

      const btn = document.getElementById('mailReplySendBtn');
      if (btn) { btn.disabled = true; btn.textContent = 'Senden…'; }

      const accounts = loadMailAccounts();
      const acc = accounts.find(a => a.id === mail.accountId);
      const reSubject = mail.subject.startsWith('Re:') ? mail.subject : 'Re: ' + mail.subject;

      try {
        if (!acc || mail.accountId === 'demo') {
          await new Promise(r => setTimeout(r, 600)); // simulierter Netzwerkaufruf
          cancelMailReply();
          toast(`✓ ${tt('toastdyn.replyToPre','Antwort an')} ${mail.fromName||mail.from} ${tt('toastdyn.replySentDemo','gesendet (Demo-Modus)')}`);
        } else if (acc.provider === 'gmail') {
          await _sendReplyGmail(acc, mail.from, reSubject, body);
          cancelMailReply();
          toast('✓ Antwort über Gmail gesendet');
        } else if (acc.provider === 'outlook') {
          await _sendReplyOutlook(acc, mail.from, reSubject, body);
          cancelMailReply();
          toast('✓ Antwort über Outlook gesendet');
        } else {
          await _sendReplySmtp(acc, mail.from, reSubject, body);
          cancelMailReply();
          toast('✓ Antwort gesendet');
        }
      } catch(e) {
        toast(tt('toastdyn.sendFailed','Senden fehlgeschlagen') + ': ' + e.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Senden ↗'; }
      }
    }

    async function _sendReplyGmail(acc, toAddr, subject, body) {
      const msg = [`To: ${toAddr}`, `Subject: ${subject}`, `Content-Type: text/plain; charset=utf-8`, '', body].join('\r\n');
      const raw = btoa(unescape(encodeURIComponent(msg))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      const r = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + acc.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw })
      });
      if (!r.ok) { const e = await r.json().catch(()=>{}); throw new Error('Gmail ' + r.status + (e?.error?.message ? ': ' + e.error.message : '')); }
    }

    async function _sendReplyOutlook(acc, toAddr, subject, body) {
      const r = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + acc.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { subject, body: { contentType: 'Text', content: body }, toRecipients: [{ emailAddress: { address: toAddr } }] } })
      });
      if (!r.ok) { const e = await r.json().catch(()=>{}); throw new Error('Outlook ' + r.status + (e?.error?.message ? ': ' + e.error.message : '')); }
    }

    async function _sendReplySmtp(acc, toAddr, subject, body) {
      const proxyUrl = window.MOSAOS_MAIL?.imap?.proxyUrl;
      if (!proxyUrl) throw new Error('SMTP-Proxy nicht konfiguriert (proxyUrl in mail-config.js)');
      const smtpUrl = proxyUrl.replace(/imap-fetch\/?$/, 'smtp-send');
      const r = await fetch(smtpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: acc.email, to: toAddr, subject, body, host: (acc.host||'').replace(/^imap\./, 'smtp.'), port: 587 })
      });
      if (!r.ok) throw new Error('SMTP-Proxy ' + r.status);
    }

    // ── Provider-Verbindungslogik ──
    function connectProvider(type) {
      closeModal('mailConnect');
      if (type === 'gmail')   connectGmail();
      else if (type === 'outlook') connectOutlook();
      else if (type === 'icloud') { updateImapPreset('icloud'); openModal('mailImap'); }
      else { updateImapPreset('custom'); openModal('mailImap'); }
    }

    function connectGmail() {
      const cid = window.MOSAOS_MAIL?.gmail?.clientId;
      if (!cid) { toast('Gmail Client-ID fehlt — in mail-config.js eintragen.', 'error'); return; }
      const scope = 'https://www.googleapis.com/auth/gmail.readonly';
      const redirect = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(cid)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=select_account`;
      const popup = window.open(url, 'gmail-auth', 'width=520,height=640,left=200,top=80');
      if (!popup) { toast('Pop-up blockiert — bitte im Browser erlauben.', 'error'); return; }
      const t = setInterval(() => {
        try {
          const token = new URLSearchParams(popup.location.hash.slice(1)).get('access_token');
          if (token) { clearInterval(t); popup.close(); finishGmailConnect(token); }
        } catch {}
        if (popup.closed) clearInterval(t);
      }, 600);
    }
    async function finishGmailConnect(token) {
      try {
        const p = await (await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', { headers:{'Authorization':'Bearer '+token} })).json();
        const acc = { id:'gmail-'+Date.now(), provider:'gmail', email:p.emailAddress, name:p.emailAddress, token };
        const accs = loadMailAccounts(); accs.push(acc); saveMailAccounts(accs);
        toast(tt('toastdyn.gmailConnected','✓ Gmail verbunden') + ': ' + p.emailAddress);
        await fetchGmailMails(acc);
        renderMailView();
      } catch(e) { toast(tt('toastdyn.gmailConnFailed','Gmail-Verbindung fehlgeschlagen') + ': ' + e.message, 'error'); }
    }
    async function fetchGmailMails(acc) {
      try {
        const list = await (await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=30&labelIds=INBOX', { headers:{'Authorization':'Bearer '+acc.token} })).json();
        if (!list.messages) return;
        const mails = [];
        for (const msg of list.messages.slice(0,20)) {
          const m = await (await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From,To,Subject,Date`, { headers:{'Authorization':'Bearer '+acc.token} })).json();
          const h = (m.payload?.headers||[]).reduce((o,x)=>(o[x.name]=x.value,o),{});
          const raw = h.From||''; const nm = raw.match(/^"?([^"<]+)"?\s*</);
          mails.push({ id:m.id, accountId:acc.id, from:raw.replace(/.*<(.+)>/,'$1').trim()||raw, fromName:nm?nm[1].trim():'',
            to:h.To||'', subject:h.Subject||'(kein Betreff)', date:new Date(parseInt(m.internalDate)).toISOString(),
            snippet:m.snippet||'', body:m.snippet||'', isRead:!m.labelIds?.includes('UNREAD'), labels:m.labelIds||[] });
        }
        const c = loadMailCache(); c[acc.id] = mails; saveMailCache(c);
      } catch {}
    }

    function connectOutlook() {
      const cfg = window.MOSAOS_MAIL?.outlook;
      if (!cfg?.clientId) { toast('Outlook Azure Client-ID fehlt — in mail-config.js eintragen.', 'error'); return; }
      const scope = 'https://graph.microsoft.com/Mail.Read offline_access';
      const redirect = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
      const url = `https://login.microsoftonline.com/${cfg.tenantId||'common'}/oauth2/v2.0/authorize?client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=select_account`;
      const popup = window.open(url, 'outlook-auth', 'width=520,height=640,left=200,top=80');
      if (!popup) { toast('Pop-up blockiert.', 'error'); return; }
      const t = setInterval(() => {
        try {
          const token = new URLSearchParams(popup.location.hash.slice(1)).get('access_token');
          if (token) { clearInterval(t); popup.close(); finishOutlookConnect(token); }
        } catch {}
        if (popup.closed) clearInterval(t);
      }, 600);
    }
    async function finishOutlookConnect(token) {
      try {
        const p = await (await fetch('https://graph.microsoft.com/v1.0/me', { headers:{'Authorization':'Bearer '+token} })).json();
        const acc = { id:'outlook-'+Date.now(), provider:'outlook', email:p.mail||p.userPrincipalName, name:p.displayName, token };
        const accs = loadMailAccounts(); accs.push(acc); saveMailAccounts(accs);
        toast(tt('toastdyn.outlookConnected','✓ Outlook verbunden') + ': ' + acc.email);
        await fetchOutlookMails(acc);
        renderMailView();
      } catch(e) { toast(tt('toastdyn.outlookConnFailed','Outlook-Verbindung fehlgeschlagen') + ': ' + e.message, 'error'); }
    }
    async function fetchOutlookMails(acc) {
      try {
        const data = await (await fetch('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=30&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead', { headers:{'Authorization':'Bearer '+acc.token} })).json();
        if (!data.value) return;
        const mails = data.value.map(m => ({ id:m.id, accountId:acc.id,
          from:m.from?.emailAddress?.address||'', fromName:m.from?.emailAddress?.name||'',
          to:m.toRecipients?.[0]?.emailAddress?.address||'', subject:m.subject||'(kein Betreff)',
          date:m.receivedDateTime, snippet:m.bodyPreview||'', body:m.bodyPreview||'',
          isRead:m.isRead, labels:['inbox'] }));
        const c = loadMailCache(); c[acc.id] = mails; saveMailCache(c);
      } catch {}
    }

    function updateImapPreset(preset) {
      const sel = document.getElementById('imapPreset');
      if (preset && sel) sel.value = preset;
      const p = sel?.value || 'icloud';
      const hostField = document.getElementById('imapServerField');
      const title = document.getElementById('imapModalTitle');
      const passLabel = document.getElementById('imapPassLabel');
      const passHint = document.getElementById('imapPassHint');
      if (p === 'icloud') {
        if (hostField) hostField.style.display = 'none';
        if (title) title.textContent = tt('mi.titleIcloud', 'iCloud Mail verbinden');
        if (passLabel) passLabel.textContent = tt('mi.passApp', 'App-spezifisches Passwort');
        if (passHint) passHint.textContent = tt('mi.passAppHint', 'iCloud: Einstellungen → Apple-ID → Anmelden & Sicherheit → App-Passwörter generieren');
      } else {
        if (hostField) hostField.style.display = '';
        if (title) title.textContent = tt('mi.titleCustom', 'Webmail / IMAP verbinden');
        if (passLabel) passLabel.textContent = tt('mi.passPlain', 'Passwort');
        if (passHint) passHint.textContent = '';
      }
    }

    async function connectImap() {
      const proxyUrl = window.MOSAOS_MAIL?.imap?.proxyUrl;
      if (!proxyUrl) { toast('IMAP-Proxy nicht konfiguriert — proxyUrl in mail-config.js eintragen.', 'error'); return; }
      const preset = document.getElementById('imapPreset').value;
      const email = document.getElementById('imapEmail').value.trim();
      const pass  = document.getElementById('imapPass').value;
      const host  = preset === 'icloud' ? 'imap.mail.me.com' : (document.getElementById('imapHost')?.value.trim() || '');
      const port  = 993;
      if (!email || !pass) { toast('E-Mail und Passwort erforderlich.', 'error'); return; }
      const btn = document.getElementById('imapConnectBtn');
      if (btn) { btn.disabled = true; btn.textContent = 'Verbinde…'; }
      try {
        const r = await fetch(proxyUrl, { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ host, port, user:email, password:pass, folder:'INBOX', limit:30 }) });
        if (!r.ok) throw new Error('Server-Fehler '+r.status);
        const data = await r.json();
        const acc = { id:'imap-'+Date.now(), provider:preset==='icloud'?'icloud':'imap', email, name:email, host, port };
        const accs = loadMailAccounts(); accs.push(acc); saveMailAccounts(accs);
        const c = loadMailCache(); c[acc.id] = (data.messages||[]).map(m=>({...m, accountId:acc.id})); saveMailCache(c);
        closeModal('mailImap');
        toast(`✓ ${preset==='icloud'?'iCloud Mail':'IMAP'} ${tt('toastdyn.connectedSuffix','verbunden')}: ${email}`);
        renderMailView();
      } catch(e) { toast(tt('toastdyn.connFailed','Verbindung fehlgeschlagen') + ': ' + e.message, 'error'); }
      finally { if (btn) { btn.disabled=false; btn.textContent='Verbinden'; } }
    }

    function disconnectMailAccount(accId) {
      if (!confirm('Postfach trennen?')) return;
      saveMailAccounts(loadMailAccounts().filter(a => a.id !== accId));
      const c = loadMailCache(); delete c[accId]; saveMailCache(c);
      if (mailSelectedId) { const mail = getAllMails().find(m => m.id === mailSelectedId); if (!mail) { mailSelectedId = null; document.getElementById('mailDetailContent').style.display='none'; document.getElementById('mailDetailPlaceholder').style.display=''; } }
      toast('Postfach getrennt');
      renderMailView();
    }

    // ============================================================
    // SUPABASE CLIENT
    // ============================================================
    function getSupabase() {
      // Bevorzuge dedizierten Config-Eintrag; falle auf supabase-client.js (window.SB) zurück
      const cfg = window.MOSAOS_SUPABASE;
      if (cfg?.url && cfg?.anonKey && window.supabase) {
        if (!window._sbClient) window._sbClient = window.supabase.createClient(cfg.url, cfg.anonKey);
        return window._sbClient;
      }
      return window.SB || null;
    }

    // ── Mandanten-ID (wird nach Login aus tenant_users geladen) ──
    window._tenantId = null;

    async function loadTenantId() {
      if (window._tenantId) return window._tenantId;
      const sb = getSupabase();
      if (!sb) return null;
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return null;
        const { data } = await sb
          .from('tenant_users')
          .select('tenant_id, role')
          .eq('user_id', session.user.id)
          .single();
        if (data?.tenant_id) {
          window._tenantId = data.tenant_id;
          window._authRole = data.role || null;
        }
      } catch {}
      return window._tenantId;
    }

    // ── Login-Status / Abmelden ──────────────────────────────
    window._authEmail = null;

    async function refreshAuthStatus() {
      const sb = getSupabase();
      const rowEl = document.getElementById('authStatusRow');
      const lblEl = document.getElementById('authActionLabel');
      let session = null;
      if (sb) { try { session = (await sb.auth.getSession()).data.session; } catch {} }
      window._authEmail = session?.user?.email || null;
      if (window._authEmail) {
        if (rowEl) rowEl.textContent = window._authEmail + (window._dbReady ? ' · ' + tt('auth.statusSynced', 'synchronisiert') : '');
        if (lblEl) lblEl.textContent = tt('common.logout', 'Abmelden');
      } else {
        if (rowEl) rowEl.textContent = tt('auth.statusLocal', 'Nicht angemeldet · nur lokal');
        if (lblEl) lblEl.textContent = tt('common.login', 'Anmelden');
      }
      // Abo-Status laden → steuert, welche Module freigeschaltet sind
      if (window.MosaBilling) {
        try {
          await window.MosaBilling.loadSubscription();
          applyFeatureFlags();
          renderModuleSettings();
        } catch {}
      }
    }

    // Entfernt die lokal zwischengespeicherten Geschäftsdaten (cc-*) von diesem Gerät.
    // UI-Einstellungen (Theme, Skin) und das „Angemeldet bleiben"-Flag bleiben erhalten.
    function clearLocalCache() {
      const keep = new Set(['cc-theme', 'cc-skin']);
      Object.keys(localStorage)
        .filter(k => k.startsWith('cc-') && !keep.has(k))
        .forEach(k => localStorage.removeItem(k));
    }

    async function onAuthAction() {
      closeUserMenu();
      const sb = getSupabase();
      if (window._authEmail && sb) {
        if (!confirm('Abmelden? Zur Sicherheit werden die lokal gespeicherten Daten auf diesem Gerät entfernt. Sie bleiben in der Cloud gesichert und werden beim nächsten Login automatisch neu geladen.')) return;
        try { await sb.auth.signOut(); } catch {}
        try { clearLocalCache(); } catch {}
        window.location.href = 'login.html';
      } else {
        window.location.href = 'login.html';
      }
    }

    async function refreshMfaStatus() {
      const sb = getSupabase(); const status = document.getElementById('mfaStatus');
      if (!sb || !window._authEmail) { if (status) status.textContent = 'Für 2FA bitte anmelden.'; return; }
      try {
        const { data, error } = await sb.auth.mfa.listFactors(); if (error) throw error;
        const active = (data?.totp || []).some(f => f.status === 'verified');
        status.textContent = active ? '✓ 2FA ist für dieses Konto aktiv.' : '2FA ist noch nicht aktiv. Für Administratoren dringend empfohlen.';
        document.getElementById('mfaEnableBtn').style.display = active ? 'none' : 'inline-flex';
        document.getElementById('mfaDisableBtn').style.display = active ? 'inline-flex' : 'none';
      } catch (error) { status.textContent = '2FA-Status konnte nicht geladen werden.'; }
    }

    async function enrollMfa() {
      const sb = getSupabase(); if (!sb) return;
      try {
        const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'MosaOS' });
        if (error) throw error;
        const factorId = data.id;
        const overlay = document.createElement('div'); overlay.className = 'modal-backdrop open'; overlay.id = 'mfaSetupModal';
        overlay.innerHTML = `<div class="modal" style="max-width:420px;"><div class="modal-title">2FA einrichten</div><p style="font-size:13px;color:var(--text-muted);">Scanne den Code mit deiner Authenticator-App und gib danach den sechsstelligen Code ein.</p><img alt="2FA QR-Code" style="display:block;width:210px;height:210px;margin:16px auto;background:white;border-radius:12px;" /><input id="mfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" /><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;"><button class="btn btn-secondary" id="mfaCancel">Abbrechen</button><button class="btn btn-accent" id="mfaVerify">Bestätigen</button></div></div>`;
        overlay.querySelector('img').src = data.totp.qr_code; document.body.appendChild(overlay);
        overlay.querySelector('#mfaCancel').onclick = async () => { await sb.auth.mfa.unenroll({ factorId }); overlay.remove(); };
        overlay.querySelector('#mfaVerify').onclick = async () => {
          const code = overlay.querySelector('#mfaCode').value.trim();
          const { error: verifyError } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
          if (verifyError) { alert('Code ungültig. Bitte erneut versuchen.'); return; }
          overlay.remove(); await refreshMfaStatus(); toast('✓ Zwei-Faktor-Authentifizierung aktiviert');
        };
      } catch (error) { alert('2FA konnte nicht aktiviert werden: ' + error.message); }
    }

    async function disableMfa() {
      if (!confirm('Zwei-Faktor-Authentifizierung wirklich deaktivieren?')) return;
      const sb = getSupabase(); if (!sb) return;
      const { data } = await sb.auth.mfa.listFactors();
      for (const factor of (data?.totp || []).filter(f => f.status === 'verified')) await sb.auth.mfa.unenroll({ factorId: factor.id });
      await refreshMfaStatus(); toast('2FA deaktiviert');
    }

    // Konto löschen (DSG – Recht auf Löschung). Ruft die Edge Function delete-account.
    async function exportCompanyData() {
      const sb = getSupabase();
      const session = sb ? (await sb.auth.getSession()).data.session : null;
      if (!session) { alert('Bitte zuerst anmelden.'); return; }
      try {
        const response = await fetch((window.SUPA_URL || '') + '/functions/v1/export-data', {
          method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token }
        });
        if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.error || 'Export fehlgeschlagen'); }
        const blob = await response.blob();
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
        link.download = 'mosaos-firmendaten-' + new Date().toISOString().slice(0,10) + '.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      } catch (error) { alert(error.message); }
    }

    async function deleteAccount() {
      const sb = getSupabase();
      if (!sb || !window._authEmail) { alert('Konto löschen geht nur, wenn du eingeloggt bist.'); return; }
      if (!confirm('Konto wirklich löschen? Das kann NICHT rückgängig gemacht werden.')) return;
      const typed = prompt('Zur Bestätigung bitte LÖSCHEN eintippen:');
      if ((typed || '').trim().toUpperCase() !== 'LÖSCHEN') { toast('Abgebrochen'); return; }
      try {
        const token = (await sb.auth.getSession()).data.session?.access_token;
        const res = await fetch((window.SUPA_URL || '') + '/functions/v1/delete-account', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: '{}'
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.error) {
          const message = j.error === 'LAST_ADMIN' ? 'Du bist der letzte Administrator. Exportiere die Firmendaten und übertrage die Administration oder kontaktiere den Support zur geordneten Firmenschliessung.' : (j.error || res.status);
          alert('Fehler beim Löschen: ' + message); return;
        }
        try { clearLocalCache(); } catch {}
        try { await sb.auth.signOut(); } catch {}
        alert('Dein Konto wurde gelöscht.');
        window.location.href = 'login.html';
      } catch (e) { alert('Verbindungsfehler: ' + e); }
    }

    // ============================================================
    // JOB QR-CODE
    // ============================================================
    function buildCheckinPayload(job, dateKey) {
      const allowed = new Set(Array.isArray(job.assigned) ? job.assigned : []);
      const fieldEmployees = (Array.isArray(EMPLOYEES) ? EMPLOYEES : [])
        .filter(e => e.status !== 'inaktiv' && (!allowed.size || allowed.has(e.id)))
        .map(e => ({ id: e.id, n: [e.firstName, e.lastName].filter(Boolean).join(' ') }));
      const emps = fieldEmployees.length ? fieldEmployees : loadUsers().map(u => ({ id: u.id, n: u.firstname + ' ' + u.lastname }));
      return {
        jk:  nkJobKey({ ...job, _dateKey: dateKey }),
        jl:  `${job.objekt || 'Einsatz'}${job.start ? ' · ' + job.start : ''}${job.end ? '–' + job.end : ''}`,
        d:   dateKey,
        emps,
        exp: Math.floor(Date.now() / 1000) + 86400
      };
    }

    async function openJobQrModal() {
      if (!editingJob) return;
      const jobs = getJobsForDate(new Date(editingJob.dateKey));
      const job = jobs[editingJob.idx];
      if (!job) { toast('Einsatz nicht gefunden', 'error'); return; }
      if (typeof qrcode !== 'function') { toast('QR-Bibliothek lädt noch', 'error'); return; }

      const sb = getSupabase();
      const session = sb ? (await sb.auth.getSession()).data.session : null;
      if (!session) { toast('Bitte anmelden, um einen sicheren Check-in-Code zu erstellen.', 'error'); return; }
      const payload = buildCheckinPayload(job, editingJob.dateKey);
      const grantResponse = await fetch((window.SUPA_URL || '') + '/functions/v1/create-checkin-token', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobKey: payload.jk, jobLabel: payload.jl, jobDate: payload.d, employeeIds: payload.emps.map(e => e.id) })
      });
      const grant = await grantResponse.json().catch(() => ({}));
      if (!grantResponse.ok || !grant.token) { toast('Sicherer Check-in-Code konnte nicht erstellt werden.', 'error'); return; }
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      const base = window.location.href.replace(/[^/]*$/, '');
      const url  = base + 'checkin.html?t=' + encodeURIComponent(grant.token) + '&d=' + b64;

      const label = document.getElementById('jobQrLabel');
      if (label) label.textContent = payload.jl;

      const link = document.getElementById('jobQrLink');
      if (link) { link.href = url; }

      // QR auf Canvas zeichnen
      const canvas = document.getElementById('jobQrCanvas');
      if (canvas) {
        const qr = qrcode(0, 'M');
        qr.addData(url); qr.make();
        const count = qr.getModuleCount();
        const size = 200, cell = size / count;
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#000';
        for (let r = 0; r < count; r++)
          for (let c = 0; c < count; c++)
            if (qr.isDark(r, c)) ctx.fillRect(c * cell, r * cell, cell, cell);
      }
      openModal('jobQr');
    }

    // ============================================================
    // ZEITERFASSUNG — Wochennavigation + Supabase-Fetch
    // ============================================================
    let zeitenWeekStart = null;

    function getMondayOf(date) {
      const d = new Date(date);
      const day = d.getDay(); // 0=So
      const diff = (day === 0 ? -6 : 1 - day);
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    function zeitenPrevWeek() {
      if (!zeitenWeekStart) zeitenWeekStart = getMondayOf(new Date());
      zeitenWeekStart.setDate(zeitenWeekStart.getDate() - 7);
      renderZeiten();
    }
    function zeitenNextWeek() {
      if (!zeitenWeekStart) zeitenWeekStart = getMondayOf(new Date());
      zeitenWeekStart.setDate(zeitenWeekStart.getDate() + 7);
      renderZeiten();
    }

    function zeitenExportCsv() {
      const body = document.getElementById('zeitenBody');
      if (!body) return;
      const rows = [['Mitarbeiter', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So', 'Summe']];
      body.querySelectorAll('tr').forEach(tr => {
        rows.push(Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim().replace(/\n.*/,'')));
      });
      const csv = rows.map(r => r.map(c => '"' + c.replace(/"/g,'""') + '"').join(',')).join('\n');
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + csv);
      a.download = 'zeiterfassung.csv';
      a.click();
    }

    async function renderZeiten() {
      const body = document.getElementById('zeitenBody');
      if (!body) return;

      if (!zeitenWeekStart) zeitenWeekStart = getMondayOf(new Date());
      const ws = new Date(zeitenWeekStart);

      // Wochentag-Header + Label
      const DAY_NAMES = [tt('wiz.dMo','Mo'),tt('wiz.dDi','Di'),tt('wiz.dMi','Mi'),tt('wiz.dDo','Do'),tt('wiz.dFr','Fr'),tt('wiz.dSa','Sa'),tt('wiz.dSo','So')];
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws); d.setDate(ws.getDate() + i);
        return d;
      });
      weekDays.forEach((d, i) => {
        const th = document.getElementById(['zhMo','zhDi','zhMi','zhDo','zhFr','zhSa','zhSo'][i]);
        if (th) th.textContent = DAY_NAMES[i] + ' ' + d.getDate() + '.';
      });
      const lbl = document.getElementById('zeitenWeekLabel');
      if (lbl) {
        const opt = { day: '2-digit', month: '2-digit' };
        lbl.textContent = `${tt('date.cw','KW')} ${getWeekNumber(ws)} · ${ws.toLocaleDateString(dateLocale(), opt)} – ${weekDays[6].toLocaleDateString(dateLocale(), opt)}`;
      }
      const sub = document.getElementById('zeitenSubtitle');
      if (sub) sub.textContent = window.MOSAOS_SUPABASE?.url ? tt('sub.zeitLive','Live-Daten aus Supabase timelog') : tt('sub.zeitNoCfg','Supabase nicht konfiguriert — Platzhalter');

      const isoWeekDays = weekDays.map(d => d.toISOString().slice(0, 10));

      if (EMPLOYEES.length === 0) {
        body.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--text-subtle);">${tt('est.noStaffRecorded','Noch keine Mitarbeiter erfasst.')}</td></tr>`;
        return;
      }

      body.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:16px;color:var(--text-subtle);">Lade…</td></tr>`;

      // Supabase-Abfrage
      let timelogs = [];
      const sb = getSupabase();
      if (sb) {
        try {
          const from = isoWeekDays[0] + 'T00:00:00';
          const to   = isoWeekDays[6] + 'T23:59:59';
          const { data } = await sb.from('timelog').select('*').gte('check_in', from).lte('check_in', to);
          if (data) timelogs = data;
        } catch {}
      }

      const fmtMins = m => m > 0 ? `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}` : '—';

      body.innerHTML = EMPLOYEES.map(e => {
        const dayMins = isoWeekDays.map(dk => {
          const logs = timelogs.filter(l => l.employee_id === e.id && (l.check_in||'').startsWith(dk));
          return logs.reduce((s, l) => s + (l.duration_m || 0), 0);
        });
        const totalMins = dayMins.reduce((a, b) => a + b, 0);
        return `<tr>
          <td><strong>${escapeHtml(empName(e))}</strong><br/><span style="font-size:12px;color:var(--text-subtle);">${escapeHtml(e.role||'')}</span></td>
          ${dayMins.map(m => `<td style="text-align:center;${m>0?'color:var(--accent);font-weight:600;':''}">${fmtMins(m)}</td>`).join('')}
          <td style="text-align:right;"><strong>${totalMins > 0 ? (totalMins/60).toFixed(1) + ' h' : '0.0 h'}</strong></td>
        </tr>`;
      }).join('') + (!sb ? `<tr><td colspan="9" style="text-align:center;padding:10px;color:var(--text-subtle);font-size:12px;">Supabase-Zugangsdaten in supabase-config.js eintragen, damit QR-Check-ins hier erscheinen.</td></tr>` : '');
    }

    document.querySelector('.nav-item[data-view="zeiten"]')?.addEventListener('click', () => {
      setTimeout(renderZeiten, 40);
    });

    // ============================================================
    // RECHNUNGS-DASHBOARD
    // ============================================================
    const INVOICE_STATUS_KEY = 'cc-invoice-status-v1';
    function loadInvoiceStatuses()     { try { return JSON.parse(localStorage.getItem(INVOICE_STATUS_KEY)) || {}; } catch { return {}; } }
    function saveInvoiceStatuses(s)    { localStorage.setItem(INVOICE_STATUS_KEY, JSON.stringify(s)); }
    function getInvoiceStatus(jobKey)  { return loadInvoiceStatuses()[jobKey] || 'offen'; }
    function setInvoiceStatus(k, st)   { const s = loadInvoiceStatuses(); s[k] = st; saveInvoiceStatuses(s); renderRechnungen(); }
    function cycleInvoiceStatus(k)     { const cur = getInvoiceStatus(k); setInvoiceStatus(k, cur === 'offen' ? 'gesendet' : cur === 'gesendet' ? 'bezahlt' : 'offen'); }

    function collectRechnungsJobs(ym) {
      const [y, m] = ym.split('-').map(Number);
      const start = new Date(y, m-1, 1), end = new Date(y, m, 0);
      const out = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
        const dk = isoDate(new Date(d));
        getJobsForDate(new Date(dk)).forEach(j => {
          if ((j.paymethod || 'rechnung') === 'rechnung') {
            out.push({ ...j, _dateKey: dk, _jobKey: nkJobKey({ ...j, _dateKey: dk }) });
          }
        });
      }
      return out.sort((a,b) => a._dateKey.localeCompare(b._dateKey));
    }

    function renderRechnungen() {
      const selEl = document.getElementById('invMonth');
      if (!selEl) return;
      if (!selEl.value) selEl.value = nkMonthDefault();
      const ym = selEl.value;
      const jobs = collectRechnungsJobs(ym);
      const statuses = loadInvoiceStatuses();
      const invL = coLocale(loadCompany());
      // Währung im Tabellenkopf folgt dem Firmenland (CHF/EUR) — Platzhalter {cur} ersetzen.
      const thAmt = document.getElementById('invThAmount');
      if (thAmt) thAmt.textContent = tt('inv.thAmount', 'Betrag ({cur} inkl.)').replace('{cur}', invL.cur);
      const sumOf = arr => arr.reduce((s, j) => s + (Number(j.price||0) * (1 + invL.vat)), 0);
      const fmtChf = n => n.toFixed(2) + ' ' + invL.cur;

      const offen    = jobs.filter(j => (statuses[j._jobKey]||'offen') === 'offen');
      const gesendet = jobs.filter(j => statuses[j._jobKey] === 'gesendet');
      const bezahlt  = jobs.filter(j => statuses[j._jobKey] === 'bezahlt');

      // Badge
      const badge = document.getElementById('rechnungenBadge');
      if (badge) { badge.textContent = offen.length; badge.style.display = offen.length ? '' : 'none'; }

      // KPI Summary
      const sumEl = document.getElementById('invSummary');
      if (sumEl) {
        const kpi = (lbl, val, sub) => `<div class="kpi"><div class="kpi-label">${lbl}</div><div class="kpi-value" style="font-size:18px;">${val}</div>${sub?`<div class="kpi-meta">${sub} Rechnung${sub!='1'?'en':''}</div>`:''}</div>`;
        sumEl.innerHTML = `<div class="kpi-grid" style="margin-bottom:20px;">
          ${kpi('Offen', fmtChf(sumOf(offen)), offen.length)}
          ${kpi('Gesendet', fmtChf(sumOf(gesendet)), gesendet.length)}
          ${kpi('Bezahlt', fmtChf(sumOf(bezahlt)), bezahlt.length)}
          ${kpi('Total Monat', fmtChf(sumOf(jobs)), jobs.length)}
        </div>`;
      }

      const body = document.getElementById('invBody');
      if (!body) return;
      if (!jobs.length) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-subtle);">${tt('est.noInvoicesMonth','Keine Rechnungen im ausgewählten Monat.')}<br><span style="font-size:12px;">${tt('est.noInvoicesHint','Einsätze mit Zahlart „Rechnung" erscheinen hier automatisch.')}</span></td></tr>`;
        return;
      }
      const ST_LABELS = { offen: 'Offen', gesendet: 'Gesendet', bezahlt: 'Bezahlt ✓' };
      body.innerHTML = jobs.map(j => {
        const st     = statuses[j._jobKey] || 'offen';
        const netto  = Number(j.price || 0);
        const brutto = (netto * (1 + invL.vat)).toFixed(2);
        const dFmt   = new Date(j._dateKey + 'T00:00:00').toLocaleDateString(invL.dateLoc, { day:'2-digit', month:'2-digit', year:'numeric' });
        const custName = j._customer ? customerDisplayName(j._customer) : (j.objekt || '—');
        const jkSafe = j._jobKey.replace(/'/g, "\\'");
        const dkSafe = j._dateKey;
        return `<tr>
          <td>${dFmt}</td>
          <td><strong>${escapeHtml(j.objekt||'—')}</strong><br><span style="font-size:11.5px;color:var(--text-subtle);">${escapeHtml(custName)}</span></td>
          <td style="text-align:right;font-variant-numeric:tabular-nums;">${brutto}</td>
          <td><span class="inv-status-badge inv-status-${st}" onclick="cycleInvoiceStatus('${jkSafe}')" title="Klicken zum Wechseln: offen → gesendet → bezahlt">${ST_LABELS[st]}</span></td>
          <td style="text-align:right;">
            ${st !== 'bezahlt'
              ? `<button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="generateInvoiceForJobFromKey('${jkSafe}','${dkSafe}')">PDF ↓</button>`
              : '<span style="color:var(--text-subtle);font-size:12px;">—</span>'}
          </td>
        </tr>`;
      }).join('');
    }

    function generateInvoiceForJobFromKey(jobKey, dateKey) {
      const jobs = getJobsForDate(new Date(dateKey));
      const j = jobs.find(x => nkJobKey({ ...x, _dateKey: dateKey }) === jobKey);
      if (!j) { toast('Einsatz nicht gefunden', 'error'); return; }
      generateInvoiceForJob(j, dateKey);
      // Nach PDF-Download als gesendet markieren
      setTimeout(() => setInvoiceStatus(jobKey, 'gesendet'), 1500);
    }

    async function generateAllOpenInvoices() {
      const selEl = document.getElementById('invMonth');
      const ym = selEl?.value || nkMonthDefault();
      const statuses = loadInvoiceStatuses();
      const jobs = collectRechnungsJobs(ym).filter(j => (statuses[j._jobKey]||'offen') === 'offen');
      if (!jobs.length) { toast('Keine offenen Rechnungen im Monat'); return; }
      toast(`${tt('toastdyn.creating','Erstelle')} ${jobs.length} PDF${jobs.length > 1 ? 's' : ''} …`);
      for (const j of jobs) {
        await generateInvoiceForJob(j, j._dateKey);
        await new Promise(r => setTimeout(r, 500));
        setInvoiceStatus(j._jobKey, 'gesendet');
      }
      toast(`✓ ${jobs.length} PDF${jobs.length > 1 ? 's' : ''} ${tt('toastdyn.pdfsCreatedSet','erstellt & auf „Gesendet" gesetzt')}`);
    }

    document.querySelector('.nav-item[data-view="rechnungen"]')?.addEventListener('click', () => {
      setTimeout(renderRechnungen, 40);
    });

    // initial badge
    (function initRechnungenBadge() {
      const ym = nkMonthDefault();
      const s  = loadInvoiceStatuses();
      const n  = collectRechnungsJobs(ym).filter(j => (s[j._jobKey]||'offen') === 'offen').length;
      const b  = document.getElementById('rechnungenBadge');
      if (b && n > 0) { b.textContent = n; b.style.display = ''; }
    })();

    // Nav-Click Handler
    document.querySelector('.nav-item[data-view="email"]')?.addEventListener('click', () => {
      setTimeout(renderMailView, 30);
    });

    // Initial: Badge mit ungelesenen Mock-Mails setzen
    (function initMailBadge() {
      const u = getAllMails().filter(m => !m.isRead).length;
      const b = document.getElementById('mailNavBadge');
      if (b) { b.textContent = u; b.style.display = u > 0 ? '' : 'none'; }
    })();

    // Mandanten-ID einmalig beim Startup laden (silent, kein Fehler wenn nicht konfiguriert)
    applyFeatureFlags();
    applyVerticalNavLabels();
    applyCompanyBranding();
    (async () => {
      await loadTenantId();
      try { await window.MosaDB?.init(); } catch (e) { console.warn('[MosaDB] init', e); }
      await refreshAuthStatus();
      // Rückkehr von Stripe-Checkout behandeln
      if (window.MosaBilling) {
        const r = window.MosaBilling.handleReturn(() => { applyFeatureFlags(); renderModuleSettings(); });
        if (r === 'success') toast('Zahlung erhalten — Module werden freigeschaltet…');
        else if (r === 'cancel') toast('Abo abgebrochen');
      }
      // Backend-Daten in localStorage? Profile neu laden (Demo-Default)
      if (window._dbReady) {
        try {
          TASKS = loadTasks();
          if (typeof loadCurrentUser === 'function') loadCurrentUser();
        } catch {}
      }
      // Branche aus dem gesyncten Firmenprofil übernehmen (vor dem Neu-Rendern).
      applyVerticalFromCompany();
      applyCompanyBranding();
      // Login → festes Büro-Profil + Rolle, Umschalter sperren (gewinnt über Demo-Auswahl)
      applyAuthProfile();
      applyFeatureFlags();
      applyVerticalNavLabels();
      try {
        if (typeof renderDashboard === 'function') renderDashboard();
        const active = document.querySelector('.nav-item.active[data-view]');
        if (active) active.click();
      } catch {}
    })();

  
