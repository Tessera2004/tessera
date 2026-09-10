// Anwendungsseitige AES-256-GCM-Verschluesselung fuer Mail-Secrets und Inhalte.
// Der Schluessel kommt ausschliesslich aus MAIL_TOKEN_ENCRYPTION_KEY und muss
// base64url-codiert genau 32 Byte enthalten. Klartext oder Schluessel nie loggen.

const FORMAT_VERSION = 'v1';
const KEY_VERSION = 1;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('MAIL_CIPHERTEXT_INVALID');
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error('MAIL_CIPHERTEXT_INVALID');
  }
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encryptionKeyBytes() {
  const configured = Deno.env.get('MAIL_TOKEN_ENCRYPTION_KEY') || '';
  let key: Uint8Array;
  try {
    key = fromBase64Url(configured);
  } catch {
    throw new Error('MAIL_ENCRYPTION_KEY_INVALID');
  }
  if (key.length !== 32) throw new Error('MAIL_ENCRYPTION_KEY_INVALID');
  return key;
}

async function encryptionKey(usage: KeyUsage[]) {
  return await crypto.subtle.importKey(
    'raw',
    encryptionKeyBytes(),
    { name: 'AES-GCM' },
    false,
    usage,
  );
}

function additionalData(context: string) {
  if (!context || context.length > 1000) throw new Error('MAIL_ENCRYPTION_CONTEXT_INVALID');
  return encoder.encode(`mosaos-mail:${FORMAT_VERSION}:${context}`);
}

export function mailEncryptionKeyVersion() {
  return KEY_VERSION;
}

export async function encryptMailValue(plaintext: string, context: string) {
  if (!plaintext) throw new Error('MAIL_PLAINTEXT_EMPTY');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData(context), tagLength: 128 },
    await encryptionKey(['encrypt']),
    encoder.encode(plaintext),
  );
  return `${FORMAT_VERSION}.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptMailValue(payload: string, context: string) {
  const [version, ivPart, ciphertextPart, extra] = String(payload || '').split('.');
  if (version !== FORMAT_VERSION || !ivPart || !ciphertextPart || extra !== undefined) {
    throw new Error('MAIL_CIPHERTEXT_INVALID');
  }
  const iv = fromBase64Url(ivPart);
  const ciphertext = fromBase64Url(ciphertextPart);
  if (iv.length !== 12 || ciphertext.length < 17) throw new Error('MAIL_CIPHERTEXT_INVALID');
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: additionalData(context), tagLength: 128 },
      await encryptionKey(['decrypt']),
      ciphertext,
    );
    return decoder.decode(plaintext);
  } catch {
    throw new Error('MAIL_DECRYPTION_FAILED');
  }
}
