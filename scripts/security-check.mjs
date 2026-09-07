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
assert(headers.includes('Content-Security-Policy:'), 'Cloudflare CSP is required');
assert(headers.includes('X-Frame-Options: DENY'), 'Clickjacking protection is required');
assert(!/(sk_live_|sk_test_|service_role\s*[:=]\s*['"][^'"]+)/i.test(allText), 'A secret-looking key is committed');

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('Security checks passed.');
