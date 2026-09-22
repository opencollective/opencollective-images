import http from 'http';

import { imageRequest } from '../../src/server/lib/request';
import { assertSafeRemoteImageUrl, RemoteImageUrlNotAllowedError } from '../../src/server/lib/safe-remote-url';

jest.mock('../../src/server/lib/safe-remote-url', () => {
  const actual = jest.requireActual('../../src/server/lib/safe-remote-url');
  return {
    ...actual,
    assertSafeRemoteImageUrl: jest.fn().mockResolvedValue(undefined),
  };
});

const listen = (server) =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });

const close = (server) =>
  new Promise((resolve) => {
    server.close(resolve);
  });

describe('request.imageRequest', () => {
  let server;
  let port;
  let capturedHeaders;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      capturedHeaders = req.headers;
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    });
    port = await listen(server);
  });

  afterAll(async () => {
    await close(server);
  });

  beforeEach(() => {
    capturedHeaders = undefined;
    assertSafeRemoteImageUrl.mockReset();
    assertSafeRemoteImageUrl.mockResolvedValue(undefined);
  });

  it('does not send internal service headers to remote destinations', async () => {
    process.env.OC_SECRET = 'TEST_SECRET_ONLY';
    process.env.OC_ENV = 'security-test-local';
    process.env.OC_APPLICATION = 'opencollective-images-test';

    const url = `http://127.0.0.1:${port}/probe.png`;
    const response = await imageRequest(url);

    expect(response.statusCode).toEqual(200);
    expect(capturedHeaders['oc-secret']).toBeUndefined();
    expect(capturedHeaders['oc-env']).toBeUndefined();
    expect(capturedHeaders['oc-application']).toBeUndefined();
    expect(capturedHeaders['user-agent']).toEqual('opencollective-images/1.0');
  });

  it('connects to the addresses returned by the checker', async () => {
    assertSafeRemoteImageUrl.mockResolvedValue(['127.0.0.1']);

    const response = await imageRequest(`http://images.example:${port}/probe.png`);

    expect(response.statusCode).toEqual(200);
    expect(capturedHeaders.host).toEqual(`images.example:${port}`);
    expect(capturedHeaders['oc-secret']).toBeUndefined();
  });

  it('follows an allowed redirect without service headers', async () => {
    process.env.OC_SECRET = 'TEST_SECRET_ONLY';
    let redirectHeaders;
    const redirectServer = http.createServer((req, res) => {
      redirectHeaders = req.headers;
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    });
    const redirectPort = await listen(redirectServer);
    const redirectingServer = http.createServer((req, res) => {
      res.writeHead(302, { Location: `http://cdn.example:${redirectPort}/image.png` });
      res.end();
    });
    const redirectingPort = await listen(redirectingServer);
    assertSafeRemoteImageUrl.mockResolvedValue(['127.0.0.1']);

    try {
      const response = await imageRequest(`http://images.example:${redirectingPort}/start`);

      expect(response.statusCode).toEqual(200);
      expect(redirectHeaders['oc-secret']).toBeUndefined();
      expect(redirectHeaders['oc-env']).toBeUndefined();
      expect(redirectHeaders['oc-application']).toBeUndefined();
      expect(redirectHeaders['user-agent']).toEqual('opencollective-images/1.0');
      expect(assertSafeRemoteImageUrl).toHaveBeenCalledWith(`http://cdn.example:${redirectPort}/image.png`);
    } finally {
      await close(redirectingServer);
      await close(redirectServer);
    }
  });

  it('does not request a redirect target the checker rejects', async () => {
    let redirectHits = 0;
    const redirectServer = http.createServer((req, res) => {
      redirectHits += 1;
      res.end('nope');
    });
    const redirectPort = await listen(redirectServer);
    const redirectingServer = http.createServer((req, res) => {
      res.writeHead(302, { Location: `http://127.0.0.1:${redirectPort}/private` });
      res.end();
    });
    const redirectingPort = await listen(redirectingServer);
    assertSafeRemoteImageUrl.mockImplementation(async (url) => {
      if (url.includes(String(redirectPort))) {
        throw new RemoteImageUrlNotAllowedError('blocked');
      }
      return ['127.0.0.1'];
    });

    try {
      await expect(imageRequest(`http://images.example:${redirectingPort}/start`)).rejects.toBeInstanceOf(
        RemoteImageUrlNotAllowedError,
      );
      expect(redirectHits).toEqual(0);
    } finally {
      await close(redirectingServer);
      await close(redirectServer);
    }
  });

  it('does not send remote image requests through HTTP_PROXY', async () => {
    const previousHttpProxy = process.env.HTTP_PROXY;
    const previousHttpProxyLower = process.env.http_proxy;
    const previousNoProxy = process.env.NO_PROXY;
    const previousNoProxyLower = process.env.no_proxy;
    let proxyHits = 0;
    const proxy = http.createServer((req, res) => {
      proxyHits += 1;
      res.writeHead(500);
      res.end('proxy');
    });
    const proxyPort = await listen(proxy);
    process.env.HTTP_PROXY = `http://127.0.0.1:${proxyPort}`;
    process.env.http_proxy = process.env.HTTP_PROXY;
    delete process.env.NO_PROXY;
    delete process.env.no_proxy;
    assertSafeRemoteImageUrl.mockResolvedValue(['127.0.0.1']);

    try {
      const response = await imageRequest(`http://images.example:${port}/probe.png`);

      expect(response.statusCode).toEqual(200);
      expect(proxyHits).toEqual(0);
      expect(capturedHeaders.host).toEqual(`images.example:${port}`);
    } finally {
      if (previousHttpProxy === undefined) {
        delete process.env.HTTP_PROXY;
      } else {
        process.env.HTTP_PROXY = previousHttpProxy;
      }
      if (previousHttpProxyLower === undefined) {
        delete process.env.http_proxy;
      } else {
        process.env.http_proxy = previousHttpProxyLower;
      }
      if (previousNoProxy === undefined) {
        delete process.env.NO_PROXY;
      } else {
        process.env.NO_PROXY = previousNoProxy;
      }
      if (previousNoProxyLower === undefined) {
        delete process.env.no_proxy;
      } else {
        process.env.no_proxy = previousNoProxyLower;
      }
      await close(proxy);
    }
  });
});
