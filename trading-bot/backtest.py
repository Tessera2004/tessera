#!/usr/bin/env python3
"""
Einfacher Backtest der Strategie über die letzten ~60 Tage (15m-Kerzen)
bzw. ~2 Jahre (1h-Kerzen). Zeigt Trefferquote und Gewinn in R
(1R = eingegangenes Risiko pro Trade).

Aufruf:  python3 backtest.py [1h|15m]
"""

import sys

import yfinance as yf

import strategy
from instruments import INSTRUMENTS


def run(name: str, ticker: str, interval: str, analyze_fn):
    period = "2y" if interval == "1h" else "60d"
    df = yf.download(ticker, period=period, interval=interval,
                     progress=False, auto_adjust=True)
    if df is None or df.empty:
        print(f"{name}: keine Daten")
        return None
    if hasattr(df.columns, "nlevels") and df.columns.nlevels > 1:
        df.columns = df.columns.get_level_values(0)
    df = df.dropna()

    wins = losses = 0
    total_r = 0.0
    open_trade = None  # (direction, entry, sl, tp)

    for i in range(strategy.MIN_BARS, len(df)):
        window = df.iloc[:i]
        bar = df.iloc[i]  # nächste Kerze nach dem Signal

        if open_trade:
            d, entry, sl, tp = open_trade
            hi, lo = float(bar["High"]), float(bar["Low"])
            if d == "LONG":
                if lo <= sl:
                    losses += 1; total_r -= 1; open_trade = None
                elif hi >= tp:
                    wins += 1; total_r += 2; open_trade = None
            else:
                if hi >= sl:
                    losses += 1; total_r -= 1; open_trade = None
                elif lo <= tp:
                    wins += 1; total_r += 2; open_trade = None
            continue

        sig = analyze_fn(window)
        if sig:
            open_trade = (sig.direction, sig.entry, sig.stop_loss,
                          sig.take_profit_2)

    n = wins + losses
    if n == 0:
        print(f"{name}: keine abgeschlossenen Trades im Zeitraum")
        return None
    print(f"{name}: {n} Trades | Trefferquote {wins / n * 100:.0f}% | "
          f"Ergebnis {total_r:+.1f}R")
    return total_r


def main():
    interval = sys.argv[1] if len(sys.argv) > 1 else "1h"
    print(f"Backtest ({interval}-Kerzen, TP=2R, SL=1R) — vereinfacht, "
          f"ohne Spread/Slippage:")
    for strat_name, analyze_fn in strategy.STRATEGIES.items():
        print(f"\n=== Strategie: {strat_name} ===")
        total = 0.0
        for name, ticker in INSTRUMENTS.items():
            r = run(name, ticker, interval, analyze_fn)
            if r is not None:
                total += r
        print(f"Gesamt ({strat_name}): {total:+.1f}R")
    print("\nHinweis: 1R = dein Risiko pro Trade. Bei 1% Risiko pro Trade "
          "entspricht +10R also +10% aufs Konto.")


if __name__ == "__main__":
    main()
