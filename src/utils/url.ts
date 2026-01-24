/**
 * Convert HTTP URLs to HTTPS to avoid mixed content warnings
 */
export function toHttps(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(/^http:\/\//i, 'https://');
}
