// JSON payloads passed in URLs (Chrome extension -> app deep links).
//
// Encoding: JSON -> UTF-8 bytes -> base64url (no padding), so any Unicode text survives and
// the value needs no escaping in a query string. chrome-extension-v2/popup/popup.js inlines
// the same encoder; keep the two in sync.
//
// Decoding also accepts links made by older extension versions: standard base64 (with + / and
// padding) and payloads that were Latin-1 rather than UTF-8 (the old cart import).

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

/** Encodes a JSON-serialisable value as UTF-8 base64url. */
export function encodePayload(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a payload made by encodePayload (or by an older extension).
 * Returns null if the input isn't base64-encoded JSON.
 */
export function decodePayload(input: string): unknown {
  // A raw "+" in a query string is read back as a space, so turn spaces back into "+".
  const base64 = input
    .replace(/\s/g, (char) => (char === ' ' ? '+' : ''))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/=+$/, '');

  if (!/^[A-Za-z0-9+/]+$/.test(base64) || base64.length % 4 === 1) return null;

  let binary: string;
  try {
    binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  } catch {
    return null;
  }

  let text: string;
  try {
    text = utf8Decoder.decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  } catch {
    // Not valid UTF-8: an old link that base64-encoded Latin-1 text directly.
    text = binary;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
