const decoder = new TextDecoder();

function decodeBase64Url(value: string) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return '';
  // Der Pilot verarbeitet keine Anhaenge und benoetigt hoechstens den Anfang
  // eines Nachrichtentexts. Das Limit verhindert grosse Inline-Bodies im RAM.
  const limited = value.slice(0, 200000);
  const normalized = limited.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  try {
    const binary = atob(padded);
    return decoder.decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  } catch {
    return '';
  }
}

function header(headers: Array<{ name?: string; value?: string }> | undefined, name: string) {
  return String((headers || []).find((item) => String(item.name || '').toLowerCase() === name.toLowerCase())?.value || '');
}

function plainFromHtml(html: string) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function messageBody(payload: Record<string, unknown> | undefined) {
  const plain: string[] = [];
  const html: string[] = [];
  const stack: Array<Record<string, unknown>> = payload ? [payload] : [];
  let visited = 0;
  let plainSize = 0;
  let htmlSize = 0;
  while (stack.length && visited < 200) {
    visited += 1;
    const part = stack.pop() || {};
    const mimeType = String(part.mimeType || '').toLowerCase();
    const body = part.body && typeof part.body === 'object' ? part.body as Record<string, unknown> : {};
    const data = typeof body.data === 'string' ? decodeBase64Url(body.data) : '';
    // attachmentId wird absichtlich ignoriert: Anhaenge gehoeren nicht zum Pilot.
    if (data && mimeType === 'text/plain' && plainSize < 150000) {
      plain.push(data);
      plainSize += data.length;
    } else if (data && mimeType === 'text/html' && htmlSize < 150000) {
      html.push(data);
      htmlSize += data.length;
    }
    const parts = Array.isArray(part.parts) ? part.parts : [];
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      if (parts[i] && typeof parts[i] === 'object') stack.push(parts[i] as Record<string, unknown>);
    }
  }
  const selected = plain.length ? plain.join('\n\n') : plainFromHtml(html.join('\n'));
  return selected.replaceAll('\u0000', '').slice(0, 100000).trim();
}

function senderAddress(from: string) {
  const angle = from.match(/<([^<>]+)>/);
  const candidate = String(angle?.[1] || from).trim().toLowerCase();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(candidate) ? candidate.slice(0, 320) : '';
}

function senderName(from: string) {
  if (!from.includes('<')) return '';
  return from.slice(0, from.lastIndexOf('<')).trim().replace(/^"|"$/g, '').slice(0, 300);
}

export function gmailMessageIdsFromHistory(historyResponse: Record<string, unknown>) {
  const ids = new Set<string>();
  const history = Array.isArray(historyResponse.history) ? historyResponse.history : [];
  for (const event of history) {
    if (!event || typeof event !== 'object') continue;
    const added = Array.isArray((event as Record<string, unknown>).messagesAdded)
      ? (event as Record<string, unknown>).messagesAdded as Array<Record<string, unknown>>
      : [];
    for (const item of added) {
      const message = item?.message && typeof item.message === 'object'
        ? item.message as Record<string, unknown>
        : {};
      const id = String(message.id || '');
      const labels = Array.isArray(message.labelIds) ? message.labelIds.map(String) : [];
      if (id && (!labels.length || labels.includes('INBOX'))) ids.add(id);
    }
  }
  return [...ids];
}

export function gmailMessageToPayload(message: Record<string, unknown>) {
  const payload = message.payload && typeof message.payload === 'object'
    ? message.payload as Record<string, unknown>
    : {};
  const headers = Array.isArray(payload.headers)
    ? payload.headers as Array<{ name?: string; value?: string }>
    : [];
  const from = header(headers, 'From').replaceAll('\u0000', '').slice(0, 1000);
  const to = header(headers, 'To').replaceAll('\u0000', '').slice(0, 2000);
  const subject = (header(headers, 'Subject').replaceAll('\u0000', '').trim() || '(Kein Betreff)').slice(0, 1000);
  const internalDate = Number(message.internalDate);
  const headerDate = Date.parse(header(headers, 'Date'));
  const internalDateValue = Number.isFinite(internalDate) && internalDate > 0 ? new Date(internalDate) : null;
  const headerDateValue = Number.isFinite(headerDate) ? new Date(headerDate) : null;
  const receivedAt = internalDateValue && Number.isFinite(internalDateValue.getTime())
    ? internalDateValue.toISOString()
    : headerDateValue && Number.isFinite(headerDateValue.getTime())
      ? headerDateValue.toISOString()
      : new Date().toISOString();
  return {
    from: senderAddress(from),
    fromName: senderName(from),
    to,
    subject,
    receivedAt,
    body: messageBody(payload) || String(message.snippet || '').replaceAll('\u0000', '').slice(0, 100000),
    snippet: String(message.snippet || '').replaceAll('\u0000', '').slice(0, 2000),
  };
}
