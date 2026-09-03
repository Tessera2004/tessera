import { json, options, sha256, withCors } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { brevoKontaktAnlegen, brevoKontaktAbmelden } from '../_shared/mail.ts';

// Bestaetigt eine Anmeldung (Klick im Link) oder meldet ab.
// Erst hier entsteht der Nachweis der Einwilligung — vorher darf an die
// Adresse nichts verschickt werden.
Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase().slice(0, 320);
    const token = String(body.token || '').trim();
    const abmelden = body.action === 'unsubscribe';
    if (!email || !token) return json({ error: 'INVALID_INPUT' }, 400);

    const db = adminClient();
    const { data: eintrag } = await db.from('newsletter_subscribers')
      .select('id, token_hash, token_expires_at, confirmed_at')
      .eq('email', email).maybeSingle();

    // Gleiche Antwort fuer "gibt es nicht" und "falsches Token": sonst liesse
    // sich ueber die Fehlermeldung herausfinden, wer angemeldet ist.
    if (!eintrag || !eintrag.token_hash) return json({ error: 'INVALID_TOKEN' }, 400);
    if (eintrag.token_hash !== await sha256(token)) return json({ error: 'INVALID_TOKEN' }, 400);

    if (abmelden) {
      // Der Abmeldelink muss ohne Ablauf funktionieren. Ein abgelaufener
      // Abmeldelink wuerde jemanden in einer Liste festhalten, aus der er
      // heraus will — rechtlich wie menschlich falsch.
      await db.from('newsletter_subscribers')
        .update({ unsubscribed_at: new Date().toISOString() }).eq('id', eintrag.id);
      // Auch in Brevo austragen, sonst wuerde die naechste Kampagne trotzdem
      // an diese Adresse gehen.
      const ab = await brevoKontaktAbmelden(email);
      if (!ab.ok) console.error('In Supabase abgemeldet, in Brevo nicht:', ab.grund);
      return json({ ok: true, status: 'unsubscribed' });
    }

    if (eintrag.confirmed_at) return json({ ok: true, status: 'already' });
    if (eintrag.token_expires_at && new Date(eintrag.token_expires_at) < new Date()) {
      return json({ error: 'TOKEN_EXPIRED' }, 400);
    }

    const { error } = await db.from('newsletter_subscribers').update({
      confirmed_at: new Date().toISOString(),
      // Das Bestaetigungs-Token wird verbraucht. Zum Abmelden bekommt der
      // Empfaenger in jeder Mail ein eigenes, unbefristetes Token.
      token_expires_at: null,
    }).eq('id', eintrag.id);
    if (error) throw error;

    // Jetzt liegt eine nachweisbare Einwilligung vor — erst ab hier gehoert
    // die Adresse in den Verteiler. Scheitert das, bleibt die Bestaetigung
    // trotzdem gueltig; der Grund steht im Funktionsprotokoll.
    const anlegen = await brevoKontaktAnlegen(email);
    if (!anlegen.ok) console.error('Bestaetigt, aber nicht in Brevo eingetragen:', anlegen.grund);

    return json({ ok: true, status: 'confirmed' });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'INTERNAL' }, 500);
  }
}));
