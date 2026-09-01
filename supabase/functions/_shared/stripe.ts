const stripeBase = 'https://api.stripe.com/v1';

export async function stripeRequest(path: string, params?: URLSearchParams, method = 'POST') {
  const response = await fetch(stripeBase + path, {
    method,
    headers: {
      Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: params?.toString(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'STRIPE_ERROR');
  return data;
}

export function safeReturnUrl(value: unknown) {
  const configured = Deno.env.get('APP_ORIGIN');
  if (!configured) throw new Error('APP_ORIGIN_NOT_CONFIGURED');
  const url = new URL(String(value || configured));
  if (url.origin !== new URL(configured).origin) throw new Error('INVALID_RETURN_URL');
  return url.toString();
}

