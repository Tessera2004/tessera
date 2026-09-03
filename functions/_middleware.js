// MosaOS — leitet die alte mosaos.pages.dev-Adresse auf mosaos.ch weiter.
// Cloudflare Pages liefert unter beiden Domains dieselbe Bereitstellung aus
// (die eigene *.pages.dev-Adresse lässt sich nicht abschalten), darum läuft
// diese Weiterleitung als Pages Function statt als DNS-Eintrag.
//
// Nur die feste Produktionsadresse "mosaos.pages.dev" wird umgeleitet —
// nicht die zufälligen Vorschau-Adressen (<hash>.mosaos.pages.dev), die
// beim Testen einzelner Deployments gebraucht werden.
const ALTE_DOMAIN = 'mosaos.pages.dev';
const NEUE_DOMAIN = 'mosaos.ch';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === ALTE_DOMAIN) {
    url.hostname = NEUE_DOMAIN;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
