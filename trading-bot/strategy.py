"""
Bewährte Trendfolge-Strategie mit Pullback-Einstieg.

Logik (Long-Beispiel, Short spiegelverkehrt):
  1. TRENDFILTER : Kurs über EMA 200  UND  EMA 50 über EMA 200  -> nur Long-Signale
  2. PULLBACK    : RSI(14) fiel unter 45 (Rücksetzer im Aufwärtstrend)
  3. EINSTIEG    : RSI kreuzt wieder über 45  UND  MACD-Histogramm dreht nach oben
  4. RISIKO      : Stop-Loss = 1.5 x ATR(14), TP1 = 1R, TP2 = 2R

Alle Indikatoren sind in reinem pandas implementiert (kein TA-Lib nötig).
"""

from dataclasses import dataclass
from typing import Optional

import pandas as pd

# ---------------------------------------------------------------- Indikatoren


def ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, 1e-10)
    return 100 - (100 / (1 + rs))


def macd_histogram(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.Series:
    macd_line = ema(series, fast) - ema(series, slow)
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    return macd_line - signal_line


def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    high, low, close = df["High"], df["Low"], df["Close"]
    prev_close = close.shift(1)
    tr = pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1
    ).max(axis=1)
    return tr.ewm(alpha=1 / period, adjust=False).mean()


# ------------------------------------------------------------------- Signale


@dataclass
class Signal:
    direction: str          # "LONG" oder "SHORT"
    entry: float
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    rsi_value: float
    reason: str


# Parameter der Strategie
EMA_TREND = 200
EMA_MID = 50
RSI_PERIOD = 14
RSI_PULLBACK_LONG = 45    # RSI muss darunter fallen und wieder darüber kreuzen
RSI_PULLBACK_SHORT = 55   # spiegelverkehrt für Short
ATR_PERIOD = 14
ATR_SL_MULT = 1.5
PULLBACK_LOOKBACK = 6     # Kerzen, in denen der Pullback stattgefunden haben muss

MIN_BARS = EMA_TREND + 20


def analyze(df: pd.DataFrame) -> Optional[Signal]:
    """Prüft die letzte ABGESCHLOSSENE Kerze auf ein Signal.

    Erwartet einen DataFrame mit Spalten Open/High/Low/Close, aufsteigend
    sortiert, dessen letzte Zeile die zuletzt abgeschlossene Kerze ist.
    """
    if df is None or len(df) < MIN_BARS:
        return None

    close = df["Close"]
    ema200 = ema(close, EMA_TREND)
    ema50 = ema(close, EMA_MID)
    rsi14 = rsi(close, RSI_PERIOD)
    hist = macd_histogram(close)
    atr14 = atr(df, ATR_PERIOD)

    c = float(close.iloc[-1])
    cur_rsi = float(rsi14.iloc[-1])
    prev_rsi = float(rsi14.iloc[-2])
    cur_hist = float(hist.iloc[-1])
    prev_hist = float(hist.iloc[-2])
    cur_atr = float(atr14.iloc[-1])

    if cur_atr <= 0:
        return None

    uptrend = c > float(ema200.iloc[-1]) and float(ema50.iloc[-1]) > float(ema200.iloc[-1])
    downtrend = c < float(ema200.iloc[-1]) and float(ema50.iloc[-1]) < float(ema200.iloc[-1])

    recent_rsi = rsi14.iloc[-(PULLBACK_LOOKBACK + 1):-1]

    # ------------------------------------------------------------- LONG
    if uptrend:
        had_pullback = bool((recent_rsi < RSI_PULLBACK_LONG).any())
        rsi_cross_up = prev_rsi <= RSI_PULLBACK_LONG < cur_rsi
        macd_turning_up = cur_hist > prev_hist and cur_hist > 0

        if had_pullback and rsi_cross_up and macd_turning_up:
            sl = c - ATR_SL_MULT * cur_atr
            risk = c - sl
            return Signal(
                direction="LONG",
                entry=c,
                stop_loss=sl,
                take_profit_1=c + risk,
                take_profit_2=c + 2 * risk,
                rsi_value=cur_rsi,
                reason=(
                    "Aufwärtstrend (Kurs > EMA200, EMA50 > EMA200), "
                    "RSI-Pullback beendet, MACD dreht nach oben"
                ),
            )

    # ------------------------------------------------------------ SHORT
    if downtrend:
        had_pullback = bool((recent_rsi > RSI_PULLBACK_SHORT).any())
        rsi_cross_down = prev_rsi >= RSI_PULLBACK_SHORT > cur_rsi
        macd_turning_down = cur_hist < prev_hist and cur_hist < 0

        if had_pullback and rsi_cross_down and macd_turning_down:
            sl = c + ATR_SL_MULT * cur_atr
            risk = sl - c
            return Signal(
                direction="SHORT",
                entry=c,
                stop_loss=sl,
                take_profit_1=c - risk,
                take_profit_2=c - 2 * risk,
                rsi_value=cur_rsi,
                reason=(
                    "Abwärtstrend (Kurs < EMA200, EMA50 < EMA200), "
                    "RSI-Erholung beendet, MACD dreht nach unten"
                ),
            )

    return None


def trend_snapshot(df: pd.DataFrame) -> dict:
    """Kompakter Marktüberblick für den /status-Befehl."""
    close = df["Close"]
    c = float(close.iloc[-1])
    e200 = float(ema(close, EMA_TREND).iloc[-1])
    e50 = float(ema(close, EMA_MID).iloc[-1])
    if c > e200 and e50 > e200:
        trend = "Aufwärtstrend 📈"
    elif c < e200 and e50 < e200:
        trend = "Abwärtstrend 📉"
    else:
        trend = "Seitwärts / unklar ➡️"
    return {
        "price": c,
        "trend": trend,
        "rsi": float(rsi(close, RSI_PERIOD).iloc[-1]),
    }
