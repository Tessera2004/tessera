import { adminClient } from './supabase.ts';

export async function tenantHasMailModule(tenantId: string) {
  const { data, error } = await adminClient().from('subscriptions')
    .select('status,modules,trial_ends_at').eq('tenant_id', tenantId).maybeSingle();
  if (error || !data) return false;
  const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at).getTime() : 0;
  if (!['active','trialing'].includes(String(data.status || '')) && trialEndsAt > Date.now()) {
    return true;
  }
  if (!['active','trialing'].includes(String(data.status || ''))) return false;
  const modules = Array.isArray(data.modules) ? data.modules.map(String) : [];
  return modules.includes('email') || modules.includes('komplett');
}
