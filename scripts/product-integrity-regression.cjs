const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const price=require('../app/pricing-core.js');
const invoice=require('../app/invoice-core.js');
const route=require('../app/route-core.js');
const base={unit:'qm',quantity:50,rate:3.2,minTotal:250,fee:25};
assert.equal(price.calculate(base).total,275);
for(const label of ['Leiter','Ladder','Échelle'])assert.equal(price.calculate({unit:'h',quantity:2,rate:50,addons:[{label,kind:'percent',price:12}]}).total,112);
assert.equal(price.calculate({...base,override:100}).lines.reduce((s,l)=>s+l.amount,0),100);
assert.throws(()=>price.calculate({...base,quantity:-1}));
const co={name:'Test AG',iban:'CH9300762011623852957',addr1:'Musterstrasse 1',addr2:'4600 Olten'};
const qr=invoice.swissPayload(co,{name:'Testkunde',addr1:'Weg 2',addr2:'5000 Aarau'},300,'TEST').split('\r\n');
assert.equal(qr.length,31);assert.equal(qr[4],'S');assert.equal(qr[18],'300.00');assert.equal(qr[19],'CHF');assert.equal(qr[20],'S');assert.equal(qr[30],'EPD');
assert.throws(()=>invoice.iban('CH9300762011623852958'));
assert.throws(()=>invoice.swissPayload({...co,name:'A\nB'},null,300,''));
assert.equal(invoice.lines({price:300,duration:120})[0].unit,'flat');
const jobs=[{id:'a',objekt:'A',start:'08:00',duration:60},{id:'b',objekt:'B',start:'14:00',duration:60}];
const proposal=route.propose(jobs,()=>10);
assert.deepEqual(proposal.schedule.map(x=>x.proposedStart),[480,840]);assert.equal(proposal.conflicts.length,0);
assert.ok(route.propose(jobs,()=>Infinity).conflicts.length);
assert.ok(route.propose([{...jobs[0],start:'07:00'}],()=>60).conflicts.length);
assert.ok(route.propose([{...jobs[0],start:'18:30',duration:60}],()=>10).conflicts.length);
const afternoon=route.propose([{...jobs[0],start:'14:00'}, {...jobs[1],start:'15:10'}],()=>10);
assert.equal(afternoon.conflicts.length,0,'idle lunch interval must not insert a second break at 15:00');

// Exercise the real queue, not a copied implementation. No network involved.
const storage=new Map(),events=[];let rejects=true,writes=0;
const sb={from(){return {upsert(){writes++;return Promise.resolve({error:rejects?{message:'test failure'}:null});}};}};
const window={_tenantId:'tenant-a',SB:sb,dispatchEvent(e){events.push(e.detail);},addEventListener(){}};
const context={window,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},crypto:require('node:crypto').webcrypto,CustomEvent:class{constructor(t,o){this.detail=o.detail;}},console:{warn(){}},setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync(require.resolve('../app/db-sync.js'),'utf8'),context);
(async()=>{
  for(let i=0;i<305;i++)await window.MosaDB.push('company_prices',{rate:i});
  assert.equal(JSON.parse(storage.get('mosaos-sync-queue-v1')).length,305,'no silent dropping at retry or former 250-item limit');
  assert.equal(events.at(-1).state,'error');
  rejects=false;await window.MosaDB.flush();
  assert.equal(JSON.parse(storage.get('mosaos-sync-queue-v1')).length,0);
  assert.equal(events.at(-1).state,'synced');
  rejects=true;await window.MosaDB.push('company_prices',{rate:99});
  window._tenantId='tenant-b';rejects=false;const before=writes;await window.MosaDB.flush();
  assert.equal(writes,before,'a queued write may not cross tenants');
  assert.equal(JSON.parse(storage.get('mosaos-sync-queue-v1')).length,1);
  storage.set('mosaos-sync-queue-v1','[]');window._tenantId='tenant-a';
  storage.set('cc-prices',JSON.stringify({rate:10}));
  sb.from=table=>{
    const query={select:()=>query,eq:()=>query,maybeSingle:()=>query,then(resolve){
      if(table==='company_settings'){
        storage.set('cc-prices',JSON.stringify({rate:99}));
        return Promise.resolve({data:{prices:{rate:10}},error:null}).then(resolve);
      }
      return Promise.resolve({data:[],error:null}).then(resolve);
    }};return query;
  };
  await window.MosaDB.init();
  assert.equal(JSON.parse(storage.get('cc-prices')).rate,99,'remote init must not overwrite a local edit during loading');
  assert.equal(window._dbReady,false);
  console.log('PASS: pricing, QR, fixed appointments, routes, 305 queued writes, tenant boundary and edit-during-load preservation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
