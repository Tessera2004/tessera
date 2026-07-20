# 📈 Telegram Trading-Signal-Bot (Forex, GER40, NAS100)

Ein Bot, der die Märkte automatisch überwacht und dir bei einem
Handelssignal einen **Alarm auf Telegram** schickt — mit Einstieg,
Stop-Loss und zwei Take-Profit-Zielen. **Du führst die Trades selbst
bei deinem Broker aus** (der Bot handelt nicht automatisch).

## Überwachte Märkte

- EUR/USD und GBP/USD (Forex)
- GER40 / DAX
- NAS100 / Nasdaq 100

Weitere Märkte kannst du in `bot.py` unter `INSTRUMENTS` ergänzen
(Yahoo-Finance-Ticker, z. B. `"Gold": "GC=F"` oder `"USD/JPY": "JPY=X"`).

## Die Strategie (bewährte Trendfolge mit Pullback)

Trendfolge ist die am besten dokumentierte und über Jahrzehnte
robusteste Strategie-Klasse. Der Bot kombiniert sie mit einem
Pullback-Einstieg, damit du nicht am Hoch kaufst:

1. **Trendfilter**: Kurs über EMA 200 und EMA 50 über EMA 200 → nur Käufe.
   Umgekehrt → nur Verkäufe. (Niemals gegen den Trend!)
2. **Pullback**: RSI(14) fällt im Aufwärtstrend unter 45 (Rücksetzer).
3. **Einstieg**: RSI kreuzt wieder nach oben **und** das MACD-Histogramm
   dreht nach oben → Kaufsignal.
4. **Risiko-Management**: Stop-Loss = 1,5 × ATR(14).
   Ziel 1 = 1× Risiko, Ziel 2 = 2× Risiko.

Empfehlung bei Alarm: Bei Ziel 1 die halbe Position schließen und den
Stop auf den Einstieg ziehen — so ist der Trade ab dann risikofrei.

## Einrichtung (ca. 5 Minuten)

### 1. Telegram-Bot erstellen

1. Öffne Telegram und schreibe [@BotFather](https://t.me/BotFather) an.
2. Sende `/newbot`, wähle einen Namen und Benutzernamen.
3. Du bekommst einen **Token** wie `123456789:ABCdef...` — kopieren!
4. Schreibe [@userinfobot](https://t.me/userinfobot) an — er zeigt dir
   deine **Chat-ID** (eine Zahl).
5. Wichtig: Schicke deinem neuen Bot einmal `/start`, damit er dir
   schreiben darf.

### 2. Bot installieren und starten

```bash
cd trading-bot
pip3 install -r requirements.txt

cp .env.example .env
# .env öffnen und TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID eintragen

python3 bot.py
```

Der Bot meldet sich sofort mit einer Startnachricht in Telegram.

### 3. Dauerhaft laufen lassen

Der Bot muss laufen, um Alarme zu schicken. Optionen:

- **Eigener PC/Server**: `nohup python3 bot.py &` (Linux/Mac) oder
  einfach das Terminal offen lassen.
- **Kostenloser Cloud-Server**: z. B. Oracle Cloud Free Tier, oder ein
  günstiger VPS (~4 €/Monat). Dort per `systemd` oder `screen` starten.
- **Raspberry Pi**: perfekt geeignet, minimaler Stromverbrauch.

## Telegram-Befehle

| Befehl    | Funktion                                    |
|-----------|---------------------------------------------|
| `/status` | Aktueller Marktüberblick (Trend, RSI, Kurs) |
| `/hilfe`  | Hilfe und Einstellungen anzeigen            |

## Backtest

Prüfe selbst, wie die Strategie zuletzt gelaufen wäre:

```bash
python3 backtest.py 1h    # ~2 Jahre auf Stundenkerzen
python3 backtest.py 15m   # ~60 Tage auf 15-Minuten-Kerzen
```

Ausgabe in **R** (1R = dein Risiko pro Trade). Der Backtest ist
vereinfacht (ohne Spread/Slippage) und dient nur zur Orientierung.

## Einstellungen (in `.env`)

| Variable              | Standard | Bedeutung                          |
|-----------------------|----------|------------------------------------|
| `CANDLE_INTERVAL`     | `15m`    | Kerzen-Intervall (5m/15m/30m/1h)  |
| `CHECK_EVERY_SECONDS` | `300`    | Prüf-Rhythmus in Sekunden          |
| `COOLDOWN_SECONDS`    | `3600`   | Mindestabstand zwischen Alarmen    |

Für ruhigere, verlässlichere Signale: `CANDLE_INTERVAL=1h`.
Für mehr Signale (aber mehr Rauschen): `5m`.

## ⚠️ Wichtige Hinweise

- **Keine Anlageberatung.** Kein Bot und keine Strategie gewinnt immer —
  auch Trendfolge hat Verlustphasen. Der Vorteil kommt über viele Trades
  mit gutem Chance-Risiko-Verhältnis (hier 2:1).
- **Riskiere pro Trade maximal 1–2 %** deines Kontos. Positionsgröße =
  (Konto × 1 %) ÷ Abstand zum Stop-Loss.
- Yahoo-Finance-Kurse können bei Indizes ~15 Minuten verzögert sein —
  vergleiche den Einstieg immer mit dem Kurs bei deinem Broker.
- Handle GER40/NAS100 nur zu den Haupthandelszeiten (9–22 Uhr MEZ),
  Forex läuft rund um die Uhr (Mo–Fr).
