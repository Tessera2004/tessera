import { json, options, sha256, randomToken, withCors } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { sendeMail } from '../_shared/mail.ts';

const SEITE = Deno.env.get('SITE_URL') || 'https://mosaos.ch';

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const body = await req.json();
    // Honigtopf: ein fuer Menschen unsichtbares Feld. Ist es ausgefuellt, war
    // es ein Bot — wir antworten freundlich und tun nichts.
    if (String(body.website || '')) return json({ ok: true });

    const email = String(body.email || '').trim().toLowerCase().slice(0, 320);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || body.consent !== true) {
      return json({ error: 'INVALID_INPUT' }, 400);
    }

    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    const ipHash = await sha256(`${Deno.env.get('CONTACT_HASH_SALT') || ''}:${ip}`);
    const db = adminClient();

    const seit = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db.from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('source_ip_hash', ipHash).gte('created_at', seit);
    if ((count || 0) >= 5) return json({ error: 'RATE_LIMITED' }, 429);

    const { data: vorhanden } = await db.from('newsletter_subscribers')
      .select('id, confirmed_at').eq('email', email).maybeSingle();

    // Ist die Adresse bereits bestaetigt, wird KEINE neue Mail geschickt.
    // Sonst liesse sich das Formular missbrauchen, um jemanden zuzumuellen.
    // Nach aussen dieselbe Antwort wie bei einer neuen Anmeldung: Wer hier
    // fremde Adressen durchprobiert, soll nicht erfahren, wer eingetragen ist.
    if (vorhanden?.confirmed_at) return json({ ok: true }, 201);

    const token = randomToken();
    const tokenHash = await sha256(token);
    const laeuftAb = new Date(Date.now() + 7 * 86400_000).toISOString();

    const { error } = await db.from('newsletter_subscribers').upsert({
      email,
      token_hash: tokenHash,
      token_expires_at: laeuftAb,
      unsubscribed_at: null,
      source: String(body.source || '').trim().slice(0, 100) || null,
      source_ip_hash: ipHash,
    }, { onConflict: 'email' });
    if (error) throw error;

    const link = `${SEITE}/newsletter-bestaetigt.html?token=${token}&email=${encodeURIComponent(email)}`;
    // Text- UND HTML-Fassung. Manche Programme zeigen nur die eine, manche nur
    // die andere — wer beide mitschickt, sieht nirgends kaputt aus.
    const textFassung = [
      'Guten Tag',
      '',
      'Sie haben sich für den MosaOS-Newsletter angemeldet.',
      'Bitte bestätigen Sie die Anmeldung über diesen Link:',
      '',
      link,
      '',
      'Der Link ist sieben Tage gültig.',
      '',
      'Waren Sie das nicht, müssen Sie nichts tun. Ohne Bestätigung erhalten',
      'Sie keine Mail von uns, und die Adresse wird gelöscht.',
      '',
      'Freundliche Grüsse',
      'Brian Knuchel, MosaOS',
      'https://mosaos.ch',
    ].join('\n');

    // Bewusst schlicht und mit Inline-Stilen: E-Mail-Programme werfen
    // <style>-Bloecke weg und koennen kein modernes CSS. Eine Tabelle als
    // Rahmen ist hier kein Rueckschritt, sondern das, was ueberall ankommt.
    const htmlFassung = `<!doctype html>
<html lang="de"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;">
<tr><td style="padding:32px 32px 8px;">
  <div style="font-size:18px;font-weight:700;letter-spacing:-0.01em;">MosaOS</div>
</td></tr>
<tr><td style="padding:8px 32px 0;">
  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Guten Tag</p>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Sie haben sich für den MosaOS-Newsletter angemeldet. Bitte bestätigen Sie die Anmeldung:</p>
  <p style="margin:0 0 24px;">
    <a href="${link}" style="display:inline-block;background:#E11D2A;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Anmeldung bestätigen</a>
  </p>
  <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#71717a;">Der Link ist sieben Tage gültig. Falls der Knopf nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:<br>
    <span style="word-break:break-all;color:#52525b;">${link}</span></p>
  <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#71717a;">Waren Sie das nicht, müssen Sie nichts tun. Ohne Bestätigung erhalten Sie keine Mail von uns, und die Adresse wird gelöscht.</p>
</td></tr>
<tr><td style="padding:0 32px 32px;border-top:1px solid #e4e4e7;">
  <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#71717a;">Brian Knuchel · MosaOS · Hägendorf, Schweiz<br>
    <a href="https://mosaos.ch" style="color:#71717a;">mosaos.ch</a></p>
</td></tr>
</table>
</body></html>`;

    const versand = await sendeMail({
      an: email,
      betreff: 'Bitte bestätigen Sie Ihre Anmeldung',
      text: textFassung,
      html: htmlFassung,
    });

    // Der Versand kann scheitern, die Anmeldung ist trotzdem gespeichert.
    // Der Grund steht im Funktionsprotokoll, nicht in der Antwort an den
    // Browser — sonst verraet die Seite Details ueber die Konfiguration.
    if (!versand.ok) console.error('Bestaetigungsmail nicht verschickt:', versand.grund);

    return json({ ok: true }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'INTERNAL' }, 500);
  }
}));
