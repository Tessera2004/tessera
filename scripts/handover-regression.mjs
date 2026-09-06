import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const app=read('app/app.html'),mobile=read('app/mobile.html'),sync=read('app/db-sync.js');
function section(s,start,end){const i=s.indexOf(start);assert(i>=0);const j=s.indexOf(end,i+start.length);assert(j>i);return s.slice(i,j);}
for(const file of ['app/app.html','app/mobile.html'])for(const m of read(file).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
for(const file of ['app/app-i18n.js','app/db-sync.js'])new vm.Script(read(file));
let jobs={},allowed=true;
const date=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const ctx=vm.createContext({Date,loadPlanJobs:()=>structuredClone(jobs),savePlanJobsAll:v=>jobs=v,hasPerm:()=>allowed,isoDate:date,protokolliere:()=>{},tt:(k,v)=>v});
vm.runInContext(section(app,'    function nextRepeatDate(', '    function wizToggleRepeat(')+section(app,'    function aboVerlaengern(', '    function aboVerlaengernKlick(')+section(app,'    function abosNachfuellen(', '    function aboEndSeries(')+'\nconst ABO_HORIZONT_TAGE=56;',ctx);
ctx.getAllSeries=()=>{const m={};for(const [d,list] of Object.entries(jobs))for(const j of list)(m[j.seriesId]??={seriesId:j.seriesId,dates:[]}).dates.push(d);return Object.values(m).map(s=>({...s,dates:s.dates.sort()}));};
const today=date(new Date());
for(const [recurring,n] of [['weekly',8],['biweekly',4]]){jobs={[today]:[{id:'j',seriesId:'s',recurring}]};assert.equal(ctx.abosNachfuellen(),n);assert.equal(ctx.abosNachfuellen(),0);}
jobs={[today]:[{id:'j',seriesId:'s',recurring:'monthly'}]};const n=ctx.abosNachfuellen();assert(n>=1&&n<=2);assert.equal(ctx.abosNachfuellen(),0);
jobs={'2020-01-01':[{id:'j',seriesId:'s',recurring:'weekly'}]};assert.equal(ctx.abosNachfuellen(),0);
allowed=false;assert.equal(ctx.aboVerlaengern('s'),0);assert.equal(ctx.abosNachfuellen(),0);
let notices=0,calls=[];ctx.toast=()=>notices++;
vm.runInContext(section(app,'    function pdfLogo(', '    // C1'),ctx);
for(const [w,h] of [[400,100],[100,400],[100,100]]){calls=[];ctx.pdfLogo({getImageProperties:()=>({width:w,height:h}),addImage:(...a)=>calls.push(a)},{logo:'data:image/png;base64,fixture'},20,20);assert.equal(calls.length,1);assert.equal(calls[0][4]/calls[0][5],w/h);assert(calls[0][4]<=22&&calls[0][5]<=18);}
ctx.pdfLogo({}, {logo:'data:image/svg+xml;base64,fixture'},20,20);assert.equal(notices,1);
const syncCtx=vm.createContext({Date});vm.runInContext(section(sync,'  function unflattenJobs(', '  // ── Format-Konverter')+section(sync,'  function flattenJobs(', '  // ── Merge-Helfer'),syncCtx);
const rows=syncCtx.flattenJobs({[today]:[{id:'j',seriesId:'s',recurring:'monthly'}]},'tenant');const restored=syncCtx.unflattenJobs(rows);assert.equal(restored[today][0].seriesId,'s');assert.equal(restored[today][0].recurring,'monthly');
const elements={};const el=id=>elements[id]??={style:{},textContent:'',appendChild(x){this.child=x;}};
let failure=null,rendered=0,filters;
const sb={from(table){const q={select(){return q},eq(){return q},in(k,v){filters=v;return q},then(resolve){return Promise.resolve({data:table==='office_users'?[{id:'office',email:'me@example.test'}]:[{id:'task',assignee:'office',priority:'hoch'}],error:failure===table?{message:'test failure'}:null}).then(resolve)}};return q;}};
const mc=vm.createContext({window:{_tenantId:'tenant',_fieldUser:'me@example.test'},mSb:()=>sb,document:{getElementById:el,createElement:()=>({})},tt:(k,v)=>v,renderMyTasks:()=>rendered++});
vm.runInContext('let MY_TASKS=[];'+section(mobile,'    async function loadMyTasks(', '    function renderMyTasks('),mc);
await mc.loadMyTasks({id:'employee'});assert.equal(rendered,1);assert.deepEqual(Array.from(filters),['employee','office']);
for(const table of ['office_users','tasks']){failure=table;await mc.loadMyTasks({id:'employee'});assert.equal(rendered,1);assert.match(el('mTasks').textContent,/nicht geladen/);assert.equal(typeof el('mTasks').child.onclick,'function');}
failure=null;await el('mTasks').child.onclick();assert.equal(rendered,2);
console.log('Regression checks passed: JS syntax, Abo horizon/idempotence/permissions, PDF aspect ratios/fallback, series sync round-trip, mobile errors/retry.');
