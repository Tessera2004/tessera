# Produktkorrekturen – Umsetzung und Freigabe

Stand: 27. September 2026. Ergänzung zur ursprünglichen `PRODUKTPRUEFUNG-2026-09-27.md`.

## Status

Die unten genannten Änderungen sind lokal implementiert und mit isolierten Testdaten geprüft. **Nicht produktiv eingespielt.** Kein Push, keine echte Mail, Buchung oder Zahlung. Die SQL-Migrationen wurden geprüft, aber mangels lokaler PostgreSQL-Instanz noch nicht ausgeführt. Browser- und Backend-Tests ersetzen diesen Datenbanktest nicht.

**Nicht einfach nur die Websites pushen:** Das neue Frontend benötigt zuerst die neuen Datenbankfelder, Rechnungsfunktionen und Edge Functions.

## Implementiert

- Einheitliche Preisberechnung für Preislistenübernahme der Offerte und Auftragsassistent; Mindestbetrag, Anfahrt, Zuschläge und manuelle Anpassung als Positionen. Gespeicherte Stundensätze/Mindestpreise werden nicht mehr gelöscht. Stunden-/Flächenmodus reist mit der Firmenpreisliste. Neue Aufträge behalten den Berechnungsstand.
- Rechnungen übernehmen gespeicherte Positionen. Alte Aufträge ohne verlässliche Mengen werden als vereinbarte Pauschale ausgewiesen, nicht als erfundener Stundensatz.
- Neuer Rechnungsdatensatz mit mandantenspezifischem Zähler, eingefrorenen Firmen-/Empfänger-/Preis-/Steuerdaten und ursprünglicher PDF-Datei. Erneuter Abruf verwendet das Original. Bereits früher ausgestellte Rechnungen ohne Archiv werden nicht stillschweigend neu ausgestellt.
- IBAN-Prüfung und vollständige Swiss-QR-Feldstruktur mit strukturierten Adressen; QR-IBAN ohne QR-Referenz wird abgelehnt. Korrekte Symbolgrösse und reservierter Zahlteil. Lange Rechnungstexte werden umgebrochen und auf weitere Seiten verteilt.
- Vorschau, Ausstellung und Versand sind getrennt. Auftragsabschluss verschickt keine Rechnung automatisch. Sichere Gmail-Verbindung bleibt im Backend. Versand nutzt den archivierten Empfänger und das Original-PDF; gleichzeitige Sendewünsche werden gesperrt. Bei unklarem Versandresultat kein blindes erneutes Senden.
- Speicherwarteschlange behält auch mehr als 250 Einträge und endgültig fehlgeschlagene Versuche. Mandantenwechsel kann fremde Warteschlangeneinträge nicht übertragen. Sichtbarer Fehlerstatus mit Wiederholen/Export; Logout warnt bei ausstehenden Daten. Während eines Ladevorgangs bearbeitete lokale Daten werden nicht mit einem alten Serverstand überschrieben.
- Routenberechnung als Vorschlag mit ausdrücklicher Übernahme und Rückgängig. Feste Termine bleiben fest; nur ausdrücklich flexible Aufträge werden verschoben. Schichtende, Pause, Rückfahrt, fehlende Fahrzeit und unzureichende verfügbare Teamgrösse werden geprüft. Änderungen während der Berechnung machen den Vorschlag ungültig.
- Planung zeigt laufende Einsätze statt unbegründetem „frei“. Ist-Personenstunden werden über stabile Auftragskennungen gespeichert und mit dem Auftrag synchronisiert. Vergleich nur mit erfassten Einsätzen; Soll berücksichtigt die geplante Besetzung.
- Einstellungen in sieben Register aufgeteilt, bessere sekundäre Schrift/Fokusführung, Einsätze im Dashboard vor Kennzahlen. Demo-Identität im Seitenleistenfuss an die Kopfzeile angeglichen. Navigation zur Einsatzadresse in der Feld-App ergänzt.
- Zeitfenster: Leistung vor Uhrzeit, Dauer und Puffer je Leistung, serverseitig abgeleitete Dauer, überlappende Intervalle inklusive Tageswechsel berücksichtigt. Datenbank-Sperre gegen gleichzeitige Überschneidungen vorbereitet. Kalenderdatei nach Buchung, kompaktere mobile Buchungsansicht und korrigierte mobile Verwaltung.

## Nachweise

Erfolgreich lokal ausgeführt:

```sh
python3 scripts/app-pruefen.py
node scripts/product-integrity-regression.cjs
node scripts/booking-interval-regression.cjs
node scripts/invoice-delivery-regression.cjs
node scripts/security-check.mjs
node scripts/handover-regression.mjs
python3 scripts/product-integrity-browser.py
python3 scripts/sprachen-bauen.py
git diff --check
```

Die Node-Tests für TypeScript verwenden Node 24 (`stripTypeScriptTypes`). Browserprüfung benötigt Python Playwright und Chromium; Ergebnisse gehen in einen neu angelegten temporären Ordner. Supabase-Anfragen werden blockiert oder simuliert. Drittanbieter-Browserbibliotheken kommen wie in der App vom CDN.

Konkrete Ergebnisse:

- Gespeicherte Werte 79/84/600/900 bleiben erhalten. Offerte und Auftrag jeweils 275 CHF statt zuvor 160/275. Leiterzuschlag ergibt in DE/EN/FR denselben Testbetrag von 112 CHF.
- 305 fehlgeschlagene Schreibaufträge bleiben erhalten; Wiederholung, Mandantentrennung und Bearbeitung während des Ladens getestet.
- Fester Termin bleibt 14:00, flexibler Termin wird 08:00; Übernahme und Rückgängig getestet. Gleichzeitige lokale Planänderung wird geschützt.
- Drei Rechnungsfälle erzeugt: normale Rechnung, mehrseitiger Text und langer Firmenname/Adresse. Insgesamt vier gerenderte Seiten visuell geprüft. Original-PDF nach nachträglicher Preis-/Firmenänderung bytegleich.
- 13 Büroansichten geprüft; zentrale Ansichten zusätzlich bei 390 px, kein horizontaler Seitenüberlauf und keine JavaScript-Seitenfehler in diesen Abläufen.
- Versandhandler mit simulierter Datenbank/Gmail getestet: gleichzeitige Anfragen erzeugen nur einen Versand; Timeout/5xx führen nicht zur automatischen Doppelzustellung; falsche Berechtigungen senden nichts.
- Zeitfenster separat: TypeScript-Prüfung, `oxlint app lib --deny-warnings`, Produktionsbuild und Browserprüfung erfolgreich; öffentliche und Verwaltungsansicht bei 390 px ohne Seitenüberlauf. Keine externen Schreibanfragen im Browsertest.
- Der vollständige Zeitfenster-Lint enthält weiterhin 19 bereits vorhandene Befunde in unberührten Vorlagenkomponenten/Hooks. Er ist nicht als vollständig bestanden ausgewiesen.

## Reihenfolge vor Veröffentlichung

1. Gesonderte Testdatenbank/Backup vorbereiten; aktuelle Migrationen und vorhandene Rollenfunktionen prüfen. Keine Testmigration blind auf das einzige Live-System anwenden.
2. `202609270001_product_integrity.sql` in der Testdatenbank ausführen: `plan_jobs.details`, Rechnungsarchiv und Zähler. RLS mit zwei Mandanten und nicht berechtigter Rolle prüfen. Gleichzeitige Ausstellung desselben und verschiedener Aufträge, Originalabruf und Erstschreiben der PDF testen.
3. Vor `202609270002_booking_intervals.sql` bestehende Buchungen fachlich prüfen. Alttermine erhalten zunächst 30 Minuten und 0 Puffer. Die Migration bricht bei bestehenden Überschneidungen vollständig ab; **keine Termine löschen**, sondern tatsächliche Dauern/Belegungen klären. Danach parallele Buchung/Änderung, Absage und Mitternachtsfälle in PostgreSQL testen.
4. Erst nach erfolgreicher Abnahme die Migrationen im vorgesehenen Zielsystem einspielen. Beide senden `NOTIFY pgrst, 'reload schema'`. Für Wiederholungen die Migrationstabelle beachten; die neuen Policies/Constraints sind nicht für beliebiges doppeltes manuelles Ausführen gedacht.
5. Edge Functions `send-job-invoice` und `zeitfenster` mit gemeinsamem Helper deployen. Bestehende Authentifizierungs-/Secret-Einstellungen erhalten. Kein API-Schlüssel ins Frontend. Unklare Versandzustände nur nach Prüfung im tatsächlichen Ausgangspostfach freigeben.
6. Dann MosaOS und Zeitfenster veröffentlichen (Push durch Brian). Isolierte Testkonten verwenden; echter Mailversand nur nach separater Freigabe an ein eigenes Testpostfach. Keinen KI-Agenten und keine kostenpflichtigen Dienste einschalten.
7. Bestehende Warteschlangeneinträge ohne Mandantenkennung nicht automatisch einem Konto zuordnen. Export sichern und Zuordnung prüfen. Frühere verlorene Serverdaten kann diese Korrektur nicht rückwirkend rekonstruieren.

## Bewusst noch offen / keine Vollabnahme behaupten

- Echte Datenbankausführung und Parallelität/RLS, realer Gmail-Rundlauf, Bank-/QR-Scan, Offline-Fotos/Unterschriften auf echtem iPhone und Zweitgerät sowie Stripe sind noch nicht abgenommen.
- Rechnungsarchiv ist keine vollständige Buchhaltung. Storno/Gutschrift, revisionssichere Zahlungsbuchungen und Migration alter Rechnungsdateien fehlen weiterhin. Quittungen und Offerten haben noch nicht dieselbe serverseitige unveränderliche Archivierung wie der neue Rechnungspfad.
- Zeitfenster verwendet weiterhin ausdrücklich konfigurierte **Startzeiten**, keine automatisch generierten Öffnungsintervalle. Die Verwaltung nennt dies jetzt korrekt und weist auf ausreichende Restzeit hin. Automatische Vorab-Erinnerungen, mehrere Räume/Mitarbeitende und externe Kalender-Synchronisation sind nicht Bestandteil dieser Korrektur; Kalenderdatei ist keine Synchronisation.
- Grössere UI-Ausbauschritte (Teamverwaltung in Register, vollständige Kartenansichten statt Tabellen, komplette Übersetzung aller Resttexte, umfassender Barrierefreiheitstest) sind weitere Arbeit, nicht als erledigt gekennzeichnet.
- Fahrzeiten sind Schätzungen ohne Echtzeitverkehr; keine Garantie für den realen Arbeitstag. Flexible Zeitfenster sind im Datenmodell geschützt, der Assistent bietet derzeit vor allem die ausdrückliche Flexible/Fest-Auswahl.

Diese Einschränkungen bleiben sichtbar, damit aus bestandenen lokalen Tests keine falsche Behauptung „alles produktiv fertig“ wird.
