import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const migration = read('supabase/migrations/202609010001_security_foundation.sql');
const checkin = read('app/checkin.html');
const app = ['app/app.html', ...fs.readdirSync(path.join(root, 'app'))
  .filter(f => /^app-.*\.js$/.test(f)).map(f => 'app/' + f)]
  .map(read).join('\n');
const invoiceDelivery = read('supabase/functions/send-job-invoice/index.ts');
const jobLifecycle = read('supabase/migrations/202609070000_job_lifecycle.sql');
const mailFoundation = read('supabase/migrations/202609100006_mail_assistent_foundation.sql');
const mailCrypto = read('supabase/functions/_shared/mail-crypto.ts');
const mailEntitlement = read('supabase/functions/_shared/mail-entitlement.ts');
const mailOauthStart = read('supabase/functions/mail-oauth-start/index.ts');
const mailOauthCallback = read('supabase/functions/mail-oauth-callback/index.ts');
const mailStatus = read('supabase/functions/mail-account-status/index.ts');
const mailDisconnect = read('supabase/functions/mail-disconnect/index.ts');
const mailSync = read('supabase/functions/mail-sync/index.ts');
const mailRetention = read('supabase/functions/mail-retention/index.ts');
const mailAnalysisMigration = read('supabase/migrations/202609100007_mail_analysis.sql');
const mailAnalyse = read('supabase/functions/mail-analyse/index.ts');
const mailDeliveryMigration = read('supabase/migrations/202609100008_mail_review_delivery.sql');
const mailInbox = read('supabase/functions/mail-inbox/index.ts');
const mailDraftSave = read('supabase/functions/mail-draft-save/index.ts');
const mailSend = read('supabase/functions/mail-send/index.ts');
const headers = read('_headers');
const allText = [...fs.readdirSync(root), ...fs.readdirSync(path.join(root, 'app')).map(f => 'app/' + f)]
  .filter(f => fs.statSync(path.join(root, f)).isFile())
  .map(read).join('\n');

assert(!/FOR\s+(INSERT|UPDATE)\s+TO\s+anon/i.test(migration), 'Anonymous database writes must remain disabled');
assert(!/from\(['"]timelog['"]\)\.(insert|update)/.test(checkin), 'Check-in page must not write directly to timelog');
assert(checkin.includes("'/functions/v1/checkin'"), 'Check-in must use the hardened Edge Function');
assert(app.includes("'/functions/v1/create-checkin-token'"), 'QR creation must request a server token');
assert(app.includes("'/functions/v1/create-invite'"), 'Invites must use a server token');
assert(invoiceDelivery.includes('authenticatedTenant(req)'), 'Invoice delivery must require an authenticated tenant');
assert(invoiceDelivery.includes(".rpc('claim_job_invoice_delivery'"), 'Invoice delivery must atomically claim a job');
assert(!/body\.(recipient|to|email)/.test(invoiceDelivery), 'Invoice recipient must not be accepted from the browser');
assert(jobLifecycle.includes("j.invoice_status = 'pending'"), 'Invoice claim must only accept pending jobs');
for (const table of ['mail_accounts','mail_oauth_states','mail_messages','mail_drafts']) {
  assert(mailFoundation.includes(`revoke all on public.${table} from anon, authenticated`), `${table} must not be exposed directly to browsers`);
}
assert(mailFoundation.includes("check (mode = 'draft_only')"), 'Mail agent must remain draft-only at database level');
assert(mailFoundation.includes('foreign key (mail_account_id, tenant_id)'), 'Mail messages must belong to an account in the same tenant');
assert(mailFoundation.includes('foreign key (message_id, tenant_id)'), 'Mail drafts must belong to a message in the same tenant');
assert(mailFoundation.includes("private.has_mail_permission('mail.admin')"), 'Mail administration needs a dedicated permission');
assert(mailCrypto.includes("{ name: 'AES-GCM'"), 'Mail secrets must use authenticated encryption');
assert(mailCrypto.includes('additionalData: additionalData(context)'), 'Mail encryption must bind ciphertext to tenant context');
assert(mailCrypto.includes("Deno.env.get('MAIL_TOKEN_ENCRYPTION_KEY')"), 'Mail encryption key must come from a server secret');
assert(!/localStorage|sessionStorage/.test(mailCrypto), 'Mail crypto must never use browser storage');
assert(mailOauthStart.includes('authenticatedTenant(req)') && mailOauthStart.includes("hasMailPermission(req, 'mail.admin')"), 'Starting mail OAuth must require mail administration permission');
assert(mailOauthStart.includes('tenantHasMailModule(auth.tenantId)'), 'Starting mail OAuth must require the paid or trial mail module');
assert(mailOauthStart.includes("code_challenge_method: 'S256'"), 'Mail OAuth must use PKCE');
assert(mailOauthCallback.includes(".is('consumed_at', null)") && mailOauthCallback.includes(".gt('expires_at'"), 'Mail OAuth state must be one-time and expiring');
assert(mailOauthCallback.includes('mayAdminMail') && mailOauthCallback.includes("custom.perms.includes('admin_email')") && mailOauthCallback.includes('tenantHasMailModule(claimed.tenant_id)'), 'Mail OAuth callback must recheck mail administration membership and module entitlement');
assert(!/return json\(\{[^}]*token/is.test(mailOauthCallback), 'Mail OAuth callback must never return provider tokens');
assert(mailEntitlement.includes("modules.includes('email')") && mailEntitlement.includes("modules.includes('komplett')"), 'Mail entitlement must recognise email and complete plans');
assert(mailStatus.includes("select('id,provider,email,status,last_synced_at,last_error_code,created_at')"), 'Mail status endpoint must select only safe account fields');
assert(mailDisconnect.includes(".eq('id', accountId).eq('tenant_id', auth.tenantId)"), 'Mail disconnect must bind account to authenticated tenant');
assert(mailSync.includes("req.headers.get('x-cron-secret')") && mailSync.includes("Deno.env.get('MAIL_CRON_SECRET')"), 'Mail sync must authenticate scheduler calls');
assert(mailSync.includes('decryptMailValue(') && mailSync.includes("Deno.env.get('MAIL_CONTACT_HASH_SALT')"), 'Mail sync must decrypt server-side and use a keyed sender hash');
assert(mailSync.includes(".eq('mail_account_id', accountId).eq('tenant_id', tenantId)"), 'Mail sync lookups must bind account and tenant');
assert(mailSync.includes('GMAIL_BACKLOG_TOO_LARGE'), 'Mail sync must fail visibly instead of skipping a large backlog');
assert(!/messages\/send|sendMail/.test(mailSync), 'Background mail sync must not contain a send path');
assert(mailRetention.includes("req.headers.get('x-cron-secret')") && mailRetention.includes(".lt('retention_until'"), 'Mail retention must authenticate and enforce expiry');
assert(mailAnalysisMigration.includes('for update of m skip locked'), 'Mail analysis queue must claim messages atomically');
assert(mailAnalysisMigration.includes('grant execute on function public.claim_mail_message_for_analysis() to service_role'), 'Mail analysis claim must be service-role only');
assert(mailAnalyse.includes("req.headers.get('x-cron-secret')") && mailAnalyse.includes("Deno.env.get('MAIL_CRON_SECRET')"), 'Mail analysis must authenticate scheduler calls');
assert(mailAnalyse.includes('store: false'), 'OpenAI mail responses must not be stored by the Responses API');
assert(mailAnalyse.includes("type: 'json_schema'") && mailAnalyse.includes('strict: true'), 'OpenAI mail output must use strict structured output');
assert(!/messages\/send|sendMail/.test(mailAnalyse), 'Background mail analysis must not contain a send path');
assert(!/tools:\s*\[[^\]]/.test(mailAnalyse), 'Mail analysis must not give the model tools');
assert(mailInbox.includes("hasMailPermission(req, 'mail.read')") && mailInbox.includes('decryptMailValue('), 'Mail inbox must authorise and decrypt only server-side');
assert(mailDraftSave.includes(".rpc('save_mail_draft_review'") && mailDeliveryMigration.includes('for update;'), 'Mail draft review must be saved under a database lock');
assert(mailSend.includes(".rpc('claim_mail_draft_delivery'") && mailSend.includes(".rpc('finish_mail_draft_delivery'"), 'Mail delivery must claim and finish atomically');
assert(mailSend.includes("setDeliveryState(tenantId, claimedMessageId, 'delivery_unknown'") && mailRetention.includes(".eq('status', 'sending')"), 'Uncertain and interrupted mail delivery must never be retried silently');
assert(mailSend.includes('gmail.googleapis.com/gmail/v1/users/me/messages/send'), 'Only explicit mail delivery may call Gmail send');
assert(headers.includes('Content-Security-Policy:'), 'Cloudflare CSP is required');
assert(headers.includes('X-Frame-Options: DENY'), 'Clickjacking protection is required');
assert(!/(sk_live_|sk_test_|service_role\s*[:=]\s*['"][^'"]+)/i.test(allText), 'A secret-looking key is committed');

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('Security checks passed.');
