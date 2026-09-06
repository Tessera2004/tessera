# MosaOS: Website, App und Vermarktung

Stand: 6. September 2026. Bewertung des aktuellen lokalen Repository-Stands; Startseite, Reinigungsseite und Supabase-Konfiguration zusätzlich live gegengeprüft.

## Danach umgesetzt

- Die blockierende Startanimation wurde entfernt und die Hauptaussage auf den konkreten Arbeitsablauf ausgerichtet.
- Demo-Links öffnen nun eine gefüllte Beispieldemo mit drei Mitarbeitenden, drei Kunden und drei Einsätzen des aktuellen Tages. Vorhandene lokale Daten werden nicht überschrieben. Ein sichtbarer Button entfernt die Beispieldaten und öffnet die Registrierung.
- Die mobile Hero-Reihenfolge zeigt Text und Handlungsbutton vor der Produktgrafik; das Cookie-Infobanner wurde auf schmalen Bildschirmen kompakter.
- Die Reinigungs-Preiskarte nennt Basisumfang, Zusatzmodule, Mitarbeiterpreis und eine Beispielrechnung entsprechend der aktuellen Produktkonfiguration.
- Das noch nicht eingerichtete E-Mail-Modul wurde aus dem öffentlichen Preisrechner entfernt. Die App zeigt die Provider als „In Vorbereitung“ und keine technischen Konfigurationsmeldungen mehr.
- Die fünf Website-Sprachen wurden für Hauptaussage, Preiserklärung und Mail-Status angepasst und neu gebaut.

## Git und Veröffentlichung

Die vorherigen Korrekturen sind lokal geändert und noch nicht committed. Sie müssen zuerst committed und anschliessend auf origin/main gepusht werden, damit Cloudflare Pages das Frontend aktualisiert. Ein Push ohne Commit überträgt diese Dateien nicht. Die neue Datenbankmigration ist bereits eingespielt. Die öffentlich ausgelieferte app/supabase-client.js verwendet kxhsroiholjnyisaystr: Das ist dasselbe Projekt wie die eingespielte Migration. Damit ist die frühere Unsicherheit über diese Zuordnung geklärt.

Dieser Review verändert keine Produktdateien und veröffentlicht keine Beiträge oder Nachrichten.

## Was geprüft wurde

- 19 Seiten bei Desktopbreite 1440 px und Handybreite 390 px: Startseite, fünf Branchen, Branchenübersicht, Über uns, Anfrage, Ratgeberübersicht und drei Artikel, Impressum, Datenschutz, AGB, Login, Registrierung und Feld-App-Login.
- 22 Hauptansichten der Büro-App bei beiden Breiten, über die vorhandene Navigation-Funktion aufgerufen; einschliesslich der speziellen Branchenansichten. Sichtprüfung ausgewählter Screenshots und Text-/Codeprüfung der übrigen Ansichten.
- 77 HTML-Dateien auf lokal fehlende href/src-Dateiziele: keine gefunden. Das prüft keine externen Links, Hash-Anker oder Formularzustellung.
- Keine JavaScript-pageerror-Meldungen im erfassten Durchlauf. Bei der Baustellenansicht auf 390 px ein horizontaler Überstand von 19 px. Kein umfassender Barrierefreiheits- oder Sicherheitstest.
- Desktop und Handy verwenden dieselbe Browserengine. Kein Safari-/iPhone-Gerätetest, keine Anmeldung mit Kundenzugang, kein Testkauf, kein Absenden von Anfragen. Die Feld-App wurde bis zum Login geprüft. Netzwerkfehler durch im Test blockiertes Supabase wurden nicht als Produktfehler gewertet.
- Live-Startseite und /reinigung liefern HTTP 200. Die unten genannte Preis-Unklarheit ist auch live vorhanden.

## Gesamturteil

Das visuelle Fundament ist brauchbar und wirkt konsistent. Ein vollständiger Designneustart ist aus meiner Sicht nicht die beste nächste Investition. Die grössten Hebel sind eine eindeutige Produktzusage, nachvollziehbare Gesamtkosten und ein Demo-Erlebnis, das vor der Einrichtung bereits Nutzen zeigt.

## Priorität 1: Vertrauen und Einstieg

### 1. Preise und enthaltene Leistungen eindeutig machen

Die Reinigungsseite zeigt unter CHF 49 „Arbeitsrapport & Fotos“ sowie „Verträge & Nachkalkulation“ und schreibt, die Branchenwerkzeuge seien in der Basis enthalten. In app/stripe-config.js sind berichte, abos und nachkalkulation hingegen drei kostenpflichtige Module zu je CHF 9. Hinzu kommen CHF 4 pro aktiv geführtem Mitarbeiter. Die Branchen-Preiskarte erklärt diesen Mitarbeiterzuschlag nicht.

Empfehlung: Basisleistungen, kostenpflichtige Module und Mitarbeiterzuschlag überall identisch ausweisen. Ein berechnetes Beispiel zeigen, etwa „Basis + Rechnungen + 5 Mitarbeitende = CHF 83/Monat“ nach aktueller Konfiguration, mit klarer Angabe zur Steuerbehandlung. Alternativ ein verständliches Branchenpaket definieren und Website/Checkout darauf abstimmen. Keine neue Preisstrategie ohne Entscheidung des Inhabers umsetzen.

### 2. Eine echte Demo anbieten

„Demo testen“ führt derzeit in eine bewusst leere App mit der Aufforderung, Mitarbeiter, Kunden und Aufträge anzulegen. Diese Einrichtung ist sinnvoll für den eigenen Betrieb, verlangt aber viel von einem Besucher, der den Nutzen erst einschätzen will.

Empfehlung: separat zurücksetzbare Beispieldemo mit 3 Mitarbeitern, 5 Objekten, einer Tagesroute, einem Fotobericht und einer Beispielrechnung. Ein kurzer Weg: Auftrag öffnen → Mitarbeiteransicht ansehen → fertigen Nachweis/Rechnung öffnen. Eigene Registrierung klar getrennt. Beispieldaten dürfen nicht automatisch in einen echten Mandanten übernommen werden.

### 3. Funktionsversprechen an die Verfügbarkeit anpassen

Die Startseite stellt E-Mails als zentralen Bestandteil dar. Die Provider-Konfiguration ist leer; in der Mailansicht stehen technische Meldungen wie „Client-ID fehlt“ und „Edge Function fehlt“.

Empfehlung: Mail-Anbindung vor entsprechendem Verkauf fertigstellen oder deutlich als noch nicht verfügbar kennzeichnen. Besuchern verständliche Aussagen und eine Kontaktmöglichkeit geben; Dateinamen und OAuth-Konfiguration gehören nicht in den Kundenablauf. Auch das FAQ-Versprechen eines Kundenlistenimports sollte gegen den tatsächlichen Weg geprüft werden: Bei dieser Codeprüfung wurde kein entsprechender Importdialog gefunden.

## Priorität 2: Website und Bedienung

### 4. Den Nutzen sofort sichtbar machen

main.js spielt auf der Startseite ein 3,2-sekündiges Intro ab. Währenddessen werden Navigation und Hero-Inhalt ausgeblendet. Anschliessend lautet die Überschrift „Eine Plattform. Jede Branche.“ Sie beschreibt den Umfang, aber kaum den konkreten Nutzen.

Empfehlung: keine blockierende Intro-Sequenz beim regulären Besuch. Eine mögliche Überschrift für die erste Zielgruppe: „Einsätze planen. Arbeit dokumentieren. Rechnungen schreiben.“ Darunter: „Für Schweizer Reinigungsbetriebe – vom Büro bis zum Mitarbeiter vor Ort.“ Die übrigen Branchen können weiterhin eigene Seiten behalten.

### 5. Mobile Startansicht kürzen

Auf der Reinigungsseite steht mobil zunächst der Produkt-Screenshot, dann die Erklärung und erst danach der Startbutton. In der 390 × 900-Prüfung lag der Button bei etwa 741 px; das unten eingeblendete Cookie-Infobanner überdeckte dabei einen Teil des Handlungsbereichs. Auf der Startseite lag „Demo testen“ bei etwa 829 px, noch vor zusätzlichen Effekten einer realen Browserleiste.

Empfehlung: Überschrift, kurzer Nutzen und Button zuerst, Screenshot danach. Infobanner kompakter anordnen, sodass kein wichtiger Button verdeckt wird. Auf einem echten iPhone zusätzlich prüfen.

### 6. Einstellungen in verständliche Bereiche aufteilen

Die Ansicht heisst „Preise & Konditionen“, enthält aber zusätzlich Firma/IBAN, Erscheinungsbild, Zeitfaktoren, Vorlagen, Historie, Module, Leistungen, 2FA und Kontolöschung. Mehrere Karten haben separate Speichern-Buttons, daneben gibt es einen allgemeinen Button.

Empfehlung: Unterseiten oder Reiter „Firma“, „Leistungen & Preise“, „Team & Rechte“, „Dokumente“, „Abo“, „Sicherheit“. Pro Bereich klar anzeigen, ob Änderungen gespeichert sind. Bereits vorhandene Erste-Schritte-Karte behalten und zu einem messbaren ersten vollständigen Auftrag führen.

### 7. Kleine, konkrete Interface-Korrekturen

- Baustellenansicht: 19 px horizontalen Überstand bei 390 px beheben.
- Fehlende Übersetzungen in Einstellungen und Branchenansichten vervollständigen. Fünf geladene Wörterbücher bedeuten nicht, dass jeder Text übersetzt ist; im englischen Test bleiben beispielsweise „Erscheinungsbild“, „Eigene Leistungen“ und Statusbegriffe deutsch.
- Nicht angemeldete Demo neutral beschriften: Der frische Aufruf begrüsst „Brian“ und zeigt Standard-Firmendaten. Das sollte klar als Beispielbetrieb erkennbar sein.
- Antwortversprechen vereinheitlichen: „unter 4 Stunden während Bürozeiten“ steht neben „innerhalb eines Arbeitstags“. Die Anfrage-Seite kündigt ausserdem einen 15-Minuten-Call an. Für einen schriftlichen Einstieg besser den Call als freiwillig anbieten.
- Die Über-uns-Seite sagt, weitere Branchen folgten erst, während die Website bereits fünf Branchen anbietet. Den tatsächlichen Reifegrad verständlich beschreiben.

## Vermarktung: nächste Phase

Annahme mangels bestätigter Nutzungszahlen: MosaOS befindet sich noch in der frühen Kundengewinnung. Die folgenden Zahlen sind Arbeitsziele für ein Experiment, keine Erfolgsprognosen.

### Bestehende Kanäle sinnvoll verwenden

- Crunchbase: als ergänzendes Unternehmensprofil pflegen. Ich würde es derzeit nicht als Hauptquelle für Schweizer Reinigungsbetriebe einplanen.
- local.ch: Status der angefragten Eintragung klären; Name, Website, Kontakt und Beschreibung konsistent halten. Eine bestätigte Veröffentlichung wurde hier nicht geprüft.
- Google Search Console und Bing Webmaster Tools: nicht nur Registrierung abhaken, sondern Indexierung, Suchanfragen, Impressionen und Klicks der Branchenseiten verfolgen. Eine Sitemap garantiert keine Indexierung oder Platzierung; das erklärt Google ausdrücklich: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- LinkedIn Unternehmensseite: Produktbeispiele, kurze Bildschirmvideos und später echte Kundenbelege sammeln. Persönliches Profil: sachliche Einblicke in reale Arbeitsprobleme und Weiterentwicklung. Dafür sind weder Gesichtsvideos noch private Geschichten nötig. Bestehende fachlich passende Kontakte zur Unternehmensseite einladen, keine ungeprüfte Annahme über aktuelle Einladungskontingente. LinkedIn nennt solche Einladungen in seinem Gründerleitfaden: https://business.linkedin.com/content/dam/lem/business/en/advertise/startups/founders-guide-to-linkedin-v2.pdf

### Erst eine Branche gewinnen

Meine Empfehlung: Reinigung in der Deutschschweiz, zunächst kleinere Betriebe mit mehreren Mitarbeitenden. Das passt zur stärksten vorhandenen Produktausprägung. Website und Produkt dürfen mehrere Branchen bedienen; für die erste Kampagne sollte jede Botschaft denselben klaren Kundentyp ansprechen.

### Vier Wochen mit konkreten Ergebnissen

1. Woche: Preisdarstellung, Erstbesuch und Demo verbessern. Eine kurze Bildschirmvorführung erstellen: „So kommt der Auftrag vom Büro aufs Handy“. Einen eindeutigen Testaufruf und einen freiwilligen schriftlichen Hilfekanal anbieten.
2. Woche: Drei fachliche Beiträge auf dem persönlichen Profil bzw. der Unternehmensseite verteilen. Eine wiederverwendbare Produktvorführung genügt als Material. Bei relevanten bestehenden Kontakten und erlaubten Branchenbeiträgen freiwillige Testbetriebe suchen. Ziel: 3–5 passende Betriebe für strukturiertes Feedback, keine unverlangten Seriennachrichten.
3. Woche: Mit den Testbetrieben einen echten Ablauf beobachten: erster Kunde, erster geplanter Einsatz, erster Nachweis. Schriftliche Einrichtungshilfe anbieten. Abbruchstellen dokumentieren und die zwei häufigsten Hindernisse beheben.
4. Woche: Wiederholte Nutzung prüfen. Nur mit Zustimmung ein konkretes Kundenbeispiel veröffentlichen. Erst danach neue Kanäle hinzufügen; bezahlte Werbung erst erwägen, wenn Interessenten die Demo verstehen und Testnutzer produktiv werden.

### Sofort nutzbare Content-Ideen

- „Mitarbeiter fällt morgens aus: So änderst du den Tagesplan.“ 30–45 Sekunden Bildschirmvideo.
- „Vom Treppenhaus-Foto zum Nachweis im Büro.“ Ein Ablauf statt einer Liste von Modulen.
- „Was kostet MosaOS für einen Betrieb mit fünf Mitarbeitenden?“ Ehrliche Beispielrechnung inklusive aller gewählten Module.
- „Welche Angaben gehören auf einen Reinigungsrapport?“ Den vorhandenen Ratgeber durch eine wirklich herunterladbare Vorlage ergänzen.
- „Warum ein fertiger Auftrag nicht automatisch eine bezahlte Rechnung ist.“ Den tatsächlichen manuellen Zahlungsstatus erklären, keine automatische Bankabstimmung versprechen.

### Vorhandenes Suchmaterial verbessern

Es gibt bereits drei Ratgeber. Der Artikel unter stundenrapport-vorlage.html erklärt Angaben und Arbeitsweise, bietet jedoch keinen Download. Daraus liesse sich ein konkretes Gratisangebot machen: ausfüllbare Rapportvorlage plus ein vollständig ausgefülltes Beispiel. Eine anschliessende Erklärung zeigt denselben Ablauf in MosaOS. Erst vorhandene Seiten nützlicher machen, bevor viele allgemeine Artikel produziert werden.

Für Bing können Sitemap und IndexNow die Entdeckung aktueller URLs unterstützen; sie ersetzen keine nützlichen Inhalte oder Nachfrage. Quelle: https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search

### Was gemessen werden sollte

Pro Woche: relevante Besucher → Demo gestartet → Konto erstellt → erster Einsatz geplant → Nutzung an einem weiteren Tag → zahlender Betrieb. Kanalzuordnung über nachvollziehbare Kampagnenlinks oder die freiwillige Frage „Wie bist du auf uns aufmerksam geworden?“ ergänzen. Im Quellcode wurde keine entsprechende durchgängige Ereignismessung gefunden; extern konfigurierte Cloudflare-Statistiken wurden nicht eingesehen.

Likes und Profilaufrufe sind ergänzende Hinweise. Die praktische Frage ist, ob ein passender Betrieb seinen ersten realen Einsatz mit MosaOS durchführt und danach wiederkommt.
