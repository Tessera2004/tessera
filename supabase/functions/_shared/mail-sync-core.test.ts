import { gmailMessageIdsFromHistory, gmailMessageToPayload } from './mail-sync-core.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function encoded(value: string) {
  return btoa(unescape(encodeURIComponent(value))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

Deno.test('Gmail payload extracts headers and prefers plain text', () => {
  const result = gmailMessageToPayload({
    id: 'm1', internalDate: '1789012800000', snippet: 'Vorschau',
    payload: {
      headers: [
        { name: 'From', value: '"Anna Muster" <ANNA@example.ch>' },
        { name: 'To', value: 'info@firma.ch' },
        { name: 'Subject', value: 'Anfrage' },
      ],
      parts: [
        { mimeType: 'text/plain', body: { data: encoded('Guten Tag\nIch brauche eine Reinigung.') } },
        { mimeType: 'text/html', body: { data: encoded('<p>Falsche HTML-Alternative</p>') } },
        { mimeType: 'application/pdf', body: { attachmentId: 'ignored' } },
      ],
    },
  });
  assert(result.from === 'anna@example.ch', 'sender was not normalized');
  assert(result.fromName === 'Anna Muster', 'sender name missing');
  assert(result.subject === 'Anfrage', 'subject missing');
  assert(result.body.includes('Ich brauche eine Reinigung.'), 'plain body missing');
  assert(!result.body.includes('HTML-Alternative'), 'HTML alternative should not duplicate plain text');
});

Deno.test('Gmail history returns unique inbox message ids', () => {
  const ids = gmailMessageIdsFromHistory({ history: [
    { messagesAdded: [
      { message: { id: 'a', labelIds: ['INBOX','UNREAD'] } },
      { message: { id: 'sent', labelIds: ['SENT'] } },
    ] },
    { messagesAdded: [{ message: { id: 'a', labelIds: ['INBOX'] } }, { message: { id: 'b' } }] },
  ] });
  assert(ids.join(',') === 'a,b', 'history ids were not filtered and deduplicated');
});

Deno.test('Gmail HTML fallback removes active markup', () => {
  const result = gmailMessageToPayload({ payload: {
    headers: [{ name: 'From', value: 'kunde@example.ch' }],
    parts: [{ mimeType: 'text/html', body: { data: encoded('<style>x</style><p>Hallo<br>Welt</p><script>bad()</script>') } }],
  } });
  assert(result.body === 'Hallo\nWelt', 'HTML fallback was not reduced to text');
});
