// Zeitfenster: Terminbuchung fuer fremde Betriebe.
//
// Vier Wege in einer Function statt vier Ordnern, anders als sonst hier
// ueblich: Zeitfenster ist ein eigenes Produkt in dieser Datenbank zu Gast.
// Beisammen bleibt der spaetere Auszug in ein eigenes Projekt eine einzelne
// Bewegung, und die abweichende CORS-Regel unten steht nur an einer Stelle.
//
//   GET  /zeitfenster/konfiguration?betrieb=slug   Leistungen und freie Zeiten
//   POST /zeitfenster/buchen                       Termin verbindlich belegen
//   GET  /zeitfenster/absagen?token=…              Absageseite fuer den Gast
//   POST /zeitfenster/absagen                      Absage ausfuehren
//   GET  /zeitfenster/termine?betrieb=…&token=…    Liste fuer den Betrieb (Notzugang)
//   POST /zeitfenster/verwalten                    Status per Notzugang aendern
//   POST /zeitfenster/betrieb-termin               Absagen/Verschieben mit Mail
//   POST /zeitfenster/erinnerungen                 Taeglicher Auftrag (Zeitplan)
//   GET  /zeitfenster/erinnerung-aus?token=…       Abmeldung von Erinnerungen
import { sha256, randomToken } from '../_shared/http.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';
import { sendeMail } from '../_shared/mail.ts';

// Absichtlich jede Herkunft, anders als bei den MosaOS-Functions.
//
// Der Buchungsplan laeuft auf der Website des Kunden, und die hat bei jedem
// Kunden eine andere Adresse. Eine Liste erlaubter Herkuenfte muesste bei
// jedem Verkauf nachgezogen werden — ein Deploy pro Kunde, und beim
// Vergessen ein Fehler, den man erst beim Anruf des Kunden bemerkt.
// Tragbar ist das, weil Buchen ohnehin oeffentlich ist: Wer die Seite
// aufrufen darf, darf buchen. Die Verwaltungsliste schuetzt nicht die
// Herkunft, sondern das Token.
const cors = {
  'Access-Control-Allow-Origin': '*',
  // apikey und authorization, weil Supabase den oeffentlichen Schluessel am
  // Eingang erwartet; ohne sie scheitert schon der Vorabruf des Browsers.
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const html = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const moechteJson = (req: Request) =>
  req.headers.get('accept')?.includes('application/json') ?? false;

const zeitfensterSeite = () =>
  (Deno.env.get('ZEITFENSTER_SEITE') || 'https://termine.mosaos.ch').replace(/\/$/, '');

// Inhalte aus der Datenbank duerfen in den schlichten Bestaetigungsseiten
// niemals als HTML interpretiert werden. Firmenname und Datum sind Text.
const htmlText = (wert: string) => wert
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

// Aktuelle Ortszeit des Betriebs als "YYYY-MM-DDTHH:MM".
//
// Bewusst ohne Zeitzonen-Bibliothek: Buchungen stehen als Ortszeit in der
// Datenbank, also braucht der Vergleich nur dieselbe Ortszeit als Text.
// Beide Seiten sind Wanduhrzeit im selben Ort, damit stimmt der
// Zeichenkettenvergleich auch ueber die Zeitumstellung hinweg.
function jetztInZone(zone: string): string {
  const teile = new Intl.DateTimeFormat('sv-SE', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date());
  return teile.replace(' ', 'T').slice(0, 16);
}

// Verschiebt ein Datum um Tage, rein auf der Kalenderebene.
function plusTage(datum: string, tage: number): string {
  const d = new Date(datum + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

// ISO-Wochentag: 1 = Montag … 7 = Sonntag.
const wochentag = (datum: string) =>
  String(((new Date(datum + 'T12:00:00Z').getUTCDay() + 6) % 7) + 1);

type Betrieb = {
  id: string;
  name: string;
  benachrichtigung_email: string;
  zeitzone: string;
  oeffnungszeiten: Record<string, string[]>;
  leistungen: string[];
  geschlossen: string[];
  vorlauf_stunden: number;
  horizont_tage: number;
  verwaltung_token_hash: string | null;
  logo_url: string | null;
  farbe: string | null;
};

async function ladeBetrieb(slug: string): Promise<Betrieb | null> {
  const db = adminClient();
  const { data } = await db.from('zf_betriebe')
    .select('id,name,benachrichtigung_email,zeitzone,oeffnungszeiten,leistungen,geschlossen,vorlauf_stunden,horizont_tage,verwaltung_token_hash,logo_url,farbe')
    .eq('slug', slug).eq('aktiv', true).maybeSingle();
  return (data as Betrieb) ?? null;
}

// Freie Zeiten je Tag im Zeitraum: Oeffnungszeiten minus Belegtes, minus
// geschlossene Tage, minus alles vor der Vorlauffrist.
async function freieZeiten(betrieb: Betrieb, von: string, bis: string) {
  const db = adminClient();
  const { data: belegt } = await db.from('zf_buchungen')
    .select('datum,zeit').eq('betrieb_id', betrieb.id)
    .neq('status', 'abgesagt').gte('datum', von).lte('datum', bis);

  const genommen = new Set(
    (belegt ?? []).map((b) => `${b.datum} ${String(b.zeit).slice(0, 5)}`),
  );
  const geschlossen = new Set(betrieb.geschlossen ?? []);

  // Frueheste buchbare Ortszeit. Zeichenkette, damit sie sich direkt mit
  // "datum + T + zeit" vergleichen laesst.
  const jetzt = jetztInZone(betrieb.zeitzone);
  const fruehestens = new Date(
    new Date(jetzt + ':00Z').getTime() + betrieb.vorlauf_stunden * 3600_000,
  ).toISOString().slice(0, 16);
  const spaetestens = plusTage(jetzt.slice(0, 10), betrieb.horizont_tage);

  const tage: Record<string, string[]> = {};
  for (let d = von; d <= bis; d = plusTage(d, 1)) {
    if (d > spaetestens || geschlossen.has(d)) continue;
    const zeiten = (betrieb.oeffnungszeiten?.[wochentag(d)] ?? [])
      .filter((z) => !genommen.has(`${d} ${z}`))
      .filter((z) => `${d}T${z}` >= fruehestens);
    if (zeiten.length) tage[d] = zeiten;
  }
  return tage;
}

// Ist diese Zeit an diesem Tag ueberhaupt eine Oeffnungszeit?
//
// Ohne diese Pruefung koennte jemand am Formular vorbei eine beliebige
// Uhrzeit senden — 03:00 Uhr nachts waere frei, denn die Sperre in der
// Datenbank verhindert nur Doppelbuchungen, nicht erfundene Zeiten.
function zeitErlaubt(betrieb: Betrieb, datum: string, zeit: string) {
  if ((betrieb.geschlossen ?? []).includes(datum)) return false;
  if (!(betrieb.oeffnungszeiten?.[wochentag(datum)] ?? []).includes(zeit)) return false;
  const jetzt = jetztInZone(betrieb.zeitzone);
  const fruehestens = new Date(
    new Date(jetzt + ':00Z').getTime() + betrieb.vorlauf_stunden * 3600_000,
  ).toISOString().slice(0, 16);
  if (`${datum}T${zeit}` < fruehestens) return false;
  if (datum > plusTage(jetzt.slice(0, 10), betrieb.horizont_tage)) return false;
  return true;
}

const zeigeDatum = (datum: string, zone: string) =>
  new Date(datum + 'T12:00:00Z').toLocaleDateString('de-CH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: zone,
  });

// --- Wege ------------------------------------------------------------------

async function konfiguration(url: URL) {
  const betrieb = await ladeBetrieb(url.searchParams.get('betrieb') || '');
  if (!betrieb) return json({ error: 'BETRIEB_UNBEKANNT' }, 404);

  const heute = jetztInZone(betrieb.zeitzone).slice(0, 10);
  const von = url.searchParams.get('von') || heute;
  const bis = url.searchParams.get('bis') || plusTage(von, 62);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(von) || !/^\d{4}-\d{2}-\d{2}$/.test(bis) || bis < von) {
    return json({ error: 'ZEITRAUM_UNGUELTIG' }, 400);
  }

  return json({
    name: betrieb.name,
    zeitzone: betrieb.zeitzone,
    logoUrl: betrieb.logo_url,
    farbe: betrieb.farbe,
    leistungen: betrieb.leistungen ?? [],
    horizontBis: plusTage(heute, betrieb.horizont_tage),
    tage: await freieZeiten(betrieb, von, bis > plusTage(von, 92) ? plusTage(von, 92) : bis),
  });
}

async function buchen(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return json({ error: 'UNLESBAR' }, 400);

  // Honigtopf: ein im Formular verstecktes Feld, das nur ein Bot ausfuellt.
  // Antwort bewusst wie ein Erfolg, damit er es nicht erneut versucht.
  if (String(body.website || '')) return json({ ok: true });

  const betrieb = await ladeBetrieb(String(body.betrieb || ''));
  if (!betrieb) return json({ error: 'BETRIEB_UNBEKANNT' }, 404);

  const datum = String(body.datum || '');
  const zeit = String(body.zeit || '').slice(0, 5);
  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 320);
  const telefon = String(body.telefon || '').trim().slice(0, 40);
  const notiz = String(body.notiz || '').trim().slice(0, 1000);
  const leistung = String(body.leistung || '').trim().slice(0, 100);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || !/^\d{2}:\d{2}$/.test(zeit)) {
    return json({ error: 'TERMIN_UNGUELTIG' }, 400);
  }
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'ANGABEN_UNVOLLSTAENDIG' }, 400);
  }
  if (!zeitErlaubt(betrieb, datum, zeit)) return json({ error: 'ZEIT_NICHT_BUCHBAR' }, 409);

  const db = adminClient();
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  const ipHash = await sha256(`${Deno.env.get('CONTACT_HASH_SALT') || ''}:${ip}`);

  // Ein oeffentlicher Endpunkt, der Mails ausloest, wird sonst zum Werkzeug
  // gegen fremde Postfaecher.
  const seit = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from('zf_buchungen').select('id', { count: 'exact', head: true })
    .eq('source_ip_hash', ipHash).gte('created_at', seit);
  if ((count || 0) >= 5) return json({ error: 'ZU_VIELE_VERSUCHE' }, 429);

  const token = randomToken();
  const { data: gebucht, error } = await db.from('zf_buchungen').insert({
    betrieb_id: betrieb.id, datum, zeit, leistung: leistung || null,
    name, email, telefon: telefon || null, notiz: notiz || null,
    storno_token_hash: await sha256(token), source_ip_hash: ipHash,
  }).select('id').single();

  // 23505: die Sperre in der Datenbank hat zugeschlagen. Genau der Fall, in
  // dem zwei Gaeste gleichzeitig denselben freien Slot vor sich hatten.
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return json({ error: 'SLOT_BELEGT' }, 409);
    }
    console.error('Buchung nicht gespeichert:', error);
    return json({ error: 'INTERN' }, 500);
  }

  const stornoLink = `${zeitfensterSeite()}/absagen?token=${token}`;
  const wann = `${zeigeDatum(datum, betrieb.zeitzone)} um ${zeit} Uhr`;

  // Erst speichern, dann melden. Scheitert Brevo, steht der Termin trotzdem
  // und geht niemandem verloren.
  const anBetrieb = await sendeMail({
    an: betrieb.benachrichtigung_email,
    betreff: `Neue Buchung: ${name}, ${wann}`,
    antwortAn: email,
    text: [
      `${wann}`, '',
      `Name:     ${name}`,
      `E-Mail:   ${email}`,
      `Telefon:  ${telefon || '—'}`,
      `Leistung: ${leistung || '—'}`,
      ...(notiz ? ['', 'Notiz:', notiz] : []),
      '', '---', `Betrieb: ${betrieb.name}`,
    ].join('\n'),
  });
  if (!anBetrieb.ok) console.error('Buchung steht, Betrieb nicht benachrichtigt:', anBetrieb.grund);

  const anGast = await sendeMail({
    an: email,
    betreff: `Termin bestätigt: ${wann}`,
    antwortAn: betrieb.benachrichtigung_email,
    text: [
      `Guten Tag ${name}`, '',
      `Ihr Termin bei ${betrieb.name} ist reserviert:`,
      `${wann}`,
      ...(leistung ? [`Leistung: ${leistung}`] : []),
      '',
      'Sie können den Termin hier absagen:',
      stornoLink,
      '',
      'Freundliche Grüsse',
      betrieb.name,
    ].join('\n'),
  });
  if (!anGast.ok) console.error('Buchung steht, Gast nicht benachrichtigt:', anGast.grund);

  return json({
    ok: true,
    id: gebucht.id,
    // Damit die Seite den Absagelink auch dann zeigen kann, wenn die Mail
    // im Spam landet oder Brevo gerade nicht erreichbar ist.
    stornoLink,
    mailVersendet: anGast.ok,
  }, 201);
}

const seite = (titel: string, text: string, knopf?: string) => html(`<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${htmlText(titel)}</title>
<style>
 body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f9;
   font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;color:#16233a;padding:24px}
 main{max-width:26rem;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px}
 h1{margin:0 0 8px;font-size:1.35rem}
 p{margin:0 0 20px;color:#55637a}
 button{width:100%;padding:13px;border:0;border-radius:10px;background:#2440d9;
   color:#fff;font:inherit;font-weight:600;cursor:pointer}
</style></head><body><main>
<h1>${htmlText(titel)}</h1><p>${htmlText(text)}</p>
${knopf ? `<form method="post"><button>${htmlText(knopf)}</button></form>` : ''}
</main></body></html>`);

async function absagen(req: Request, url: URL) {
  const token = url.searchParams.get('token') || '';
  const alsJson = moechteJson(req);
  // Alte Bestaetigungsmails verweisen direkt auf die Function. Auch diese
  // Links landen ab jetzt auf der sichtbaren Seite der eigenen Domain.
  if (req.method === 'GET' && !alsJson) {
    return Response.redirect(
      `${zeitfensterSeite()}/absagen?${new URLSearchParams({ token })}`,
      302,
    );
  }
  if (!token) {
    return alsJson
      ? json({ error: 'LINK_UNVOLLSTAENDIG' }, 400)
      : seite('Link unvollständig', 'Dieser Absagelink ist nicht vollständig. Bitte verwenden Sie den Link aus Ihrer Bestätigungsmail.');
  }

  const db = adminClient();
  const { data } = await db.from('zf_buchungen')
    .select('id,datum,zeit,name,status,betrieb_id')
    .eq('storno_token_hash', await sha256(token)).maybeSingle();

  if (!data) {
    return alsJson
      ? json({ error: 'TERMIN_NICHT_GEFUNDEN' }, 404)
      : seite('Termin nicht gefunden', 'Zu diesem Link gibt es keinen Termin. Möglicherweise wurde er bereits gelöscht.');
  }
  if (data.status === 'abgesagt') {
    return alsJson
      ? json({ ok: true, bereitsAbgesagt: true })
      : seite('Bereits abgesagt', 'Dieser Termin wurde bereits abgesagt. Es ist nichts weiter zu tun.');
  }

  const { data: betrieb } = await db.from('zf_betriebe')
    .select('name,zeitzone,benachrichtigung_email').eq('id', data.betrieb_id).single();
  const zeit = String(data.zeit).slice(0, 5);
  const wann = `${zeigeDatum(data.datum, betrieb!.zeitzone)} um ${zeit} Uhr`;

  // Auf GET nur fragen, nie handeln.
  //
  // Mailprogramme und Virenscanner rufen Links in Nachrichten ungefragt ab,
  // um sie zu pruefen. Wuerde GET direkt absagen, waere der Termin weg,
  // bevor der Gast die Mail ueberhaupt geoeffnet hat.
  if (req.method === 'GET') {
    if (alsJson) return json({ ok: true, wann, betrieb: betrieb!.name });
    return seite('Termin absagen?', `${wann} bei ${betrieb!.name}.`, 'Termin jetzt absagen');
  }

  const { error } = await db.from('zf_buchungen')
    .update({ status: 'abgesagt', abgesagt_at: new Date().toISOString() })
    .eq('id', data.id).neq('status', 'abgesagt');
  if (error) {
    return alsJson
      ? json({ error: 'INTERN' }, 500)
      : seite('Das hat nicht geklappt', 'Bitte melden Sie sich direkt beim Betrieb.');
  }

  const gemeldet = await sendeMail({
    an: betrieb!.benachrichtigung_email,
    betreff: `Absage: ${data.name}, ${wann}`,
    text: `${data.name} hat den Termin am ${wann} abgesagt.\n\nDer Platz ist wieder frei und kann neu gebucht werden.`,
  });
  if (!gemeldet.ok) console.error('Absage gespeichert, Betrieb nicht benachrichtigt:', gemeldet.grund);

  if (alsJson) {
    return json({ ok: true, wann, betrieb: betrieb!.name, mailVersendet: gemeldet.ok });
  }
  return seite('Termin abgesagt', `Ihr Termin am ${wann} ist abgesagt. Der Betrieb wurde benachrichtigt.`);
}

// Terminliste fuer den Betrieb.
//
// Geschuetzt durch ein langes Token in der Adresse, nicht durch ein Konto.
// Das ist schwaecher als eine Anmeldung — wer den Link weitergibt, gibt die
// Liste weiter — aber es kommt ohne Registrierung, Passwort und Zuruecksetzen
// aus. Fuer einen Betrieb, der ohnehin jede Buchung per Mail bekommt, ist die
// Liste eine Beigabe. Kommen mehrere Mitarbeitende dazu, gehoert hier eine
// richtige Anmeldung hin.
async function termine(url: URL) {
  const betrieb = await ladeBetrieb(url.searchParams.get('betrieb') || '');
  const token = url.searchParams.get('token') || '';
  if (!betrieb || !betrieb.verwaltung_token_hash) return json({ error: 'BETRIEB_UNBEKANNT' }, 404);
  if (await sha256(token) !== betrieb.verwaltung_token_hash) return json({ error: 'KEIN_ZUGRIFF' }, 403);

  const db = adminClient();
  const von = url.searchParams.get('von') || plusTage(jetztInZone(betrieb.zeitzone).slice(0, 10), -7);
  const { data } = await db.from('zf_buchungen')
    .select('id,datum,zeit,name,email,telefon,leistung,notiz,status')
    .eq('betrieb_id', betrieb.id).gte('datum', von)
    .order('datum').order('zeit');

  return json({
    name: betrieb.name,
    buchungen: (data ?? []).map((b) => ({ ...b, zeit: String(b.zeit).slice(0, 5) })),
  });
}

// Statusaenderung durch den Betrieb.
//
// Der haeufigste Fall im Alltag: Jemand sagt telefonisch ab. Ohne diesen Weg
// bliebe der Platz fuer immer belegt, obwohl er frei ist — und der Betrieb
// haette keine Moeglichkeit, das zu korrigieren, ausser anzurufen.
async function verwalten(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return json({ error: 'UNLESBAR' }, 400);

  const betrieb = await ladeBetrieb(String(body.betrieb || ''));
  if (!betrieb || !betrieb.verwaltung_token_hash) return json({ error: 'BETRIEB_UNBEKANNT' }, 404);
  if (await sha256(String(body.token || '')) !== betrieb.verwaltung_token_hash) {
    return json({ error: 'KEIN_ZUGRIFF' }, 403);
  }

  const status = String(body.status || '');
  if (!['bestaetigt', 'erledigt', 'abgesagt'].includes(status)) {
    return json({ error: 'STATUS_UNGUELTIG' }, 400);
  }

  const db = adminClient();
  // Die Einschraenkung auf betrieb_id ist der eigentliche Schutz: Mit einem
  // gueltigen Token liesse sich sonst jede fremde Buchung veraendern, wenn
  // man ihre id erraet.
  const { error } = await db.from('zf_buchungen')
    .update({
      status,
      abgesagt_at: status === 'abgesagt' ? new Date().toISOString() : null,
    })
    .eq('id', String(body.id || '')).eq('betrieb_id', betrieb.id);
  if (error) {
    // Auf 'bestaetigt' zurueckzusetzen kann an der Sperre scheitern, wenn der
    // frei gewordene Platz inzwischen neu vergeben wurde.
    if ((error as { code?: string }).code === '23505') return json({ error: 'SLOT_BELEGT' }, 409);
    return json({ error: 'INTERN' }, 500);
  }
  return json({ ok: true });
}

// Absagen und Verschieben durch den Betrieb — mit Nachricht an den Gast.
//
// Warum ueber diesen Umweg und nicht direkt in die Tabelle: Der Kundenbereich
// spricht sonst PostgREST an, und PostgREST kann keine Mail verschicken. Bis
// hierher erfuhr der Gast nichts, wenn der Betrieb seinen Termin absagte — er
// waere zur verschlossenen Tuer gefahren. Das ist der schlimmste Fehler, den
// eine Terminbuchung machen kann.
//
// Geschrieben wird mit dem Token des angemeldeten Betriebs, nicht mit dem
// Service-Schluessel. Damit entscheidet weiterhin Row Level Security, wessen
// Termine jemand anfassen darf — diese Function fuegt nur die Mail hinzu und
// bekommt keine eigene Vollmacht.
async function betriebTermin(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return json({ error: 'UNLESBAR' }, 400);
  if (!req.headers.get('Authorization')) return json({ error: 'NICHT_ANGEMELDET' }, 401);

  const id = String(body.id || '');
  const aktion = String(body.aktion || '');
  const nachricht = String(body.nachricht || '').trim().slice(0, 500);
  if (!id || !['absagen', 'verschieben'].includes(aktion)) {
    return json({ error: 'AKTION_UNGUELTIG' }, 400);
  }

  const alsBetrieb = userClient(req);
  const { data: vorher, error: leseFehler } = await alsBetrieb
    .from('zf_buchungen')
    .select('id,betrieb_id,datum,zeit,name,email,leistung,status')
    .eq('id', id).maybeSingle();
  // Kein Treffer heisst hier beides: Termin gibt es nicht, oder er gehoert
  // einem fremden Betrieb. Die Antwort ist bewusst dieselbe.
  if (leseFehler || !vorher) return json({ error: 'TERMIN_UNBEKANNT' }, 404);

  const { data: betrieb } = await adminClient()
    .from('zf_betriebe')
    .select('name,zeitzone,benachrichtigung_email')
    .eq('id', vorher.betrieb_id).single();

  const altZeit = String(vorher.zeit).slice(0, 5);
  const alt = `${zeigeDatum(vorher.datum, betrieb!.zeitzone)} um ${altZeit} Uhr`;

  let aenderung: Record<string, unknown>;
  let betreff: string;
  let text: string[];

  if (aktion === 'absagen') {
    aenderung = { status: 'abgesagt', abgesagt_at: new Date().toISOString() };
    betreff = `Ihr Termin am ${alt} wurde abgesagt`;
    text = [
      `Guten Tag ${vorher.name}`, '',
      `Ihr Termin bei ${betrieb!.name} musste leider abgesagt werden:`,
      alt, '',
      ...(nachricht ? [nachricht, ''] : []),
      'Bitte vereinbaren Sie bei Bedarf einen neuen Termin.',
      '', 'Freundliche Grüsse', betrieb!.name,
    ];
  } else {
    const datum = String(body.datum || '');
    const zeit = String(body.zeit || '').slice(0, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || !/^\d{2}:\d{2}$/.test(zeit)) {
      return json({ error: 'TERMIN_UNGUELTIG' }, 400);
    }
    aenderung = { datum, zeit, status: 'bestaetigt' };
    const neu = `${zeigeDatum(datum, betrieb!.zeitzone)} um ${zeit} Uhr`;
    betreff = `Ihr Termin wurde verschoben: ${neu}`;
    text = [
      `Guten Tag ${vorher.name}`, '',
      `Ihr Termin bei ${betrieb!.name} wurde verschoben.`, '',
      `Bisher: ${alt}`,
      `Neu:    ${neu}`,
      ...(vorher.leistung ? ['', `Leistung: ${vorher.leistung}`] : []),
      '',
      ...(nachricht ? [nachricht, ''] : []),
      'Freundliche Grüsse', betrieb!.name,
    ];
  }

  const { error } = await alsBetrieb.from('zf_buchungen').update(aenderung).eq('id', id);
  if (error) {
    if ((error as { code?: string }).code === '23505') return json({ error: 'SLOT_BELEGT' }, 409);
    console.error('Aenderung durch Betrieb fehlgeschlagen:', error);
    return json({ error: 'INTERN' }, 500);
  }

  // Erst aendern, dann melden. Scheitert Brevo, steht die Aenderung trotzdem —
  // und der Betrieb sieht am Rueckgabewert, dass er selbst anrufen muss.
  const versand = await sendeMail({
    an: vorher.email,
    betreff,
    antwortAn: betrieb!.benachrichtigung_email,
    text: text.join('\n'),
  });
  if (!versand.ok) console.error('Termin geändert, Gast nicht benachrichtigt:', versand.grund);

  return json({ ok: true, mailVersendet: versand.ok });
}


// --- Wiedervorlage ---------------------------------------------------------

// Taeglicher Auftrag: erinnert an den naechsten Termin.
//
// Geschuetzt durch ein Geheimnis im Kopf, nicht durch eine Anmeldung — der
// Aufrufer ist ein Zeitplan, kein Mensch. Ohne diesen Schutz koennte jeder
// den Versand ausloesen und damit fremde Postfaecher fluten.
async function erinnerungen(req: Request) {
  const erwartet = Deno.env.get('ZEITFENSTER_CRON_SECRET');
  if (!erwartet || req.headers.get('x-cron-secret') !== erwartet) {
    return json({ error: 'KEIN_ZUGRIFF' }, 403);
  }

  const db = adminClient();
  const { data: betriebe } = await db.from('zf_betriebe')
    .select('id,slug,name,zeitzone,benachrichtigung_email,wiedervorlage_wochen')
    .eq('aktiv', true).gt('wiedervorlage_wochen', 0);

  const basis = zeitfensterSeite();
  let verschickt = 0, uebersprungen = 0;

  for (const b of betriebe ?? []) {
    // Der Stichtag: genau so viele Wochen zurueck wie eingestellt.
    const heute = jetztInZone(b.zeitzone).slice(0, 10);
    const stichtag = plusTage(heute, -b.wiedervorlage_wochen * 7);

    const { data: faellig } = await db.from('zf_buchungen')
      .select('id,name,email,leistung')
      .eq('betrieb_id', b.id).eq('datum', stichtag)
      .neq('status', 'abgesagt').is('erinnert_at', null);

    for (const t of faellig ?? []) {
      // Wer seither wieder gebucht hat, braucht keine Erinnerung. Diese
      // Pruefung ist der Unterschied zwischen einem hilfreichen Hinweis und
      // einer laestigen Mail an einen Stammkunden.
      const { count: spaeter } = await db.from('zf_buchungen')
        .select('id', { count: 'exact', head: true })
        .eq('betrieb_id', b.id).eq('email', t.email)
        .neq('status', 'abgesagt').gt('datum', stichtag);

      const { data: abgemeldet } = await db.from('zf_erinnerung_aus')
        .select('email').eq('betrieb_id', b.id).eq('email', t.email).maybeSingle();

      if ((spaeter || 0) > 0 || abgemeldet) {
        // Trotzdem abhaken, sonst prueft der Auftrag denselben Termin morgen
        // erneut — der Stichtag wandert ja mit.
        await db.from('zf_buchungen')
          .update({ erinnert_at: new Date().toISOString() }).eq('id', t.id);
        uebersprungen++;
        continue;
      }

      const token = randomToken();
      await db.from('zf_buchungen')
        .update({ abmelde_token_hash: await sha256(token) }).eq('id', t.id);

      const versand = await sendeMail({
        an: t.email,
        betreff: `Zeit für den nächsten Termin bei ${b.name}?`,
        antwortAn: b.benachrichtigung_email,
        abmeldeLink: `${basis}/erinnerung-aus?token=${token}`,
        text: [
          `Guten Tag ${t.name}`, '',
          `Ihr letzter Termin bei ${b.name} liegt ${b.wiedervorlage_wochen} Wochen zurück.`,
          'Möchten Sie den nächsten gleich abmachen?',
          '',
          `${basis}/?betrieb=${b.slug}`,
          '',
          'Freundliche Grüsse',
          b.name,
          '',
          '---',
          'Keine Erinnerungen mehr erhalten:',
          `${basis}/erinnerung-aus?token=${token}`,
        ].join('\n'),
      });

      await db.from('zf_buchungen')
        .update({ erinnert_at: new Date().toISOString() }).eq('id', t.id);
      if (versand.ok) verschickt++;
      else console.error('Erinnerung nicht verschickt:', versand.grund);
    }
  }

  return json({ ok: true, verschickt, uebersprungen });
}

// Abmeldung von Erinnerungen.
//
// Wie beim Absagelink: GET fragt nur, POST handelt. Mailprogramme rufen Links
// ungefragt ab — eine Abmeldung, die niemand wollte, waere hier besonders
// aergerlich, weil sie sich von aussen nicht rueckgaengig machen laesst.
async function erinnerungAus(req: Request, url: URL) {
  const token = url.searchParams.get('token') || '';
  const alsJson = moechteJson(req);
  if (req.method === 'GET' && !alsJson) {
    return Response.redirect(
      `${zeitfensterSeite()}/erinnerung-aus?${new URLSearchParams({ token })}`,
      302,
    );
  }
  if (!token) {
    return alsJson
      ? json({ error: 'LINK_UNVOLLSTAENDIG' }, 400)
      : seite('Link unvollständig', 'Bitte verwenden Sie den Link aus Ihrer E-Mail.');
  }

  const db = adminClient();
  const { data } = await db.from('zf_buchungen')
    .select('betrieb_id,email').eq('abmelde_token_hash', await sha256(token)).maybeSingle();
  if (!data) {
    return alsJson
      ? json({ error: 'ERINNERUNG_NICHT_GEFUNDEN' }, 404)
      : seite('Nicht gefunden', 'Zu diesem Link gibt es keinen Eintrag.');
  }

  const { data: betrieb } = await db.from('zf_betriebe')
    .select('name').eq('id', data.betrieb_id).single();

  if (req.method === 'GET') {
    if (alsJson) return json({ ok: true, betrieb: betrieb!.name });
    return seite(
      'Keine Erinnerungen mehr?',
      `Sie erhalten dann keine Terminerinnerungen mehr von ${betrieb!.name}. Bereits gebuchte Termine bleiben bestehen.`,
      'Erinnerungen abbestellen',
    );
  }

  await db.from('zf_erinnerung_aus')
    .upsert({ betrieb_id: data.betrieb_id, email: data.email }, { onConflict: 'betrieb_id,email' });

  if (alsJson) return json({ ok: true, betrieb: betrieb!.name });

  return seite(
    'Abgemeldet',
    `Sie erhalten keine Terminerinnerungen mehr von ${betrieb!.name}. Buchen können Sie weiterhin jederzeit.`,
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const url = new URL(req.url);
  const weg = url.pathname.split('/').filter(Boolean).pop();
  try {
    if (weg === 'konfiguration' && req.method === 'GET') return await konfiguration(url);
    if (weg === 'buchen' && req.method === 'POST') return await buchen(req);
    if (weg === 'absagen' && (req.method === 'GET' || req.method === 'POST')) return await absagen(req, url);
    if (weg === 'termine' && req.method === 'GET') return await termine(url);
    if (weg === 'verwalten' && req.method === 'POST') return await verwalten(req);
    if (weg === 'betrieb-termin' && req.method === 'POST') return await betriebTermin(req);
    if (weg === 'erinnerungen' && req.method === 'POST') return await erinnerungen(req);
    if (weg === 'erinnerung-aus' && (req.method === 'GET' || req.method === 'POST')) return await erinnerungAus(req, url);
    return json({ error: 'UNBEKANNTER_WEG' }, 404);
  } catch (e) {
    console.error('zeitfenster:', e);
    return json({ error: 'INTERN' }, 500);
  }
});
