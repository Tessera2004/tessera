import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(req: Request) {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function authenticatedTenant(req: Request) {
  const client = userClient(req);
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error('UNAUTHORIZED');
  const { data, error } = await client.from('tenant_users').select('tenant_id,role').eq('user_id', userData.user.id).single();
  if (error || !data) throw new Error('NO_TENANT');
  return { user: userData.user, tenantId: data.tenant_id as string, role: data.role as string };
}

