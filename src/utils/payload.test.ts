import { describe, expect, it } from 'vitest';
import { decodePayload, encodePayload } from './payload';

const product = {
  name: 'Sac à main – L’Occitane édition €',
  price: 72.5,
  currency: 'EUR',
  brand: 'L’Occitane en Provence',
  productUrl: 'https://fr.loccitane.com/sac?ref=été',
};

describe('encodePayload / decodePayload', () => {
  it('round-trips accented and typographic characters', () => {
    expect(decodePayload(encodePayload(product))).toEqual(product);
  });

  it('round-trips a cart with ’ € – (which plain btoa cannot encode)', () => {
    const cart = [product, { name: 'Crème brûlée – 2 × 100 g', price: 9, currency: 'EUR', quantity: 2 }];
    expect(() => btoa(JSON.stringify(cart))).toThrow();
    expect(decodePayload(encodePayload(cart))).toEqual(cart);
  });

  it('produces URL-safe output that survives a query string unescaped', () => {
    const encoded = encodePayload({ ...product, notes: '~~~???>>>' }); // bytes that map to + and /
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);

    const params = new URLSearchParams(`itemData=${encoded}`);
    expect(decodePayload(params.get('itemData')!)).toEqual({ ...product, notes: '~~~???>>>' });
  });
});

describe('decodePayload with links from older extension versions', () => {
  it('decodes the old single-item format (UTF-8, standard base64)', () => {
    const old = btoa(unescape(encodeURIComponent(JSON.stringify(product))));
    expect(decodePayload(old)).toEqual(product);
  });

  it('decodes the old cart format (Latin-1, standard base64)', () => {
    const cart = [{ name: 'Crème brûlée', price: 9 }];
    expect(decodePayload(btoa(JSON.stringify(cart)))).toEqual(cart);
  });

  it('accepts standard base64 whose "+" was turned into a space by the query string', () => {
    const old = btoa(unescape(encodeURIComponent(JSON.stringify({ notes: '~~~???>>>' }))));
    expect(old).toContain('+');
    const params = new URLSearchParams(`itemData=${old}`); // not percent-encoded
    expect(decodePayload(params.get('itemData')!)).toEqual({ notes: '~~~???>>>' });
  });
});

describe('decodePayload with invalid input', () => {
  it.each([
    ['an empty string', ''],
    ['characters outside base64', 'not base64!'],
    ['an impossible length', 'abcde'],
    ['base64 that is not JSON', btoa('hello world')],
    ['truncated JSON', encodePayload(product).slice(0, 20)],
  ])('returns null for %s', (_label, input) => {
    expect(decodePayload(input)).toBeNull();
  });
});
