import { json, options, withCors } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';
import { decryptMailValue, mailEncryptionKeyVersion } from '../_shared/mail-crypto.ts';
import { tenantHasMailModule } from '../_shared/mail-entitlement.ts';
import { hasMailPermission } from '../_shared/mail-user.ts';

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'GET') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const auth = await authenticatedTenant(req);
    if (!await hasMailPermission(req, 'mail.read')) return json({ error: 'FORBIDDEN' }, 403);
    if (!await tenantHasMailModule(auth.tenantId)) return json({ error: 'MAIL_MODULE_REQUIRED' }, 402);
    const requested = Number(new URL(req.url).searchParams.get('limit') || 50);
    const limit = Math.max(1, Math.min(50, Number.isFinite(requested) ? requested : 50));
    const { data: rows, error } = await adminClient().from('mail_messages')
      .select('id,mail_account_id,received_at,category,priority,needs_human,status,encrypted_payload,payload_key_version,mail_drafts(id,encrypted_subject,encrypted_body,payload_key_version,confidence,missing_information,knowledge_refs,reviewed_at,sent_at)')
      .eq('tenant_id', auth.tenantId).order('received_at', { ascending: false }).limit(limit);
    if (error) throw error;

    const messages = [];
    for (const row of rows || []) {
      if (Number(row.payload_key_version) !== mailEncryptionKeyVersion()) continue;
      const payload = JSON.parse(await decryptMailValue(
        String(row.encrypted_payload), `message:${auth.tenantId}:${row.id}:gmail`,
      ));
      const rawDraft = Array.isArray(row.mail_drafts) ? row.mail_drafts[0] : row.mail_drafts;
      let draft = null;
      if (rawDraft && Number(rawDraft.payload_key_version) === mailEncryptionKeyVersion()) {
        draft = {
          id: rawDraft.id,
          subject: await decryptMailValue(String(rawDraft.encrypted_subject), `draft:${auth.tenantId}:${rawDraft.id}:subject`),
          body: await decryptMailValue(String(rawDraft.encrypted_body), `draft:${auth.tenantId}:${rawDraft.id}:body`),
          confidence: rawDraft.confidence,
          missingInformation: rawDraft.missing_information || [],
          knowledgeRefs: rawDraft.knowledge_refs || [],
          reviewedAt: rawDraft.reviewed_at,
          sentAt: rawDraft.sent_at,
        };
      }
      messages.push({
        id: row.id, accountId: row.mail_account_id, date: row.received_at,
        from: String(payload.from || ''), fromName: String(payload.fromName || ''),
        to: String(payload.to || ''), subject: String(payload.subject || '(Kein Betreff)'),
        snippet: String(payload.snippet || ''), body: String(payload.body || ''),
        isRead: payload.isRead !== false, labels: ['inbox'],
        category: row.category, priority: row.priority, needsHuman: row.needs_human,
        status: row.status, draft,
      });
    }
    return json({ messages });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL';
    if (code === 'UNAUTHORIZED') return json({ error: code }, 401);
    if (code === 'NO_TENANT') return json({ error: code }, 403);
    if (code === 'MAIL_PERMISSION_CHECK_FAILED') return json({ error: 'FORBIDDEN' }, 403);
    return json({ error: 'MAIL_INBOX_UNAVAILABLE' }, 500);
  }
}));
