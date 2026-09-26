/* A proposal may move only explicitly flexible jobs; all times are minutes. */
(function(root){
  'use strict';
  const minutes=t=>Number(t.split(':')[0])*60+Number(t.split(':')[1]);
  function evaluate(order,travel,{start=420,end=1140,breakStart=720,breakMinutes=30}={}){
    let time=start,drive=0,previous=null,paused=false;
    const schedule=[],conflicts=[];
    if(![start,end,breakStart,breakMinutes].every(Number.isFinite) || end<=start || breakMinutes<0)return {schedule,conflicts:['Ungültige Arbeitszeit oder Pause'],travel:Infinity};
    for(const job of order){
      if(!Number.isFinite(job.duration) || job.duration<=0 || !Number.isFinite(minutes(job.start || ''))){conflicts.push('Ungültige Einsatzzeit');return {schedule,conflicts,travel:Infinity};}
      const leg=travel(previous,job);
      if(!Number.isFinite(leg) || leg<0){conflicts.push('Fahrzeit unbekannt');return {schedule,conflicts,travel:Infinity};}
      const earliest=job.planning?.flexible ? minutes(job.planning.earliest || '07:00') : minutes(job.start);
      const latest=job.planning?.flexible ? minutes(job.planning.latest || '19:00')-job.duration : minutes(job.start);
      const proposed=Math.max(time+leg,earliest);
      if(!paused && breakMinutes>0 && proposed+job.duration>breakStart){
        if(time+leg<=breakStart && proposed>=breakStart+breakMinutes){paused=true;}
        else {time=Math.max(time,breakStart)+breakMinutes;paused=true;}
      }
      time+=leg;drive+=leg;
      time=Math.max(time,earliest);
      if(time>latest) conflicts.push((job.objekt || job.id)+': Termin nicht erreichbar');
      if(job.deadline && time+job.duration>minutes(job.deadline)) conflicts.push((job.objekt || job.id)+': Übergabe zu spät');
      schedule.push({...job,proposedStart:time});time+=job.duration;previous=job;
    }
    const back=travel(previous,null);drive+=back;time+=back;
    if(!Number.isFinite(back))conflicts.push('Rückfahrt unbekannt');
    if(time>end)conflicts.push('Rückkehr ausserhalb der geplanten Arbeitszeit');
    return {schedule,conflicts,travel:drive,returnAt:time};
  }
  function propose(jobs,travel,settings){
    let best=null;
    function test(order){const x=evaluate(order,travel,settings);if(!best || x.conflicts.length<best.conflicts.length || (x.conflicts.length===best.conflicts.length && x.travel<best.travel))best=x;}
    function walk(prefix,rest){if(!rest.length){test(prefix);return;}rest.forEach((x,i)=>walk([...prefix,x],rest.filter((_,j)=>i!==j)));}
    if(jobs.length<=7)walk([],jobs);else test([...jobs].sort((a,b)=>minutes(a.start)-minutes(b.start)));
    return best || {schedule:[],conflicts:[],travel:0};
  }
  root.MosaRoute={evaluate,propose,minutes};if(typeof module!=='undefined')module.exports=root.MosaRoute;
})(typeof window!=='undefined'?window:globalThis);
