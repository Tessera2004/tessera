"""Disposable local UI checks; blocks all Supabase traffic."""
import functools, tempfile, threading
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
out=Path(tempfile.mkdtemp(prefix='mosaos-workspace-'))
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':1440,'height':1000},locale='de-CH')
    context.route('**/*.supabase.co/**',lambda r:r.abort())
    page=context.new_page(); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/app/app.html?demo=1',wait_until='networkidle')
    page.evaluate("MosaI18n.set('de')")
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        for view in ['dashboard','kunden','team','einstellungen']:
            page.evaluate('(v)=>navTo(v)',view)
            page.wait_for_timeout(150)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (view,width)
            page.screenshot(path=str(out/f'{view}-{width}.png'),full_page=True)
    page.evaluate("navTo('team')")
    tab=page.get_by_role('tab',name='Personen & Einladungen')
    tab.focus();tab.press('ArrowRight')
    assert page.locator('#team-roles-panel').is_visible()
    page.get_by_role('tab',name='Änderungsverlauf').click()
    assert page.locator('#team-history-panel').is_visible()
    page.evaluate("navTo('kunden')")
    page.locator('.kunde-card').first.click()
    assert page.locator('#customer-contact-panel').is_visible()
    page.get_by_role('tab',name='Anrufe',exact=True).click()
    assert page.locator('#customer-calls-panel').is_visible()
    page.evaluate("closeModal('customerDetail')")
    page.locator('.kunde-card').first.click()
    assert page.locator('#customer-contact-panel').is_visible()
    page.wait_for_timeout(400)
    page.screenshot(path=str(out/'kundenakte.png'),full_page=True)
    page.goto(f'http://127.0.0.1:{server.server_port}/app/mobile.html?demo=1',wait_until='networkidle')
    page.evaluate('''()=>{MosaI18n.set('de');document.getElementById('checklistOverlay').classList.remove('open');MY_JOBS=[{id:'qa-only',objekt:'Langer Beispielbetrieb mit mehreren Abteilungen',ort:'Musterstrasse 12, 4600 Olten',start_time:'08:00',duration:120,note_crew:'Schlüssel am Empfang abholen.'}];renderMyStops();}''')
    for width in [320,390,768]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), ('field',width)
        page.screenshot(path=str(out/f'field-{width}.png'),full_page=True)
    assert not errors,errors
    browser.close()
server.shutdown()
print('PASS: responsive workspace, keyboard tabs, customer reset and field cards. Screenshots:',out)
