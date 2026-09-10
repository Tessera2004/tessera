export const MAIL_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: {
      type: 'string',
      enum: ['customer_request','existing_customer','appointment','complaint','billing','application','unimportant','unclear'],
    },
    priority: { type: 'string', enum: ['urgent','normal','low'] },
    needs_human: { type: 'boolean' },
    reason: { type: 'string' },
    subject: { type: 'string' },
    body: { type: 'string' },
    missing_information: { type: 'array', items: { type: 'string' } },
    knowledge_refs: { type: 'array', items: { type: 'string' } },
  },
  required: ['category','priority','needs_human','reason','subject','body','missing_information','knowledge_refs'],
} as const;

const CATEGORIES = new Set(['customer_request','existing_customer','appointment','complaint','billing','application','unimportant','unclear']);
const PRIORITIES = new Set(['urgent','normal','low']);
const CONFIDENCES = new Set(['high','medium','low']);
const RESULT_KEYS = new Set(['category','priority','needs_human','reason','subject','body','missing_information','knowledge_refs']);

export function ruleBasedIgnore(mail: Record<string, unknown>) {
  const subject = String(mail.subject || '').toLowerCase();
  const automaticSubject = /(automatic reply|automatische antwort|abwesenheitsnotiz|out of office)/i.test(subject);
  if (automaticSubject) {
    return { category: 'unimportant', priority: 'low', needsHuman: false, reason: 'Automatische Abwesenheitsantwort' };
  }
  return null;
}

export function validateMailResult(value: unknown, allowedKnowledgeIds: Set<string>) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('OPENAI_SCHEMA_INVALID');
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !RESULT_KEYS.has(key))) throw new Error('OPENAI_SCHEMA_INVALID');
  if (!CATEGORIES.has(String(result.category))) throw new Error('OPENAI_SCHEMA_INVALID');
  if (!PRIORITIES.has(String(result.priority))) throw new Error('OPENAI_SCHEMA_INVALID');
  if (typeof result.needs_human !== 'boolean') throw new Error('OPENAI_SCHEMA_INVALID');
  const reason = String(result.reason || '').trim();
  const subject = String(result.subject || '').replaceAll('\u0000', '').trim();
  const body = String(result.body || '').replaceAll('\u0000', '').trim();
  if (!reason || reason.length > 500 || !subject || subject.length > 1000 || !body || body.length > 8000) {
    throw new Error('OPENAI_SCHEMA_INVALID');
  }
  const missing = Array.isArray(result.missing_information)
    ? result.missing_information.map(String).map((item) => item.trim()).filter(Boolean)
    : null;
  const refs = Array.isArray(result.knowledge_refs)
    ? [...new Set(result.knowledge_refs.map(String))]
    : null;
  if (!missing || missing.length > 20 || missing.some((item) => item.length > 300) || !refs) {
    throw new Error('OPENAI_SCHEMA_INVALID');
  }
  if (refs.some((id) => !allowedKnowledgeIds.has(id))) throw new Error('OPENAI_KNOWLEDGE_REF_INVALID');
  const category = String(result.category);
  const forcedHuman = ['complaint','billing','application','unclear'].includes(category);
  return {
    category,
    priority: String(result.priority),
    needsHuman: Boolean(result.needs_human) || forcedHuman,
    reason,
    subject,
    body,
    missingInformation: missing,
    knowledgeRefs: refs,
  };
}

export function confidenceFor(result: { needsHuman: boolean; missingInformation: string[]; knowledgeRefs: string[] }) {
  const value = result.needsHuman || result.missingInformation.length ? 'low'
    : result.knowledgeRefs.length ? 'high' : 'medium';
  if (!CONFIDENCES.has(value)) throw new Error('OPENAI_SCHEMA_INVALID');
  return value;
}

export function responseOutputText(response: Record<string, unknown>) {
  if (typeof response.output_text === 'string') return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as Array<Record<string, unknown>>
      : [];
    const text = content.find((part) => part.type === 'output_text' && typeof part.text === 'string')?.text;
    if (typeof text === 'string') return text;
  }
  return '';
}
