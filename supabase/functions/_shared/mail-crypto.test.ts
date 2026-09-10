import {
  decryptMailValue,
  encryptMailValue,
  mailEncryptionKeyVersion,
} from './mail-crypto.ts';

const TEST_KEY = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test('mail crypto round-trip and random IV', async () => {
  Deno.env.set('MAIL_TOKEN_ENCRYPTION_KEY', TEST_KEY);
  const context = 'refresh-token:tenant-a:account-a:gmail';
  const first = await encryptMailValue('secret-token', context);
  const second = await encryptMailValue('secret-token', context);
  assert(first.startsWith('v1.'), 'version prefix missing');
  assert(first !== second, 'ciphertexts must use different IVs');
  assert(await decryptMailValue(first, context) === 'secret-token', 'round-trip failed');
  assert(mailEncryptionKeyVersion() === 1, 'unexpected key version');
});

Deno.test('mail crypto binds ciphertext to its tenant context', async () => {
  Deno.env.set('MAIL_TOKEN_ENCRYPTION_KEY', TEST_KEY);
  const encrypted = await encryptMailValue('secret-token', 'refresh-token:tenant-a:account-a:gmail');
  let rejected = false;
  try {
    await decryptMailValue(encrypted, 'refresh-token:tenant-b:account-a:gmail');
  } catch (error) {
    rejected = error instanceof Error && error.message === 'MAIL_DECRYPTION_FAILED';
  }
  assert(rejected, 'cross-tenant context must be rejected');
});

Deno.test('mail crypto rejects malformed key and ciphertext', async () => {
  Deno.env.set('MAIL_TOKEN_ENCRYPTION_KEY', 'too-short');
  let badKeyRejected = false;
  try {
    await encryptMailValue('secret-token', 'test');
  } catch (error) {
    badKeyRejected = error instanceof Error && error.message === 'MAIL_ENCRYPTION_KEY_INVALID';
  }
  assert(badKeyRejected, 'invalid key must be rejected');

  Deno.env.set('MAIL_TOKEN_ENCRYPTION_KEY', TEST_KEY);
  let malformedRejected = false;
  try {
    await decryptMailValue('not-a-valid-payload', 'test');
  } catch (error) {
    malformedRejected = error instanceof Error && error.message === 'MAIL_CIPHERTEXT_INVALID';
  }
  assert(malformedRejected, 'malformed ciphertext must be rejected');
});
