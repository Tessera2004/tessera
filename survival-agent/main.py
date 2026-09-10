"""Survival Agent - Simulation.

Start:
    python main.py --mock            # kostenlos, ohne API
    python main.py --ticks 50        # mit Claude (ANTHROPIC_API_KEY in .env)
"""

from __future__ import annotations

import argparse
import csv
import os
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

from agent import (
    MAX_API_CALLS,
    ApiLimitReached,
    ClaudeDecider,
    Decision,
    MockDecider,
)
from economy import BASE_TICK_COST, Economy, mode_for_balance

# --- .env laden (ohne harte Abhaengigkeit auf python-dotenv) ----------------

def load_env(path: str = ".env") -> None:
    try:
        from dotenv import load_dotenv  # type: ignore
        load_dotenv(path)
        return
    except ImportError:
        pass
    env_file = Path(path)
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


# --- Farben -----------------------------------------------------------------

class C:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    MAGENTA = "\033[95m"

    _enabled = sys.stdout.isatty() and os.getenv("NO_COLOR") is None

    @classmethod
    def paint(cls, text: str, *codes: str) -> str:
        if not cls._enabled:
            return text
        return "".join(codes) + text + cls.RESET


MODE_COLOR = {"normal": C.GREEN, "low": C.YELLOW, "critical": C.RED}


# --- Telegram (optional) ----------------------------------------------------

def send_telegram(message: str) -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return
    try:
        import requests
        requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": message},
            timeout=10,
        )
    except Exception as exc:  # Telegram darf die Simulation nie stoppen
        print(C.paint(f"[telegram] Nachricht fehlgeschlagen: {exc}", C.DIM))


# --- Simulation -------------------------------------------------------------

def run(args: argparse.Namespace) -> int:
    rng = random.Random(args.seed)
    economy = Economy(rng=rng, enable_market=not args.no_market)

    if args.mock:
        decider = MockDecider()
    else:
        try:
            decider = ClaudeDecider(max_api_calls=args.max_api_calls)
        except RuntimeError as exc:
            print(C.paint(f"Fehler: {exc}", C.RED, C.BOLD))
            return 2

    balance = float(args.start_balance)
    peak = balance
    memory: list[str] = []
    tick = 0
    death_cause = "unbekannt"
    critical_notified = False

    log_path = Path(args.log)
    log_file = log_path.open("w", newline="", encoding="utf-8")
    writer = csv.writer(log_file)
    writer.writerow(
        ["tick", "zeit", "guthaben_vorher", "modus", "aktion",
         "begruendung", "ergebnis", "delta", "guthaben_nachher", "quelle"]
    )

    print(C.paint(
        f"\n=== Survival Agent ({decider.name}) - Start mit {balance:.2f} Credits ===\n",
        C.BOLD, C.CYAN))

    try:
        while tick < args.ticks:
            tick += 1
            mode = mode_for_balance(balance)
            balance_before = balance

            if mode == "critical" and not critical_notified:
                critical_notified = True
                send_telegram(
                    f"[Survival Agent] KRITISCH: nur noch {balance:.2f} Credits "
                    f"in Tick {tick}."
                )
            elif mode != "critical":
                critical_notified = False

            jobs = economy.generate_jobs(tick)
            market = economy.generate_market(balance)

            try:
                decision: Decision = decider.decide(
                    balance, mode, tick, jobs, market, memory
                )
            except ApiLimitReached as exc:
                print(C.paint(f"\n{exc} Simulation gestoppt.", C.YELLOW, C.BOLD))
                death_cause = "API-Limit erreicht (Agent lebt noch)"
                break

            # Kosten: Grundkosten + Denkkosten
            think_cost = decider.think_cost(mode)
            balance -= BASE_TICK_COST + think_cost
            results: list[str] = [
                f"Fixkosten -{BASE_TICK_COST:.2f}, Denken -{think_cost:.2f}"
            ]

            # Aktion ausfuehren
            if decision.action == "take_jobs":
                by_id = {j.job_id: j for j in jobs}
                for job_id in decision.job_ids:
                    _, delta, desc = economy.run_job(by_id[job_id])
                    balance += delta
                    results.append(desc)
            elif decision.action == "gamble" and market:
                _, delta, desc = economy.run_market(market)
                balance += delta
                results.append(desc)
            else:
                results.append("Nichts getan")

            balance = round(balance, 2)
            peak = max(peak, balance)
            result_text = " | ".join(results)
            memory.append(f"Tick {tick}: {decision.summary()} -> {result_text} "
                          f"(Guthaben {balance:.2f})")
            memory = memory[-10:]

            writer.writerow([
                tick,
                datetime.now(timezone.utc).isoformat(timespec="seconds"),
                f"{balance_before:.2f}", mode, decision.summary(),
                decision.reason, result_text, f"{balance - balance_before:.2f}",
                f"{balance:.2f}", decision.source,
            ])
            log_file.flush()

            colour = MODE_COLOR[mode]
            print(
                f"{C.paint(f'Tick {tick:>3}', C.BOLD)}  "
                f"{C.paint(f'{balance:8.2f} Cr', colour, C.BOLD)}  "
                f"{C.paint(f'[{mode:^8}]', colour)}  "
                f"{C.paint(decision.summary(), C.MAGENTA)}"
            )
            print(f"        {C.paint('Grund: ' + decision.reason, C.DIM)}")
            print(f"        {C.paint(result_text, C.CYAN)}")

            if balance <= 0:
                death_cause = (
                    f"Guthaben auf {balance:.2f} gefallen nach Aktion "
                    f"'{decision.summary()}'"
                )
                print(C.paint(
                    f"\n*** AGENT TOT in Tick {tick}: {death_cause} ***", C.RED, C.BOLD))
                send_telegram(
                    f"[Survival Agent] TOT in Tick {tick}. {death_cause}. "
                    f"Hoechststand: {peak:.2f} Credits."
                )
                break
        else:
            death_cause = "ueberlebt (Tick-Limit erreicht)"
    finally:
        log_file.close()

    # --- Zusammenfassung ---
    api_calls = getattr(decider, "api_calls", 0)
    print(C.paint("\n=== Zusammenfassung ===", C.BOLD, C.CYAN))
    print(f"  Ueberlebensdauer : {tick} Ticks")
    print(f"  Endguthaben      : {balance:.2f} Credits")
    print(f"  Hoechstes Guthaben: {peak:.2f} Credits")
    print(f"  Todesursache     : {death_cause}")
    print(f"  API-Aufrufe      : {api_calls}")
    print(f"  Log              : {log_path.resolve()}\n")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Survival Agent Simulation (Spielgeld)")
    p.add_argument("--mock", action="store_true",
                   help="Ohne API: einfache Regel-Logik entscheidet (kostenlos)")
    p.add_argument("--ticks", type=int, default=50, help="Maximale Anzahl Ticks")
    p.add_argument("--start-balance", type=float, default=100.0,
                   help="Startguthaben in Credits")
    p.add_argument("--seed", type=int, default=None, help="Zufalls-Seed")
    p.add_argument("--log", default="log.csv", help="Pfad zur CSV-Logdatei")
    p.add_argument("--no-market", action="store_true",
                   help="Riskanten Casino/Trading-Markt deaktivieren")
    p.add_argument("--max-api-calls", type=int, default=MAX_API_CALLS,
                   help="Sicherheitslimit fuer API-Aufrufe pro Lauf")
    return p


def main() -> int:
    load_env()
    args = build_parser().parse_args()
    if args.ticks <= 0:
        print("--ticks muss groesser als 0 sein.")
        return 2
    try:
        return run(args)
    except KeyboardInterrupt:
        print(C.paint("\nAbgebrochen.", C.YELLOW))
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
