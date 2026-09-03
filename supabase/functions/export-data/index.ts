import { corsHeaders, json, options, withCors } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  try {
    const auth = await authenticatedTenant(req);
    if (auth.role !== 'admin') return json({ error: 'FORBIDDEN' }, 403);
    const db = adminClient();
    const tables = ['office_users','employees','teams','customers','plan_jobs','tasks','reports','vehicles','work_orders','tire_storage','bait_stations','pest_protocols','construction_sites','work_reports','company_settings','timelog','subscriptions','audit_log'];
    const exportData: Record<string, unknown> = {
      format: 'MosaOS tenant export', version: 1, tenantId: auth.tenantId, exportedAt: new Date().toISOString(), data: {},
    };
    for (const table of tables) {
      const { data, error } = await db.from(table).select('*').eq('tenant_id', auth.tenantId);
      if (error) throw error;
      (exportData.data as Record<string, unknown>)[table] = data || [];
    }
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="mosaos-export-${new Date().toISOString().slice(0,10)}.json"`, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'INTERNAL' }, 500);
  }
}));

