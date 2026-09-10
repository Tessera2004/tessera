# MosaOS Mail-Assistent – MVP-Plan

Stand: 10. September 2026

Status: technische Planung, noch nicht produktiv umgesetzt. Der produktive Einsatz setzt eine Prüfung der Datenschutzunterlagen, der Provider-Freigaben und der Mandantentrennung voraus.

## Umsetzungsstand

Etappen 1 bis 3 sind im Repository vorbereitet, aber bewusst noch nicht deployt:

- Datenbankmigration mit Tabellen, RLS, eigenen Mailrechten und mandantenbindenden Fremdschlüsseln;
- AES-256-GCM-Verschlüsselung mit Mandantenkontext und Schlüsselversion;
- serverseitiger Gmail-OAuth-Start und einmaliger Callback mit PKCE;
- tokenfreie Statusabfrage und kontrolliertes Trennen des Postfachs;
- serverseitige Gmail-Token-Erneuerung und Abruf neuer Nachrichten;
- idempotente Speicherung mit verschlüsseltem Inhalt und mandantengebundenem Absender-Hash;
- sichtbarer Abbruch statt still übersprungener Nachrichten bei einem zu grossen Rückstand;
- automatischer Löschlauf für abgelaufene Nachrichten, Entwürfe und technische Laufdaten;
- atomare Analyse-Queue ohne doppelte KI-Aufrufe bei parallelen Cron-Läufen;
- regelbasierter Filter für automatische Abwesenheitsantworten;
- OpenAI Responses API mit `store: false`, ohne Tools und mit strengem JSON-Schema;
- begrenzte Auswahl freigegebener Wissenseinträge und passender Kunden-/Einsatzdaten;
- nachgelagerte Prüfung von Wissensquellen und zwingende Eskalation risikoreicher Kategorien;
- monatliches Tokenlimit pro Mandant, standardmässig 5 Millionen Token;
- statische Sicherheitsprüfungen, Kryptografie-Test und ausführbarer RLS-Negativtest.

Noch offen sind das Setzen der Secrets, die Anwendung auf einer separaten Staging-Datenbank, der dortige RLS-Test und die Einrichtung der beiden Scheduler-Aufrufe. Lokal ist derzeit kein Docker oder Podman vorhanden; deshalb wurde die Migration noch nicht gegen eine laufende lokale Supabase-Datenbank ausgeführt.

## Entscheidung

Der Mail-Assistent wird als optionales Modul innerhalb von MosaOS gebaut. Die erste Fassung unterstützt genau ein Gmail-Postfach pro Mandant und erstellt ausschliesslich Antwortentwürfe. Sie versendet niemals selbstständig eine Nachricht.

Der erste Abruf erfolgt alle 30 Minuten. Eine spätere Umstellung auf Gmail-Push-Benachrichtigungen bleibt möglich, ist für den Pilot aber nicht erforderlich.

## Bereits vorhanden

`app/app-konto.js` enthält bereits:

- eine Postfachansicht;
- Gmail- und Outlook-Anbindung im Browser;
- das Lesen der letzten Nachrichten;
- das manuelle Beantworten einer Nachricht;
- die Umwandlung einer Nachricht in eine Aufgabe;
- die Modulkennung `email` im bestehenden Abonnementmodell.

Diese Oberfläche kann weiterverwendet werden. Die vorhandene technische Anbindung ist jedoch nur eine Vorstufe:

- OAuth-Zugangstokens werden im `localStorage` gespeichert;
- Nachrichten werden nur bei geöffneter App abgerufen;
- ein Gmail-Zugang läuft nach kurzer Zeit ab und wird nicht serverseitig erneuert;
- der Hintergrunddienst kennt keine dauerhaft sichere Postfachverbindung;
- Nachrichtentexte und Antwortentwürfe werden noch nicht mandantenbezogen in Supabase verwaltet.

Für den Mail-Assistenten darf deshalb nicht einfach KI an den vorhandenen Browser-Code angehängt werden.

## Funktionsumfang des Piloten

### Enthalten

1. Ein Administrator verbindet ein Gmail-Postfach.
2. MosaOS prüft serverseitig alle 30 Minuten auf neue Nachrichten.
3. Neue Nachrichten werden einer Kategorie zugeordnet:
   - neue Kundenanfrage;
   - bestehender Kunde;
   - Termin oder Verschiebung;
   - Reklamation;
   - Rechnung oder Zahlung;
   - Bewerbung;
   - Werbung oder unwichtig;
   - unklar.
4. Jede Nachricht erhält eine Priorität: `dringend`, `normal` oder `niedrig`.
5. MosaOS sucht nur passende, belegte Informationen des Mandanten und gegebenenfalls des erkannten Kunden.
6. Die KI erstellt einen Entwurf mit einer kurzen Begründung und weist auf fehlende Angaben hin.
7. Ein berechtigter Benutzer prüft und bearbeitet den Entwurf.
8. Erst ein ausdrücklicher Klick des Benutzers versendet die freigegebene Fassung.
9. Verarbeitung, Freigabe und Versand werden ohne unnötigen Mailinhalt protokolliert.

### Nicht enthalten

- automatischer Versand;
- selbstständige Preiszusagen, Rabatte, Terminbestätigungen oder Gutschriften;
- Verarbeitung von Anhängen;
- Öffnen oder Abrufen von Links aus Nachrichten;
- Outlook, IMAP und iCloud im ersten Pilot;
- selbstständige Änderungen an Kunden, Einsätzen, Rechnungen oder Aufgaben;
- Training eines eigenen KI-Modells mit Kundenmails.

## Firmenwissen

Der Agent darf nicht pauschal den gesamten Mandantenbestand erhalten. Er bekommt pro Nachricht nur die dafür nötigen Informationen.

### Freigegebene Wissensquellen

- Firmenname, Anschrift und Kontaktdaten;
- Öffnungszeiten und Reaktionszeiten;
- angebotene Leistungen und Einsatzgebiet;
- ausdrücklich freigegebene Preisregeln;
- Zahlungsbedingungen;
- Signatur und gewünschter Schreibstil;
- Antwortregeln und Eskalationsregeln;
- bei eindeutig erkanntem Absender: passende Kundendaten und relevante offene Vorgänge.

Jeder Wissenseintrag benötigt eine sichtbare Quelle, ein Änderungsdatum und den Status `freigegeben`. Freitext aus eingehenden Mails wird niemals automatisch zu dauerhaftem Firmenwissen.

## Sicherheitsregeln

1. OAuth-Client-Secret, Refresh-Token und Verschlüsselungsschlüssel liegen nur in Supabase-Secrets beziehungsweise verschlüsselt in der Datenbank. Sie erscheinen nie in HTML, JavaScript, `localStorage` oder API-Antworten.
2. Jede Datenbankzeile gehört zu genau einem `tenant_id`. Funktionen bestimmen den Mandanten aus der geprüften Sitzung oder aus einer serverseitig geprüften Postfachzuordnung.
3. Der Browser erhält keine Provider-Tokens. Lesen und Senden laufen über Edge Functions.
4. E-Mail-Inhalt gilt als nicht vertrauenswürdige Eingabe. Anweisungen wie „Ignoriere deine Regeln“ oder Aufforderungen zur Herausgabe interner Daten dürfen das Systemverhalten nicht verändern.
5. Die KI erhält keine Secrets, OAuth-Tokens, internen Schlüssel oder Daten anderer Mandanten.
6. Die KI antwortet in einem festen JSON-Schema. Freitext darf keine Aktionen auslösen.
7. Rechtsfragen, Drohungen, Personalfälle, Datenschutzanfragen, hohe Preisabweichungen und unklare Reklamationen werden zur manuellen Bearbeitung markiert.
8. Es gibt keine automatische Zustellung. Auch ein als sicher bewerteter Entwurf braucht eine menschliche Freigabe.
9. Doppelte Provider-Ereignisse erzeugen durch eindeutige Provider-IDs weder doppelte Entwürfe noch Doppelversand.
10. Nach dem Trennen eines Postfachs wird der Refresh-Token widerrufen, der gespeicherte Token gelöscht und der Hintergrundabruf beendet.

## Vorgeschlagenes Datenmodell

Die Namen sind vor Erstellung der Migration nochmals gegen das vorhandene Schema zu prüfen.

### `mail_accounts`

Serverseitige Postfachverbindung.

| Feld | Zweck |
| --- | --- |
| `id uuid` | interne Kennung |
| `tenant_id uuid` | Mandant |
| `provider text` | für den Pilot nur `gmail` |
| `email text` | verbundene Adresse |
| `encrypted_refresh_token text` | anwendungsseitig verschlüsselter Refresh-Token |
| `token_key_version integer` | verwendete Schlüsselversion |
| `scopes text[]` | tatsächlich gewährte Berechtigungen |
| `status text` | `active`, `reauth_required`, `disabled` |
| `provider_cursor text` | Gmail-History-ID oder letzter Abrufpunkt |
| `last_synced_at timestamptz` | letzter erfolgreicher Abruf |
| `last_error_code text` | technischer Fehler ohne Mailinhalt |
| `created_by uuid` | verbindender Benutzer |
| `created_at`, `updated_at` | Zeitstempel |

Für die Tokenfelder gibt es keine direkte `SELECT`-Policy für Browserbenutzer. Zugriff ist nur über dafür vorgesehene Edge Functions mit serverseitiger Autorisierung erlaubt.

### `mail_agent_settings`

Pro Mandant genau ein Einstellungsdatensatz.

| Feld | Zweck |
| --- | --- |
| `tenant_id uuid` | Primärschlüssel und Mandant |
| `enabled boolean` | Hintergrundverarbeitung ein oder aus |
| `mode text` | im Pilot fest `draft_only` |
| `language text` | Standardsprache, zunächst `de-CH` |
| `tone text` | gewünschter Ton |
| `signature text` | freigegebene Signatur |
| `business_hours jsonb` | Geschäftszeiten |
| `reply_rules jsonb` | feste Antwortregeln |
| `escalation_rules jsonb` | manuelle Eskalationen |
| `retention_days integer` | mandantenspezifische Löschfrist innerhalb der Systemgrenze |
| `updated_by uuid` | letzte Änderung |
| `updated_at` | Zeitstempel |

Nur Administratoren dürfen diese Einstellungen verändern.

### `mail_agent_knowledge`

Kontrollierte Wissenseinträge statt eines unübersichtlichen Gesamtprompts.

| Feld | Zweck |
| --- | --- |
| `id uuid` | Kennung |
| `tenant_id uuid` | Mandant |
| `category text` | zum Beispiel `service`, `price_rule`, `policy`, `area` |
| `title text` | verständliche Bezeichnung |
| `content text` | freigegebener Inhalt |
| `source text` | Herkunft der Angabe |
| `approved boolean` | darf die KI den Eintrag verwenden? |
| `valid_from`, `valid_until` | optionale Gültigkeit |
| `created_by`, `updated_by` | Verantwortliche |
| `created_at`, `updated_at` | Zeitstempel |

Im Pilot ist keine Vektordatenbank nötig. Kategorien und einfache Volltextsuche sind nachvollziehbarer und kostengünstiger.

### `mail_messages`

Minimaler Arbeitsbestand für erkannte Nachrichten.

| Feld | Zweck |
| --- | --- |
| `id uuid` | interne Kennung |
| `tenant_id uuid` | Mandant |
| `mail_account_id uuid` | verbundenes Postfach |
| `provider_message_id text` | Idempotenz gegenüber Gmail |
| `provider_thread_id text` | Bezug zur Unterhaltung |
| `received_at timestamptz` | Eingangszeit |
| `encrypted_payload text` | verschlüsselter Absender, Betreff und Nachrichtentext |
| `sender_hash text` | datensparsame Zuordnung zu bekannten Kontakten |
| `category text` | erkannte Kategorie |
| `priority text` | erkannte Priorität |
| `needs_human boolean` | zwingende manuelle Behandlung |
| `status text` | `new`, `drafted`, `reviewed`, `sent`, `ignored`, `failed` |
| `retention_until timestamptz` | geplanter Löschzeitpunkt |
| `created_at`, `updated_at` | Zeitstempel |

Eindeutiger Index: `(mail_account_id, provider_message_id)`.

### `mail_drafts`

| Feld | Zweck |
| --- | --- |
| `id uuid` | Kennung |
| `tenant_id uuid` | Mandant |
| `message_id uuid` | Ursprungsnachricht |
| `encrypted_subject text` | verschlüsselter Betreff |
| `encrypted_body text` | verschlüsselter Antworttext |
| `confidence text` | `high`, `medium`, `low` |
| `missing_information jsonb` | offen deklarierte Lücken |
| `knowledge_refs uuid[]` | verwendete Wissenseinträge |
| `model text` | verwendetes Modell |
| `input_tokens`, `output_tokens` | Kostenkontrolle |
| `reviewed_by uuid` | prüfender Benutzer |
| `reviewed_at`, `sent_at` | Freigabe und Versand |
| `created_at`, `updated_at` | Zeitstempel |

### `mail_agent_runs`

Technisches Protokoll ohne vollständige Nachrichtentexte: Laufzeit, Status, Fehlercode, Anzahl gefundener Nachrichten, Anzahl Entwürfe und Tokenverbrauch. Sicherheitsrelevante Benutzeraktionen gehören zusätzlich in `audit_log`.

## Edge Functions

### Benutzerseitig mit gültiger MosaOS-Sitzung

- `mail-oauth-start`: nur Administrator; erzeugt einen zufälligen, serverseitig gehashten Einmal-State und die Gmail-Autorisierungs-URL.
- `mail-account-status`: liefert nur unsensible Verbindungsdaten.
- `mail-inbox`: entschlüsselt erlaubte Nachrichten für berechtigte Benutzer.
- `mail-draft-save`: speichert die manuell bearbeitete Fassung.
- `mail-send`: versendet nur nach explizitem Benutzeraufruf, prüft Mandant, Berechtigung und Idempotenz.
- `mail-disconnect`: nur Administrator; widerruft und löscht Provider-Token.

### Provider- oder serverseitig

- `mail-oauth-callback`: prüft OAuth-State und tauscht den Code serverseitig gegen Token.
- `mail-sync`: wird mit einem separaten Cron-Secret aufgerufen, lädt nur neue Nachrichten und erzeugt Arbeitsaufträge.
- `mail-analyse`: klassifiziert eine gespeicherte Nachricht und erstellt den Entwurf mit streng begrenztem Firmenkontext.
- `mail-retention`: löscht fällige Nachrichten und Entwürfe und protokolliert den Lauf.

Der vorhandene `x-cron-secret`-Ansatz der Funktion `zeitfenster` kann als Muster dienen. Cron- und Provider-Endpunkte dürfen keine normalen Browser-CORS-Endpunkte sein.

## KI-Vertrag

Die Modellantwort muss gegen ein festes Schema validiert werden:

```json
{
  "category": "customer_request",
  "priority": "normal",
  "needs_human": false,
  "reason": "Neue Anfrage ohne bestätigten Termin oder Preis.",
  "subject": "Re: Anfrage Unterhaltsreinigung",
  "body": "…",
  "missing_information": ["gewünschter Starttermin"],
  "knowledge_refs": ["…"]
}
```

Unbekannte Fakten werden nicht ergänzt. Fehlt eine verlässliche Angabe, muss das Modell sie als `missing_information` melden oder im Entwurf als Rückfrage formulieren. Die Anwendung verwirft Antworten mit ungültigem Schema oder nicht existierenden `knowledge_refs`.

## Berechtigungen

- `admin`: Postfach verbinden oder trennen, Wissen und Regeln pflegen, Entwürfe prüfen und versenden.
- `disposition`: Nachrichten und Entwürfe sehen, bearbeiten und nach ausdrücklicher Berechtigung versenden.
- `accounting`: nur Kategorien Rechnung/Zahlung und zugewiesene Nachrichten.
- `readonly`: standardmässig kein Zugriff auf Mailinhalte.
- `field`: kein Zugriff auf das Postfachmodul.

Vor Umsetzung ist zu entscheiden, ob dafür eigene Rechte wie `mail.read`, `mail.review`, `mail.send` und `mail.admin` ergänzt werden. Das ist sauberer als eine pauschale Ableitung aus `operations.write`.

## Aufbewahrung und Datenschutz

Für den Pilot gilt als technische Voreinstellung eine kurze Aufbewahrung von 30 Tagen für lokal gespeicherte Nachrichtentexte und Entwürfe. Der Provider bleibt das führende Mailarchiv. Metadaten dürfen nur so lange gespeichert werden, wie sie für Nachvollziehbarkeit und Sicherheit nötig sind.

Vor dem produktiven Einsatz sind mindestens zu aktualisieren:

- Datenschutzerklärung;
- Auftragsbearbeitungsvertrag;
- Verzeichnis der Bearbeitungstätigkeiten;
- Unterauftragsbearbeiterliste mit dem eingesetzten KI-Anbieter;
- Lösch- und Aufbewahrungsrichtlinie;
- Information der Mitarbeitenden über die Mailanalyse;
- Google-OAuth-Verifizierung und gegebenenfalls verlangte Sicherheitsprüfung.

Der Pilot darf nur mit einem eigens dafür freigegebenen Testpostfach und geeigneten Testnachrichten starten.

## Kostenkontrolle

- nur neue Nachrichten verarbeiten;
- Newsletter, automatische Benachrichtigungen und Spam vor dem KI-Aufruf regelbasiert aussortieren;
- zunächst nur den notwendigen Nachrichtentext ohne ganze historische Mailbox senden;
- Firmenwissen gezielt auswählen;
- Tokenverbrauch pro Entwurf protokollieren;
- monatliches Limit pro Mandant vorsehen;
- Verarbeitung bei erreichtem Limit pausieren und sichtbar melden.

## Umsetzung in Etappen

### Etappe 1 – Sicherheitsfundament

1. neue Tabellen und RLS-Policies als Migration anlegen;
2. eigene Mailberechtigungen definieren;
3. Verschlüsselungsformat und Schlüsselrotation festlegen;
4. mandantenübergreifende Negativtests schreiben;
5. OAuth-State und Secrets konfigurieren.

Ergebnis: Ein Postfach kann sicher verbunden und wieder getrennt werden. Noch keine KI.

### Etappe 2 – Hintergrundabruf

1. Gmail-Refresh-Token serverseitig verwenden;
2. Cron-Abruf alle 30 Minuten;
3. neue Nachrichten idempotent speichern;
4. Fehler- und Reautorisierungsstatus in MosaOS anzeigen;
5. Aufbewahrungslauf einrichten.

Ergebnis: Neue Nachrichten erscheinen auch dann zuverlässig, wenn die App geschlossen ist.

### Etappe 3 – Klassifikation und Entwurf

1. regelbasierte Vorfilter;
2. strukturierter KI-Aufruf;
3. Auswahl freigegebener Firmendaten;
4. Schema-, Quellen- und Sicherheitsvalidierung;
5. Kosten- und Laufprotokoll.

Ergebnis: Jede geeignete neue Nachricht erhält einen überprüfbaren Entwurf.

### Etappe 4 – Prüfung und manueller Versand

1. bestehende Mailansicht um Priorität, Kategorie und Entwurfsstatus ergänzen;
2. verwendete Wissensquellen und fehlende Angaben sichtbar machen;
3. Bearbeiten, verwerfen und freigeben;
4. serverseitiger Versand mit Idempotenzschutz;
5. Audit-Eintrag für Freigabe und Versand.

Ergebnis: vollständiger Pilotablauf ohne automatischen Versand.

### Etappe 5 – Produktionsfreigabe

1. Staging-Test mit separatem Postfach;
2. RLS-, OAuth-, Widerrufs-, Prompt-Injection- und Doppelversandtests;
3. Datenschutz- und Vertragsprüfung;
4. Google-Freigabeprozess;
5. kontrollierter Test mit genau einem Pilotmandanten;
6. Auswertung von Fehlklassifikationen und Kosten.

Outlook und weitere Provider werden erst danach ergänzt.

## Abnahmekriterien für den Pilot

- Ein Benutzer aus Mandant A kann weder Metadaten noch Inhalte oder Entwürfe von Mandant B lesen.
- Provider-Tokens erscheinen nie im Browser, in Logs oder in Fehlermeldungen.
- Der Abruf funktioniert bei geschlossenem Browser.
- Dieselbe Gmail-Nachricht erzeugt höchstens einen Datensatz und einen Entwurf.
- Ohne aktivierten `draft_only`-Modus wird kein KI-Aufruf ausgeführt.
- Kein Codepfad kann ohne einen aktuellen, protokollierten Benutzerentscheid versenden.
- Manipulative Anweisungen in Testmails verändern weder Systemregeln noch Firmenwissen.
- Preis, Termin oder Kulanz werden ohne belegte Grundlage nicht zugesagt.
- Das Trennen eines Postfachs beendet weitere Abrufe und entfernt den gespeicherten Token.
- Abgelaufene Inhalte werden entsprechend der Aufbewahrungsfrist gelöscht.
- Tokenverbrauch und geschätzte KI-Kosten sind pro Mandant auswertbar.

## Offene Entscheidungen vor dem Pilotbetrieb

1. Welches separate Gmail-Testpostfach wird für den Pilot verwendet?
2. Welche MosaOS-Rollen dürfen Entwürfe sehen, bearbeiten und versenden?
3. Welche konkreten Firmenangaben werden als erste Wissensbasis freigegeben?
4. Ist die voreingestellte Inhaltsaufbewahrung von 30 Tagen für den Pilot passend?
5. Welches monatliche KI-Limit soll pro Mandant gelten?

Diese Entscheidungen verändern nicht die Grundarchitektur. Sie müssen spätestens vor der Verbindung des ersten echten Postfachs feststehen.
