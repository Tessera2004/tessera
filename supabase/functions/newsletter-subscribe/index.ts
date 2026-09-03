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

    const basis = `${SEITE}/newsletter-bestaetigt.html?token=${token}&email=${encodeURIComponent(email)}`;
    const link = basis;
    // Dasselbe Token dient zum Abmelden. Beim Bestaetigen wird nur die Frist
    // aufgehoben, nicht das Token — so bleibt der Abmeldelink dauerhaft
    // gueltig. Ein abgelaufener Abmeldelink haelt jemanden in einer Liste
    // fest, aus der er heraus will.
    const abmeldeLink = `${basis}&action=unsubscribe`;
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
      'Möchten Sie sich wieder abmelden, genügt dieser Link:',
      abmeldeLink,
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
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="padding-right:12px;vertical-align:middle;">
      <!-- PNG statt SVG: Gmail und Outlook zeigen SVG nicht an. Doppelte
           Aufloesung (96px) fuer scharfe Darstellung auf Retina. -->
      <img src="${SEITE}/logo/mosaos-mark-email.png" width="40" height="40" alt=""
           style="display:block;border:0;width:40px;height:40px;" />
    </td>
    <td style="vertical-align:middle;">
      <div style="font-size:19px;font-weight:700;letter-spacing:-0.01em;">MosaOS</div>
    </td>
  </tr></table>
</td></tr>
<tr><td style="padding:16px 32px 0;">
  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Guten Tag</p>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Sie haben sich für den MosaOS-Newsletter angemeldet. Bitte bestätigen Sie die Anmeldung:</p>
  <p style="margin:0 0 24px;">
    <a href="${link}" style="display:inline-block;background:#E11D2A;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Anmeldung bestätigen</a>
  </p>
  <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#71717a;">Der Link ist sieben Tage gültig. Falls der Knopf nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:<br>
    <span style="word-break:break-all;color:#52525b;">${link}</span></p>
  <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#71717a;">Waren Sie das nicht, müssen Sie nichts tun. Ohne Bestätigung erhalten Sie keine Mail von uns, und die Adresse wird gelöscht.</p>
</td></tr>
<tr><td style="padding:24px 32px 32px;">
  <!-- Signatur mit vollstaendiger Anschrift: Eine Werbemail ohne
       Absenderangaben wirkt wie Spam — und muss sie in der Schweiz
       nach UWG ohnehin enthalten. -->
  <div style="border-top:1px solid #e4e4e7;padding-top:20px;font-size:13px;line-height:1.7;color:#52525b;">
    <div style="font-weight:600;color:#18181b;">Brian Knuchel</div>
    <div style="color:#71717a;">MosaOS — Software für Dienstleistungsbetriebe</div>
    <div style="margin-top:10px;color:#71717a;">
      Sandgrube 21 · 4614 Hägendorf · Schweiz
    </div>
    <div style="margin-top:4px;">
      <a href="tel:+41765265975" style="color:#52525b;text-decoration:none;">+41 76 526 59 75</a>
      &nbsp;·&nbsp;
      <a href="mailto:info@mosaos.ch" style="color:#52525b;text-decoration:none;">info@mosaos.ch</a>
    </div>
    <div style="margin-top:4px;">
      <a href="${SEITE}" style="color:#E11D2A;text-decoration:none;font-weight:600;">mosaos.ch</a>
    </div>
    <div style="margin-top:16px;font-size:12px;color:#a1a1aa;">
      <a href="${abmeldeLink}" style="color:#a1a1aa;">Vom Newsletter abmelden</a>
    </div>
  </div>
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
