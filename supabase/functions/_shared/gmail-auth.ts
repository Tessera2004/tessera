export async function refreshGmailAccessToken(refreshToken: string) {
  const clientId = Deno.env.get('GMAIL_OAUTH_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('GMAIL_OAUTH_CLIENT_SECRET') || '';
  if (!clientId || !clientSecret) throw new Error('MAIL_OAUTH_NOT_CONFIGURED');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const token = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !token.access_token) {
    if (token.error === 'invalid_grant') throw new Error('GMAIL_REAUTH_REQUIRED');
    throw new Error('GMAIL_TOKEN_REFRESH_FAILED');
  }
  return String(token.access_token);
}
