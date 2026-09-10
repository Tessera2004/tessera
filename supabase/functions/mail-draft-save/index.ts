import { json, options, withCors } from '../_shared/http.ts';
import { adminClient, authenticatedTenant } from '../_shared/supabase.ts';
import { encryptMailValue, mailEncryptionKeyVersion } from '../_shared/mail-crypto.ts';
import { tenantHasMailModule } from '../_shared/mail-entitlement.ts';
import { hasMailPermission } from '../_shared/mail-user.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const auth = await authenticatedTenant(req);
    if (!await hasMailPermission(req, 'mail.review')) return json({ error: 'FORBIDDEN' }, 403);
    if (!await tenantHasMailModule(auth.tenantId)) return json({ error: 'MAIL_MODULE_REQUIRED' }, 402);
    const input = await req.json().catch(() => ({}));
    const messageId = String(input.messageId || '');
    const requestedDraftId = String(input.draftId || '');
    const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
    const body = typeof input.body === 'string' ? input.body.trim() : '';
    if (!UUID.test(messageId) || (requestedDraftId && !UUID.test(requestedDraftId)) || !subject || subject.length > 1000 || !body || body.length > 8000) {
      return json({ error: 'INVALID_INPUT' }, 400);
    }
    const db = adminClient();
    const { data: existing, error: existingError } = await db.from('mail_drafts').select('id')
      .eq('message_id', messageId).eq('tenant_id', auth.tenantId).maybeSingle();
    if (existingError) throw existingError;
    const draftId = String(existing?.id || requestedDraftId || crypto.randomUUID());
    if (requestedDraftId && existing?.id && requestedDraftId !== existing.id) return json({ error: 'DRAFT_MISMATCH' }, 409);
    const encryptedSubject = await encryptMailValue(subject, `draft:${auth.tenantId}:${draftId}:subject`);
    const encryptedBody = await encryptMailValue(body, `draft:${auth.tenantId}:${draftId}:body`);
    const { data: savedDraftId, error: saveError } = await db.rpc('save_mail_draft_review', {
      p_tenant_id: auth.tenantId, p_message_id: messageId, p_draft_id: draftId,
      p_actor_id: auth.user.id, p_encrypted_subject: encryptedSubject,
      p_encrypted_body: encryptedBody, p_key_version: mailEncryptionKeyVersion(),
    });
    if (saveError) throw saveError;
    if (!savedDraftId) return json({ error: 'DRAFT_NOT_EDITABLE' }, 409);
    await db.from('audit_log').insert({ tenant_id: auth.tenantId, actor_id: auth.user.id,
      action: 'review', table_name: 'mail_drafts', record_id: draftId, metadata: { messageId } });
    return json({ ok: true, draftId });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL';
    if (code === 'UNAUTHORIZED') return json({ error: code }, 401);
    if (code === 'NO_TENANT' || code === 'MAIL_PERMISSION_CHECK_FAILED') return json({ error: 'FORBIDDEN' }, 403);
    return json({ error: 'DRAFT_SAVE_FAILED' }, 500);
  }
}));
