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
assert(mailOauthStart.includes('authenticatedTenant(req)') && mailOauthStart.includes("auth.role !== 'admin'"), 'Starting mail OAuth must require a tenant admin');
assert(mailOauthStart.includes('tenantHasMailModule(auth.tenantId)'), 'Starting mail OAuth must require the paid or trial mail module');
assert(mailOauthStart.includes("code_challenge_method: 'S256'"), 'Mail OAuth must use PKCE');
assert(mailOauthCallback.includes(".is('consumed_at', null)") && mailOauthCallback.includes(".gt('expires_at'"), 'Mail OAuth state must be one-time and expiring');
assert(mailOauthCallback.includes("membership?.role !== 'admin'") && mailOauthCallback.includes('tenantHasMailModule(claimed.tenant_id)'), 'Mail OAuth callback must recheck admin membership and module entitlement');
assert(!/return json\(\{[^}]*token/is.test(mailOauthCallback), 'Mail OAuth callback must never return provider tokens');
assert(mailEntitlement.includes("modules.includes('email')") && mailEntitlement.includes("modules.includes('komplett')"), 'Mail entitlement must recognise email and complete plans');
assert(mailStatus.includes("select('id,provider,email,status,last_synced_at,last_error_code,created_at')"), 'Mail status endpoint must select only safe account fields');
assert(mailDisconnect.includes(".eq('id', accountId).eq('tenant_id', auth.tenantId)"), 'Mail disconnect must bind account to authenticated tenant');
assert(headers.includes('Content-Security-Policy:'), 'Cloudflare CSP is required');
assert(headers.includes('X-Frame-Options: DENY'), 'Clickjacking protection is required');
assert(!/(sk_live_|sk_test_|service_role\s*[:=]\s*['"][^'"]+)/i.test(allText), 'A secret-looking key is committed');

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('Security checks passed.');
