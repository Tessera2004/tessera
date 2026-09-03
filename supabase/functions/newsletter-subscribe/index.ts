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
    const versand = await sendeMail({
      an: email,
      betreff: 'Bitte bestaetigen Sie Ihre Anmeldung',
      text: [
        'Guten Tag',
        '',
        'Sie haben sich fuer den MosaOS-Newsletter angemeldet. Bitte bestaetigen',
        'Sie die Anmeldung ueber diesen Link:',
        '',
        link,
        '',
        'Der Link ist sieben Tage gueltig.',
        '',
        'Waren Sie das nicht, muessen Sie nichts tun. Ohne Bestaetigung',
        'erhalten Sie keine Mail von uns, und die Adresse wird geloescht.',
        '',
        'Freundliche Gruesse',
        'Brian Knuchel, MosaOS',
        'https://mosaos.ch',
      ].join('\n'),
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
