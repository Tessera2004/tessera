import { json, options, withCors } from '../_shared/http.ts';
import { adminClient, authenticatedTenant, userClient } from '../_shared/supabase.ts';

const MAX_PDF_BASE64 = 10_000_000;

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
    body: JSON.stringify({ raw })
  });
}

async function sendOutlook(token: string, to: string, subject: string, text: string, filename: string, pdf: string) {
  return await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method:'POST', headers:{ Authorization:'Bearer ' + token, 'Content-Type':'application/json' },
    body: JSON.stringify({ message: {
      subject, body:{ contentType:'Text', content:text },
      toRecipients:[{ emailAddress:{ address:to } }],
      attachments:[{ '@odata.type':'#microsoft.graph.fileAttachment', name:filename, contentType:'application/pdf', contentBytes:pdf }]
    }, saveToSentItems:true })
  });
}

Deno.serve(withCors(async req => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const { tenantId } = await authenticatedTenant(req);
    const body = await req.json().catch(() => ({}));
    const jobId = String(body.jobId || '');
    const pdfBase64 = String(body.pdfBase64 || '');
    const connectedMailbox = String(body.connectedMailbox || '').trim().toLowerCase();
    const provider = String(body.provider || '');
    const accessToken = String(body.accessToken || '');
    if (!jobId || !pdfBase64 || !connectedMailbox || !accessToken || !['gmail','outlook'].includes(provider)) return json({ error: 'INVALID_INPUT' }, 400);
    if (pdfBase64.length > MAX_PDF_BASE64) return json({ error: 'PDF_TOO_LARGE' }, 413);
    if (!/^[A-Za-z0-9+/=]+$/.test(pdfBase64) || !pdfBase64.startsWith('JVBERi0')) return json({ error: 'INVALID_PDF' }, 400);

    const client = userClient(req);
    const { data: claimedRows, error: claimError } = await client
      .rpc('claim_job_invoice_delivery', { p_job_id: jobId });
    if (claimError) throw claimError;
    const claimed = claimedRows?.[0] || null;
    if (!claimed) return json({ error: 'ALREADY_CLAIMED_OR_NOT_SENDABLE' }, 409);

    const admin = adminClient();
    const { data: customer } = await admin.from('customers').select('email,first_name,last_name')
      .eq('id', claimed.customer_id).eq('tenant_id', tenantId).maybeSingle();
    const recipient = String(customer?.email || '').trim().toLowerCase();
    if (!recipient) {
      await admin.from('plan_jobs').update({ invoice_status: 'failed', invoice_send_error: 'Kunden-E-Mail fehlt' })
        .eq('id', jobId).eq('tenant_id', tenantId);
      return json({ error: 'CUSTOMER_EMAIL_MISSING' }, 422);
    }

    const invoiceNumber = String(claimed.invoice_number ||
      `${String(claimed.date_key).replaceAll('-', '')}-${jobId.slice(-4)}`.toUpperCase())
      .replace(/[\r\n]/g, ' ').trim().slice(0, 100);
    const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || claimed.objekt || '';
    const filename = `Rechnung_${invoiceNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
    const subject = `Rechnung ${invoiceNumber}`;
    const text = `Guten Tag${name ? ' ' + name : ''}\n\nIm Anhang finden Sie die Rechnung ${invoiceNumber}.\n\nFreundliche Grüsse`;
    try {
      const profileUrl = provider === 'gmail'
        ? 'https://gmail.googleapis.com/gmail/v1/users/me/profile'
        : 'https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName';
      const profileResponse = await fetch(profileUrl, { headers:{ Authorization:'Bearer ' + accessToken } });
      const profile = await profileResponse.json().catch(() => ({}));
      const authenticatedMailbox = String(provider === 'gmail' ? profile.emailAddress : (profile.mail || profile.userPrincipalName || '')).toLowerCase();
      if (!profileResponse.ok || authenticatedMailbox !== connectedMailbox) {
        await admin.from('plan_jobs').update({ invoice_status:'failed', invoice_send_error:'Postfach-Autorisierung abgelaufen oder ungueltig' })
          .eq('id', jobId).eq('tenant_id', tenantId).eq('invoice_status','sending');
        return json({ error:'MAILBOX_AUTH_INVALID' }, 401);
      }
      const sent = provider === 'gmail'
        ? await sendGmail(accessToken, authenticatedMailbox, recipient, subject, text, filename, pdfBase64)
        : await sendOutlook(accessToken, recipient, subject, text, filename, pdfBase64);
      if (!sent.ok) {
        const detail = `${provider} ${sent.status}: ${(await sent.text()).slice(0, 500)}`;
        await admin.from('plan_jobs').update({ invoice_status:'failed', invoice_send_error:detail })
          .eq('id', jobId).eq('tenant_id', tenantId).eq('invoice_status','sending');
        return json({ error:'SEND_FAILED', detail }, 502);
      }
    } catch (mailError) {
      const detail = mailError instanceof Error ? mailError.message : 'Transportfehler';
      await admin.from('plan_jobs').update({ invoice_status:'delivery_unknown', invoice_send_error:detail })
        .eq('id', jobId).eq('tenant_id', tenantId).eq('invoice_status','sending');
      return json({ error:'DELIVERY_UNKNOWN', detail }, 502);
    }

    const sentAt = new Date().toISOString();
    await admin.from('plan_jobs').update({ invoice_status: 'sent', invoice_sent_at: sentAt, invoice_send_error: null })
      .eq('id', jobId).eq('tenant_id', tenantId).eq('invoice_status', 'sending');
    return json({ ok: true, sentAt, recipient });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'UNKNOWN';
    return json({ error: message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : message === 'NO_TENANT' ? 'NO_TENANT' : 'INTERNAL' },
      message === 'UNAUTHORIZED' ? 401 : message === 'NO_TENANT' ? 403 : 500);
  }
}));
