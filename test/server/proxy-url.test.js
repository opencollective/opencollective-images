import { getCloudinaryUrl, getProxyFetchUrl } from '../../src/server/lib/utils';

describe('getProxyFetchUrl', () => {
  const OC_ENV = process.env.OC_ENV;
  afterEach(() => {
    process.env.OC_ENV = OC_ENV;
  });

  test('keeps the Cloudinary URLs built by getCloudinaryUrl', () => {
    const src = 'https://example.com/logo.png';
    const url = getCloudinaryUrl(src, { width: 100 });
    expect(getProxyFetchUrl(url)).toBe(url);
    expect(getProxyFetchUrl(getCloudinaryUrl(src, { query: '/../../other/' }))).toMatch(
      /^https:\/\/res\.cloudinary\.com\//,
    );
  });

  test('never leaves the Cloudinary host', () => {
    expect(getProxyFetchUrl('https://res.cloudinary.com//evil.com/x.png')).toBe(
      'https://res.cloudinary.com//evil.com/x.png',
    );
    expect(new URL(getProxyFetchUrl('https://res.cloudinary.com//evil.com/x.png')).host).toBe('res.cloudinary.com');
  });

  test('rejects any other host', () => {
    expect(getProxyFetchUrl('https://example.com/logo.png')).toBeNull();
    expect(getProxyFetchUrl('http://169.254.169.254/latest/meta-data/')).toBeNull();
    expect(getProxyFetchUrl('https://res.cloudinary.com.evil.com/x.png')).toBeNull();
    expect(getProxyFetchUrl('https://res.cloudinary.com@evil.com/x.png')).toBeNull();
    expect(getProxyFetchUrl('http://res.cloudinary.com/x.png')).toBeNull();
    expect(getProxyFetchUrl('http://localhost:3000/logo.png')).toBeNull();
    expect(getProxyFetchUrl('not a url')).toBeNull();
  });

  test('accepts localhost only in development', () => {
    process.env.OC_ENV = 'development';
    expect(getProxyFetchUrl('http://localhost:9000/bucket/logo.png?v=1')).toBe(
      'http://localhost:9000/bucket/logo.png?v=1',
    );
    expect(getProxyFetchUrl('http://127.0.0.1:3000/logo.png')).toBeNull();
  });
});
