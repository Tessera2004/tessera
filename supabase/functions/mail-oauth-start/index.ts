import { json, options, randomToken, sha256, withCors } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';
import { encryptMailValue, mailEncryptionKeyVersion } from '../_shared/mail-crypto.ts';
import { tenantHasMailModule } from '../_shared/mail-entitlement.ts';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function safeReturnPath(value: unknown) {
  const path = typeof value === 'string' ? value : '/app/app.html';
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
    ? path.slice(0, 500)
    : '/app/app.html';
}

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const auth = await authenticatedTenant(req);
    if (auth.role !== 'admin') return json({ error: 'FORBIDDEN' }, 403);
    if (!await tenantHasMailModule(auth.tenantId)) return json({ error: 'MAIL_MODULE_REQUIRED' }, 402);
    const clientId = Deno.env.get('GMAIL_OAUTH_CLIENT_ID') || '';
    const redirectUri = Deno.env.get('MAIL_OAUTH_REDIRECT_URI') || '';
    if (!clientId || !redirectUri.startsWith('https://')) {
      return json({ error: 'MAIL_OAUTH_NOT_CONFIGURED' }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const returnPath = safeReturnPath(body.returnPath);
    const state = randomToken(32);
    const stateHash = await sha256(state);
    const verifier = randomToken(64);
    const challengeBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const challenge = base64Url(challengeBytes);
    const encryptedVerifier = await encryptMailValue(
      verifier,
      `oauth-state:${auth.tenantId}:${stateHash}:gmail`,
    );

    const db = adminClient();
    await db.from('mail_oauth_states').delete()
      .eq('tenant_id', auth.tenantId).eq('user_id', auth.user.id).eq('provider', 'gmail');
    const { error } = await db.from('mail_oauth_states').insert({
      tenant_id: auth.tenantId,
      user_id: auth.user.id,
      provider: 'gmail',
      state_hash: stateHash,
      encrypted_pkce_verifier: encryptedVerifier,
      token_key_version: mailEncryptionKeyVersion(),
      return_path: returnPath,
    });
    if (error) throw error;

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GMAIL_SCOPES.join(' '),
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();
    return json({ url: url.toString() });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL';
    if (code === 'UNAUTHORIZED') return json({ error: code }, 401);
    if (code === 'NO_TENANT') return json({ error: code }, 403);
    return json({ error: 'INTERNAL' }, 500);
  }
}));
