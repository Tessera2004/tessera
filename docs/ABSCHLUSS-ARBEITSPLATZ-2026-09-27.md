# Arbeitsplatz und Design – geprüfter Stand

## Diese Runde umgesetzt

- Dashboard: offene heutige Einsätze, fällige Aufgaben und Rückrufe als direkte Einstiege; auf dem Handy lesbare Einsatzkarten statt breiter Tabelle.
- Kunden: native bedienbare Schaltflächen; Kontakt, Offerten und Anrufe getrennt, mit Tastaturnavigation. Kunden- und Anruftexte werden als Text ausgegeben statt ungeprüft als HTML.
- Büro-Team: Personen/Einladungen, Rollen/Rechte und Änderungsverlauf getrennt. Berechtigungslogik unverändert.
- Einstellungen: Kategorien auf grossen Bildschirmen umbrechend, auf kleinen horizontal erreichbar.
- Mitarbeiter-App: lesbarere Einsatzkarten, schmale Geräte ohne überlappende Zeitspalte, grössere Aktionen, QR-Overlay am Bildschirm.
- Zeitfenster (separates Repository): direkte Einstellungsnavigation, erreichbarer Speichern-Kopf, vorgelesene Erfolgs-/Fehlermeldungen.

## Prüfung

Bestanden: app-pruefen.py, product-integrity-regression.cjs, booking-interval-regression.cjs, invoice-delivery-regression.cjs, security-check.mjs und handover-regression.mjs. Lokale Browserprüfungen für Preisberechnung, unveränderte ausgestellte PDF, Routenprüfung/Rücknahme und 13 Ansichten ohne JavaScript-Fehler.

Design-Browserprüfung: Planung, Offerten, Rechnungen von 320 bis 1440 px; Auftragspreise auf Handy/Desktop. workspace-browser.py prüft Dashboard, Kunden, Team, Einstellungen von 320 bis 1440 px, Tastatur-Tabs und Mitarbeiterkarten von 320 bis 768 px. Prüfbilder gesichtet; dabei gefundene Überlappung auf 320 px korrigiert.

Zeitfenster: statischer Build und TypeScript-Prüfung; Buchungsablauf mit simulierten Daten und mobile Einstellungen ohne Überbreite/JavaScript-Fehler. Keine externe Schreibanfrage. Geänderte Verwaltungsdatei separat linten; der gesamte Linter meldet weiterhin bestehende Probleme in den allgemeinen components/ui-Vorlagen. Diese sind nicht Teil einer bestätigten vollständigen Bereinigung.

## Nicht mit einer Produktionsfreigabe verwechseln

Die neuen Datenbankmigrationen vom 27.09. sind **nicht angewendet oder gegen eine echte PostgreSQL-Testdatenbank abgenommen**. Lokal fehlen PostgreSQL und Container-Laufzeit. Mock-/Quelltests ersetzen weder RLS- noch Parallelitätstests in PostgreSQL.

Vor Veröffentlichung bleibt die Freigabereihenfolge aus UMSETZUNG-PRODUKTPRUEFUNG-2026-09-27.md verbindlich: separate Testdatenbank, Migrationen/RLS/Parallelität abnehmen, Backend-Funktionen deployen, erst danach passende Frontends veröffentlichen. Nicht einfach den gesamten Stand pushen, solange das Backend nicht bereit ist.

Zusätzlich offen: echter Mailversand, Kamera/GPS/Uploads auf einem echten Handy, Zahlungs-/QR-Abnahme. Keine E-Mails versendet, keine Zahlungen ausgelöst, keine Live-Daten verändert, nichts gepusht. Damit sind die hier beschriebenen lokalen Änderungen fertig, nicht sämtliche denkbaren Funktionen oder der produktive Gesamtbetrieb garantiert fehlerfrei.
