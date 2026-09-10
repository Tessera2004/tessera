"""Rendert den kurzen MosaOS-Motion-Film framegenau in 60 fps mit Ton."""
import base64,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT.parent/'tmp/produktvideo-v6'; OUT.mkdir(parents=True,exist_ok=True)
FF='/Users/brianknuchel/projekte/shorts/bin/ffmpeg'; FPS=60; DURATION=15.2; FRAMES=round(FPS*DURATION)
with tempfile.TemporaryDirectory(prefix='mosaos-v6-') as tmp:
    silent=Path(tmp)/'silent.mp4'
    with sync_playwright() as p:
        b=p.chromium.launch(headless=True); page=b.new_page(viewport={'width':1920,'height':1080}); page.goto((ROOT/'product-film-v6.html').as_uri()+'?render')
        enc=subprocess.Popen([FF,'-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',str(FPS),'-i','-','-c:v','libx264','-preset','fast','-crf','15','-pix_fmt','yuv420p','-movflags','+faststart',str(silent)],stdin=subprocess.PIPE)
        for f in range(FRAMES):
            data=page.evaluate('(t)=>{renderFrame(t);return c.toDataURL("image/jpeg",.985).split(",")[1]}',f/FPS); enc.stdin.write(base64.b64decode(data))
            if f in (90,210,390,540,690,840): page.screenshot(path=str(OUT/f'check-{f}.png'))
        enc.stdin.close()
        if enc.wait(): raise RuntimeError('Video-Encoding fehlgeschlagen')
        b.close()
    pulse="0.015+0.055*(between(t,2.35,2.8)+between(t,4.85,5.25)+between(t,7.7,8.15)+between(t,10.45,10.9)+between(t,12.7,13.15))"
    subprocess.run([FF,'-loglevel','error','-y','-i',str(silent),'-f','lavfi','-i',f'sine=frequency=72:sample_rate=48000:duration={DURATION}','-f','lavfi','-i',f'anoisesrc=color=pink:sample_rate=48000:duration={DURATION}:seed=11','-filter_complex',f"[1:a]volume=0.045,afade=t=in:d=0.3,afade=t=out:st=14.5:d=0.7[b];[2:a]highpass=f=450,lowpass=f=5000,volume='{pulse}':eval=frame[n];[b][n]amix=inputs=2:normalize=0,alimiter=limit=0.8[a]",'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-t',str(DURATION),'-movflags','+faststart',str(OUT/'MosaOS-V6-Final.mp4')],check=True)
print(OUT/'MosaOS-V6-Final.mp4')
