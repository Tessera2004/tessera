import { confidenceFor, responseOutputText, ruleBasedIgnore, validateMailResult } from './mail-analysis-core.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test('automatic out-of-office reply is ignored without AI', () => {
  const result = ruleBasedIgnore({ from: 'anna@example.ch', subject: 'Automatische Antwort: Ferien' });
  assert(result?.category === 'unimportant' && result.needsHuman === false, 'automatic reply not ignored');
  assert(ruleBasedIgnore({ from: 'kunde@example.ch', subject: 'Reinigungsanfrage' }) === null, 'customer mail was ignored');
});

Deno.test('mail result rejects invented knowledge references', () => {
  let rejected = false;
  try {
    validateMailResult({
      category: 'customer_request', priority: 'normal', needs_human: false,
      reason: 'Anfrage', subject: 'Re: Anfrage', body: 'Guten Tag',
      missing_information: [], knowledge_refs: ['not-provided'],
    }, new Set(['approved-id']));
  } catch (error) {
    rejected = error instanceof Error && error.message === 'OPENAI_KNOWLEDGE_REF_INVALID';
  }
  assert(rejected, 'invented reference was accepted');
});

Deno.test('high-risk categories always require a human', () => {
  const result = validateMailResult({
    category: 'complaint', priority: 'urgent', needs_human: false,
    reason: 'Reklamation', subject: 'Re: Reklamation', body: 'Guten Tag',
    missing_information: [], knowledge_refs: [],
  }, new Set());
  assert(result.needsHuman, 'complaint was not escalated');
  assert(confidenceFor(result) === 'low', 'escalated result must have low confidence');
});

Deno.test('response output text supports raw Responses API shape', () => {
  const text = responseOutputText({ output: [{ content: [{ type: 'output_text', text: '{"ok":true}' }] }] });
  assert(text === '{"ok":true}', 'output text was not found');
});
