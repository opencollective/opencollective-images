import dns from 'dns';

import { assertSafeRemoteImageUrl, RemoteImageUrlNotAllowedError } from '../../src/server/lib/safe-remote-url';

describe('safe-remote-url', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects literal IP addresses', async () => {
    await expect(assertSafeRemoteImageUrl('http://127.0.0.1/image.png')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
    await expect(assertSafeRemoteImageUrl('http://169.254.169.254/latest/meta-data')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
  });

  it('rejects hostnames resolving to private addresses', async () => {
    jest.spyOn(dns.promises, 'resolve4').mockResolvedValue(['127.0.0.1']);
    jest.spyOn(dns.promises, 'resolve6').mockRejectedValue(new Error('no AAAA'));

    await expect(assertSafeRemoteImageUrl('https://evil.example/image.png')).rejects.toBeInstanceOf(
      RemoteImageUrlNotAllowedError,
    );
  });

  it('allows same-origin images service URLs in production', async () => {
    const previousImagesUrl = process.env.IMAGES_URL;
    const previousOcEnv = process.env.OC_ENV;
    process.env.IMAGES_URL = 'http://localhost:3001';
    process.env.OC_ENV = 'production';

    await expect(assertSafeRemoteImageUrl('http://localhost:3001/apex/avatar/rounded/64.png')).resolves.toBeUndefined();

    process.env.IMAGES_URL = previousImagesUrl;
    process.env.OC_ENV = previousOcEnv;
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

    await expect(assertSafeRemoteImageUrl('https://images.example.test/banner.png')).resolves.toBeUndefined();
  });
});
