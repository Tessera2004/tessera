"""Export every frame explicitly: no realtime capture, dropped frames or VP8 intermediate."""
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'tmp/produktvideo-v5'
OUT.mkdir(parents=True,exist_ok=True)
FF='/Users/brianknuchel/projekte/shorts/bin/ffmpeg'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1920,'height':1080})
    page.goto((ROOT/'product-film-v5.html').as_uri()+'?render')
    proc=subprocess.Popen([FF,'-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate','60','-i','-','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'MosaOS-V5.mp4')],stdin=subprocess.PIPE)
    import base64
    for frame in range(34*60):
        data=page.evaluate('(t)=>{renderFrame(t);return c.toDataURL("image/jpeg",.97).split(",")[1]}',frame/60)
        proc.stdin.write(base64.b64decode(data))
        if frame%300==0: print(f'{frame}/2040 frames',flush=True)
        if frame in [180,570,1080,1620,1920]: page.screenshot(path=str(OUT/f'check-{frame}.png'))
    proc.stdin.close()
    if proc.wait()!=0: raise RuntimeError('Encoding failed')
    browser.close()
print(OUT/'MosaOS-V5.mp4')
