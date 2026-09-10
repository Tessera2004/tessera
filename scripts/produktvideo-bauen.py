#!/usr/bin/env python3
"""Nimmt product-film-v2.html deterministisch als MP4 auf.

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
        default=ROOT.parent / "tmp" / "produktvideo-v2" / "MosaOS-Produktfilm-V2.mp4",
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
                    "http://127.0.0.1:8768/product-film-v2.html",
                    wait_until="networkidle",
                )
                page.wait_for_timeout(32_400)
                video = page.video
                page.close()
                context.close()
                browser.close()
                webm = Path(video.path())

            zwischen = Path(tmp) / "film.webm"
            shutil.copy2(webm, zwischen)
            subprocess.run(
                [
                    str(FFMPEG), "-y", "-i", str(zwischen),
                    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    "-an", str(args.ausgabe),
                ],
                check=True,
            )
        finally:
            server.terminate()
            server.wait(timeout=5)

    print(args.ausgabe)


if __name__ == "__main__":
    main()
