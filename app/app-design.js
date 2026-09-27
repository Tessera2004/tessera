/* Presentation only: no changes to jobs, prices, permissions or saved data. */
(function () {
  'use strict';
  let planMode = 'timeline';
  const text = value => escapeHtml(String(value ?? ''));
  function renderPlan(wrap, jobs) {
    const from = Math.floor(Math.min(7 * 60, ...jobs.map(j => parseHM(j.start))) / 60) * 60;
    const until = Math.ceil(Math.max(18 * 60, ...jobs.map(j => parseHM(j.start) + Number(j.duration || 60))) / 60) * 60;
    const span = until - from;
    const groups = [...new Set(jobs.map(j => j.team || ''))];
    const time = minutes => String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
    const status = job => job.status === 'provisorisch' ? tt('job.statusProvisional', 'Provisorisch') : job.status === 'beendet' ? tt('job.statusFinished', 'Beendet') : tt('job.statusDefinitive', 'Definitiv');
    const period = job => job.start + '–' + time(parseHM(job.start) + Number(job.duration || 60));
    const teamName = job => getTeamById(job.team)?.name || 'Nicht zugewiesen';
    const people = job => (job.assigned || []).map(id => {const e = empById(id); return e ? empShort(e) : '';}).filter(Boolean).join(', ');
    const ticks = [];
    for (let min = from; min <= until; min += 60) ticks.push(`<span style="left:${(min-from)/span*100}%">${time(min)}</span>`);
    const lanes = groups.map(id => {
      const teamJobs = jobs.filter(j => (j.team || '') === id).sort((a,b) => parseHM(a.start)-parseHM(b.start));
      const ends = [];
      const blocks = teamJobs.map(job => {
        const start = parseHM(job.start), duration = Number(job.duration || 60);
        let lane = ends.findIndex(end => end <= start);
        if (lane < 0) lane = ends.length;
        ends[lane] = start + duration;
        const conflict = Boolean(id) && job.status !== 'provisorisch' && teamJobs.some(other => other !== job && other.status !== 'provisorisch' && parseHM(other.start) < start+duration && start < parseHM(other.start)+Number(other.duration || 60));
        const label = [job.objekt, period(job), status(job), people(job), conflict ? 'Zeitliche Überschneidung im Team' : ''].filter(Boolean).join(' · ');
        return `<button type="button" class="plan-block${duration < 45 ? ' is-short' : ''}${conflict ? ' has-overlap' : ''}" data-plan-job="${job._idx}" style="left:${(start-from)/span*100}%;width:${duration/span*100}%;top:${lane*70+10}px" title="${text(label)}" aria-label="${text(label)}"><small>${text(period(job))}</small><strong>${text(job.objekt)}</strong><span>${text(conflict ? 'Überschneidung' : status(job))}</span></button>`;
      }).join('');
      const team = getTeamById(id);
      return `<div class="plan-lane"><div class="plan-lane-label"><strong>${text(team?.name || 'Nicht zugewiesen')}</strong><span>${teamJobs.length} ${teamJobs.length === 1 ? 'Einsatz' : text(tt('plan.jobs','Einsätze'))}</span></div><div class="plan-track" style="height:${Math.max(1,ends.length)*70+20}px;--hour-size:${60/span*100}%">${blocks}</div></div>`;
    }).join('');
    const agenda = jobs.map(job => `<button type="button" class="plan-agenda-item" data-plan-job="${job._idx}"><span class="plan-agenda-time">${text(job.start)}<small>bis ${time(parseHM(job.start)+Number(job.duration || 60))}</small></span><span class="plan-agenda-info"><strong>${text(job.objekt)}</strong><span>${text(job.ort)}</span><small>${text(teamName(job))}${people(job) ? ' · '+text(people(job)) : ''}</small></span><span class="plan-agenda-state">${text(status(job))}</span><span class="plan-open" aria-hidden="true">↗</span></button>`).join('');
    wrap.classList.add('plan-board');
    wrap.classList.toggle('is-agenda', planMode === 'agenda');
    wrap.innerHTML = `<div class="plan-board-head"><div><h2>Tagesübersicht</h2><p>Zeiten und Teambelegung auf einen Blick</p></div><div class="plan-view-switch" role="group" aria-label="Darstellung"><button type="button" data-plan-mode="timeline" aria-pressed="${planMode === 'timeline'}">Zeitplan</button><button type="button" data-plan-mode="agenda" aria-pressed="${planMode === 'agenda'}">Liste</button></div></div><div class="plan-board-scroll"><div class="plan-board-grid"><div class="plan-axis"><span>Team / Uhrzeit</span><div>${ticks.join('')}</div></div>${lanes}</div></div><div class="plan-agenda">${agenda}</div><p class="plan-board-note">${text(tt('plan.jobs','Einsätze'))} öffnen zum Bearbeiten · Lücken zeigen keine berechnete Fahrzeit oder garantierte Verfügbarkeit.</p>`;
    const shortJobs = jobs.filter(job => Number(job.duration || 60) < 45);
    if (shortJobs.length) wrap.querySelector('.plan-board-scroll').insertAdjacentHTML('beforeend', `<div class="plan-short-jobs"><span>Kurztermine</span>${shortJobs.map(job => `<button type="button" data-plan-job="${job._idx}">${text(period(job))} · ${text(job.objekt)}</button>`).join('')}</div>`);
    wrap.querySelectorAll('[data-plan-mode]').forEach(button => button.addEventListener('click', () => {planMode=button.dataset.planMode;renderPlan(wrap,jobs);wrap.querySelector(`[data-plan-mode="${planMode}"]`).focus();}));
    wrap.querySelectorAll('[data-plan-job]').forEach(button => button.addEventListener('click', () => openJobEditor(isoDate(planCurrentDate),Number(button.dataset.planJob))));
  }
  function renderPrice() {
    const summary = document.getElementById('priceSummary');
    if (!summary || !wizService) return;
    const result = calcPriceForService();
    if (!result) return;
    let detail = document.getElementById('designPriceDetail');
    if (!detail) {detail=document.createElement('div');detail.id='designPriceDetail';summary.prepend(detail);summary.classList.add('has-price-detail');}
    const locale=coLocale(loadCompany()),fmt=value=>Number(value).toFixed(2)+' '+locale.cur;
    const tax=MosaPricing.money(result.total*locale.vat),gross=MosaPricing.money(result.total+tax);
    detail.innerHTML = `<div class="price-detail-heading"><span>PREISÜBERSICHT</span><strong>So setzt sich der Preis zusammen</strong></div><div class="price-detail-lines">${result.lines.map(line=>{
      const unit={h:'Personenstunden',qm:'m²',flat:'pauschal','%':'%'}[line.unit] || line.unit;
      const basis=line.unit==='%' ? line.quantity+' % von '+fmt(line.rate*100) : line.quantity+' '+unit+' × '+fmt(line.rate);
      return `<div><span><strong>${text(line.label)}</strong><small>${text(basis)}</small></span><b>${text(fmt(line.amount))}</b></div>`;
    }).join('')}</div><dl class="price-detail-total"><div><dt>Netto</dt><dd>${text(fmt(result.total))}</dd></div><div><dt>${text(locale.mwstPflichtig ? locale.vatLabel : 'Keine Mehrwertsteuer')}</dt><dd>${text(fmt(tax))}</dd></div><div class="price-detail-gross"><dt>Gesamtbetrag</dt><dd>${text(fmt(gross))}</dd></div></dl><p class="price-detail-duration">${text(result.dur)}</p>`;
  }
  window.MosaDesign={renderPlan,renderPrice};
  function init() {
    const crew=document.getElementById('daycrewCard'),status=document.getElementById('teamStatusBar'),timeline=document.getElementById('dayTimeline');
    if(crew && status && timeline){
      const details=document.createElement('details');details.className='plan-people';
      const summary=document.createElement('summary');summary.textContent='Besetzung und Verfügbarkeit';
      details.append(summary,crew,status);timeline.after(details);
      // Direct links to controls still reveal their container.
      details.addEventListener('focusin',()=>{details.open=true;});
    }
    if(typeof renderDayTimeline==='function')renderDayTimeline();
    renderPrice();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
