# Survival Agent

Eine Simulation: Ein KI-Agent muss mit **Spielgeld** (Credits) überleben. Jede Runde
kostet ihn Geld, er muss sich seinen Unterhalt durch Jobs verdienen — und wenn das
Guthaben auf 0 fällt, ist er endgültig tot.

> Alles hier ist Spielgeld. Es gibt keine echten Zahlungen, keine echten Märkte.

## Schnellstart

```bash
cd survival-agent
python3 -m venv .venv && source .venv/bin/activate

# 1) Kostenlos testen, ohne API und ohne Installation:
python main.py --mock

# 2) Mit Claude (Anthropic API):
pip install -r requirements.txt
cp .env.example .env        # ANTHROPIC_API_KEY eintragen
python main.py --ticks 50
```

## Spielregeln

| Regel | Wert |
|---|---|
| Startguthaben | 100 Credits |
| Grundkosten pro Tick | 2 Credits |
| Denkkosten teures Modell | 3 Credits / Tick |
| Denkkosten billiges Modell | 0,5 Credits / Tick |
| Tod | Guthaben ≤ 0 → Simulation stoppt endgültig, Log wird geschlossen |

### Überlebensmodi

| Modus | Guthaben | Modell | Aktionen/Tick | Markt erlaubt |
|---|---|---|---|---|
| `normal` | > 50 | teuer (`claude-opus-5`) | 2 | ja |
| `low` | 20 – 50 | billig (`claude-haiku-4-5`) | 1 | ja |
| `critical` | < 20 | billig | 1 | **nein** (nur Jobs oder nichts tun) |

### Wirtschaft

* Pro Tick entstehen **3–5 zufällige Jobs** (Text schreiben, Daten sortieren,
  Rechenaufgabe, Bug fixen, …) mit Belohnung, Schwierigkeit, Erfolgswahrscheinlichkeit
  und Aufwandskosten.
* Der Aufwand liegt nahe am Erwartungswert der Belohnung: manche Jobs lohnen sich,
  manche nicht. **Scheitert ein Job, ist das Geld für den Aufwand trotzdem weg.**
* Zusätzlich gibt es einen riskanten **Casino/Trading-Markt** mit hoher Varianz und
  leicht negativem Erwartungswert — daran sieht man, ob der Agent unter Druck zu
  riskant wird. Abschaltbar mit `--no-market`.

## KI-Entscheidungen

Pro Tick sieht der Agent sein Guthaben, seinen Modus, die verfügbaren Jobs, das
Marktangebot und die **letzten 10 Ereignisse** als Gedächtnis. Claude antwortet immer
als JSON:

```json
{"action": "take_jobs", "job_ids": ["t7-j2"], "reason": "Bester Erwartungswert bei hoher Erfolgschance."}
```

Die Antwort wird geprüft, bevor sie ausgeführt wird: unbekannte Job-IDs fliegen raus,
zu viele Aktionen werden abgeschnitten, im Modus `critical` wird `gamble` zu `idle`.
Unlesbare Antworten führen zu `idle` statt zu einem Absturz.

**Sicherheitslimit:** maximal **200 API-Aufrufe pro Lauf** (`--max-api-calls`), danach
stoppt die Simulation.

### `--mock`

Ohne API entscheidet eine einfache Regel-Logik (bester Erwartungswert, Notfall-Job bei
Ebbe). Das kostet nichts, braucht keinen API-Key und nicht einmal das `anthropic`-Paket
— ideal zum Testen der Simulation.

## Ausgabe

* **Terminal:** pro Tick farbig Guthaben, Modus (grün/gelb/rot), Aktion und die
  Begründung der KI.
* **`log.csv`:** Tick, Zeit, Guthaben vorher, Modus, Aktion, Begründung, Ergebnis,
  Delta, Guthaben nachher, Quelle (`claude`/`mock`).
* **Zusammenfassung:** Überlebensdauer in Ticks, Endguthaben, höchstes Guthaben,
  Todesursache, Anzahl API-Aufrufe.

## Telegram (optional)

Trage `TELEGRAM_BOT_TOKEN` und `TELEGRAM_CHAT_ID` in die `.env` ein. Dann meldet sich
der Agent, wenn er in den Modus `critical` fällt und wenn er stirbt. Fehlen die Werte,
läuft die Simulation still weiter.

## Optionen

```
--mock                  Ohne API, Regel-Logik entscheidet (kostenlos)
--ticks N               Maximale Anzahl Ticks (Standard: 50)
--start-balance X       Startguthaben (Standard: 100)
--seed N                Zufalls-Seed für reproduzierbare Läufe
--log PFAD              CSV-Logdatei (Standard: log.csv)
--no-market             Casino/Trading-Markt deaktivieren
--max-api-calls N       Sicherheitslimit für API-Aufrufe (Standard: 200)
```

## Dateien

| Datei | Inhalt |
|---|---|
| `economy.py` | Kostenmodell, Modi, Job- und Markt-Generierung, Ausführung |
| `agent.py` | Prompt, Claude-Entscheider, Mock-Entscheider, Validierung der Antwort |
| `main.py` | Simulationsschleife, farbige Ausgabe, CSV-Log, Telegram, Zusammenfassung |

Der API-Key wird **ausschließlich** aus der `.env` gelesen und steht nie im Code.
`.env` und `log.csv` sind per `.gitignore` ausgeschlossen.
