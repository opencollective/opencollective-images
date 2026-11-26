import http from 'http';

import express from 'express';
import type { AddressInfo } from 'net';
import fetch from 'node-fetch';
import sharp from 'sharp';

import logo from '../../src/server/controllers/logo';

jest.mock('../../src/server/lib/graphql', () => ({
  fetchCollectiveWithCache: jest.fn(),
}));

const fetchCollectiveWithCacheMock = jest.requireMock('../../src/server/lib/graphql').fetchCollectiveWithCache;

const listen = (server: http.Server): Promise<string> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`));
  });

const close = (server: http.Server): Promise<unknown> => new Promise((resolve) => server.close(resolve));

describe('logo controller', () => {
  // An upstream serving bytes that look like an image but can't be decoded
  const upstream = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xde, 0xad]));
  });
  const app = express();
  app.get('/:collectiveSlug/logo.:format', logo);
  const server = http.createServer(app);
  let upstreamUrl: string, appUrl: string;

  beforeAll(async () => {
    upstreamUrl = await listen(upstream);
    appUrl = await listen(server);
  });

  afterAll(async () => {
    await close(server);
    await close(upstream);
  });

  describe('when the image cannot be processed', () => {
    test.each([
      ['COLLECTIVE', 'png', 'image/png'],
      ['FUND', 'jpg', 'image/jpeg'],
      ['ORGANIZATION', 'png', 'image/png'],
      ['USER', 'png', 'image/png'],
    ])('serves a default logo for a %s (%s)', async (type, format, contentType) => {
      fetchCollectiveWithCacheMock.mockResolvedValue({ id: 1, type, name: 'Test', image: `${upstreamUrl}/broken.jpg` });
      const res = await fetch(`${appUrl}/example/logo.${format}?height=64`);
      expect(res.status).toEqual(200);
      expect(res.headers.get('content-type')).toEqual(contentType);
      expect(res.headers.get('cache-control')).toEqual('no-store');
      const metadata = await sharp(await res.buffer()).metadata();
      expect(metadata.height).toEqual(64);
    });

    test('serves a rounded default logo', async () => {
      fetchCollectiveWithCacheMock.mockResolvedValue({ id: 2, type: 'COLLECTIVE', image: `${upstreamUrl}/broken.jpg` });
      const res = await fetch(`${appUrl}/example/logo.png?height=32&style=rounded`);
      expect(res.status).toEqual(200);
      const metadata = await sharp(await res.buffer()).metadata();
      expect(metadata.width).toEqual(32);
      expect(metadata.height).toEqual(32);
    });
  });
});
