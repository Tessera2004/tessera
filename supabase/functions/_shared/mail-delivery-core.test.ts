import { gmailReplyRaw } from './mail-delivery-core.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test('Gmail reply MIME strips injected headers and keeps threading headers', () => {
  const raw = gmailReplyRaw({
    from: 'firma@example.ch', to: 'kunde@example.ch\r\nBcc: leak@example.ch',
    subject: 'Grüezi\r\nBcc: leak@example.ch', body: 'Vielen Dank.',
    messageId: '<m1@example.ch>', references: '<old@example.ch>',
  });
  const normalized = raw.replaceAll('-', '+').replaceAll('_', '/');
  const decoded = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  assert(!decoded.includes('\r\nBcc:'), 'header injection survived');
  assert(decoded.includes('In-Reply-To: <m1@example.ch>'), 'thread header missing');
  assert(decoded.includes('References: <old@example.ch> <m1@example.ch>'), 'references missing');
});
