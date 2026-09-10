const encoder = new TextEncoder();

function base64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function gmailReplyRaw(input: {
  from: string; to: string; subject: string; body: string; messageId?: string; references?: string;
}) {
  const cleanAddress = (value: string) => value.replace(/[\r\n]/g, '').trim().slice(0, 320);
  const from = cleanAddress(input.from);
  const to = cleanAddress(input.to);
  if (!from || !to || !to.includes('@')) throw new Error('MAIL_RECIPIENT_INVALID');
  const subject = input.subject.replace(/[\r\n]+/g, ' ').trim().slice(0, 1000);
  const encodedSubject = `=?UTF-8?B?${base64(encoder.encode(subject))}?=`;
  const replyId = String(input.messageId || '').replace(/[\r\n]/g, '').trim().slice(0, 1000);
  const references = [String(input.references || '').replace(/[\r\n]/g, ' ').trim(), replyId]
    .filter(Boolean).join(' ').slice(0, 4000);
  const headers = [
    `From: ${from}`, `To: ${to}`, `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  if (replyId) headers.push(`In-Reply-To: ${replyId}`);
  if (references) headers.push(`References: ${references}`);
  const mime = [...headers, '', base64(encoder.encode(input.body))].join('\r\n');
  return base64(encoder.encode(mime)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}
