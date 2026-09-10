"""Baut den 15-sekündigen Hybridfilm aus Higgsfield-Bewegung und echten MosaOS-Ansichten."""
import argparse
import base64
import subprocess
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path('/Users/brianknuchel/Desktop/hf_20260910_221017_d8a9a039-94d5-4180-a739-10dbc6ab97c8.mp4')
FFMPEG = Path('/Users/brianknuchel/projekte/shorts/bin/ffmpeg')
FPS = 60
DURATION = 15.08
FRAMES = round(FPS * DURATION)
CHECKS = {60, 150, 258, 390, 510, 642, 756, 870}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--output-dir', type=Path, default=ROOT.parent / 'tmp' / 'produktvideo-hybrid')
    args = parser.parse_args()
    source = args.source.expanduser().resolve()
    output_dir = args.output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    if not source.is_file():
        raise SystemExit(f'Quelldatei fehlt: {source}')
    if not FFMPEG.is_file():
        raise SystemExit(f'ffmpeg fehlt: {FFMPEG}')

    final = output_dir / 'MosaOS-Hybrid-V1.mp4'
    with tempfile.TemporaryDirectory(prefix='mosaos-hybrid-') as tmp:
        silent = Path(tmp) / 'silent.mp4'
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=['--allow-file-access-from-files'])
            page = browser.new_page(viewport={'width': 1920, 'height': 1080})
            page.goto((ROOT / 'product-film-hybrid.html').as_uri(), wait_until='load')
            prepared = page.evaluate('(src) => prepare(src)', source.as_uri())
            if prepared.get('duration', 0) < DURATION - 0.1:
                raise RuntimeError(f'Quellvideo ist zu kurz: {prepared}')
            encoder = subprocess.Popen([
                str(FFMPEG), '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'mjpeg',
                '-framerate', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'fast', '-crf', '14',
                '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(silent)
            ], stdin=subprocess.PIPE)
            for frame in range(FRAMES):
                data = page.evaluate('(t) => renderFrame(t).then(() => c.toDataURL("image/jpeg", .99).split(",")[1])', frame / FPS)
                encoder.stdin.write(base64.b64decode(data))
                if frame in CHECKS:
                    page.screenshot(path=str(output_dir / f'check-{frame:04d}.png'))
            encoder.stdin.close()
            if encoder.wait():
                raise RuntimeError('Video-Encoding fehlgeschlagen')
            browser.close()

        subprocess.run([
            str(FFMPEG), '-loglevel', 'error', '-y', '-i', str(silent), '-i', str(source),
            '-map', '0:v:0', '-map', '1:a:0?', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
            '-t', str(DURATION), '-movflags', '+faststart', str(final)
        ], check=True)
    print(final)


if __name__ == '__main__':
    main()
