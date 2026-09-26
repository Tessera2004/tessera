# MosaOS und Zeitfenster – Produktprüfung

Stand: 27. September 2026 · MosaOS-Commit `8f98f6e`

## Ergebnis

Die Anwendungen haben eine brauchbare, zusammenhängende Grundlage. Ein kompletter Neubau oder ein Framework-Wechsel ist nicht begründet. Vor weiterer Nutzung als verlässliche Abrechnungs- und Dispositionslösung müssen aber mehrere konkrete Fehler behoben werden. Die wichtigsten betreffen Geldbeträge, QR-Rechnungen, feste Termine und die Rückmeldung über gespeicherte Daten – nicht Farben oder Animationen.

Empfohlene Reihenfolge: **Preise und Dokumente → zuverlässiges Speichern und Versenden → sichere Planung → einfachere Bedienung → Ausbau Zeitfenster.** Die Fehler in der Speicherwarteschlange sollten parallel zur ersten Korrekturrunde behandelt werden.

Dies ist ein Prüfbericht, keine Umsetzung. Anwendungscode, produktive Daten, Konten und Einstellungen wurden nicht verändert. Keine E-Mail, Buchung oder Zahlung wurde ausgelöst; nichts wurde gepusht.

## Prüfumfang und Aussagegrenzen

- Büro-App: 13 Hauptansichten im isolierten Browser angesehen, darunter Dashboard, Planung, Kunden, Mitarbeiter, Offerten, Rechnungen, Aufgaben, Zeiten, Berichte, Nachkalkulation, Abos, Büro-Team und Einstellungen. Auftragsassistent und Offerteneditor zusätzlich angesehen.
- Desktop mit 1440 Pixeln und zentrale Handyansichten mit 390 Pixeln geprüft. Mitarbeiter-App inklusive Tagesplan und Checkliste angesehen.
- Native Offerten- und Rechnungs-PDFs mit künstlichen Daten erzeugt, gerendert und visuell geprüft; zusätzlich absichtlich langer Rechnungstext.
- Preis-, Sprach-, Rechnungsnummern- und Routenfälle direkt gegen die geladenen Anwendungsfunktionen getestet. Warteschlange und Mailbox-Erkennung zusätzlich mit isolierten Originalfunktionen geprüft.
- Zeitfenster: öffentliche Live-Buchungsansicht lesend geprüft; Verwaltung und Einstellungen mit abgefangenen Backend-Anfragen und künstlichen Datensätzen angesehen. Backend- und Datenmodell anhand der Quellen geprüft.
- Die fünf zentralen Dateien `app-preise.js`, `app-firma.js`, `app-routen.js`, `db-sync.js` und `app-konto.js` sind per SHA-256 mit den öffentlich ausgelieferten Dateien auf mosaos.ch identisch. Ein Deployment sämtlicher Edge Functions wurde damit **nicht** bestätigt.
- Bestehende Prüfungen `app-pruefen.py`, `handover-regression.mjs` und `security-check.mjs` bestehen. Sie decken die unten nachgewiesenen fachlichen Fehler nicht ausreichend ab.

Nicht erfolgt: produktiver Rundlauf mit echten Kundendaten, tatsächlicher Mailversand/Spamtest, Bankfreigabe einer Rechnung, Stripe-Kauf/Kündigung, Kamera/GPS auf echtem iPhone, vollständige Offline-Wiederherstellung über mehrere Geräte oder vollständiger Barrierefreiheits-/Penetrationstest. Eine Ansicht ohne sichtbaren Fehler bedeutet nicht, dass jeder Ablauf darin vollständig abgenommen ist.

## 1. Preise: drei reproduzierte Fehler und eine Synchronisationslücke

### 1.1 Heutige Preisfelder werden als alte Daten gelöscht – dringend

**Nachgewiesen:** Gespeicherte Stundensätze für End-/Baureinigung von 79/84 sowie Mindestpreise 600/900 werden beim Laden entfernt. Im frischen Test stehen anschliessend wieder die Eingabestandards 45/55 und Mindestpreise 250/400.

Ursache: Eine unversionierte Migration erkennt `end-rate` oder `bau-rate` als veraltet und löscht zugleich Mindestpreise. Diese Stundensatzfelder gibt es in der heutigen Oberfläche weiterhin.

Änderung: explizite Versionsmigration, aktuelle Felder vollständig im Preis-Datenmodell, keine stillschweigende Rücksetzung. Tests für Speichern, Neuladen, Moduswechsel und Übernahme auf einem zweiten Gerät.

Quelle: [app-preise.js:32](/Users/brianknuchel/MosaOS/mosaos-main/app/app-preise.js:32).

### 1.2 „Preis aus Preisliste“ und Auftragsassistent rechnen unterschiedlich – dringend

**Nachgewiesen:** Endreinigung, 50 m², 3.20 CHF/m², Mindestauftrag 250 CHF, Anfahrt 25 CHF, keine Zusätze:

| Weg | Angezeigtes Berechnungsergebnis |
|---|---:|
| Offerte: Preis aus Preisliste | 160 CHF |
| Auftragsassistent | 275 CHF |

Die Offertenberechnung berücksichtigt bei diesem Dienst Mindestauftrag und Anfahrt nicht wie der Auftragsassistent. Die Abrechnungsart wird ebenfalls separat behandelt.

Änderung: **eine gemeinsame Berechnung** für Offerte, Auftrag, Rechnung und Quittung. Ergebnis mit Positionen, Menge, Einheit, Satz, Zuschlägen, Mindestpreis-Ausgleich, Anfahrt, Netto, Steuer und Brutto speichern. Manuelle Übersteuerung ausdrücklich kennzeichnen.

Quellen: [app-offerten.js:69](/Users/brianknuchel/MosaOS/mosaos-main/app/app-offerten.js:69), [app-preise.js:378](/Users/brianknuchel/MosaOS/mosaos-main/app/app-preise.js:378).

### 1.3 Sprachwechsel verändert einen Zuschlag – dringend

**Nachgewiesen:** Fensterreinigung, zwei Stunden, eine Person, Leiter ausgewählt: Deutsch 112 CHF, Englisch und Französisch jeweils 100 CHF, ohne Änderung der Leistung.

Die Berechnung prüft sichtbare deutsche Beschriftungen wie „Leiter“. Eine Übersetzung darf niemals den Preis beeinflussen. Ähnliche Textprüfungen existieren bei Fassadenleistungen; diese wurden nicht alle einzeln nachgestellt.

Änderung: stabile Dienst-/Zusatzkennungen statt sichtbarer Texte. Identische Testfälle in allen unterstützten Sprachen.

Quelle: [app-preise.js:441](/Users/brianknuchel/MosaOS/mosaos-main/app/app-preise.js:441).

### 1.4 Stunden-/m²-Modus wird nicht wie die Preisliste synchronisiert

**Codebefund:** `cc-price-modes` bleibt lokal. Die Synchronisation der Firmeneinstellungen enthält zwar Preise, aber nicht diese Modi. Das kann auf zwei Geräten unterschiedliche Berechnungswege ergeben; kein produktiver Zwei-Geräte-Test erfolgt.

Änderung: Modus, Einheit, Preise und Gültigkeitsversion als zusammengehörige Firmeneinstellung synchronisieren.

Quellen: [app-preise.js:128](/Users/brianknuchel/MosaOS/mosaos-main/app/app-preise.js:128), [db-sync.js:715](/Users/brianknuchel/MosaOS/mosaos-main/app/db-sync.js:715).

## 2. Rechnungen und PDFs: gute optische Basis, unzuverlässiger Inhalt

### 2.1 Swiss-QR-Datenstruktur ist fehlerhaft – vor produktiven QR-Rechnungen korrigieren

**Nachgewiesen:** Im reservierten Endkreditor-Block werden sechs statt sieben Leerfelder erzeugt. Dadurch stehen Betrag und alle folgenden Daten um eine Zeile verschoben. Zusätzlich werden kombinierte Adressen vom Typ `K` ausgegeben. Der QR-Code wird mit seiner integrierten Ruhezone insgesamt auf 46 mm verkleinert.

Die SIX-Vorgaben verlangen die vollständige Feldstruktur, strukturierte Adressen und 46 × 46 mm für das Codesymbol ohne Ruhezone. Die optische Erzeugung eines QR-Bildes bestätigt keine gültige Zahlungsinformation. Grundlage: [SIX Implementation Guidelines QR-Rechnung 2.3](https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.3-de.pdf), insbesondere Datenelemente, Abmessungen und Beispiel Anhang A.

Änderung: getrennte Adressfelder, Schema-Prüfung vor Export, IBAN-/Referenzprüfung, korrektes Zahlteil-Layout und ein Validierungstest. Fehlende oder ungültige Zahlungsangaben müssen einen verständlichen Fehler erzeugen. Bis dahin keine ungeprüften QR-Rechnungen an Kunden verschicken. Es wurde keine Bankzahlung getestet.

Quelle: [app-firma.js:159](/Users/brianknuchel/MosaOS/mosaos-main/app/app-firma.js:159).

### 2.2 Verschiedene Aufträge können dieselbe Rechnungsnummer erhalten

**Nachgewiesen:** Die Auftragskennungen `j1780000000100-0` und `j1780000000200-0` erzeugen für denselben Tag beide `20260927-00-0`. Die Nummer entsteht aus Datum und den letzten vier Zeichen der Kennung, nicht aus einem eindeutigen Rechnungszähler.

**Zusätzlicher Codebefund:** Beim erneuten PDF-Abruf wird aus aktuellen Auftrags- und Firmendaten neu generiert. Ein eingefrorener Rechnungsstand mit ursprünglichen Positionen, Adressen und Steuern fehlt in diesem Pfad. Eine später geänderte IBAN oder Steuerkonfiguration kann somit die neu ausgegebene Datei verändern.

Änderung: eigener Rechnungsdatensatz, eindeutige Nummer je Betrieb, unveränderlicher Stand bei Ausstellung. Entwurf bearbeitbar; ausgestellte Rechnung nur über nachvollziehbare Korrektur. Erneuter Download liefert den ursprünglichen Stand.

Quellen: [app-firma.js:235](/Users/brianknuchel/MosaOS/mosaos-main/app/app-firma.js:235), [app-konto.js:1284](/Users/brianknuchel/MosaOS/mosaos-main/app/app-konto.js:1284).

### 2.3 Jede Rechnungsposition wird als Stundenleistung dargestellt

**Nachgewiesen:** Ein Testauftrag mit Flächenangabe, zwei Stunden Dauer und 300 CHF Gesamtpreis wird als 2 Stunden à 150 CHF dargestellt. Die Rechnung leitet den Satz rückwärts aus Preis/Dauer ab – auch bei m² oder Pauschalen. Zusätze und Mindestpreis-Ausgleich erscheinen nicht als nachvollziehbare Einzelpositionen.

Änderung: Rechnung übernimmt die tatsächlichen gespeicherten Berechnungspositionen. Arbeitsdauer und verrechnete Einheit dürfen unterschiedliche Werte sein; auch Personenstunden müssen ausdrücklich definiert werden.

Quelle: [app-firma.js:284](/Users/brianknuchel/MosaOS/mosaos-main/app/app-firma.js:284).

### 2.4 Langer Rechnungstext läuft in den Zahlteil

**Visuell reproduziert:** Bei einem langen eigenen Vorlagentext überlagern Tabelle und Summen den unten fest positionierten QR-Zahlteil. Der Rechnungsgenerator fügt dafür keine neue Seite ein.

Änderung: reservierte Zahlteilfläche, echte Seitenumbrüche und Zeilenumbruch für lange Namen/Adressen/Positionen. Testfälle mit leerem Text, kurzem Text, mehrseitigem Text, vielen Positionen sowie langem Firmennamen.

Den ruhigen weissen PDF-Grundstil, klare Summen und dezente Markenfarbe beibehalten. Keine dekorativen Elemente auf Kosten der Lesbarkeit.

Quelle: [app-firma.js:273](/Users/brianknuchel/MosaOS/mosaos-main/app/app-firma.js:273).

## 3. Planung und Routen: aus Optimierung muss ein sicherer Vorschlag werden

### 3.1 Ein fester Termin wird vorgezogen

**Nachgewiesen:** Zwei Einsätze um 08:00 und 14:00 Uhr werden durch die Optimierung auf 08:00 und 09:03 Uhr gesetzt. Bestehende Startzeiten werden nicht als verbindliche Kundenzeiten geschützt. Der berechnete Plan überschreibt die Zeiten ohne geeignete Vorher-/Nachher-Freigabe.

Änderung: feste Termine sperren; für flexible Termine früheste/späteste Ankunft festlegen. Optimierung zeigt Reihenfolge, Fahrzeit und Konflikte als Vorschlag. Erst „Übernehmen“ schreibt; „Rückgängig“ stellt den vorherigen Stand wieder her.

Quelle: [app-routen.js:100](/Users/brianknuchel/MosaOS/mosaos-main/app/app-routen.js:100).

### 3.2 Nicht erreichbare Strecke wird zu drei Minuten

**Nachgewiesen mit simuliertem Routing-Ergebnis:** Eine nicht berechenbare Strecke (`null`) wird als 0 Minuten plus 3 Minuten Puffer verarbeitet. Das sieht wie eine gültige kurze Fahrt aus.

**Weitere Codebefunde:** Geocoding ist auf die Schweiz begrenzt. Der Depotweg ist nicht vollständig in derselben Strassenmatrix enthalten. Die automatische Teamauswahl berücksichtigt nicht alle Tagesabwesenheiten. Schichten, Pausen, vollständige Zeitfenster und Rückfahrt sind kein umfassendes Optimierungsmodell.

Änderung: unbekannt/nicht erreichbar eindeutig behandeln, keine stille Null-Minuten-Annahme. Land aus dem Betrieb, vollständige Start-/Endstrecken, Tagesbesetzung und Arbeitszeiten berücksichtigen. Geschätzte Fahrten als Schätzung markieren.

Quelle: [app-routen.js:23](/Users/brianknuchel/MosaOS/mosaos-main/app/app-routen.js:23).

### 3.3 Die Zeitleiste zeigt belegte Stunden als „frei“

**Visuell und im Code bestätigt:** Ein Einsatz von 07:30 bis 09:30 wird nur bei seiner Startstunde eingeordnet; 08:00 und 09:00 tragen trotzdem „frei“. Ebenso erscheinen Stunden innerhalb eines 13:00–17:00-Einsatzes als frei. Andere Teams können frei sein, aber die Anzeige bildet diese Unterscheidung nicht verständlich ab.

Änderung: echte Dauerbalken pro Team oder eine kompakte Agenda ohne unbegründete Frei-Aussagen. Besetzt, Fahrt, Pause und verfügbare Kapazität sichtbar unterscheiden. Die Tagesplanung sollte vor Zusatzkarten stehen.

Quelle: [app-planung.js:610](/Users/brianknuchel/MosaOS/mosaos-main/app/app-planung.js:610).

## 4. Speicherung und Mailversand

### 4.1 Nicht gespeicherte Änderungen verschwinden aus der Warteschlange

**Isoliert mit Originalfunktion reproduziert:** Ein Eintrag nach fünf gescheiterten Versuchen wird aus der Warteschlange entfernt. Wenn sonst nichts verbleibt, lautet der gemeldete Zustand `synced`. Es gibt lediglich eine Warnung in der Entwicklerkonsole. Zusätzlich schneidet die Warteschlange oberhalb von 250 Einträgen ältere Einträge ab.

Das beweist nicht, dass sämtliche lokalen Datensätze sofort gelöscht werden. Es beweist aber, dass ihre ausstehenden Übertragungsaufträge verloren gehen und die Erfolgsmeldung irreführend sein kann.

Änderung: dauerhafte Fehlerliste, verständlicher Status „Nicht gespeichert“, Wiederholen und Export/Support-Möglichkeit. Keine Verwerfung ohne bewusste Entscheidung. „Synchronisiert“ nur, wenn tatsächlich keine offenen oder aufgegebenen Schreibvorgänge bestehen. Fotos/Nachweise dabei gesondert testen.

Quellen: [db-sync.js:524](/Users/brianknuchel/MosaOS/mosaos-main/app/db-sync.js:524), [db-sync.js:747](/Users/brianknuchel/MosaOS/mosaos-main/app/db-sync.js:747).

### 4.2 Sicheres Gmail-Konto passt nicht zum älteren Rechnungsversand

**Codebefund und isolierter Funktionstest:** Der sichere Kontostatus liefert bewusst keine Zugangstokens an den Browser. `invoiceMailbox()` verlangt aber genau ein solches `token`. Ein korrekt geformtes verbundenes Gmail-Konto aus diesem Status wird deshalb nicht als sendefähig erkannt. Der ältere Rechnungs-Endpunkt erwartet weiterhin einen vom Browser übergebenen Zugangstoken.

Änderung: Rechnungsversand mit Konto-ID an das sichere Backend anbinden, Zugangsdaten bleiben dort. Nicht als Reparatur Tokens zurück in den Browser geben. PDF-Vorschau, Empfänger, Betreff und bewusste Versandfreigabe; belastbare Zustände für erfolgreich/fehlgeschlagen/unklar. Kein tatsächlicher Mailversand im Audit.

Quellen: [app-konto.js:62](/Users/brianknuchel/MosaOS/mosaos-main/app/app-konto.js:62), [mail-account-status/index.ts:12](/Users/brianknuchel/MosaOS/mosaos-main/supabase/functions/mail-account-status/index.ts:12), [send-job-invoice/index.ts:45](/Users/brianknuchel/MosaOS/mosaos-main/supabase/functions/send-job-invoice/index.ts:45).

## 5. Konkrete UI-/UX-Richtung für MosaOS

### Beibehalten

- Ruhige dunkle Büroansicht, klare Navigation, zurückhaltende MosaOS-Markenfarbe.
- Trennung von Büro und Feld-App; grosse Hauptaktionen in der Feld-App.
- Kunden-/Mitarbeiterkarten und grundsätzlich verständliche Module.
- Helle, sachliche Geschäftsdokumente. Kein kompletter visueller Neustart nötig.

### Ändern

| Bereich | Beobachtung | Konkrete Gestaltung |
|---|---|---|
| Einstellungen | Im Test über 6000 Pixel lange Seite, viele getrennte Speichervorgänge | Echte Unterseiten oder Register: Firma, Preise, Planung, Dokumente, Mail, Sicherheit. Je Bereich klarer Speicherstatus. |
| Dashboard | Bestandszahlen und grosse Karten verdrängen die heutigen Einsätze | Zuerst nächste Einsätze, offene Entscheidungen, überfällige Aufgaben/Rechnungen; danach Kennzahlen. |
| Planung | Tagesbesetzung, Teams und Hinweisbanner wiederholen Informationen | Eine kompakte Besetzungsleiste; Aufträge direkt darunter. Konflikte am betroffenen Auftrag. |
| Auftragsassistent | Berechnung schwer nachzuvollziehen | Sichtbare Preisaufschlüsselung mit Menge × Satz, Zusätzen, Mindestpreis und Anfahrt; klare Netto-/Bruttoangabe und Vorschau. |
| Rechnungen | Erstellung, Dokument und Versandzustand sind zu eng gekoppelt | Getrennte Aktionen „Entwurf prüfen“, „Ausstellen“, „PDF“, „Senden“, „Zahlung erfassen“. |
| Schrift | Manche Hilfstexte nur 10.5–11.5 px, Eingabelabels etwa 12.5 px | Kerntext 14–16 px, Hilfstext mindestens etwa 12–13 px, deutliche Zahlen und Status. Keine pauschale Behauptung eines gemessenen WCAG-Verstosses. |
| Farben | Dunkle Flächen plus rötliches Hintergrundleuchten | Ruhiger neutraler Hintergrund, klar abgestufte Flächen. Rot gezielt einsetzen; Warnung/Fehler/Erfolg zusätzlich mit Text/Icon kennzeichnen. |
| Handy-Büro | Wichtige Aufträge weit unten, breite Tabellen müssen seitlich gelesen werden | Auftragskarten, kompakte Kennzahlen, Filter einklappbar; zentrale Tagesaktion sofort sichtbar. Kein allgemeiner Seitenbreiten-Overflow wurde gemessen. |
| Feld-App | Gute Basis, aber Arbeitsweg kann direkter werden | Adresse antippbar zur Navigation, eindeutiger Start/Pause/Fertig-Ablauf, Fortschritt und Speicherstatus je Nachweis. Auf echtem iPhone nachtesten. |
| Teamverwaltung | Änderungsverlauf und Rollenkarten stehen vor den Personen | Personen zuerst, Rollen und Verlauf in eigene Register; klare Einladung und Status. |
| Sprachen | Englisch enthält viele verbleibende deutsche Beschriftungen | Sichtbare Oberflächen vollständig übersetzen; Preise nie an Übersetzung koppeln. |
| Demo | Kopf zeigt Alex Demo/Admin, Seitenleisten-Fuss Brian K./Disposition | Identität und Rolle an einer Datenquelle ausrichten, keine persönlichen Überbleibsel in der Demo. |

Zusätzlich: leere Zeiterfassung sollte in der Demo einen hilfreichen Beispielzustand zeigen statt Entwicklerhinweisen über Zugangsdaten. In der Nachkalkulation sind Einsatzstunden und Personenstunden ausdrücklich zu trennen; manuelle Ist-Werte liegen derzeit lokal und ihr Schlüssel enthält den veränderlichen Startzeitpunkt. Eine belastbare betriebsübergreifende Nachkalkulations-Abnahme steht aus. Quelle: [app-routen.js:573](/Users/brianknuchel/MosaOS/mosaos-main/app/app-routen.js:573).

## 6. Zeitfenster: gute einfache Oberfläche, fachlich noch ein Festzeit-System

Die helle Gestaltung wirkt aufgeräumter und zielgerichteter als viele Bereiche der grossen App. Sie benötigt keinen neuen Look. Die wichtigste Grenze liegt im Datenmodell:

- Leistungen sind Namen, keine Datensätze mit Dauer/Puffer/Ressource.
- Die Datenbank verhindert doppelt belegte identische Startzeiten, aber berechnet keine überschneidenden Leistungsintervalle.
- Unterschiedlich lange Behandlungen können dadurch nicht zuverlässig gegeneinander gesperrt werden. Für gleich lange, bewusst getrennte feste Termine ist das Modell wesentlich geeigneter.
- Der Gast wählt den Zeitpunkt, bevor seine Leistung im Formular feststeht.
- Öffnungszeiten werden in der Verwaltung als kommaseparierte einzelne Uhrzeiten eingegeben. Das ist bei vielen Zeiten fehleranfällig.

Quellen: [Zeitfenster-Datenmodell](/Users/brianknuchel/MosaOS/mosaos-main/supabase/migrations/202609100000_zeitfenster.sql:19), [Buchungsvalidierung](/Users/brianknuchel/MosaOS/mosaos-main/supabase/functions/zeitfenster/index.ts:200), [Frontend](/Users/brianknuchel/MosaOS/terminbuchung/app/page.tsx).

Empfohlener nächster Ausbau:

1. Leistung mit Dauer und Puffer; serverseitige Prüfung gegen die tatsächlich angebotenen Leistungen.
2. Reihenfolge **Leistung → verfügbare Zeit → Kontaktdaten → Bestätigung**. Überschneidungen serverseitig und gleichzeitigkeitsfest verhindern.
3. Öffnungsintervalle und Pausen pro Wochentag mit verständlicher Eingabemaske; bestehende Ferientage weiter nutzen.
4. Auf dem Handy Einleitung kürzen/einklappen: Im Test liegen die ersten Zeitoptionen erst etwa unterhalb des ersten Bildschirms.
5. Termin-Erinnerung vor dem Besuch und Kalenderdatei zum Hinzufügen. Die vorhandene Wiedervorlage nach mehreren Wochen ist eine andere Funktion, kein Ersatz für eine Erinnerung vor dem gebuchten Termin.
6. Mehrere Mitarbeitende/Räume und externe Kalender-Synchronisation erst gezielt nach Bedarf ergänzen. Nicht gleichzeitig eine zweite grosse Verwaltungsplattform bauen.

Nicht im Audit ausgelöst: echte Buchung, Absage, Erinnerungs-Mail oder Anmeldung als echter Betrieb. Verwaltungsbilder beruhen auf Testdaten.

## 7. Abnahmeplan nach den Korrekturen

### Runde A – Geld und Daten

- Alle Dienste: Stunden/m²/Pauschale, Mindestpreis, Anfahrt, Zusätze und manuelle Übersteuerung.
- Derselbe Fall in Offerte, Auftrag, Rechnung und Quittung; identische fachliche Beträge in allen Sprachen.
- Einstellung speichern, neu laden und auf zweitem Gerät prüfen.
- Eindeutige Rechnungsnummer auch bei zeitgleichen Aufträgen; unveränderlicher erneuter Download.
- Kurze/mehrseitige PDF-Texte, lange Adressen, mehrere Positionen und gültiger QR-Zahlteil.
- Serverablehnung, fünf Wiederholungen, Offline/Online und grosse Warteschlange: kein falscher Erfolgsstatus und kein stilles Verwerfen.

### Runde B – Arbeitstag

- Feste Termine bleiben fix, flexible Termine bleiben im Zeitfenster.
- Abwesende Personen, zu kleine Teams, Pausen, Depot/Rückfahrt und unerreichbare Strecke.
- Vorschau/Übernahme/Rückgängig der Route.
- Reales Handy: Foto, Unterschrift, Verbindungsabbruch, Wiederaufnahme und Sichtbarkeit im Büro.
- Rechnungsversand nur mit ausdrücklicher Testfreigabe an ein eigenes Testpostfach; Versandstatus und Duplikatschutz prüfen.

### Runde C – Bedienung und Buchung

- Neue Person findet ohne Erklärung: Auftrag anlegen, Preis verstehen, Team zuordnen, PDF prüfen.
- Handyansichten bei 390 px und grösserer Systemschrift; Tastaturbedienung und Fokusführung.
- Zeitfenster: unterschiedliche Dauern/Puffer, gleichzeitige Buchungsversuche, Ferien, kurzfristige Termine und Zeitumstellung.
- Reale Rollen-/Mandantentrennung, Kontoabläufe und Stripe-Ende-zu-Ende separat mit kontrollierten Testkonten abnehmen.

**Entscheidung:** Keine weiteren Module als erste Massnahme. Zuerst den vorhandenen Kern so konsistent machen, dass Preis, Termin, Dokument und Speicherzustand zuverlässig zusammenpassen. Danach die Oberfläche gezielt vereinfachen und mit wenigen Pilotbetrieben testen.
