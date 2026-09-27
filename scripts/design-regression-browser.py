"""Local, disposable demo-only design regression. No production data or writes."""
import functools, json, tempfile, threading
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT = str(Path(__file__).resolve().parents[1])
OUT = Path(tempfile.mkdtemp(prefix='mosaos-design-'))
print('Prüfbilder:', OUT, flush=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=server.serve_forever, daemon=True).start()
errors, results = [], {}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1000}, locale='de-CH', timezone_id='Europe/Zurich')
    context.route('**/*.supabase.co/**', lambda route: route.abort())
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/app/app.html?demo=1', wait_until='networkidle')
    page.evaluate('''()=>{
      MosaI18n.set('de');
      const dk=isoDate(planCurrentDate);
      const jobs=[
        {id:'design-a',objekt:'Atelier Morgenrot',ort:'Musterstrasse 1, Olten',start:'08:00',duration:120,team:'demo-t1',assigned:['demo-e1'],status:'definitiv',price:280},
        {id:'design-b',objekt:'Musterunternehmen mit einem besonders langen Kundennamen AG',ort:'Bahnhofstrasse 12, Aarau',start:'09:30',duration:90,team:'demo-t1',assigned:['demo-e1'],status:'definitiv',price:300},
        {id:'design-c',objekt:'Verwaltung Sonnengarten',ort:'Testweg 4, Solothurn',start:'13:00',duration:180,team:'demo-t2',assigned:['demo-e2'],status:'definitiv',price:560},
        {id:'design-d',objekt:'Kurzer Kontrolltermin',ort:'Musterweg 5',start:'16:30',duration:15,team:'',assigned:[],status:'provisorisch',price:50}
      ];
      window.designJobs=jobs;localStorage.setItem(PLAN_JOBS_KEY,JSON.stringify({[dk]:jobs}));
      localStorage.setItem('cc-offerts',JSON.stringify([{id:'design-offer',service:'end',kunde:jobs[1].objekt,adresse:jobs[1].ort,datum:dk,preis:1250,status:'Entwurf'}]));
    }''')
    def view(name):
        page.evaluate('(v)=>document.querySelector(`.nav-item[data-view="${v}"]`).click()', name)
        if name=='offerten':
            page.evaluate('()=>renderOffertList()')
            assert page.locator('#offertList .document-row').count()==1
        page.wait_for_timeout(400)
    def shot(name):
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT/(name+'.png')), full_page=True)
    def no_overflow(name):
        size=page.evaluate('()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})')
        results[name]=size
        if size['width']!=size['scroll']:
            shot(name+'-overflow')
            print(page.evaluate('()=>[...document.querySelectorAll("body *")].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&getComputedStyle(e).position!=="fixed"}).slice(0,20).map(e=>({tag:e.tagName,id:e.id,cl:e.className,width:e.getBoundingClientRect().width}))'),flush=True)
        assert size['width']==size['scroll'], (name,size)
    view('planung')
    assert page.locator('.plan-block').count()==4
    assert page.locator('.plan-block.has-overlap').count()==2
    assert page.locator('.plan-block.has-overlap').nth(0).bounding_box()['y']!=page.locator('.plan-block.has-overlap').nth(1).bounding_box()['y']
    shot('planung-desktop')
    page.locator('[data-plan-mode="agenda"]').click()
    assert page.locator('[data-plan-mode="agenda"]').evaluate('(e)=>document.activeElement===e')
    page.locator('[data-plan-mode="timeline"]').click()
    page.locator('.plan-block').first.click()
    assert page.locator('#modal-jobEditor').is_visible()
    page.evaluate("()=>closeModal('jobEditor')")
    page.evaluate('''()=>{localStorage.setItem(PLAN_JOBS_KEY,'{}');renderDayTimeline();}''')
    assert page.locator('#dayTimeline').inner_text().find('Keine Einsätze')>=0
    page.evaluate('''()=>{localStorage.setItem(PLAN_JOBS_KEY,JSON.stringify({[isoDate(planCurrentDate)]:designJobs}));renderDayTimeline();}''')
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        for name in ['planung','offerten']:
            view(name);no_overflow(f'{name}-{width}');shot(f'{name}-{width}')
    page.evaluate('''()=>{const jobs=designJobs.map(j=>({...j,status:'beendet',paymethod:'rechnung'}));localStorage.setItem(PLAN_JOBS_KEY,JSON.stringify({[isoDate(planCurrentDate)]:jobs}));}''')
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        view('rechnungen');no_overflow(f'rechnungen-{width}');shot(f'rechnungen-{width}')
        assert page.locator('#invBody .invoice-customer').count()==4
        if width<760:
            assert page.locator('#invBody').evaluate('(e)=>getComputedStyle(e).display')=='grid'
            assert page.locator('.invoice-table table').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    page.evaluate("()=>{openModal('newAuftrag');selectService('fenster');wizStep(1);wizStep(1);}")
    for width in [390,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        page.locator('#wizDuration').fill('3')
        page.locator('#wizDuration').dispatch_event('change')
        amount=page.evaluate('()=>MosaPricing.money(calcPriceForService().total*(1+coLocale(loadCompany()).vat)).toFixed(2)')
        assert amount in page.locator('.price-detail-gross dd').inner_text()
        page.locator('#modal-newAuftrag .modal-body').evaluate('(e)=>e.scrollTop=0')
        shot(f'auftrag-{width}')
        page.locator('#designPriceDetail').scroll_into_view_if_needed()
        shot(f'preis-{width}')
        no_overflow(f'auftrag-{width}')
        assert page.locator('#modal-newAuftrag .modal-body').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'), 'Modal overflow'
    results['errors']=errors
    assert not errors, errors
    browser.close()
server.shutdown()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False))
