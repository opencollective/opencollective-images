import '../../../src/server/env';

import { mockImageResponse } from '../helpers/images';
import { describeLiveServer, fetchFromImagesServer, LIVE_SERVER_TIMEOUT } from '../helpers/live-server';
import { startRouteTestServer } from '../helpers/route-server';

jest.mock('../../../src/server/lib/graphql');
jest.mock('../../../src/server/lib/request');

import { fetchMembersWithCache } from '../../../src/server/lib/graphql';
import { imageRequest } from '../../../src/server/lib/request';

describe('src/server/controllers/banner.js', () => {
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
      const res = await testServer.get('/apex/backers.svg?limit=1&button=false');

      expect(res.status).toEqual(200);
      expect(res.headers.get('content-type')).toMatch(/image\/svg\+xml/);
      expect(await res.text()).toMatch(/<svg/);
      expect(imageRequest).toHaveBeenCalled();
    });
  });

  describeLiveServer('live server responses', () => {
    test(
      'loads the tier backers banner (svg)',
      async () => {
        const res = await fetchFromImagesServer('/apex/tiers/backers.svg');
        expect(res.status).toEqual(200);
      },
      LIVE_SERVER_TIMEOUT,
    );

    test(
      'loads the contributors mosaic',
      async () => {
        const res = await fetchFromImagesServer('/apex/contributors.svg?width=500');
        expect(res.status).toEqual(200);
        expect(res.headers.get('content-type')).toMatch('image/svg+xml');
        expect(res.headers.get('content-type')).toMatch('charset=utf-8');
        expect(res.headers.get('cache-control')).toMatch(/public, max-age=[1-9][0-9]{2,5}/);
        const text = await res.text();
        expect(text.length).toBeGreaterThan(800000);
      },
      LIVE_SERVER_TIMEOUT,
    );
  });
});
