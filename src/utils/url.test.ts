import { describe, expect, it } from 'vitest';
import { toStorableImageUrl, toStorableLinkUrl } from './url';

describe('toStorableImageUrl', () => {
  it('upgrades http and normalises the scheme to https://', () => {
    expect(toStorableImageUrl('http://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(toStorableImageUrl(' HTTPS://cdn.example.com/a.jpg ')).toBe('https://cdn.example.com/a.jpg');
  });

  it.each(['', '   ', null, undefined, '//cdn.example.com/a.jpg', 'data:image/png;base64,AAAA', 'https://a.com/\nb'])(
    'rejects %j',
    (url) => {
      expect(toStorableImageUrl(url)).toBeUndefined();
    }
  );
});

describe('toStorableLinkUrl', () => {
  it('keeps http and https links, lower-casing the scheme', () => {
    expect(toStorableLinkUrl('http://shop.example.com/p/1')).toBe('http://shop.example.com/p/1');
    expect(toStorableLinkUrl('HTTPS://shop.example.com/p/1')).toBe('https://shop.example.com/p/1');
  });

  it.each(['', 'www.example.com', 'javascript:alert(1)', 'ftp://example.com/file'])('rejects %j', (url) => {
    expect(toStorableLinkUrl(url)).toBeUndefined();
  });
});
