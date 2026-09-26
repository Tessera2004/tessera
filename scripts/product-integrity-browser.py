"""Local browser regression. Requires Python Playwright + Chromium; all Supabase calls mocked/blocked."""
import tempfile
import base64,functools,json,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=str(Path(__file__).resolve().parents[1])
OUT=Path(tempfile.mkdtemp(prefix='mosaos-integrity-'));print('Prüfdateien:',OUT)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=ROOT))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
results={};errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 c=b.new_context(viewport={'width':1440,'height':1000},locale='de-CH',timezone_id='Europe/Zurich')
 c.route('**/*.supabase.co/**',lambda r:r.abort())
 a=c.new_page();a.on('pageerror',lambda e:errors.append(str(e)))
 a.goto(url+'/app/app.html?demo=1',wait_until='networkidle')
 a.evaluate('()=>MosaI18n.set("de")')
 results['views']={}
 for name in ['dashboard','planung','kunden','mitarbeiter','offerten','rechnungen','aufgaben','zeiten','berichte','nachkalkulation','abos','team','einstellungen']:
  a.evaluate('(v)=>document.querySelector(`.nav-item[data-view="${v}"]`).click()',name);a.wait_for_timeout(150)
  a.screenshot(path=str(OUT/(name+'.png')),full_page=True)
  results['views'][name]=a.evaluate('()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight})')
 results['settings']=a.evaluate('()=>({tabs:[...document.querySelectorAll(".settings-jump a")].map(x=>x.textContent),visible:[...document.querySelectorAll(".settings-panel")].filter(x=>!x.hidden).length})')
 for i in range(a.locator('.settings-jump a').count()):
  a.locator('.settings-jump a').nth(i).click();a.screenshot(path=str(OUT/f'settings-{i}.png'),full_page=True)
 results['pricing']=a.evaluate('''()=>{
  localStorage.setItem('cc-prices',JSON.stringify({'end-rate':79,'bau-rate':84,'end-min':600,'bau-min':900}));loadPrices();
  const preserved=[getPrice('end-rate'),getPrice('bau-rate'),getPrice('end-min'),getPrice('bau-min')];
  localStorage.setItem('cc-prices','{}');loadPrices();setPriceMode('end','qm');wizService='end';
  document.getElementById('endFlaeche').value=50;
  document.querySelectorAll('.svc-options[data-svc-opts="end"] .opt-chip').forEach(x=>x.classList.remove('on'));
  currentOffertService='end';document.getElementById('offMenge').value=50;offPreisAusPreisliste(true);
  const order=calcPriceForService().total,quote=Number(document.getElementById('offPreis').value);
  togglePriceOverride();const override=Number(document.getElementById('priceOverride').value);resetPriceOverride();
  wizService='fenster';document.getElementById('wizDuration').value=2;document.getElementById('wizCrew').value=1;
  document.querySelectorAll('.svc-options[data-svc-opts="fenster"] .opt-chip').forEach(x=>x.classList.remove('on'));
  document.querySelector('[data-addon-price="fenster-leiter"]').classList.add('on');
  const languages={};for(const lang of ['de','en','fr']){MosaI18n.set(lang);languages[lang]=calcPriceForService().total;}MosaI18n.set('de');
  return {preserved,order,quote,override,languages};
 }''')
 assert results['pricing']['preserved']==[79,84,600,900]
 assert results['pricing']['order']==results['pricing']['quote']==results['pricing']['override']==275
 assert len(set(results['pricing']['languages'].values()))==1
 results['route']=a.evaluate('''async()=>{
  const dk=isoDate(planCurrentDate), original=JSON.stringify(loadPlanJobs());
  const jobs=[{id:'qa-flex',objekt:'Flexibler Auftrag',ort:'Teststrasse 1',start:'09:00',duration:60,team:'demo-t1',assigned:['demo-e1'],status:'definitiv',planning:{flexible:true,earliest:'08:00',latest:'18:00'}},{id:'qa-fixed',objekt:'Fester Kundentermin',ort:'Teststrasse 2',start:'14:00',duration:60,team:'demo-t1',assigned:['demo-e1'],status:'definitiv'}];
  localStorage.setItem(PLAN_JOBS_KEY,JSON.stringify({[dk]:jobs}));
  const before=JSON.stringify(loadPlanJobs()),oldGeocode=geocodeAddress,oldPrefetch=prefetchTravelTimes,oldTravel=travelMinutes;
  geocodeAddress=async()=>({lat:47,lon:8});prefetchTravelTimes=async()=>{};travelMinutes=()=>10;
  await runAutoPlan();
  const visible=document.getElementById('routeReview')?.open;
  await applyRouteProposal();const after=loadPlanJobs()[dk];await undoRouteProposal();
  const restored=JSON.stringify(loadPlanJobs())===before;
  // A user edit during an asynchronous route lookup must invalidate the proposal.
  let edited=false;
  geocodeAddress=async()=>{if(!edited){edited=true;const changed=loadPlanJobs();changed[dk][0].start='10:00';localStorage.setItem(PLAN_JOBS_KEY,JSON.stringify(changed));}return {lat:47,lon:8};};
  await runAutoPlan();
  const staleRejected=routeProposal===null && loadPlanJobs()[dk][0].start==='10:00';
  localStorage.setItem(PLAN_JOBS_KEY,original);geocodeAddress=oldGeocode;prefetchTravelTimes=oldPrefetch;travelMinutes=oldTravel;
  return {visible,restored,staleRejected,fixed:after.find(j=>j.id==='qa-fixed').start,flex:after.find(j=>j.id==='qa-flex').start};
 }''')
 assert results['route']=={'visible':True,'restored':True,'staleRejected':True,'fixed':'14:00','flex':'08:00'},results['route']
 # Local fake backend only. No credentials or network writes.
 a.evaluate('''()=>{
  localStorage.setItem('cc-company-v1',JSON.stringify({name:'Audit Muster AG',iban:'CH9300762011623852957',addr1:'Musterstrasse 1',addr2:'4600 Olten',country:'CH',mwstPflichtig:true,contact:'Nur Testdaten'}));
  window._fakeInvoices={};window._authEmail='audit@example.invalid';window._tenantId='audit';window.MOSAOS_DEMO_MODE=false;
  window.MosaDB.flush=async()=>{};
  getSupabase=()=>({from:()=>{const q={select:()=>q,eq:(k,v)=>{if(k==='job_id')q.jobId=v;return q;},maybeSingle:async()=>({data:window._fakeInvoices[q.jobId]||null,error:null})};return q;},rpc:async(name,args)=>{
   if(name==='issue_job_invoice'){const row={document:args.p_document,number:'RE-2026-00000'+(Object.keys(window._fakeInvoices).length+1),issued_at:'2026-09-27T12:00:00Z'};window._fakeInvoices[args.p_job_id]=row;return {data:row,error:null};}
   if(name==='store_job_invoice_pdf'){window._fakeInvoices[args.p_job_id].pdf_base64=args.p_pdf;return {data:args.p_pdf,error:null};}
   throw Error('Unexpected RPC '+name);
  }});
 }''')
 for name,long in [('invoice',False),('invoice-long',True),('invoice-address',False)]:
  if name=='invoice-address':a.evaluate('''()=>{localStorage.setItem('cc-company-v1',JSON.stringify({name:'Audit Gesellschaft für Gebäudeservice und Dienstleistungen Schweiz AG',iban:'CH9300762011623852957',addr1:'Lange Musterstrasse für diesen ausschliesslich künstlichen Test 123',addr2:'4600 Olten mit einem langen Ortsnamen',country:'CH',mwstPflichtig:false}));ladeVorlagen=()=>({});}''')
  if long:a.evaluate('''()=>{ladeVorlagen=()=>({rechnungText:('Dies ist ein längerer Auftragstext mit vereinbartem Leistungsumfang und Angaben zum Objekt. ').repeat(35),rechnungBedingungen:'Zahlbar innerhalb von 30 Tagen.'});}''')
  result=a.evaluate('''async(id)=>await generateInvoiceForJob({id,svc:'end',objekt:'Testobjekt Flächenpreis',ort:'Testweg 2, 5000 Aarau',price:300,duration:120,paymethod:'rechnung',status:'beendet'},'2026-09-27',{download:false,quiet:true,issue:true})''',name)
  assert result and result['issued'],f'PDF failed {name}'
  (OUT/(name+'.pdf')).write_bytes(base64.b64decode(result['pdfBase64']))
  results[name]={'number':result['invNr'],'bytes':len(result['pdfBase64'])}
 original=a.evaluate('()=>window._fakeInvoices.invoice.pdf_base64')
 a.evaluate('()=>localStorage.setItem("cc-company-v1",JSON.stringify({name:"Geändert",country:"CH"}))')
 again=a.evaluate('''async()=>await generateInvoiceForJob({id:'invoice',price:999,status:'beendet',paymethod:'rechnung'},'2026-09-27',{download:false,quiet:true})''')
 assert again['pdfBase64']==original,'Issued invoice changed'
 results['immutablePDF']=True
 a.set_viewport_size({'width':390,'height':844})
 a.goto(url+'/app/app.html?demo=1',wait_until='networkidle')
 a.evaluate('()=>MosaI18n.set("de")')
 for name in ['dashboard','planung','einstellungen','rechnungen']:
  a.evaluate('(v)=>document.querySelector(`.nav-item[data-view="${v}"]`).click()',name);a.wait_for_timeout(150);a.screenshot(path=str(OUT/('mobile-'+name+'.png')),full_page=True)
  results['views']['mobile-'+name]=a.evaluate('()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})')
 a.goto(url+'/app/mobile.html?demo=1',wait_until='networkidle')
 a.screenshot(path=str(OUT/'field.png'),full_page=True)
 results['errors']=errors
 b.close()
server.shutdown()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False))
assert not errors,errors
assert all(v['width']==v['scroll'] for v in results['views'].values()),'Viewport overflow'
