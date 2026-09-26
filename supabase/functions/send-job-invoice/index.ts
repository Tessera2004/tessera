import { json, options, withCors } from '../_shared/http.ts';
import { adminClient, authenticatedTenant, userClient } from '../_shared/supabase.ts';
import { decryptMailValue, mailEncryptionKeyVersion } from '../_shared/mail-crypto.ts';
import { refreshGmailAccessToken } from '../_shared/gmail-auth.ts';
import { tenantHasMailModule } from '../_shared/mail-entitlement.ts';
import { hasMailPermission } from '../_shared/mail-user.ts';


function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function sendGmail(token: string, from: string, to: string, subject: string, text: string, filename: string, pdf: string) {
  const boundary = 'mosaos_' + crypto.randomUUID();
  const wrappedPdf = pdf.match(/.{1,76}/g)?.join('\r\n') || pdf;
  const mime = [
    `From: ${from}`, `To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: 8bit', '', text, '',
    `--${boundary}`, `Content-Type: application/pdf; name="${filename}"`,
    'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${filename}"`, '', wrappedPdf, '',
    `--${boundary}--`, ''
  ].join('\r\n');
  const raw = bytesToBase64(new TextEncoder().encode(mime)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  return await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method:'POST', headers:{ Authorization:'Bearer ' + token, 'Content-Type':'application/json' },
    body: JSON.stringify({ raw }), signal: AbortSignal.timeout(30000)
  });
}

Deno.serve(withCors(async req => {
  const preflight=options(req); if(preflight) return preflight;
  if(req.method!=='POST') return json({error:'METHOD_NOT_ALLOWED'},405);
  let tenantId='', invoiceId='', sending=false;
  const admin=adminClient();
  const state=async(status:string)=>{
    if(!invoiceId) return;
    const {error}=await admin.from('job_invoices').update({delivery_status:status})
      .eq('id',invoiceId).eq('tenant_id',tenantId).eq('delivery_status','sending');
    if(error) console.error('Invoice state recording failed',error.code);
  };
  try {
    tenantId=(await authenticatedTenant(req)).tenantId;
    if(!await hasMailPermission(req,'mail.send')) return json({error:'FORBIDDEN'},403);
    if(!await tenantHasMailModule(tenantId)) return json({error:'MAIL_MODULE_REQUIRED'},402);
    const body=await req.json();
    const client=userClient(req);
    // User-scoped read enforces the invoice finance permission in addition to mail.send.
    const {data:invoice,error}=await client.from('job_invoices').select('*').eq('tenant_id',tenantId).eq('job_id',String(body.jobId || '')).maybeSingle();
    if(error || !invoice?.pdf_base64) return json({error:'ISSUED_INVOICE_REQUIRED'},422);
    const {data:account,error:accountError}=await admin.from('mail_accounts').select('*')
      .eq('tenant_id',tenantId).eq('id',String(body.accountId || '')).eq('provider','gmail').eq('status','active').maybeSingle();
    if(accountError || !account || Number(account.token_key_version)!==mailEncryptionKeyVersion()) return json({error:'MAILBOX_AUTH_INVALID'},422);
    const recipient=String(invoice.document.email || '');
    const from=String(account.email || '');
    const email=/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
    if(!email.test(recipient) || !email.test(from)) return json({error:'INVALID_EMAIL'},422);
    const refresh=await decryptMailValue(String(account.encrypted_refresh_token),`refresh-token:${tenantId}:${account.id}:gmail`);
    const token=await refreshGmailAccessToken(refresh);
    // Atomic claim: another tab, a retry or a double click can never send twice.
    const {data:claimed,error:claimError}=await admin.from('job_invoices').update({delivery_status:'sending'})
      .eq('id',invoice.id).eq('tenant_id',tenantId).in('delivery_status',['pending','failed']).select('id').maybeSingle();
    if(claimError) throw claimError;
    if(!claimed) return json({error:'ALREADY_SENT_OR_DELIVERY_UNCERTAIN'},409);
    invoiceId=invoice.id;
    const number=String(invoice.number).replace(/[^A-Za-z0-9-]/g,'');
    sending=true;
    const response=await sendGmail(token,from,recipient,'Rechnung '+number,
      'Guten Tag\n\nIm Anhang finden Sie Ihre Rechnung '+number+'.\n\nFreundliche Grüsse\n'+String(invoice.document.company?.name || ''),
      'Rechnung_'+number+'.pdf',invoice.pdf_base64);
    if(!response.ok){
      await state(response.status>=500?'delivery_unknown':'failed');
      return json({error:response.status>=500?'DELIVERY_UNKNOWN':'MAIL_SEND_REJECTED'},502);
    }
    const sentAt=new Date().toISOString();
    const {data:recorded,error:recordError}=await admin.from('job_invoices').update({delivery_status:'sent',sent_at:sentAt})
      .eq('id',invoiceId).eq('tenant_id',tenantId).eq('delivery_status','sending').select('id').maybeSingle();
    if(recordError || !recorded){await state('delivery_unknown');return json({error:'DELIVERY_UNKNOWN'},502);}
    await admin.from('plan_jobs').update({invoice_status:'sent',invoice_number:number,invoice_sent_at:sentAt,invoice_send_error:null})
      .eq('id',String(body.jobId)).eq('tenant_id',tenantId);
    return json({ok:true,sentAt,recipient});
  } catch(error){
    await state(sending?'delivery_unknown':'failed');
    const code=error instanceof Error?error.message:'INTERNAL';
    return json({error:sending?'DELIVERY_UNKNOWN':code==='UNAUTHORIZED'?'UNAUTHORIZED':'INVOICE_SEND_FAILED'},code==='UNAUTHORIZED'?401:502);
  }
}));
