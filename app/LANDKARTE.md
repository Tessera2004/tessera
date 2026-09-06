# Landkarte der App

Wo liegt was. Gedacht für den Einstieg — damit niemand die ganze App laden
muss, um eine Stelle zu finden.

Stand 6. September 2026, nach dem Aufteilen von `app.html`.

---

## Die beiden Oberflächen

| Datei | Was | Grösse |
|---|---|---|
| `app.html` | Büro-Anwendung: Aufbau und Gestaltung, lädt den Code | 4'093 Zeilen |
| `mobile.html` | Feld-App fürs Handy, eigenständig | 1'035 Zeilen |

`mobile.html` bringt ihren Code selbst mit und liest direkt aus Supabase.
Sie teilt sich mit dem Büro nur `app-i18n.js` und `presets.js`.

---

## Der Code des Büros

Vierzehn Dateien, geladen in dieser Reihenfolge. **Die Reihenfolge zählt** —
siehe unten.

| Datei | Zeilen | Inhalt |
|---|---|---|
| `app-basis.js` | 614 | Seitenleiste, Module und Freischaltung, Testphase, Branchen-Preset |
| `app-benutzer.js` | 635 | Benutzer, Rollen, Rechte, Einladungen |
| `app-planung.js` | 1076 | Routenplanung, Tages-Crew, eigene Aufträge, Job-Editor |
| `app-kunden.js` | 174 | Kundenverwaltung |
| `app-branchen.js` | 558 | Handwerk (Baustellen, Rapporte), Schädling (Köderstellen), Werkstattplan |
| `app-firma-basis.js` | 393 | Firmen-Stammdaten, Länder-Lokalisierung (`chf()`, `coLocale()`) |
| `app-fahrzeuge.js` | 372 | Reifenhotel, Fahrzeugakte |
| `app-aufgaben.js` | 935 | Anrufprotokoll, Aufgaben, Historie, Monatsbericht |
| `app-mitarbeiter.js` | 391 | Mitarbeiter, Teams, Erscheinungsbild, Modals, `toast()` |
| `app-routen.js` | 756 | Routenoptimierung, Auftrag speichern, Berichte, Dashboard, Zeiterfassung, Nachkalkulation, Abos |
| `app-firma.js` | 833 | Firmeneinstellungen, QR-Rechnung, Adresssuche, Auftrag-Assistent |
| `app-preise.js` | 531 | Preislisten je Branche, eigene Leistungen, Abrechnungsarten |
| `app-offerten.js` | 1498 | Offerten-Editor, eigene Textvorlagen, PDF-Ausgabe |
| `app-konto.js` | 1040 | Anmeldung und Mandant, Rechnungen, Mail-Ansicht, Start der App |

## Die übrigen Dateien

| Datei | Inhalt |
|---|---|
| `app-i18n.js` | Alle Texte in fünf Sprachen. **Grösste Fehlerquelle: Apostrophe.** Siehe unten. |
| `styles.css` | Gestaltung, auch für Feld-App und Anmeldung |
| `db-sync.js` | Schreibt lokale Änderungen nach Supabase, mit Warteschlange |
| `presets.js` | Was eine Branche mitbringt: Leistungen, Begriffe, Protokollpunkte |
| `demo-data.js` | Beispieldaten für `?demo=1` |
| `tour.js` | Geführte Einführung beim ersten Start |
| `billing.js`, `stripe-config.js` | Abo und Bezahlung |
| `supabase-client.js`, `supabase-config.js` | Verbindung zur Datenbank |
| `mail-config.js` | OAuth für die Mail-Anbindung (noch ohne Zugangsdaten) |

---

## Wo finde ich …

| Ich suche … | Datei |
|---|---|
| Preise, Mindestbuchung, Anfahrt, m² ↔ Stunde | `app-preise.js` |
| den Auftrag-Assistenten, Preisberechnung darin | `app-firma.js` (`wizCalcPrice`) |
| Kundenwahl im Auftrag | `app-firma.js` (`wizKundeSuchen`) |
| Offerten-Text, Vorlagen, Platzhalter | `app-offerten.js` |
| PDF-Ausgabe, Logo, Markenfarbe | `app-offerten.js` (`downloadOffertePDF`, `pdfLogo`, `belegHeader`) |
| die Rechnung zum Auftrag | `app-routen.js` (`generateInvoiceForJob`) |
| Historie, wer hat was gelöscht | `app-aufgaben.js` (`protokolliere`) |
| Aktivitäten auf dem Dashboard | `app-routen.js` (`renderDashboard`) |
| Zeitfaktoren, Routenstart | `app-offerten.js` (`ladeZeitfaktoren`) |
| Abo-Verträge, Nachfüllen | `app-routen.js` (`abosNachfuellen`) |
| Routenoptimierung | `app-routen.js` (`optimizeTeamOrder`) |
| Aufgaben im Handy, QR-Scanner | `mobile.html` |

Wenn du eine Funktion suchst und nicht weisst wo:

```bash
grep -n "function wizCalcPrice" app/app-*.js
```

---

## Drei Dinge, die man wissen muss

**1. Es sind gewöhnliche Skripte, keine Module.** Alle vierzehn Dateien
teilen sich denselben globalen Namensraum — `loadCustomers()` aus
`app-kunden.js` ist überall verfügbar. Dafür gilt: **Funktionen werden nur
noch innerhalb ihrer eigenen Datei nach oben gezogen.** Code, der beim Laden
ausgeführt wird, darf nichts aufrufen, das erst in einer späteren Datei
steht. Aufrufe in Ereignis-Zuhörern sind unbedenklich — die laufen später,
wenn alles geladen ist.

Beim Verschieben von Code also prüfen: Wird das beim Laden ausgeführt, oder
erst auf Klick?

**2. Cache-Versionen erhöhen.** Jede `<script src="app-x.js?v=N">` in
`app.html` hat eine Nummer. Wer sie vergisst, sieht tagelang den alten Stand,
während lokal alles stimmt. Das hat in diesem Projekt schon mehrfach Zeit
gekostet.

**3. Apostrophe in `app-i18n.js`.** Die Datei ist eine grosse
JavaScript-Zuordnung in einfachen Anführungszeichen. Ein französisches
`l'appel` oder englisches `job's` braucht `\'`. Ein doppeltes Escape
(`l\\'appel`) bricht die ganze Datei — und die App fällt still auf Deutsch
zurück, ohne sichtbaren Fehler. Nach jeder Änderung prüfen:

```js
Object.keys(MosaI18n.DICT)   // muss ['de','fr','it','es','en'] ergeben
```

---

## Prüfen ohne die App zu öffnen

Syntax aller Code-Dateien:

```bash
for f in app/app-*.js; do node --check "$f" || echo "FEHLER $f"; done
```

Auf diesem Mac gibt es kein globales `node` — der Pfad steht in
`scripts/supabase.sh`.
