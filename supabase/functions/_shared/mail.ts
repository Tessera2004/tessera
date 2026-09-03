// Mailversand ueber Brevo (Server in Frankreich, passt zur EU-Zusage auf der
// Website). Absender und Schluessel kommen aus den Secrets, damit ein Wechsel
// des Anbieters nur diese Datei betrifft.
//
// Bewusst kein Fehler nach aussen, wenn BREVO_API_KEY fehlt: Solange kein
// Schluessel gesetzt ist, sollen Formulare trotzdem funktionieren und Daten
// speichern. Ein fehlender Mailversand darf keine Anmeldung verschlucken.
const API = 'https://api.brevo.com/v3/smtp/email';

export const MAIL_BEREIT = Boolean(Deno.env.get('BREVO_API_KEY'));

export async function sendeMail(opts: {
  an: string;
  betreff: string;
  text: string;
  html?: string;
  antwortAn?: string;
  // Adresse zum Abmelden. Setzt die List-Unsubscribe-Kopfzeile, damit
  // Gmail und Apple Mail ihren eigenen "Abmelden"-Knopf neben dem Absender
  // anzeigen. Wer den findet, klickt nicht auf "Spam" — und genau das
  // schuetzt die Zustellbarkeit aller kuenftigen Mails.
  abmeldeLink?: string;
}): Promise<{ ok: boolean; grund?: string }> {
  const key = Deno.env.get('BREVO_API_KEY');
  if (!key) return { ok: false, grund: 'BREVO_API_KEY fehlt' };

  const absender = Deno.env.get('MAIL_FROM') || 'info@mosaos.ch';
  const absenderName = Deno.env.get('MAIL_FROM_NAME') || 'MosaOS';

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { email: absender, name: absenderName },
        to: [{ email: opts.an }],
        subject: opts.betreff,
        textContent: opts.text,
        ...(opts.html ? { htmlContent: opts.html } : {}),
        ...(opts.antwortAn ? { replyTo: { email: opts.antwortAn } } : {}),
        ...(opts.abmeldeLink ? {
          // Nur die Adresse, bewusst ohne List-Unsubscribe-Post: Der
          // One-Click-Zusatz verspricht dem Mailprogramm einen Endpunkt, der
          // ein POST beantwortet. Unsere Bestaetigungsseite ist eine normale
          // HTML-Seite — Gmails Abmeldeknopf liefe damit ins Leere, was
          // schlimmer waere als gar kein Knopf.
          headers: { 'List-Unsubscribe': `<${opts.abmeldeLink}>` },
        } : {}),
      }),
    });
    if (!res.ok) return { ok: false, grund: `Brevo ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, grund: e instanceof Error ? e.message : 'unbekannt' };
  }
}
