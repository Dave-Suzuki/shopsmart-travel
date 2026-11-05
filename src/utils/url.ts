/**
 * Convert HTTP URLs to HTTPS to avoid mixed content warnings
 */
export function toHttps(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(/^http:\/\//i, 'https://');
}

const WEB_SCHEME = /^(https?):\/\//i;

// Firestore rules only accept https:// image URLs and http(s):// product links, matched
// case-sensitively and on a single line. These helpers normalise a URL to that form, or
// return undefined when it can't be stored (empty, another scheme, or contains line breaks).

/** Normalises an image URL to https://, or returns undefined if it isn't a web URL. */
export function toStorableImageUrl(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim();
  const match = trimmed ? WEB_SCHEME.exec(trimmed) : null;
  if (!trimmed || !match || /[\r\n]/.test(trimmed)) return undefined;
  return `https://${trimmed.slice(match[0].length)}`;
}

/** Normalises a product link's scheme to lower case, or returns undefined if it isn't http(s). */
export function toStorableLinkUrl(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim();
  const match = trimmed ? WEB_SCHEME.exec(trimmed) : null;
  if (!trimmed || !match || /[\r\n]/.test(trimmed)) return undefined;
  return `${match[1].toLowerCase()}://${trimmed.slice(match[0].length)}`;
}
