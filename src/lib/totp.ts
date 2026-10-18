// M60: RFC 6238 TOTP built on WebCrypto — SHA-1, 6 digits, 30-second step.
// Pure and dependency-free so the node unit tests can pin the RFC vectors.
// Runs on both the Node and Edge runtimes (globalThis.crypto.subtle).

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const TOTP_STEP_SEC = 30;
export const TOTP_DIGITS = 6;

// Standard base32 (RFC 4648, no padding needed). Returns null on bad input.
export function base32Decode(input: string): Uint8Array | null {
  const clean = input.replace(/[=\s]/g, '').toUpperCase();
  if (!clean || /[^A-Z2-7]/.test(clean)) return null;
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    value = (value << 5) | ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, message as unknown as BufferSource));
}

function counterBytes(counter: number): Uint8Array {
  const bytes = new Uint8Array(8);
  let value = counter; // 53-bit safe integers are plenty for the current epoch
  for (let i = 7; i >= 0; i--) {
    bytes[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  return bytes;
}

export async function totpCode(secret: Uint8Array, atMs: number = Date.now(), step = TOTP_STEP_SEC): Promise<string> {
  const counter = Math.floor(atMs / 1000 / step);
  const digest = await hmacSha1(secret, counterBytes(counter));
  // Dynamic truncation (RFC 4226 §5.3), then the usual 6-digit display
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(binary % 1_000_000).padStart(TOTP_DIGITS, '0');
}

// Accepts the previous, current and next step by default, so a clock a few
// seconds off still logs in.
export async function verifyTotp(
  secretB32: string,
  code: string,
  atMs: number = Date.now(),
  windowSteps = 1,
): Promise<boolean> {
  const secret = base32Decode(secretB32);
  if (!secret || !new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(code)) return false;
  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const candidate = await totpCode(secret, atMs + offset * TOTP_STEP_SEC * 1000);
    if (candidate === code) return true;
  }
  return false;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
