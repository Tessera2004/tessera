/* Task-first workspace: presentation and navigation only. */
(function () {
  'use strict';
  const escape = value => escapeHtml(String(value ?? ''));
  function tabs(root, name, sections) {
    const nav = document.createElement('div');
    nav.className = 'workspace-tabs'; nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', name);
    root.prepend(nav);
    const buttons = sections.map((section, i) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = section.label;
      button.id = section.panel.id + '-tab'; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', section.panel.id);
      section.panel.setAttribute('role', 'tabpanel'); section.panel.setAttribute('aria-labelledby', button.id);
      nav.append(button); return button;
    });
    const select = index => sections.forEach((section, i) => {
      section.panel.hidden = i !== index;
      buttons[i].setAttribute('aria-selected', String(i === index)); buttons[i].tabIndex = i === index ? 0 : -1;
    });
    buttons.forEach((button, i) => {
      button.onclick = () => select(i);
      button.onkeydown = event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const n = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        select(n); buttons[n].focus();
      };
    });
    select(0); return select;
  }
  function panel(id, nodes) {
    const el = document.createElement('section'); el.id = id; el.className = 'workspace-panel';
    nodes.filter(Boolean).forEach(node => el.append(node)); return el;
  }
  let resetCustomer = () => {};
  function initCustomer() {
    const body = document.querySelector('#modal-customerDetail .modal-body');
    if (!body) return;
    const info = document.getElementById('custDetailInfo'), offers = document.getElementById('custOffertLog'), calls = document.getElementById('custCallLog');
    const offerHead = offers.previousElementSibling, callHead = calls.previousElementSibling;
    const sections = [
      {label:'Kontakt',panel:panel('customer-contact-panel',[info])},
      {label:'Offerten',panel:panel('customer-offers-panel',[offerHead,offers])},
      {label:'Anrufe',panel:panel('customer-calls-panel',[callHead,calls])}
    ];
    sections.forEach(s => body.append(s.panel)); resetCustomer = tabs(body,'Kundenakte',sections);
  }
  function initTeam() {
    const root = document.querySelector('.view[data-view="team"]');
    if (!root) return;
    const grid = document.getElementById('teamGrid'), invites = document.getElementById('invitesSection');
    const roles = document.getElementById('rolesLegend'), head = roles.previousElementSibling;
    const history = root.querySelector('.team-history-card');
    const host = document.createElement('div'); root.append(host);
    const sections = [
      {label:'Personen & Einladungen',panel:panel('team-people-panel',[grid,invites])},
      {label:'Rollen & Rechte',panel:panel('team-roles-panel',[head,roles])},
      {label:'Änderungsverlauf',panel:panel('team-history-panel',[history])}
    ];
    sections.forEach(s => host.append(s.panel)); tabs(host,'Büro-Team',sections);
  }
  function dashboard(jobs, empty) {
    const area = document.getElementById('dashDataArea');
    if (!area) return;
    let overview = document.getElementById('workspacePriorities');
    if (!overview) { overview=document.createElement('div'); overview.id='workspacePriorities'; overview.className='workspace-priorities'; area.before(overview); }
    overview.hidden=empty;
    const today=isoDate(new Date());
    const tasks=typeof TASKS === 'undefined' ? [] : TASKS.filter(t=>!t.done && t.dueDate && t.dueDate<=today);
    const calls=typeof loadAllCalls === 'function' ? loadAllCalls().filter(callHasRueckruf) : [];
    const entries=[['planung',jobs.filter(j=>j.status!=='beendet').length,'Einsätze heute offen','Tagesplanung öffnen'],['aufgaben',tasks.length,'Aufgaben heute fällig / überfällig','Aufgaben prüfen'],['anrufprotokoll',calls.length,'Rückrufe offen','Anrufprotokoll öffnen']];
    overview.innerHTML=entries.filter(([view])=>{
      const link=document.querySelector(`.nav-item[data-view="${view}"]`);
      return link && getComputedStyle(link).display!=='none';
    }).map(([view,count,label,hint])=>`<button type="button" data-workspace-view="${view}"><strong>${count}</strong><span>${escape(label)}</span><small>${escape(hint)} →</small></button>`).join('');
    overview.querySelectorAll('button').forEach(button=>button.onclick=()=>navTo(button.dataset.workspaceView));
  }
  window.MosaWorkspace={dashboard,resetCustomer:()=>resetCustomer(0)};
  function init() { initCustomer(); initTeam(); if(typeof renderDashboard==='function')renderDashboard(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
