import dns from 'dns';

import {
  assertSafeRemoteImageUrl,
  isRemoteImageHttpUrl,
  RemoteImageUrlNotAllowedError,
} from '../../../src/server/lib/safe-remote-url';

describe('src/server/lib/safe-remote-url.js', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isRemoteImageHttpUrl', () => {
    it('treats absolute HTTP(S) and protocol-relative URLs as remote', () => {
      expect(isRemoteImageHttpUrl('https://gravatar.com/avatar/test')).toBe(true);
      expect(isRemoteImageHttpUrl('http://example.com/logo.png')).toBe(true);
      expect(isRemoteImageHttpUrl('  HTTPS://Example.COM/x  ')).toBe(true);
      expect(isRemoteImageHttpUrl('//cdn.example.com/logo.png')).toBe(true);
    });

    it('does not treat local static paths as remote when http appears elsewhere', () => {
      expect(isRemoteImageHttpUrl('/images/default-collective-logo-1.png')).toBe(false);
      expect(isRemoteImageHttpUrl('/images/path-with-https://not-a-scheme.png')).toBe(false);
      expect(isRemoteImageHttpUrl('/images/foo?redirect=https://evil.example')).toBe(false);
    });

    it('rejects non-http schemes and invalid values', () => {
      expect(isRemoteImageHttpUrl('file:///etc/passwd')).toBe(false);
      expect(isRemoteImageHttpUrl('javascript:alert(1)')).toBe(false);
      expect(isRemoteImageHttpUrl('')).toBe(false);
      expect(isRemoteImageHttpUrl(null)).toBe(false);
    });
  });

  const withEnv = async (env, fn) => {
    const previous = {};
    for (const key of Object.keys(env)) {
      previous[key] = process.env[key];
      if (env[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = env[key];
      }
    }
    try {
      await fn();
    } finally {
      for (const key of Object.keys(previous)) {
        if (previous[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = previous[key];
        }
      }
    }
  };

  it('rejects literal IP addresses', async () => {
    await expect(assertSafeRemoteImageUrl('http://127.0.0.1/image.png')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
    await expect(assertSafeRemoteImageUrl('http://169.254.169.254/latest/meta-data')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
    await expect(assertSafeRemoteImageUrl('http://2130706433/image.png')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
    await expect(assertSafeRemoteImageUrl('http://[::1]/image.png')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
    await expect(assertSafeRemoteImageUrl('http://[::ffff:169.254.169.254]/latest/meta-data')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
  });

  it('rejects disallowed hostnames and non-http URLs', async () => {
    await expect(assertSafeRemoteImageUrl('http://localhost./image.png')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
    await expect(assertSafeRemoteImageUrl('http://metadata.google.internal/image.png')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
    await expect(assertSafeRemoteImageUrl('http://printer.local/image.png')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
    await expect(assertSafeRemoteImageUrl('file:///etc/passwd')).rejects.toBeInstanceOf(RemoteImageUrlNotAllowedError);
  });

  it('rejects hostnames resolving to private addresses', async () => {
    jest.spyOn(dns.promises, 'resolve4').mockResolvedValue(['127.0.0.1']);
    jest.spyOn(dns.promises, 'resolve6').mockRejectedValue(new Error('no AAAA'));

    await expect(assertSafeRemoteImageUrl('https://evil.example/image.png')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
  });

  it('keeps routable addresses when another record is not routable', async () => {
    jest.spyOn(dns.promises, 'resolve4').mockResolvedValue(['8.8.8.8', '10.0.0.1']);
    jest.spyOn(dns.promises, 'resolve6').mockResolvedValue(['2001:4860:4860::8888', 'fd00::1']);

    await expect(assertSafeRemoteImageUrl('https://images.example.test/banner.png')).resolves.toEqual([
      '8.8.8.8',
      '2001:4860:4860::8888',
    ]);
  });

  it('allows loopback hosts during development and still rejects other literals', async () => {
    await withEnv({ OC_ENV: 'development' }, async () => {
      await expect(assertSafeRemoteImageUrl('http://localhost:9000/image.png')).resolves.toEqual(['127.0.0.1']);
      await expect(assertSafeRemoteImageUrl('http://127.0.0.1:9000/image.png')).resolves.toEqual(['127.0.0.1']);
      await expect(assertSafeRemoteImageUrl('http://[::1]:9000/image.png')).resolves.toEqual(['::1']);
      await expect(assertSafeRemoteImageUrl('http://169.254.169.254/latest/meta-data')).rejects.toBeInstanceOf(
        RemoteImageUrlNotAllowedError,
      );
    });
  });

  it('allows same-origin images service URLs in production', async () => {
    await withEnv({ IMAGES_URL: 'http://localhost:3001', OC_ENV: 'production' }, async () => {
      await expect(
        assertSafeRemoteImageUrl('http://localhost:3001/apex/avatar/rounded/64.png'),
      ).resolves.toBeUndefined();
    });
  });

  it('skips address checks only for same-site file URLs', async () => {
    await withEnv({ WEBSITE_URL: 'https://opencollective.com', OC_ENV: 'production' }, async () => {
      const resolve4 = jest.spyOn(dns.promises, 'resolve4').mockResolvedValue(['8.8.8.8']);
      jest.spyOn(dns.promises, 'resolve6').mockRejectedValue(new Error('no AAAA'));

      await expect(assertSafeRemoteImageUrl('https://opencollective.com/api/files/abc-123')).resolves.toBeUndefined();
      expect(resolve4).not.toHaveBeenCalled();

      await expect(assertSafeRemoteImageUrl('https://opencollective.com/logo.png')).resolves.toEqual(['8.8.8.8']);
    });
  });

  it('allows trusted image provider hosts without DNS resolution', async () => {
    const resolve4 = jest.spyOn(dns.promises, 'resolve4');
    const resolve6 = jest.spyOn(dns.promises, 'resolve6');

    await expect(assertSafeRemoteImageUrl('https://gravatar.com/avatar/test')).resolves.toBeUndefined();

    expect(resolve4).not.toHaveBeenCalled();
    expect(resolve6).not.toHaveBeenCalled();
  });

  it('allows public hostnames resolving to public addresses', async () => {
    jest.spyOn(dns.promises, 'resolve4').mockResolvedValue(['8.8.8.8']);
    jest.spyOn(dns.promises, 'resolve6').mockRejectedValue(new Error('no AAAA'));

    await expect(assertSafeRemoteImageUrl('https://images.example.test/banner.png')).resolves.toEqual(['8.8.8.8']);
  });
});
