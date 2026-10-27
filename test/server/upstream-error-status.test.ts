import http from 'http';
import net from 'net';

import express from 'express';
import type { AddressInfo } from 'net';
import fetch from 'node-fetch';

import avatar from '../../src/server/controllers/avatar';
import logo from '../../src/server/controllers/logo';
import { CONTENT_SECURITY_POLICY, maxAge, securityHeaders } from '../../src/server/middlewares';

jest.mock('../../src/server/lib/graphql', () => ({
  fetchCollectiveWithCache: jest.fn(),
  fetchMembersWithCache: jest.fn(),
}));

const fetchCollectiveWithCacheMock = jest.requireMock('../../src/server/lib/graphql').fetchCollectiveWithCache;
const fetchMembersWithCacheMock = jest.requireMock('../../src/server/lib/graphql').fetchMembersWithCache;

const STATUS_TEXT = '<b>Custom status</b>';

const listen = (server: net.Server): Promise<string> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`));
  });

const close = (server: net.Server): Promise<unknown> => new Promise((resolve) => server.close(resolve));

/** An upstream that answers every request with the given status and a custom status text */
const createUpstream = () => {
  const state = { status: 404 };
  const server = net.createServer((socket) => {
    socket.once('data', () => {
      socket.end(`HTTP/1.1 ${state.status} ${STATUS_TEXT}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`);
    });
  });
  return { server, state };
};

describe('upstream error status', () => {
  const originalImagesUrl = process.env.IMAGES_URL;
  const upstream = createUpstream();
  const app = express();
  app.use(securityHeaders);
  // Same middlewares as in routes.js, which can't be loaded here (some dependencies are ESM-only)
  app.get('/:collectiveSlug/logo.:format', maxAge(24 * 60 * 60), logo);
  app.get('/:collectiveSlug/:backerType/:position/avatar.:format', maxAge(2 * 60 * 60), avatar);
  app.get('/ok', (req, res) => res.send('ok'));
  const server = http.createServer(app);
  let upstreamUrl: string, appUrl: string;

  beforeAll(async () => {
    upstreamUrl = await listen(upstream.server);
    appUrl = await listen(server);
  });

  afterAll(async () => {
    process.env.IMAGES_URL = originalImagesUrl;
    await close(server);
    await close(upstream.server);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    upstream.state.status = 404;
    // Avatars are served from the logo route of IMAGES_URL, here the upstream
    process.env.IMAGES_URL = upstreamUrl;
    fetchCollectiveWithCacheMock.mockResolvedValue({ id: 1, type: 'COLLECTIVE', image: `${upstreamUrl}/logo.png` });
    fetchMembersWithCacheMock.mockResolvedValue([{ type: 'USER', name: 'Jane', slug: 'jane' }]);
  });

  const expectStatusOnly = async (res, status) => {
    expect(res.status).toEqual(status);
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/);
    expect(await res.text()).not.toContain(STATUS_TEXT);
    expect(res.headers.get('content-security-policy')).toEqual(CONTENT_SECURITY_POLICY);
    expect(res.headers.get('x-content-type-options')).toEqual('nosniff');
  };

  describe.each([
    ['logo', '/example/logo.png'],
    ['avatar (svg)', '/example/backers/0/avatar.svg'],
    ['avatar (png)', '/example/backers/0/avatar.png'],
  ])('%s', (name, path) => {
    test('does not forward upstream status text', async () => {
      const res = await fetch(`${appUrl}${path}`);
      await expectStatusOnly(res, 404);
      expect(res.headers.get('cache-control')).toMatch(/^public/);
    });

    test('does not cache upstream server errors', async () => {
      upstream.state.status = 503;
      const res = await fetch(`${appUrl}${path}`);
      await expectStatusOnly(res, 503);
      expect(res.headers.get('cache-control')).toEqual('no-store');
    });
  });

  test('sets the security headers on successful responses', async () => {
    const res = await fetch(`${appUrl}/ok`);
    expect(res.status).toEqual(200);
    expect(res.headers.get('content-security-policy')).toEqual(CONTENT_SECURITY_POLICY);
    expect(res.headers.get('x-content-type-options')).toEqual('nosniff');
  });
});
