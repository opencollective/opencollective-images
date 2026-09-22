import '../../../src/server/env';

import { RemoteImageUrlNotAllowedError } from '../../../src/server/lib/safe-remote-url';
import { mockImageResponse } from '../helpers/images';
import { describeLiveServer, fetchFromImagesServer, fetchTextFromImagesServer, LIVE_SERVER_TIMEOUT } from '../helpers/live-server';
import { startRouteTestServer } from '../helpers/route-server';

jest.mock('../../../src/server/lib/graphql');
jest.mock('../../../src/server/lib/request');

import sharp from 'sharp';

import { fetchMembersWithCache } from '../../../src/server/lib/graphql';
import { imageRequest } from '../../../src/server/lib/request';

describe('src/server/controllers/avatar.js', () => {
  describe('remote image fetching', () => {
    let testServer;

    const member = {
      slug: 'sponsor-org',
      type: 'ORGANIZATION',
      name: 'Sponsor Org',
      image: 'https://cdn.example/sponsor.png',
    };

    beforeAll(async () => {
      testServer = await startRouteTestServer();
    });

    afterAll(async () => {
      await testServer.close();
    });

    beforeEach(() => {
      jest.clearAllMocks();
      imageRequest.mockResolvedValue(mockImageResponse());
      fetchMembersWithCache.mockResolvedValue([member]);
    });

    it('returns 400 when the nested logo fetch is blocked', async () => {
      imageRequest.mockRejectedValue(new RemoteImageUrlNotAllowedError('blocked'));

      const res = await testServer.get('/apex/sponsors/0/avatar.png?avatarHeight=64');

      expect(res.status).toEqual(400);
      expect(await res.text()).toEqual('Unable to fetch image.');
      expect(imageRequest).toHaveBeenCalled();
    });

    it('returns image data when the nested logo fetch succeeds', async () => {
      const res = await testServer.get('/apex/sponsors/0/avatar.png?avatarHeight=64');

      expect(res.status).toEqual(200);
      expect(res.headers.get('content-type')).toMatch(/image\/png/);
      expect(res.headers.get('cache-control')).toMatch(/max-age=7200/);
    });

    it('returns svg when the nested logo fetch succeeds', async () => {
      const res = await testServer.get('/apex/sponsors/0/avatar.svg?avatarHeight=64');

      expect(res.status).toEqual(200);
      expect(res.headers.get('content-type')).toMatch(/image\/svg\+xml/);
      expect(await res.text()).toMatch(/<svg/);
    });
  });

  describeLiveServer('size normalization', () => {
    describe('avatarHeight normalization', () => {
      test(
        'caps avatarHeight at 512px when requesting 2000px',
        async () => {
          const res = await fetchFromImagesServer('/apex/backers/0/avatar.png?avatarHeight=2000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(512);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'normalizes 1px avatarHeight to 8px minimum',
        async () => {
          const res = await fetchFromImagesServer('/apex/backers/0/avatar.png?avatarHeight=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(8);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'rounds avatarHeight to next power of 2 (200px -> 256px)',
        async () => {
          const res = await fetchFromImagesServer('/apex/backers/0/avatar.png?avatarHeight=200');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(256);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'keeps exact power of 2 avatarHeight unchanged (128px)',
        async () => {
          const res = await fetchFromImagesServer('/apex/backers/0/avatar.png?avatarHeight=128');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(128);
        },
        LIVE_SERVER_TIMEOUT,
      );
    });

    describe('different backer types and tiers maintain normalization', () => {
      test(
        'normalizes size for sponsors',
        async () => {
          const res = await fetchFromImagesServer('/apex/sponsors/0/avatar.png?avatarHeight=1000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(64);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'normalizes size for tier-specific avatars',
        async () => {
          const res = await fetchFromImagesServer('/apex/tiers/backers/0/avatar.png?avatarHeight=3');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(64);
        },
        LIVE_SERVER_TIMEOUT,
      );

      test(
        'normalizes size for organization avatars',
        async () => {
          const res = await fetchFromImagesServer('/apex/organizations/0/avatar.png?avatarHeight=75');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(128);
        },
        LIVE_SERVER_TIMEOUT,
      );
    });

    describe('default size handling with tier multipliers', () => {
      test(
        'respects size normalization even with tier multipliers',
        async () => {
          const res = await fetchFromImagesServer('/apex/tiers/diamond/0/avatar.png?avatarHeight=300');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(64);
        },
        LIVE_SERVER_TIMEOUT,
      );
    });
  });

  describeLiveServer('live server responses', () => {
    test(
      'loads the first backer avatar.svg',
      async () => {
        const resText = await fetchTextFromImagesServer('/apex/backers/0/avatar.svg');
        expect(resText).toMatch(/<image width="64" height="64"/);
      },
      LIVE_SERVER_TIMEOUT,
    );

    test(
      'loads the first sponsor avatar.svg',
      async () => {
        const resText = await fetchTextFromImagesServer('/apex/sponsors/0/avatar.svg');
        expect(resText).toMatch(/height="64"/);
      },
      LIVE_SERVER_TIMEOUT,
    );

    test(
      'loads the first tier member avatar.svg',
      async () => {
        const resText = await fetchTextFromImagesServer('/apex/tiers/sponsors/0/avatar.svg?isActive=false');
        expect(resText).toMatch(
          /<svg xmlns="http:\/\/www.w3.org\/2000\/svg" xmlns:xlink="http:\/\/www.w3.org\/1999\/xlink"/,
        );
      },
      LIVE_SERVER_TIMEOUT,
    );
  });
});
