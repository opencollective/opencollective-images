import { getCloudinaryUrl, isProxyableUrl } from '../../src/server/lib/utils';

describe('isProxyableUrl', () => {
  const OC_ENV = process.env.OC_ENV;
  afterEach(() => {
    process.env.OC_ENV = OC_ENV;
  });

  test('accepts the Cloudinary URLs built by getCloudinaryUrl', () => {
    const src = 'https://example.com/logo.png';
    expect(isProxyableUrl(getCloudinaryUrl(src, { width: 100 }))).toBe(true);
    expect(isProxyableUrl(getCloudinaryUrl(src, { query: '/../../other/' }))).toBe(true);
  });

  test('rejects any other host', () => {
    expect(isProxyableUrl('https://example.com/logo.png')).toBe(false);
    expect(isProxyableUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(isProxyableUrl('https://res.cloudinary.com.evil.com/x.png')).toBe(false);
    expect(isProxyableUrl('https://res.cloudinary.com@evil.com/x.png')).toBe(false);
    expect(isProxyableUrl('http://localhost:3000/logo.png')).toBe(false);
  });

  test('accepts localhost only in development', () => {
    process.env.OC_ENV = 'development';
    expect(isProxyableUrl('http://localhost:3000/logo.png')).toBe(true);
    expect(isProxyableUrl('http://127.0.0.1:3000/logo.png')).toBe(false);
  });
});
