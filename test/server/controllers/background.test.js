import '../../../src/server/env';

import { RemoteImageUrlNotAllowedError } from '../../../src/server/lib/safe-remote-url';
import { mockImageResponse,pngBody } from '../helpers/images';
import { describeLiveServer, fetchFromImagesServer, LIVE_SERVER_TIMEOUT } from '../helpers/live-server';
import { startRouteTestServer } from '../helpers/route-server';

jest.mock('../../../src/server/lib/graphql');
jest.mock('../../../src/server/lib/request');

import sharp from 'sharp';

import { fetchCollectiveWithCache } from '../../../src/server/lib/graphql';
import { imageRequest } from '../../../src/server/lib/request';

describe('src/server/controllers/background.js', () => {
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
      imageRequest.mockResolvedValue(mockImageResponse());
      fetchCollectiveWithCache.mockResolvedValue({
        id: 42,
        type: 'COLLECTIVE',
        name: 'Test Collective',
        backgroundImage: 'https://cdn.example/hero.png',
      });
    });

    it('returns 400 when the remote image URL is blocked', async () => {
      imageRequest.mockRejectedValue(new RemoteImageUrlNotAllowedError('blocked'));

      const res = await testServer.get('/test-collective/background.png');

      expect(res.status).toEqual(400);
      expect(await res.text()).toEqual('Invalid image URL');
      expect(imageRequest).toHaveBeenCalledWith('https://cdn.example/hero.png');
    });

    it('returns resized image data when the remote fetch succeeds', async () => {
      const res = await testServer.get('/test-collective/background.png?width=64&height=64');

      expect(res.status).toEqual(200);
      expect(res.headers.get('content-type')).toMatch(/image\/png/);
      expect((await res.buffer()).length).toBeGreaterThan(0);
    });

    it('returns 502 when the remote fetch fails for other reasons', async () => {
      imageRequest.mockRejectedValue(new Error('upstream timeout'));

      const res = await testServer.get('/test-collective/background.png');

      expect(res.status).toEqual(502);
      expect(await res.text()).toEqual('Bad Gateway');
    });
  });

  describeLiveServer('size normalization', () => {
    describe('width normalization (max 1800px)', () => {
      test(
        'caps width at 1800px when requesting 3000px',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?width=3000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(1800);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'normalizes 1px width to 8px minimum',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?width=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(8);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'rounds width to next power of 2 (1000px -> 1024px)',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?width=1000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(1024);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'keeps exact power of 2 width unchanged (512px)',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?width=512');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(512);
        },
        LIVE_SERVER_TIMEOUT,
      );
    });

    describe('height normalization (max 800px)', () => {
      test(
        'caps height at 800px when requesting 2000px',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?height=2000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(800);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'normalizes 1px height to 8px minimum',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?height=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(8);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'rounds height to next power of 2 (300px -> 512px)',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?height=300');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(512);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'keeps exact power of 2 height unchanged (256px)',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?height=256');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(256);
        },
        LIVE_SERVER_TIMEOUT,
      );
    });

    describe('combined width and height normalization', () => {
      test(
        'normalizes both dimensions with different maximums',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?width=5000&height=3000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(1800);
          expect(metadata.height).toEqual(800);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'normalizes both dimensions to minimums',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?width=2&height=3');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(8);
          expect(metadata.height).toEqual(8);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'normalizes mixed sizes (small width, large height)',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?width=5&height=1500');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(8);
          expect(metadata.height).toEqual(800);
        },
        LIVE_SERVER_TIMEOUT,
      );
    });

    describe('edge cases and specific sizes', () => {
      test(
        'handles typical profile hero dimensions correctly',
        async () => {
          const res = await fetchFromImagesServer('/cloudflare/background.png?width=1700&height=750');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(1800);
          expect(metadata.height).toEqual(800);
        },
        LIVE_SERVER_TIMEOUT,
      );
    });
  });
});
