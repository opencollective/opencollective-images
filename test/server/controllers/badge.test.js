import '../../../src/server/env';

import { describeLiveServer, fetchFromImagesServer, fetchTextFromImagesServer, LIVE_SERVER_TIMEOUT } from '../helpers/live-server';

describe('src/server/controllers/badge.js', () => {
  describeLiveServer('live server responses', () => {
    test(
      "returns a 404 if slug doesn't exist",
      async () => {
        const res = await fetchFromImagesServer('/webpack222/backers/badge.svg');
        expect(res.status).toEqual(404);
      },
      LIVE_SERVER_TIMEOUT,
    );

    test(
      'loads the backers badge',
      async () => {
        const resText = await fetchTextFromImagesServer('/apex/backers/badge.svg');
        expect(resText).toMatch(/backers<\/text>/);
      },
      LIVE_SERVER_TIMEOUT,
    );

    test(
      'loads the sponsors badge',
      async () => {
        const resText = await fetchTextFromImagesServer('/apex/sponsors/badge.svg');
        expect(resText).toMatch(/sponsors<\/text>/i);
      },
      LIVE_SERVER_TIMEOUT,
    );

    test(
      'loads the tier sponsors badge',
      async () => {
        const resText = await fetchTextFromImagesServer('/apex/tiers/sponsors/badge.svg');
        expect(resText).toMatch(/sponsors<\/text>/i);
      },
      LIVE_SERVER_TIMEOUT,
    );
  });
});
