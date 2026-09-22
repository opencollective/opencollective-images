import '../../../src/server/env';

import { RemoteImageUrlNotAllowedError } from '../../../src/server/lib/safe-remote-url';
import { mockImageResponse, pngBody } from '../helpers/images';
import { describeLiveServer, fetchFromImagesServer, LIVE_SERVER_TIMEOUT } from '../helpers/live-server';
import { startRouteTestServer } from '../helpers/route-server';

jest.mock('../../../src/server/lib/graphql');
jest.mock('../../../src/server/lib/request');
jest.mock('../../../src/server/lib/ascii-logo');

import sharp from 'sharp';

import { generateAsciiLogo } from '../../../src/server/lib/ascii-logo';
import { fetchCollectiveWithCache } from '../../../src/server/lib/graphql';
import { fetchRemoteImageBody } from '../../../src/server/lib/request';

describe('src/server/controllers/logo.js', () => {
  describe('remote image fetching', () => {
    let testServer;

    beforeAll(async () => {
      testServer = await startRouteTestServer();
    });

    afterAll(async () => {
      await testServer.close();
    });

    beforeEach(() => {
      jest.clearAllMocks();
      fetchRemoteImageBody.mockResolvedValue({
        response: mockImageResponse(),
        body: pngBody,
      });
      generateAsciiLogo.mockResolvedValue('ASCII');
    });

    describe('raster formats', () => {
      it('returns 400 when the remote image URL is blocked', async () => {
        fetchCollectiveWithCache.mockResolvedValue({
          id: 7,
          type: 'ORGANIZATION',
          name: 'Remote Org',
          image: 'https://cdn.example/logo.png',
        });
        fetchRemoteImageBody.mockRejectedValue(new RemoteImageUrlNotAllowedError('blocked'));

        const res = await testServer.get('/remote-org/logo.png');

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

        const res = await testServer.get('/remote-org/logo.png?height=64');

        expect(res.status).toEqual(200);
        expect(res.headers.get('content-type')).toMatch(/image\/png/);
      });

      it('serves bundled static logos without a remote fetch', async () => {
        fetchCollectiveWithCache.mockResolvedValue({
          id: 1,
          type: 'COLLECTIVE',
          name: 'Default Collective',
        });

        const res = await testServer.get('/default-collective/logo.png?height=64');

        expect(res.status).toEqual(200);
        expect(fetchRemoteImageBody).not.toHaveBeenCalled();
      });
    });

    describe('txt format', () => {
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

        const res = await testServer.get('/ascii-org/logo.txt');

        expect(res.status).toEqual(400);
        expect(await res.text()).toEqual('Invalid image URL');
      });

      it('returns ascii output when the remote fetch succeeds', async () => {
        const res = await testServer.get('/ascii-org/logo.txt');

        expect(res.status).toEqual(200);
        expect(res.headers.get('content-type')).toMatch(/text\/plain/);
        expect(await res.text()).toEqual('ASCII\n');
        expect(generateAsciiLogo).toHaveBeenCalled();
        expect(fetchRemoteImageBody).toHaveBeenCalledWith('https://cdn.example/logo.png');
      });
    });
  });

  describeLiveServer('size normalization', () => {
    describe('height normalization', () => {
      test(
        'caps height at 512px when requesting 2000px',
        async () => {
          const res = await fetchFromImagesServer('/railsgirlsatl/logo.png?height=2000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(512);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'normalizes 1px height to 8px minimum',
        async () => {
          const res = await fetchFromImagesServer('/railsgirlsatl/logo.png?height=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(8);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'rounds height to next power of 2 (100px -> 128px)',
        async () => {
          const res = await fetchFromImagesServer('/railsgirlsatl/logo.png?height=100');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(128);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'keeps exact power of 2 height unchanged (64px)',
        async () => {
          const res = await fetchFromImagesServer('/railsgirlsatl/logo.png?height=64');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(64);
        },
        LIVE_SERVER_TIMEOUT,
      );
    });

    describe('width normalization', () => {
      test(
        'caps width at 512px when requesting 2000px',
        async () => {
          const res = await fetchFromImagesServer('/railsgirlsatl/logo.png?width=2000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(512);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'normalizes 1px width to 8px minimum',
        async () => {
          const res = await fetchFromImagesServer('/railsgirlsatl/logo.png?width=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(8);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'rounds width to next power of 2 (50px -> 64px)',
        async () => {
          const res = await fetchFromImagesServer('/railsgirlsatl/logo.png?width=50');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(64);
        },
        LIVE_SERVER_TIMEOUT,
      );
    });

    describe('combined width and height normalization', () => {
      test(
        'normalizes both dimensions independently',
        async () => {
          const res = await fetchFromImagesServer('/railsgirlsatl/logo.png?width=3000&height=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(512);
          expect(metadata.height).toEqual(8);
        },
        LIVE_SERVER_TIMEOUT,
      );
    });
  });

  describeLiveServer('live server responses', () => {
    test(
      'loads the logo in ascii',
      async () => {
        const res = await fetchFromImagesServer('/railsgirlsatl/logo.txt');
        expect(res.status).toEqual(200);
        expect(res.headers.get('content-type')).toEqual('text/plain; charset=utf-8');
        expect(res.headers.get('cache-control')).toMatch(/public, max-age=[1-9][0-9]{3,7}/);
        const text = await res.text();
        expect(text.length).toBeGreaterThan(600);
        expect(text.length).toBeLessThan(1000);
      },
      LIVE_SERVER_TIMEOUT,
    );
  });
});
