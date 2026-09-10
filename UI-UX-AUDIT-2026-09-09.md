# MosaOS – Gesamtprüfung von Website, Büro-App und Handy-App

Stand: 9. September 2026. Geprüfter Commit: `a197e3f2c370adb1e7d9c56bbe8ec8905ca9dbdf`.

## Urteil

MosaOS hat ein brauchbares visuelles Fundament: Inter als gemeinsame Schrift, erkennbare Hauptaktionen, eine klare Büro-Navigation und fachlich passende Branchenansichten. Ein vollständiger Designneustart ist nicht erforderlich. Die grössten Verbesserungen liegen bei der mobilen Büro-Bedienung, verlässlichen Fehlerzuständen, verständlichen Produktversprechen und der Konsistenz zwischen Website, Anmeldung und Anwendung.

Die Aussage aus der vorangegangenen Unterhaltung, es gebe keinen dringenden Blocker, war zu weitgehend. Die vertiefte Prüfung hat reproduzierbare Fehler gefunden, die ein Syntax- oder allgemeiner Regressionstest nicht abdeckt. Besonders relevant sind die Fehlerbehandlung im Abo-Bereich und das Verhalten der Handy-App bei Ladefehlern sowie beim Teilen einer Abnahme.

**Stripe ist laut Brian live.** Dieser Bericht verlangt keine Umstellung in den Live-Modus. Ein alter öffentlicher Testschlüssel ist kein Beleg dafür, dass der serverseitige Checkout im Testmodus läuft.

## Umsetzungsstand nach dem Audit

Am 9. September 2026 wurde der priorisierte Massnahmenblock direkt umgesetzt:

- **Behoben:** F01–F06, U01–U07, T03, T04, D04–D06 und Q01. Dazu gehören belastbare Ladefehler, ehrliches Teilen ohne vorgetäuschten Versand/Abschluss, offene Protokollpunkte, eine lesbare Handyplanung, Tastaturbedienung, zugängliche Formularnamen, Rückweg aus der Materialliste, korrekte leere Firmendaten, mobile Ratgeberwege und ein einheitliches Markenrot.
- **Verbessert:** U08/U09 mit einer echten lokalen Feld-Demo und täglich aktuellen Beispieldaten; T01/T02/T07/T08 durch vorsichtigere, belegbare öffentliche Formulierungen; D02/D03 durch grössere Bedienelemente in der Feld-App.
- **Bewusst nicht als vollständig abgeschlossen bezeichnet:** Eine muttersprachliche Vollredaktion aller fünf Sprachen, ein juristisches Compliance-Gutachten, ein echter iPhone-Kamera-/GPS-Test, reale Nachrichten sowie Kauf/Kündigung in Stripe. Diese Punkte brauchen externe oder produktive Abnahme und wurden nicht simuliert.

Die vollständige Regression umfasste erneut alle **194 Zustände**. Sie fand nach dem ersten Korrekturlauf noch genau zwei horizontale Überläufe: Produktvideo und Baustellenansicht. Beide wurden danach korrigiert und gezielt bei 390 und 1440 Pixeln nachgemessen; Website, Ratgeber, Produktvideo, Büroplanung, Baustellen und Feld-Demo entsprechen nun exakt der jeweiligen Viewportbreite und erzeugten keine JavaScript-Seitenfehler. Zusätzlich bestanden `scripts/app-pruefen.py`, Security-Check und Handover-Regression. Die Abo-Funktionen liefern ohne Sitzung nun kontrolliert zurück statt mit `t is not a function` abzustürzen.

**Datenschutz-Nachtrag vom 10. September 2026:** Ein angemeldeter Browser konnte beim Öffnen von `?demo=1` zuvor seine vorhandenen lokalen beziehungsweise synchronisierten Firmendaten behalten. Der Demo-Modus sichert nun vorhandene App-Daten, ersetzt sie vollständig durch klar fiktive `.invalid`-/Musterangaben, sperrt Supabase-, Billing- und Sync-Zugriffe und stellt die lokalen Daten beim Verlassen wieder her. Ein isolierter Browsertest mit rein synthetischen Markierungswerten bestätigte: keine Anzeige der vorherigen Werte, null Supabase-Anfragen, keine Sync-Warteschlange aus Demo-Änderungen und vollständige Wiederherstellung beim Verlassen.

## Prüfumfang und Grenzen

- 75 HTML-Seiten ausserhalb der Büro-Hauptdatei: deutsche Website, Sprachfassungen DE/FR/IT/ES/EN, Branchen, Ratgeber, Kontakt, Rechtstexte, Fehler-/Bestätigungsseiten, Login, Onboarding, Einladung, Check-in, Mitarbeiter-Login und vier Produktfilm-Seiten.
- Alle 22 Büro-Ansichten: Dashboard, Planung, Mitarbeiter, Kunden, Werkstattplan, Fahrzeuge, Reifenhotel, Köderstellen, Protokolle, Baustellen, Rapporte, Anrufprotokoll, Aufgaben, E-Mail, Berichte, Zeiterfassung, Nachkalkulation, Abos, Offerten, Rechnungen, Einstellungen und Büro-Team.
- Jeweils 1440 und 390 Pixel Breite, 900 Pixel Höhe: **194 erfasste Seiten-/Ansichtszustände**. Vollständige Screenshots und ausgelesene Texte; Sichtung sämtlicher Übersichten, vertiefte Einzelansicht der auffälligen Seiten und Dialoge. Nicht jede Textzeile jeder Übersetzung wurde muttersprachlich lektoriert.
- Zusätzlich fünf zentrale Büro-Dialoge bei 390 × 844, englische Einstellungen, Handy-Tagesansicht mit synthetischem Einsatz, Materialliste, Abschlussprotokoll und künstlich erzeugter Ladefehler. Dialoge nach Ende der Animation erneut fotografiert.
- Die Branchen-Sonderansichten wurden über die vorhandene Navigation aufgerufen; teilweise mit leerem Datenbestand im Reinigungs-Demomandanten. Das ist eine Layoutprüfung, keine vollständige fachliche Abnahme jeder Branche.
- Isolierter Chromium-Browser mit lokalen Beispieldaten. Supabase-Anfragen für diesen Durchlauf blockiert; gezielte Handy-Tests verwendeten ausdrücklich synthetische Antworten. Keine Produktionsdatensätze geändert, keine Nachrichten verschickt, keine Zahlung ausgelöst.
- Live-Abgleich: `app/billing.js` und `app/mobile.html` stimmen SHA-256-genau mit mosaos.ch überein. Die Startseite unterscheidet sich durch Cloudflares E-Mail-Verschleierung und das zugehörige Skript; der verglichene übrige HTML-Inhalt ist gleich. Kein vollständiger Live-Abgleich aller Dateien.
- Kein neuer echter Kundenlogin, kein realer Kamera-/GPS-/Unterschriftentest auf einem iPhone, kein kompletter Kauf-/Kündigungsablauf, kein Lasttest und keine juristische oder umfassende Sicherheitsprüfung. Frühere erfolgreiche Tests werden nicht als Beleg für hier ungeprüfte Zustände ausgegeben.

Im normalen Aufruf der 194 Zustände wurden keine unbehandelten JavaScript-Seitenfehler und keine sichtbar defekten Bilder erfasst. Das gilt für diese Aufrufzustände, **nicht** für alle Interaktionen: Die gezielten Abo-Fehlertests scheitern reproduzierbar.

## Prioritäten

- **P1:** Fehler oder irreführendes Verhalten, das wichtige Arbeit, Vertrauen oder Datenqualität beeinträchtigt. Zuerst beheben.
- **P2:** Deutliche Hürde bei Bedienung, Lesbarkeit, Verständlichkeit oder Konsistenz.
- **P3:** Feinschliff und Wartbarkeit.
- **Bestätigt:** im Browser reproduziert oder im aktuellen Quellcode eindeutig belegt.
- **Empfehlung:** gestalterische oder redaktionelle Bewertung; kein behaupteter technischer Defekt.
- **Nachweis offen:** Aussage/Funktion benötigt gesonderte fachliche oder betriebliche Bestätigung.

## 1. Funktionsfehler und kritische Abläufe

### F01 · P1 · Abo-Fehlermeldungen stürzen selbst ab – bestätigt

**Fundstelle:** `app/billing.js`, `startCheckout()` und `openPortal()`, ab Zeile 66. Der Übersetzungshelfer heisst `t`; in beiden Funktionen überschattet `const t = await accessToken()` ihn. Im Fehlerpfad wird anschliessend der Token beziehungsweise `null` als Funktion aufgerufen.

**Reproduktion:** Ohne Sitzung beide Funktionen im isolierten Browser ausführen. Beide liefern `t is not a function`, statt „Bitte zuerst einloggen“. Auch die Fehlerantwort- und Catch-Zweige verwenden diesen falschen Namen. Ein erfolgreicher Checkout kann davon unberührt sein.

**Verbesserung:** Tokenvariable eindeutig benennen; Login-, Netzwerk- und Serverfehler sichtbar ausgeben; den Knopf nach Fehlschlag wieder freigeben. Abnahme mit fehlender Sitzung und synthetischer Serverfehlerantwort, ohne Kauf.

### F02 · P1 · Handy-Ladefehler werden als fachlicher Zustand dargestellt – bestätigt

**Fundstelle:** `app/mobile.html:551`, `loadMyDay()`.

**Beleg:** Bei `{data:null,error:…}` aus der Mitarbeiterabfrage erscheint „Dein Login ist noch keinem Mitarbeiter-Profil zugeordnet“. Die Funktion wertet `error` nicht aus. Bei Einsatzabfragen kann derselbe Mechanismus zu „Heute keine Einsätze“ führen. Leere Catch-Blöcke unterscheiden Verbindungsfehler ebenfalls nicht. Im simulierten Fehlerzustand blieben zudem zuvor geladene kommende Einsätze sichtbar.

**Verbesserung:** Laden, leer, nicht zugeordnet und fehlgeschlagen als eigene Zustände behandeln. „Einsätze konnten nicht geladen werden. Erneut versuchen.“ Vorherige Daten nur mit Kennzeichnung „Letzter geladener Stand“ anzeigen. Aufgaben und Tagesliste konsistent aktualisieren. Frühere Prüfberichte, die Ladefehler pauschal als gelöst bezeichnen, reichen für diesen konkreten Pfad nicht aus.

### F03 · P1 · „Kunde abwesend → Link senden“ verspricht einen anderen Ablauf – bestätigt im Code

**Fundstelle:** `app/mobile.html:955`, `sendProtocolLink()`.

Der Knopf teilt mit `navigator.share` lediglich Protokolltext; es wird kein individueller Bestätigungslink erzeugt. Der Fallback öffnet WhatsApp mit vorbereitetem Text. Dabei wird `markStopDone()` aufgerufen und „Link gesendet“ gespeichert, obwohl das Öffnen von WhatsApp keinen Versand und erst recht keine Kundenbestätigung belegt.

**Verbesserung:** Kurzfristig „Zusammenfassung teilen“ nennen und weder erfolgreichen Versand noch Abnahme behaupten. Auftragsabschluss separat bestätigen. Für einen echten Abnahmelink braucht es einen tatsächlichen Link mit dokumentiertem Status. Den vorhandenen Ablauf in diesem Audit nicht ausgeführt, da dies Nachrichten oder Statusänderungen auslösen könnte.

### F04 · P1 · Abschlussarbeiten sind ohne Prüfung vorab abgehakt – bestätigt

**Fundstelle:** `app/mobile.html:803`, `protoDefaultTasks().map(... done: true)`.

Beim Öffnen des Abschlussprotokolls sind Küche, Bad, Böden usw. bereits als erledigt markiert. Der Screenshot bestätigt diesen Zustand. Das erleichtert unbeabsichtigt falsche Nachweise.

**Verbesserung:** Unbestätigte Aufgaben zunächst offen oder in einem klar getrennten Zustand anzeigen. Bereits nachweislich erledigte Arbeiten übernehmen. Falls eine Sammelbestätigung gewünscht ist, diese ausdrücklich auslösen lassen.

### F05 · P1 · Mobilplanung: Text und Uhrzeit überlagern sich – bestätigt

**Fundstelle:** `app/styles.css`, Planungskomponenten; `app/app-planung.js`, Karteninhalt. Screenshot `app-390-planung.png`.

Bei 390 Pixeln sind Adresse, Name und Uhrzeit in der engen Einsatzkarte nicht sauber getrennt; beispielsweise überlagert die Zeit „07:30–09:30“ die Adresszeile. Die Kopfzeile „Heutige Besetzung“ wird durch Aktionen stark zusammengedrückt. Der erste eigentliche Einsatz beginnt erst weit unterhalb der ersten Bildschirmhöhe.

**Verbesserung:** Mobile Liste nach Uhrzeit statt der Desktop-Zeitachse: Zeit und Status oben, Objekt und Adresse darunter, Team in einer dritten Zeile. Teamdetails standardmässig kompakt. Abnahme mit langen Objektnamen, zwei Personen, längerer Adresse und mehreren Einsätzen.

### F06 · P1 · Demo-Firmendaten als allgemeiner Rückfallwert – bestätigt im Code, Produktionsauswirkung offen

**Fundstelle:** `app/app-firma-basis.js:22`, `DEFAULT_COMPANY` und `loadCompany()`.

Bei fehlenden Werten stehen dort „MosaOS AG“, eine Demo-IBAN und eine Beispiel-MWST-Nummer. Die Einstellungen warnen sogar vor der Demo-IBAN. Dass ein konkreter echter Kunde bereits ein falsches Dokument erzeugt hat, wurde nicht festgestellt.

**Verbesserung:** Beispieldaten ausschliesslich im ausdrücklich markierten Demomodus. Im echten Konto fehlende Zahlungs-/Firmenangaben leer lassen und vor Erstellung eines zahlbaren Dokuments gezielt prüfen. Weder Rechtsform noch MWST-Nummer aus einer allgemeinen Vorlage übernehmen.

## 2. Mobile Bedienung, Formulare und Barrierefreiheit

### U01 · P2 · Mehrere Büro-Ansichten verbreitern die Handyseite – bestätigt

Bei einer Sollbreite von 390 Pixeln wurden folgende Dokumentbreiten gemessen:

| Ansicht | Gemessene Breite | Überstand |
|---|---:|---:|
| Planung | 422 px | 32 px |
| Werkstattplan | 412 px | 22 px |
| Köderstellen | 401 px | 11 px |
| Baustellen | 409 px | 19 px |
| Anrufprotokoll | 415 px | 25 px |
| Zeiterfassung | 411 px | 21 px |
| Nachkalkulation | 427 px | 37 px |
| Rechnungen | 401 px | 11 px |
| Einstellungen | 408 px | 18 px |

Reifenhotel zeigte zusätzlich 1 Pixel Abweichung, allein kein wesentlicher Fehler. Die Messungen sind Momentaufnahmen des beschriebenen Daten-/Sprachstands. Ein absichtlich intern horizontal scrollbarerer Tabellenbereich ist zulässig; das gesamte Dokument soll dabei schmal bleiben. Dekorative Website-Elemente ausserhalb des Bildschirms wurden nicht pauschal als Fehler gezählt.

**Verbesserung:** Flex-/Grid-Kinder auf Mindestbreiten prüfen; Tabellen in klar erkennbaren Scrollcontainern; für mobile Boards alternativ Statuslisten. Nicht lediglich globales Abschneiden verwenden, wenn dadurch Inhalte unzugänglich werden.

### U02 · P2 · Demo-Hinweis verdeckt weiterhin Seiteninhalte – bestätigt

Der Hinweis ist im Dialog inzwischen korrekt ausgeblendet. Auf der normalen mobilen Seite liegt er aber über Teamdetails, Mitarbeiteraktionen oder Einstellungsinhalten. Ein dauerhaft fixierter Hinweis braucht reservierten Platz oder eine kompakte, einklappbare Darstellung.

**Abnahme:** Die letzte Aktion und der Inhalt direkt oberhalb des Bildschirmrands bleiben mit eingeblendetem Hinweis erreichbar. Quelle: `app/app.html:29`, Screenshots Planung, Mitarbeiter, Einstellungen.

### U03 · P1 · Hauptnavigation reagiert nicht auf Enter – bestätigt

Die Navigationseinträge sind fokussierbare `<a>`-Elemente ohne `href`. Test: Kundenansicht öffnen, „Dashboard“ fokussieren, Enter drücken. Die aktive Ansicht bleibt `kunden`. Klick funktioniert.

**Verbesserung:** Echte Buttons oder echte Links verwenden und aktiven Zustand zugänglich kennzeichnen. Tab, Enter und bei Buttons Leertaste prüfen. Fundstellen: `app/app.html:64`, `app/app-basis.js:149`; Messung `details.json`.

### U04 · P2 · Sichtbare Feldbeschriftungen sind nicht mit Feldern verbunden – bestätigt

Im Offerten-Editor haben `offKunde`, `offDatum`, `offAdresse`, `offPreis` und `offMenge` keine zugeordneten Labels und kein `aria-label`. Ein optisch oberhalb stehendes `<label>` ohne `for` reicht dafür nicht.

**Verbesserung:** `label for` und eindeutige IDs; Fehlermeldungen am Feld zuordnen; Pflichtfelder konsistent kennzeichnen. Auch Kunden-/Mitarbeiterdialoge nach demselben Schema prüfen. Quelle: `app/app.html:2130` ff.; strukturelle Messung `details.json`.

### U05 · P2 · Handy-Materialliste hat keinen normalen Ausstieg – bestätigt im UI/Code

Die Tagesliste wird von einem Material-Overlay überlagert. Es gibt „Liste bearbeiten“ und den gesperrten Startknopf, aber kein „Zurück“. Bei fehlendem Material wird damit der Blick auf den Tagesplan unnötig erschwert. Das Entfernen aller Einträge lässt den Startknopf ebenfalls gesperrt, weil `total > 0` verlangt wird.

**Verbesserung:** Rückkehr zum Tagesplan erlauben; fehlendes Material melden können; leere Liste sinnvoll behandeln. Die betriebliche Pflichtprüfung darf erhalten bleiben, sollte aber das Lesen des Einsatzplans nicht verhindern. Quelle: `app/mobile.html:468–519`.

### U06 · P2 · Handy-Login bietet keine Passwort-Hilfe – bestätigt

Der Mitarbeiter-Login hat zwei Felder und „Anmelden“, aber keinen Passwort-zurücksetzen-Link und keine Verbindung zum Büro-Login. Es ist kein normales Formular mit eindeutigem Submit-Ablauf.

**Verbesserung:** „Passwort vergessen?“ und „Büro-Anmeldung“ ergänzen, Labels dauerhaft sichtbar halten und die Eingabetaste zuverlässig anmelden lassen. Loginfehler am Formular ausgeben. Quelle: `app/mobile.html:305`.

### U07 · P2 · Wichtige Handyaktionen und Checkboxen brauchen bessere Bediensemantik – bestätigt/Empfehlung

„QR scannen“ und „Material-Check“ sind kleine Textaktionen; in der Tageskopfzeile umbrechen sie bei langen Datums-/Sprachtexten. Checklisten werden als klickbare `div`-Zeilen erzeugt, nicht als echte Checkboxen. Das erschwert Tastatur- und assistive Bedienung.

**Verbesserung:** Native Checkboxen mit grossflächigem Label; ausreichend hohe Schaltflächen, als Gestaltungsziel 44–48 px; lange Beschriftungen in separaten Zeilen. Kein vollständiges WCAG-Konformitätsurteil aus diesem Audit. Quelle: `app/mobile.html`, `renderChecklist()`, `renderProtoTasks()`.

### U08 · P2 · Demo führt nicht bis zum Ergebnis – bestätigt

Frische Demo: drei Kunden, drei Mitarbeiter und drei Einsätze, aber keine Offerte, kein Fotobericht, kein Abo und im erfassten Zustand keine Rechnung. „Reiniger-Ansicht öffnen“ startet die echte Loginseite; eine eigenständige Feld-Demo fehlt.

**Verbesserung:** Einen vollständigen ausdrücklich fiktiven Beispielauftrag mit Offerte, erledigtem Nachweis und Rechnung ergänzen; dazu eine getrennte Feld-Demo. So wird der Nutzen „Planung → Arbeit → Beleg“ überprüfbar. Quelle: `app/demo-data.js`, `app/app.html:246`.

### U09 · P2 · Demo-Inhalte altern und Identität ist widersprüchlich – bestätigt

Der Kopf zeigt „Alex Demo / Admin“, der Sidebar-Fuss „Brian K. / Disposition“. Demoeinsätze werden nur beim ersten Anlegen auf das aktuelle Datum gesetzt; bei erneutem Besuch an einem anderen Tag sind sie nicht mehr „heute“. Der Dashboard-Aufruf selbst zeigte in der frischen Audit-Demo korrekt drei Einsätze.

**Verbesserung:** Identität aus einem Profil ableiten. Demodaten kontrolliert auf einen Beispieltagesstand beziehen oder einen deutlich beschrifteten Reset anbieten; eigene Daten dabei weiterhin schützen. Quellen: `app/app.html`, `app/demo-data.js`.

### U10 · P2 · Einstellungen sind trotz Sprungnavigation sehr lang – Empfehlung

Die sechs Bereichssprünge sind eine Verbesserung. Trotzdem stehen Firmenangaben, Farben, Planungsfaktoren, Vorlagen, Module, viele Preise, 2FA und Kontolöschung in einem langen Dokument. Mehrere „Speichern“-Knöpfe lassen nicht immer sofort erkennen, welcher Bereich gesichert wird.

**Verbesserung:** Bereichsweise Darstellung oder eingeklappte Sektionen; Buttons „Firmenangaben speichern“, „Planung speichern“ usw.; sichtbarer Hinweis auf ungesicherte Änderungen pro Bereich. Kontolöschung als getrennte Verwaltungsaktion behandeln. Quelle: `app/app.html:1083` ff.

## 3. Website-Texte und Produktversprechen

### T01 · P1 · Funktions- und Preisbeschreibungen widersprechen sich teilweise – bestätigt/Nachweis offen

Im gerenderten Startseiten-Rechner steht bei der Basis „Mitarbeiter & Rollen … Zeiterfassung inklusive“, gleichzeitig kostet das Modul Zeiterfassung CHF 14. „Mahnwesen“, „automatische Rechnungspositionen“ und Kundenlistenimport werden öffentlich versprochen; im geprüften Kunden-/Rechnungsablauf konnte kein entsprechender vollständiger Bedienweg belegt werden. Der Importtext steht ausdrücklich in der FAQ.

**Verbesserung:** Je Versprechen den echten Bedienweg dokumentieren oder die Aussage auf den belegten Umfang begrenzen. Beispiel Basis: „Mitarbeiter, Rollen und mobiler Zugang“; Zeiterfassung getrennt ausweisen. Ein möglicher manueller Import durch Support muss auch so bezeichnet werden. Quellen: gerenderter Startseitentext, `config.js`, `i18n.js` Schlüssel `faq.setup.a`, `app/app-kunden.js`, `app/app-konto.js`. Kein pauschales Urteil, dass jeglicher Export oder jede Zeitfunktion fehlt.

### T02 · P1 · Absolute Sicherheits- und Revisionsversprechen sind nicht belegt – Nachweis offen

„DSG- und DSGVO-konform, ohne Wenn und Aber“ sowie „revisionssichere HACCP-Behandlungsprotokolle“ sind weitreichende öffentliche Zusagen. Dieses Audit liefert dafür keine fachliche oder rechtliche Abnahme. Editierbare Protokolle und lokale Historie allein belegen Revisionssicherheit nicht.

**Verbesserung:** Nachweisbare Eigenschaften nennen, etwa „Zugriff nach Rollen und Firmenzugehörigkeit“ oder „Behandlungsprotokolle mit Datum, Befund und Dokumentation“. Revisionssicherheit erst mit definiertem Verfahren zusagen. Dies ist eine Prüfung der Nachweisbarkeit von Werbeaussagen, keine juristische Bewertung. Quellen: `index.html:320,527`, `i18n.js`.

### T03 · P2 · Login-Zitat nennt unbelegte Leistungszahlen – bestätigt, Messnachweis offen

„Routen in 30 Sekunden statt 3 Stunden geplant“ wirkt wie ein belegtes Kundenresultat, hat aber keinen benannten Kunden oder Messkontext. Darunter steht lediglich „Eine Plattform für jede Branche“.

**Verbesserung:** Ohne belegte Messung: „Plane Einsätze und informiere dein Team an einem Ort.“ Ein echtes Testimonial nur mit Zustimmung, Quelle und nachvollziehbarem Kontext verwenden. Quelle: `app/login.html:152`.

### T04 · P2 · Standort und Erreichbarkeit sind uneinheitlich – bestätigt

Die Startseite nennt Brian als Einzelunternehmer in Aarau, während Footer und Impressum Hägendorf nennen. Website/Über uns versprechen unter vier Stunden während Bürozeiten, das Kontaktformular einen Werktag. „Kein Verkaufsgespräch nötig“ steht einem angekündigten obligatorisch wirkenden 15-Minuten-Call gegenüber.

**Verbesserung:** Tatsächlichen Standort bestätigen und überall aus einer Quelle ausgeben. Ein realistisches Antwortversprechen. Call freiwillig formulieren: „Wir klären deine Fragen per E-Mail. Wenn du möchtest, auch in einem kurzen Gespräch.“ Quellen: `index.html:606`, `anfrage.html:153`, `ueber-uns.html:118`, gerenderte Footer.

### T05 · P2 · Schweizer Sprache und Produktbegriffe vereinheitlichen – bestätigt/Empfehlung

Es stehen nebeneinander „Straße“, „regelmäßige“, „außen“, „abschliessen“, „Team“, „Crew“, „Read-only“, „Wizard“, „Tasks“ und „Kunde/Objekt“. „Eine Serie endest du“ ist unnatürlich. „Statorreinigung“ sollte fachlich geklärt werden; nicht ohne Kenntnis durch einen anderen Begriff ersetzen.

**Verbesserung:** Für de-CH durchgängig Schweizer Schreibweise. „Assistent“, „Nur lesen“, „Teamzuordnung“ und „Aufgaben“ als Standard, sofern kein fachlicher Unterschied gemeint ist. „Eine Serie beendest du mit einem Klick.“ Glossar für Büro, Feld und Website anlegen.

### T06 · P2 · Übersetzungsprüfung misst Schlüssel, nicht vollständige Oberfläche – bestätigt

Englische Einstellungen zeigen weiterhin deutsche Bereichstitel und Erklärungen. In der englischen Handyansicht bleiben Standard-Checklisten wie „Staubsauger & Ersatzbeutel an Bord“ und „Küche“ deutsch. Neue Offerten-/Rechnungsbeschriftungen sind teilweise unmittelbar im Markup oder JavaScript auf Deutsch geschrieben.

**Verbesserung:** Alle eigenen Standardtexte über Sprachschlüssel; vom Kunden eingegebene Inhalte unverändert lassen. Pro Sprache mindestens Navigation, Einstellungen, Auftrag, Offerte und Handyabschluss visuell abnehmen. Belege: `app-390-settings-en.png`, `mobile-fixture-day.png` und Quellcode. Die Existenz von fünf vollständigen Wörterbüchern beweist diesen Teil nicht.

### T07 · P2 · Ratgeber „mit Vorlage“ enthält keine Vorlage – bestätigt

Seitentitel: „Stundenrapport: was drauf gehört (mit Vorlage)“. Der Artikel liefert Erklärungen, aber keine herunterladbare oder ausfüllbare Vorlage. Überschriften wie „damit niemand reklamiert“ und „Wer vor Ort unterschreiben lässt, verhandelt gar nicht“ sind unnötig absolut.

**Verbesserung:** Echte Vorlage plus ausgefülltes Beispiel bereitstellen oder den Titel korrigieren. Textvorschlag: „Welche Angaben Rückfragen und Unklarheiten reduzieren.“ Quelle: `ratgeber/stundenrapport-vorlage.html:8,119,132`.

### T08 · P3 · Einige Texte legen mehr Leistungsumfang nahe als erklärt wird – Empfehlung

„Für jede neue Anfrage bauen wir ein eigenes Programm“ weckt eine unbeschränkte Individualentwicklungs-Erwartung. „Keine Vertragsbindung“ ist weniger präzise als „Monatlich kündbar“. „Mobile-App gratis“ benötigt den Zusammenhang mit dem Mitarbeiterpreis.

**Verbesserung:** „Wir prüfen, ob MosaOS deinen Ablauf abdecken kann“, „Monatlich kündbar“ und „Mobiler Zugang enthalten; Mitarbeiterpreis gemäss Tarif“. Keine neue Preisstrategie nötig.

## 4. Design, Schrift und Lesbarkeit

### D01 · P2 · Website, Anmeldung und Anwendung wirken wie verschiedene Gestaltungswelten – Empfehlung

Website: dunkelblau, Glühen und Verläufe. Büro: warmes Anthrazit, cremeweisse Hauptbuttons. Desktop-Login: weiss plus kräftiger blauer Verlauf. Handy-Login: dunkler Minimalbildschirm; Check-in nochmals blau/rot.

**Verbesserung:** Gemeinsame Markenregeln für Wortmarke, Akzent, Radien, Formularfelder und Statusfarben. Website darf stärker werblich und Büro ruhiger bleiben; Login sollte den Übergang erkennbar verbinden. Nicht alle Flächen müssen identisch werden.

### D02 · P2 · Inter beibehalten, Grössen und Gewichtung ordnen – Empfehlung mit Messwerten

Inter wird tatsächlich als CSS-Schriftfamilie verwendet; JetBrains Mono ergänzt Zahlen/technische Angaben. Ein Schriftwechsel löst die beobachteten Probleme nicht. Büro-Navigation/Metatexte liegen teils bei 10,5–11 px, Website-Sprachlinks bei 11 px. In mobilem Sonnenlicht und bei dichtem Inhalt ist das unnötig anstrengend. Das CSS nennt bei einigen nativen Eingaben Arial; die praktische Bedeutung hängt vom jeweiligen Feld ab.

**Vorgeschlagene Skala:** Website-Fliesstext 16–18 px, Büroinhalt 14–16 px, Feld-App 16 px für Arbeitsinformationen, Hilfstexte möglichst 12–14 px. Überschriften in wenigen Stufen, vorzugsweise Gewicht 600/700. Inter für Formulare konsequent erben lassen; Monospace nur dort, wo Ausrichtung hilft. Diese Werte sind Gestaltungsvorschläge, keine pauschale Normbehauptung.

### D03 · P2 · Kleine, gedämpfte Sprach- und Hilfstexte – bestätigt/Empfehlung

Inaktive Sprachlinks verwenden `#5B6280` bei 11 px auf dunklem Hintergrund; an mehreren Stellen ähnlich gedämpfte Metatexte. Visuell werden sie sehr unauffällig. Einzelne rote Kleintexte im Büro-Editor benötigen ebenfalls eine genaue Kontrastprüfung auf dem jeweiligen Hintergrund.

**Verbesserung:** Bedienbare Texte heller und grösser darstellen, nicht wie deaktiviert. Für die tatsächlichen Farbkombinationen Kontrast messen. Keine vollständige Kontrastkonformität behaupten: transparente Flächen, Verläufe und Zustände wurden hier nicht flächendeckend numerisch ausgewertet.

### D04 · P2 · Ratgeberüberschriften kleben am linken Handyrand – bestätigt

`.rg-wrap` gibt 24 px Seitenabstand vor, `.rg-head { padding:120px 0 32px }` überschreibt ihn. Mobile Messung: Überschrift bei x=0; Textkörper mit 24 px Innenabstand. In den Übersichten sind ebenfalls inkonsistente Einzüge sichtbar.

**Verbesserung:** Kopf und Textspalte identisch einrücken, etwa nur `padding-block` am Kopf setzen. Im Generator `scripts/ratgeber-erzeugen.py` pflegen und alle Sprachfassungen neu erzeugen. Beleg: `details.json`, Screenshot `web-390-ratgeber_stundenrapport-vorlage.png`.

### D05 · P2 · Mobile Ratgeber-Navigation verliert zentrale Wege – bestätigt

Auf kleinen Screens sind im Ratgeberkopf nur Logo und Sprachlinks sichtbar; Hauptnavigation, Login und Startbutton verschwinden, ein entsprechendes mobiles Menü fehlt dort. Auf Branchen-/Startseiten existiert dagegen ein Menü.

**Verbesserung:** Gemeinsamen Header mit zugänglichem mobilem Menü verwenden. Wechsel zwischen Ratgeber, Produkt, Preisen und Login ermöglichen, ohne bis zum Footer scrollen zu müssen.

### D06 · P3 · Markenrot und Wortmarke sind inkonsistent – bestätigt

Projektvorgabe: `#E11D2A` und „MosaOS“. Die Website definiert unter anderem `--brand-red: #DA291C`; die App verwendet `#E11D2A`. Der Startseiten-Footer wird als „mosaos“ dargestellt.

**Verbesserung:** Ein verbindlicher Wortmarkenbaustein und Markenrot aus zentraler Definition; Branchenakzente dürfen separat bleiben. Erst nach bewusster Entscheidung die Tokens angleichen. Quellen: `styles.css:15–20`, `app/styles.css:8`, Website-Footer.

### D07 · P2 · Dekoration erklärt weniger als ein Produktablauf – Empfehlung

Die Startseite nutzt viel Fläche für das grosse Mosaikzeichen, während Branchenbilder komplette Desktop-Oberflächen in sehr klein zeigen. Auf Sprachseiten bleiben die eingebetteten Produktbilder deutsch. Das erschwert das schnelle Verständnis, obwohl es technisch korrekt gerendert wird.

**Verbesserung:** Einen lesbaren Ausschnitt oder drei klar beschriftete Stationen zeigen: „Einsatz planen“, „Vor Ort dokumentieren“, „Rechnung erstellen“. Produktbilder bei wesentlichen Sprachfassungen lokalisieren oder ausdrücklich als Beispielansicht kennzeichnen. Grössere Bilder allein lösen die Informationsdichte nicht.

### D08 · P3 · Leere Ansichten sollten den nächsten Schritt erklären – Empfehlung

Offerten haben bereits eine hilfreiche Leermeldung mit Aktion. Mehrere andere Ansichten bleiben bei „Keine …“ oder fast leerem Board stehen.

**Verbesserung:** Kurzer Nutzen, Voraussetzung und eine einzige nächste Aktion, z. B. „Noch kein Rapport. Öffne einen Einsatz oder erfasse den ersten Rapport.“ Keine zusätzliche Werbekachel auf jeder Seite.

### D09 · P3 · Produktfilm-Seiten separat behandeln – bestätigt/Empfehlung

`product-video.html` verbreitert die Seite auf 1626 px bei 1440 und 547 px bei 390. Andere Filmseiten sind auf eine animierte Aufnahme ausgelegt; der erste Screenshot bildet nicht den ganzen Film ab.

**Verbesserung:** Aufnahmevorlagen als solche kennzeichnen und von normalen Besucherpfaden trennen. Falls öffentlich als Produktdemo genutzt, responsiven Rahmen und Pause-/Wiederholungsmöglichkeiten prüfen. Hier wurden Anfangszustände erfasst, keine vollständige Filmanalyse vorgenommen.

## 5. Dokumentation und Prüfverfahren

### Q01 · P2 · Veraltete Projektanweisungen führen zu falschen Aussagen – bestätigt

Die übergeordnete `AGENTS.md` nennt alte Verzeichnisse, eine frühere Supabase-ID und Stripe-Testmodus. Die tatsächliche Arbeit liegt in `mosaos-main/app` und `mosaos-main/supabase`; Stripe ist laut Brian live.

**Verbesserung:** Aktuelle Architektur und geprüften Betriebsstand gesondert festhalten; historische Angaben datieren. Keine Secrets in Dokumente übernehmen. Dieser Audit hat die Anweisungsdatei nicht geändert.

### Q02 · P2 · Allgemeine Tests decken wichtige Fehlerpfade nicht ab – bestätigt

Ein fehlerfreier Seitenaufruf, syntaktisch korrektes JavaScript und fünf geladene Wörterbücher erfassen weder F01 noch U03 oder T06. Auch Screenshots mit leerer Liste reichen für eine dicht gefüllte Planung nicht aus.

**Verbesserung:** Kleine, gezielte Abnahmeszenarien für Abo-Fehler, Mitarbeiter-/Einsatz-Ladefehler, Tastaturnavigation, lange mobile Inhalte und echte Sprachwechsel. Einen bestandenen Syntaxcheck weiterhin als solchen benennen.

## Empfohlene Umsetzungsreihenfolge

1. **Verlässliche Abläufe:** F01–F04 und U03; Demo-Firmendaten aus echten Rückfallwerten entfernen (F06). Öffentliche Zusagen aus T01/T02 gegen Belege abgleichen.
2. **Handybedienung:** F05, U01–U07. Planung als lesbare mobile Liste, funktionierende Rückwege, eindeutige Formulare.
3. **Texte und Produktverständnis:** T03–T08, Demo bis zum fertigen Beleg, eindeutige Identität und aktualisierbare Beispieldaten.
4. **Visuelle Vereinheitlichung:** D01–D08; Inter und vorhandene Grundstruktur behalten, Tokens und Komponenten konsistent machen.
5. **Abnahme:** Hauptablauf an einem echten iPhone/Safari und mit einem Testbetrieb; Zahlungsabläufe anhand vorhandener Stripe-Ereignisse oder gesondert autorisierter Tests belegen.

## Was bewusst erhalten bleiben sollte

- Inter als Hauptschrift und das ruhige Büro-Grundlayout.
- Die nach Tätigkeiten gruppierte Navigation; semantisch und mobil verbessern.
- Die sechs Einstellungsbereiche als Orientierung, mit klarerer Bereichsdarstellung.
- Offerten-Dialog mit eingeklappten optionalen Angaben und erreichbarer Fussleiste.
- Statusfilter bei Rechnungen und getrennte Monatszusammenfassung.
- Sichtbare Kennzeichnung der Beispieldemo; Platzierung verbessern.
- Branchenbezogene Begriffe und das bestehende Rollenmodell.

## Belege und vollständiges Seiteninventar

Alle Rohbefunde, Texte, Screenshots und Prüfskripte liegen in:

`/Users/brianknuchel/MosaOS/tmp/ux-audit-2026-09-09/`

- `results.json`: 194 Aufrufzustände, Seitenfehler, Bilder und gemessene Dokumentbreiten.
- `flows.json`: gezielte Dialog-/Fehlertests, unter anderem beide Abo-Ausnahmen.
- `details.json`: Tastaturtest, Feldbeschriftungen und gemessene Abstände.
- `web-<Breite>-<Datei>.json/.png`: Texte, Schriftfamilien, Screenshot pro Website-Zustand.
- `app-<Breite>-<Ansicht>.json/.png`: entsprechende Büro-Ansichten.
- `dialog-*.png`: zentrale Formulare nach der Animation.
- `mobile-fixture-*.png/.txt`: ausschliesslich synthetische Handy-Zustände. Unvollständige Datumsangaben in der künstlichen kommenden Einsatzkarte sind ein Fixture-Artefakt, kein bestätigter Produktfehler.
- `sheet-0.png` bis `sheet-16.png`: visuell gesichtete Übersichten der Seitenanfänge. Für Detailentscheidungen immer die Einzelaufnahme verwenden.
- `audit.cjs`, `flows.cjs`, `details.cjs`, `sheets.cjs`: nachvollziehbare Prüfschritte. Benötigen den lokalen Testserver und die verwendete Playwright-Laufzeit.

Das begleitende [Prüfinventar](UI-UX-AUDIT-2026-09-09-INVENTAR.md) listet jeden ursprünglich erfassten Zustand mit Belegpfad. Die nach der Umsetzung erzeugten Abnahmebilder heissen `reg-<Breite>-<Bereich>.png`; die Messwerte stehen in `regression.json`. Die Befundtexte bleiben als nachvollziehbarer Vorher-Zustand erhalten, der Umsetzungsstand oben ordnet sie ein.
