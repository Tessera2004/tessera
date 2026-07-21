#!/usr/bin/env python3
"""
Telegram-Signal-Bot für Forex, GER40 und NAS100.

Der Bot prüft in regelmäßigen Abständen die Märkte mit einer bewährten
Trendfolge-Strategie (siehe strategy.py) und schickt dir bei einem Signal
einen Alarm mit Einstieg, Stop-Loss und Take-Profit auf Telegram.
Du führst die Trades selbst bei deinem Broker aus.

Start:  python3 bot.py
Konfiguration über Umgebungsvariablen oder .env-Datei (siehe README.md).
"""

import logging
import os
import time
from datetime import datetime, timezone

import requests
import yfinance as yf

import strategy

# ------------------------------------------------------------- Konfiguration

# .env-Datei laden, falls vorhanden (ohne Zusatz-Bibliothek)
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env_path):
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# Kerzen-Intervall und Prüf-Rhythmus
INTERVAL = os.environ.get("CANDLE_INTERVAL", "15m")     # 5m, 15m, 30m, 1h
CHECK_EVERY_SECONDS = int(os.environ.get("CHECK_EVERY_SECONDS", "300"))
COOLDOWN_SECONDS = int(os.environ.get("COOLDOWN_SECONDS", "3600"))

# Aktive Strategien: "pullback", "breakout" oder beide (kommagetrennt)
ACTIVE_STRATEGIES = [
    s.strip()
    for s in os.environ.get("STRATEGIES", "pullback,breakout").split(",")
    if s.strip()
]

# Instrumente: Anzeigename -> Yahoo-Finance-Ticker (siehe instruments.py)
from instruments import INSTRUMENTS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("signalbot")

API = f"https://api.telegram.org/bot{BOT_TOKEN}"


# ----------------------------------------------------------------- Telegram


def send_message(text: str, chat_id: str = None) -> bool:
    try:
        r = requests.post(
            f"{API}/sendMessage",
            json={
                "chat_id": chat_id or CHAT_ID,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=15,
        )
        if not r.ok:
            log.error("Telegram-Fehler: %s", r.text)
        return r.ok
    except requests.RequestException as e:
        log.error("Telegram nicht erreichbar: %s", e)
        return False


def fmt_price(value: float, ref: float) -> str:
    """Passende Nachkommastellen je nach Kursniveau.

    Forex-Paare (~0.5-2) -> 5 Stellen, JPY-Paare (~80-250) -> 3 Stellen,
    Gold/Indizes -> 1 Stelle mit Tausender-Trennung.
    """
    if ref < 20:
        return f"{value:.5f}"
    if ref < 1000:
        return f"{value:.3f}"
    return f"{value:,.1f}"


def signal_message(name: str, sig: strategy.Signal) -> str:
    if sig.direction == "LONG":
        head = "🟢 <b>KAUFEN (LONG)</b>"
    else:
        head = "🔴 <b>VERKAUFEN (SHORT)</b>"
    e = sig.entry
    return (
        f"{head} — <b>{name}</b>\n"
        f"🕐 {datetime.now(timezone.utc).strftime('%d.%m.%Y %H:%M')} UTC ({INTERVAL}-Chart)\n"
        f"\n"
        f"➡️ Einstieg: <code>{fmt_price(sig.entry, e)}</code>\n"
        f"🛑 Stop-Loss: <code>{fmt_price(sig.stop_loss, e)}</code>\n"
        f"🎯 Ziel 1 (1R): <code>{fmt_price(sig.take_profit_1, e)}</code>\n"
        f"🎯 Ziel 2 (2R): <code>{fmt_price(sig.take_profit_2, e)}</code>\n"
        f"\n"
        f"🧭 Strategie: {sig.strategy}\n"
        f"📊 Grund: {sig.reason}\n"
        f"📈 RSI: {sig.rsi_value:.1f}\n"
        f"\n"
        f"⚠️ Keine Anlageberatung — Risiko pro Trade max. 1-2 % des Kontos.\n"
        f"Tipp: Bei Ziel 1 die Hälfte schließen und Stop auf Einstieg ziehen."
    )


# --------------------------------------------------------------- Marktdaten


def fetch_candles(ticker: str):
    """Holt Kerzen von Yahoo Finance und entfernt die laufende Kerze."""
    period = "1mo" if INTERVAL in ("30m", "1h") else "5d"
    try:
        df = yf.download(
            ticker,
            period=period,
            interval=INTERVAL,
            progress=False,
            auto_adjust=True,
        )
    except Exception as e:
        log.warning("Datenabruf %s fehlgeschlagen: %s", ticker, e)
        return None
    if df is None or df.empty:
        return None
    # yfinance liefert bei einzelnen Tickern teils MultiIndex-Spalten
    if hasattr(df.columns, "nlevels") and df.columns.nlevels > 1:
        df.columns = df.columns.get_level_values(0)
    df = df.dropna()
    # Letzte Zeile ist meist die noch laufende Kerze -> weglassen
    return df.iloc[:-1] if len(df) > 1 else df


# --------------------------------------------------- Befehle (Long-Polling)


HELP_TEXT = (
    "🤖 <b>Signal-Bot Befehle</b>\n\n"
    "/status — Marktüberblick aller Instrumente\n"
    "/hilfe — diese Hilfe\n\n"
    f"Überwachte Märkte: {', '.join(INSTRUMENTS)}\n"
    f"Chart: {INTERVAL} | Prüfung alle {CHECK_EVERY_SECONDS // 60} Min.\n\n"
    "Strategien:\n"
    "1️⃣ Trendfolge + Pullback (EMA 200/50, RSI, MACD)\n"
    "2️⃣ Ausbruch/Donchian (20-Kerzen-Hoch/Tief, Turtle-Trading)\n"
    "Stop-Loss jeweils über ATR, Ziele bei 1R und 2R."
)


def handle_command(text: str, chat_id: str):
    cmd = text.strip().split()[0].lower().split("@")[0]
    if cmd in ("/start", "/hilfe", "/help"):
        send_message(HELP_TEXT, chat_id)
    elif cmd == "/status":
        lines = ["📊 <b>Marktüberblick</b>\n"]
        for name, ticker in INSTRUMENTS.items():
            df = fetch_candles(ticker)
            if df is None or len(df) < strategy.MIN_BARS:
                lines.append(f"<b>{name}</b>: keine Daten (Markt evtl. geschlossen)")
                continue
            snap = strategy.trend_snapshot(df)
            lines.append(
                f"<b>{name}</b>: {fmt_price(snap['price'], snap['price'])} — "
                f"{snap['trend']} (RSI {snap['rsi']:.0f})"
            )
        send_message("\n".join(lines), chat_id)


def poll_commands(offset: int) -> int:
    """Holt neue Telegram-Nachrichten und beantwortet Befehle."""
    try:
        r = requests.get(
            f"{API}/getUpdates",
            params={"offset": offset, "timeout": 0},
            timeout=15,
        )
        if not r.ok:
            return offset
        for update in r.json().get("result", []):
            offset = update["update_id"] + 1
            msg = update.get("message") or {}
            text = msg.get("text", "")
            chat_id = str((msg.get("chat") or {}).get("id", ""))
            if text.startswith("/") and chat_id:
                # Nur auf den konfigurierten Chat reagieren
                if not CHAT_ID or chat_id == str(CHAT_ID):
                    handle_command(text, chat_id)
    except requests.RequestException as e:
        log.warning("getUpdates fehlgeschlagen: %s", e)
    return offset


# ------------------------------------------------------------------- Hauptteil


def main():
    if not BOT_TOKEN or not CHAT_ID:
        raise SystemExit(
            "Fehler: TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID müssen gesetzt sein.\n"
            "Siehe README.md für die Einrichtung (BotFather)."
        )

    unknown = [s for s in ACTIVE_STRATEGIES if s not in strategy.STRATEGIES]
    if unknown or not ACTIVE_STRATEGIES:
        raise SystemExit(
            f"Fehler: Unbekannte Strategie in STRATEGIES: {unknown}. "
            f"Erlaubt: {', '.join(strategy.STRATEGIES)}"
        )

    log.info("Signal-Bot gestartet. Instrumente: %s", ", ".join(INSTRUMENTS))
    send_message(
        "✅ <b>Signal-Bot gestartet</b>\n\n" + HELP_TEXT
    )

    last_signal_time = {}   # Instrument -> Unix-Zeit des letzten Alarms
    last_candle_seen = {}   # Instrument -> Zeitstempel der letzten geprüften Kerze
    next_check = 0.0
    offset = 0

    while True:
        offset = poll_commands(offset)

        now = time.time()
        if now >= next_check:
            next_check = now + CHECK_EVERY_SECONDS
            for name, ticker in INSTRUMENTS.items():
                df = fetch_candles(ticker)
                if df is None or len(df) < strategy.MIN_BARS:
                    log.info("%s: zu wenig Daten / Markt geschlossen", name)
                    continue

                candle_ts = str(df.index[-1])
                if last_candle_seen.get(name) == candle_ts:
                    continue  # Kerze schon geprüft
                last_candle_seen[name] = candle_ts

                signals = [
                    sig
                    for key in ACTIVE_STRATEGIES
                    if (sig := strategy.STRATEGIES[key](df)) is not None
                ]
                if not signals:
                    log.info("%s: kein Signal", name)
                    continue

                if now - last_signal_time.get(name, 0) < COOLDOWN_SECONDS:
                    log.info("%s: Signal unterdrückt (Cooldown)", name)
                    continue

                for sig in signals:
                    log.info("%s: %s-Signal (%s)!", name, sig.direction, sig.strategy)
                    if send_message(signal_message(name, sig)):
                        last_signal_time[name] = now

        time.sleep(3)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Bot beendet.")
