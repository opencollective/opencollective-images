import '../../src/server/env';

import express from 'express';
import fetch from 'node-fetch';

import { RemoteImageUrlNotAllowedError } from '../../src/server/lib/safe-remote-url';
import { loadRoutes } from '../../src/server/routes';

jest.mock('../../src/server/lib/graphql');
jest.mock('../../src/server/lib/request');
jest.mock('../../src/server/lib/ascii-logo');

jest.mock('sharp', () => {
  const chain = {
    resize: jest.fn(() => {
      return chain;
    }),
    composite: jest.fn(() => {
      return chain;
    }),
    flatten: jest.fn(() => {
      return chain;
    }),
    jpeg: jest.fn(() => {
      return chain;
    }),
    toFormat: jest.fn(() => {
      return chain;
    }),
    toBuffer: jest.fn().mockResolvedValue(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+BAQAHggJ/PpI2ywAAAABJRU5ErkJggg==',
        'base64',
      ),
    ),
  };
  return jest.fn(() => chain);
});

import { generateAsciiLogo } from '../../src/server/lib/ascii-logo';
import { fetchCollectiveWithCache, fetchMembersWithCache } from '../../src/server/lib/graphql';
import { fetchRemoteImageBody, imageRequest } from '../../src/server/lib/request';

const pngBody = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+BAQAHggJ/PpI2ywAAAABJRU5ErkJggg==',
  'base64',
);

const mockImageResponse = () => ({
  statusCode: 200,
  statusMessage: 'OK',
  headers: { 'content-type': 'image/png' },
  body: pngBody,
});

describe('remote image endpoints', () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    const app = express();
    loadRoutes(app);
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchRemoteImageBody.mockResolvedValue({
      response: mockImageResponse(),
      body: pngBody,
    });
    imageRequest.mockResolvedValue(mockImageResponse());
    generateAsciiLogo.mockResolvedValue('ASCII');
  });

  const get = (path) => fetch(`${baseUrl}${path}`);

  describe('background', () => {
    beforeEach(() => {
      fetchCollectiveWithCache.mockResolvedValue({
        id: 42,
        type: 'COLLECTIVE',
        name: 'Test Collective',
        backgroundImage: 'https://cdn.example/hero.png',
      });
    });

    it('returns 400 when the remote image URL is blocked', async () => {
      imageRequest.mockRejectedValue(new RemoteImageUrlNotAllowedError('blocked'));

      const res = await get('/test-collective/background.png');

      expect(res.status).toEqual(400);
      expect(await res.text()).toEqual('Invalid image URL');
      expect(imageRequest).toHaveBeenCalledWith('https://cdn.example/hero.png');
    });

    it('returns resized image data when the remote fetch succeeds', async () => {
      const res = await get('/test-collective/background.png?width=64&height=64');

      expect(res.status).toEqual(200);
      expect(res.headers.get('content-type')).toMatch(/image\/png/);
      expect(Buffer.from(await res.buffer()).equals(pngBody)).toBe(true);
    });

    it('returns 502 when the remote fetch fails for other reasons', async () => {
      imageRequest.mockRejectedValue(new Error('upstream timeout'));

      const res = await get('/test-collective/background.png');

      expect(res.status).toEqual(502);
      expect(await res.text()).toEqual('Bad Gateway');
    });
  });

  describe('logo (raster)', () => {
    it('returns 400 when the remote image URL is blocked', async () => {
      fetchCollectiveWithCache.mockResolvedValue({
        id: 7,
        type: 'ORGANIZATION',
        name: 'Remote Org',
        image: 'https://cdn.example/logo.png',
      });
      fetchRemoteImageBody.mockRejectedValue(new RemoteImageUrlNotAllowedError('blocked'));

      const res = await get('/remote-org/logo.png');

      expect(res.status).toEqual(400);
      expect(await res.text()).toEqual('Invalid image URL');
      expect(fetchRemoteImageBody).toHaveBeenCalledWith('https://cdn.example/logo.png');
    });

    it('returns image data when the remote fetch succeeds', async () => {
      fetchCollectiveWithCache.mockResolvedValue({
        id: 7,
        type: 'ORGANIZATION',
        name: 'Remote Org',
        image: 'https://cdn.example/logo.png',
      });

      const res = await get('/remote-org/logo.png?height=64');

      expect(res.status).toEqual(200);
      expect(res.headers.get('content-type')).toMatch(/image\/png/);
    });

    it('serves bundled static logos without a remote fetch', async () => {
      fetchCollectiveWithCache.mockResolvedValue({
        id: 1,
        type: 'COLLECTIVE',
        name: 'Default Collective',
      });

      const res = await get('/default-collective/logo.png?height=64');

      expect(res.status).toEqual(200);
      expect(fetchRemoteImageBody).not.toHaveBeenCalled();
    });
  });

  describe('logo (txt)', () => {
    beforeEach(() => {
      fetchCollectiveWithCache.mockResolvedValue({
        id: 9,
        type: 'ORGANIZATION',
        name: 'Ascii Org',
        image: 'https://cdn.example/logo.png',
      });
    });

    it('returns 400 when the remote image URL is blocked', async () => {
      fetchRemoteImageBody.mockRejectedValue(new RemoteImageUrlNotAllowedError('blocked'));

      const res = await get('/ascii-org/logo.txt');

      expect(res.status).toEqual(400);
      expect(await res.text()).toEqual('Invalid image URL');
    });

    it('returns ascii output when the remote fetch succeeds', async () => {
      const res = await get('/ascii-org/logo.txt');

      expect(res.status).toEqual(200);
      expect(res.headers.get('content-type')).toMatch(/text\/plain/);
      expect(await res.text()).toEqual('ASCII\n');
      expect(generateAsciiLogo).toHaveBeenCalled();
      expect(fetchRemoteImageBody).toHaveBeenCalledWith('https://cdn.example/logo.png');
    });
  });

  describe('avatar', () => {
    const member = {
      slug: 'sponsor-org',
      type: 'ORGANIZATION',
      name: 'Sponsor Org',
      image: 'https://cdn.example/sponsor.png',
    };

    beforeEach(() => {
      fetchMembersWithCache.mockResolvedValue([member]);
    });

    it('returns 400 when the nested logo fetch is blocked', async () => {
      imageRequest.mockRejectedValue(new RemoteImageUrlNotAllowedError('blocked'));

      const res = await get('/apex/sponsors/0/avatar.png?avatarHeight=64');

      expect(res.status).toEqual(400);
      expect(await res.text()).toEqual('Unable to fetch image.');
      expect(imageRequest).toHaveBeenCalled();
    });

    it('returns image data when the nested logo fetch succeeds', async () => {
      const res = await get('/apex/sponsors/0/avatar.png?avatarHeight=64');

      expect(res.status).toEqual(200);
      expect(res.headers.get('content-type')).toMatch(/image\/png/);
      expect(res.headers.get('cache-control')).toMatch(/max-age=7200/);
    });

    it('returns svg when the nested logo fetch succeeds', async () => {
      const res = await get('/apex/sponsors/0/avatar.svg?avatarHeight=64');

      expect(res.status).toEqual(200);
      expect(res.headers.get('content-type')).toMatch(/image\/svg\+xml/);
      expect(await res.text()).toMatch(/<svg/);
    });
  });

  describe('banner', () => {
    beforeEach(() => {
      fetchMembersWithCache.mockResolvedValue([
        {
          slug: 'backer-user',
          type: 'USER',
          name: 'Backer',
          image: null,
        },
      ]);
    });

    it('still renders when avatar sub-requests succeed', async () => {
      const res = await get('/apex/backers.svg?limit=1&button=false');

      expect(res.status).toEqual(200);
      expect(res.headers.get('content-type')).toMatch(/image\/svg\+xml/);
      expect(await res.text()).toMatch(/<svg/);
      expect(imageRequest).toHaveBeenCalled();
    });
  });
});
