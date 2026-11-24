import path from 'path';

import { isRemoteImageUrl, resolveBundledImagePath } from '../../src/server/lib/static-image';

const staticFolder = path.resolve(__dirname, '../../src/static');

describe('static-image', () => {
  describe('isRemoteImageUrl', () => {
    test('accepts http and https URLs regardless of casing', () => {
      expect(isRemoteImageUrl('https://cdn.example/logo.png')).toBe(true);
      expect(isRemoteImageUrl('HTTPS://cdn.example/logo.png')).toBe(true);
      expect(isRemoteImageUrl('http://cdn.example/logo.png')).toBe(true);
      expect(isRemoteImageUrl('ht\ntp://cdn.example/logo.png')).toBe(true);
    });

    test('rejects bundled paths and non-http protocols', () => {
      expect(isRemoteImageUrl('/images/default-collective-logo-1.png')).toBe(false);
      expect(isRemoteImageUrl('file:///etc/passwd')).toBe(false);
      expect(isRemoteImageUrl('file:///etc/passwd#http://')).toBe(false);
      expect(isRemoteImageUrl('gopher://example.com')).toBe(false);
    });
  });

  describe('resolveBundledImagePath', () => {
    test('resolves default logos under /images/', () => {
      expect(resolveBundledImagePath('/images/default-collective-logo-1.png', staticFolder)).toMatch(
        /static\/images\/default-collective-logo-1.png$/,
      );
    });

    test('rejects traversal and non-bundled paths', () => {
      expect(resolveBundledImagePath('/images/../../../etc/passwd', staticFolder)).toBeNull();
      expect(resolveBundledImagePath('/etc/passwd', staticFolder)).toBeNull();
      expect(resolveBundledImagePath('https://cdn.example/a.png', staticFolder)).toBeNull();
    });
  });
});
