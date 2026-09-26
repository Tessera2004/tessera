// Execute the real Edge Function with an in-memory database and fake Gmail.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {stripTypeScriptTypes}=require('node:module');
const source=fs.readFileSync(require.resolve('../supabase/functions/send-job-invoice/index.ts'),'utf8');
const js=stripTypeScriptTypes(source,{mode:'strip'}).replace(/^import .*;\n/gm,'');
function setup(mode='ok'){
  let handler,calls=0,lastMime='';
  const invoice={id:'invoice',tenant_id:'tenant',job_id:'job',number:'RE-2026-000001',delivery_status:'pending',pdf_base64:'JVBERi0xLjQK',document:{email:'customer@example.invalid',company:{name:'Test AG'}}};
  const account={id:'account',tenant_id:'tenant',provider:'gmail',status:'active',token_key_version:1,email:'company@example.invalid',encrypted_refresh_token:'ENCRYPTED'};
  const db={from(table){
    let patch=null;const filters=[];
    const q={select(){return q;},update(value){patch=value;return q;},eq(k,v){filters.push(row=>row[k]===v);return q;},in(k,values){filters.push(row=>values.includes(row[k]));return q;},maybeSingle(){return Promise.resolve(execute());},then(resolve,reject){return Promise.resolve(execute()).then(resolve,reject);}};
    function execute(){const row=table==='job_invoices'?invoice:table==='mail_accounts'?account:null;if(!row || !filters.every(f=>f(row)))return {data:null,error:null};if(patch)Object.assign(row,patch);return {data:structuredClone(row),error:null};}
    return q;
  }};
  const context={Error,Request,Response,Headers,TextEncoder,Uint8Array,AbortSignal,crypto:require('node:crypto').webcrypto,btoa,console,
    Deno:{serve(fn){handler=fn;}},withCors:f=>f,options:()=>null,json:(obj,status=200)=>new Response(JSON.stringify(obj),{status}),
    adminClient:()=>db,userClient:()=>db,authenticatedTenant:async()=>{if(mode==='unauthorized')throw Error('UNAUTHORIZED');return {tenantId:'tenant'};},
    hasMailPermission:async()=>mode!=='forbidden',tenantHasMailModule:async()=>true,
    decryptMailValue:async()=> 'refresh',mailEncryptionKeyVersion:()=>1,refreshGmailAccessToken:async()=> 'token',
    fetch:async(url,options)=>{calls++;lastMime=Buffer.from(JSON.parse(options.body).raw,'base64url').toString();if(mode==='network')throw Error('timeout');return new Response('{}',{status:mode==='500'?500:200});}
  };
  vm.runInNewContext(js,context);
  const send=()=>handler(new Request('https://local.invalid/send-job-invoice',{method:'POST',body:JSON.stringify({jobId:'job',accountId:'account',recipient:'attacker@example.invalid',pdf:'REPLACED'})}));
  return {send,invoice,get calls(){return calls;},get mime(){return lastMime;}};
}
(async()=>{
  const ok=setup();const responses=await Promise.all([ok.send(),ok.send()]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(ok.calls,1);assert.equal(ok.invoice.delivery_status,'sent');
  assert.ok(ok.mime.includes('To: customer@example.invalid'));assert.ok(ok.mime.includes('JVBERi0xLjQK'));assert.ok(!ok.mime.includes('attacker@example.invalid'));assert.ok(!ok.mime.includes('REPLACED'));
  for(const mode of ['network','500']){const test=setup(mode);assert.equal((await test.send()).status,502);assert.equal(test.invoice.delivery_status,'delivery_unknown');assert.equal((await test.send()).status,409);assert.equal(test.calls,1);}
  for(const [mode,status] of [['unauthorized',401],['forbidden',403]]){const test=setup(mode);assert.equal((await test.send()).status,status);assert.equal(test.calls,0);}
  console.log('PASS: concurrent send claim, archived recipient/PDF, timeout and 5xx retry blocking, authentication and permission checks.');
})().catch(e=>{console.error(e);process.exitCode=1;});
