// Erlaubte Herkunft(e). APP_ORIGIN darf mehrere Domains enthalten, mit Komma getrennt,
// z. B. "https://mosaos.ch,https://www.mosaos.ch,https://mosaos.pages.dev".
// withCors() unten setzt pro Anfrage die passende davon ein.
export const ALLOWED_ORIGINS = (Deno.env.get('APP_ORIGIN') || 'https://mosaos.ch')
  .split(',').map((o) => o.trim()).filter(Boolean);

export function pickOrigin(req: Request) {
  const o = req.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0];
}

// Setzt auf jeder Antwort die zur Anfrage passende Allow-Origin. So funktionieren
// mehrere Domains, ohne dass jede Function ihre Antworten selbst anfassen muss.
export function withCors(handler: (req: Request) => Response | Promise<Response>) {
  return async (req: Request) => {
    const res = await handler(req);
    const headers = new Headers(res.headers);
    headers.set('Access-Control-Allow-Origin', pickOrigin(req));
    headers.set('Vary', 'Origin');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  };
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

export function json(body: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extra, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function options(req: Request) {
  return req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: corsHeaders }) : null;
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 32) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...raw)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

