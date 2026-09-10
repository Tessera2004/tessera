#!/usr/bin/env python3
"""Nimmt eine HTML-Motion-Graphic deterministisch als MP4 auf.

Kein Cloud-Dienst und keine generative Video-API: Chromium rendert die echte
HTML-Motion-Graphic, Playwright zeichnet sie auf und das lokale ffmpeg wandelt
sie in ein breit kompatibles H.264-MP4 um.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
FFMPEG = Path("/Users/brianknuchel/projekte/shorts/bin/ffmpeg")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--ausgabe",
        type=Path,
        default=ROOT.parent / "tmp" / "produktvideo-v4" / "MosaOS-Produktfilm-V4.mp4",
    )
    parser.add_argument(
        "--quelle",
        default="product-film-v4.html",
        help="HTML-Datei relativ zum Repository (Vorgabe: product-film-v4.html)",
    )
    parser.add_argument(
        "--dauer",
        type=float,
        default=36.3,
        help="Ausgabedauer in Sekunden (Vorgabe: 36.3)",
    )
    args = parser.parse_args()
    args.ausgabe.parent.mkdir(parents=True, exist_ok=True)

    if not FFMPEG.is_file():
        raise SystemExit(f"ffmpeg fehlt: {FFMPEG}")

    with tempfile.TemporaryDirectory(prefix="mosaos-film-") as tmp:
        video_dir = Path(tmp) / "video"
        server = subprocess.Popen(
            ["python3", "-m", "http.server", "8768", "--bind", "127.0.0.1"],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            time.sleep(0.8)
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    record_video_dir=str(video_dir),
                    record_video_size={"width": 1920, "height": 1080},
                    reduced_motion="no-preference",
                )
                page = context.new_page()
                page.goto(
                    f"http://127.0.0.1:8768/{args.quelle}",
                    wait_until="networkidle",
                )
                page.wait_for_timeout(int((args.dauer + 0.4) * 1000))
                video = page.video
                page.close()
                context.close()
                browser.close()
                webm = Path(video.path())

            zwischen = Path(tmp) / "film.webm"
            stumm = Path(tmp) / "film-stumm.mp4"
            shutil.copy2(webm, zwischen)
            subprocess.run(
                [
                    str(FFMPEG), "-y", "-i", str(zwischen),
                    "-t", str(args.dauer),
                    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    "-an", str(stumm),
                ],
                check=True,
            )
            sound_filter = (
                "[1:a]volume=0.055,lowpass=f=190[base];"
                "[2:a]highpass=f=220,lowpass=f=5200,"
                "volume='0.012+0.095*(between(t,4.0,5.7)+between(t,10.4,12.1)+"
                "between(t,21.0,23.1)+between(t,31.1,32.8))':eval=frame[air];"
                "[3:a]volume='0.075*(between(t,7.0,7.11)+between(t,18.8,18.93)+"
                "between(t,26.2,26.33)+between(t,33.0,33.13))':eval=frame[tick];"
                "[base][air][tick]amix=inputs=3:normalize=0,alimiter=limit=0.82[a]"
            )
            subprocess.run(
                [
                    str(FFMPEG), "-y", "-i", str(stumm),
                    "-f", "lavfi", "-i",
                    f"sine=frequency=52:sample_rate=48000:duration={args.dauer}",
                    "-f", "lavfi", "-i",
                    f"anoisesrc=color=pink:sample_rate=48000:duration={args.dauer}",
                    "-f", "lavfi", "-i",
                    f"sine=frequency=720:sample_rate=48000:duration={args.dauer}",
                    "-filter_complex", sound_filter,
                    "-map", "0:v:0", "-map", "[a]", "-t", str(args.dauer),
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart", str(args.ausgabe),
                ],
                check=True,
            )
        finally:
            server.terminate()
            server.wait(timeout=5)

    print(args.ausgabe)


if __name__ == "__main__":
    main()
