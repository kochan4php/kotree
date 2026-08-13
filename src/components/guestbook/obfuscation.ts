// Light obfuscation (Base64 + char shift) — NOT encryption, hence the 🤫

export const OBFUSCATED_PREFIX = '🤫 ';

export function encryptMessage(message: string): string {
  return OBFUSCATED_PREFIX + btoa(Array.from(message).map(c => String.fromCharCode(c.charCodeAt(0) + 1)).join(''));
}

export function decryptMessage(encrypted: string): string {
  // Backwards compatible with the old 🔒 prefix used by previously stored entries
  if (!encrypted.startsWith('🔒 ') && !encrypted.startsWith(OBFUSCATED_PREFIX)) return encrypted;
  try {
    const base64 = encrypted.replace(/^(🔒|🤫) /, '');
    const decoded = atob(base64);
    return Array.from(decoded).map(c => String.fromCharCode(c.charCodeAt(0) - 1)).join('');
  } catch {
    return encrypted;
  }
}
