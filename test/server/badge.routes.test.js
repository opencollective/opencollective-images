import '../../src/server/env';

import fetch from 'node-fetch';

const imagesUrl = process.env.IMAGES_URL;

const timeout = 30000;

const cacheBurst = `cacheBurst=${Math.round(Math.random() * 100000)}`;

const fetchResponse = (path) => {
  const pathWithCacheBurst = [path, cacheBurst].join(path.indexOf('?') === -1 ? '?' : '&');
  return fetch(`${imagesUrl}${pathWithCacheBurst}`);
};

const fetchText = (path) => fetchResponse(path).then((response) => response.text());

describe('badge.routes.test.js', () => {
  describe('backerType (backers|sponsors)', () => {
    test(
      "returns a 404 if slug doesn't exist",
      async () => {
        const res = await fetchResponse('/webpack222/backers/badge.svg');
        expect(res.status).toEqual(404);
      },
      timeout,
    );

    test(
      'loads the backers badge',
      async () => {
        const resText = await fetchText('/apex/backers/badge.svg');
        expect(resText).toMatch(/backers<\/text>/);
      },
      timeout,
    );

    test(
      'loads the sponsors badge',
      async () => {
        const resText = await fetchText('/apex/sponsors/badge.svg');
        expect(resText).toMatch(/sponsors<\/text>/i);
      },
      timeout,
    );

    test(
      "returns a 404 if slug doesn't exist",
      async () => {
        const res = await fetchResponse('/apex222/backers/0/avatar.svg');
        expect(res.status).toEqual(404);
      },
      timeout,
    );

    test(
      'loads the first backer avatar.svg',
      async () => {
        const resText = await fetchText('/apex/backers/0/avatar.svg');
        expect(resText).toMatch(/<image width="64" height="64"/);
      },
      timeout,
    );

    test(
      'loads the first sponsor avatar.svg',
      async () => {
        const resText = await fetchText('/apex/sponsors/0/avatar.svg');
        expect(resText).toMatch(/height="64"/);
      },
      timeout,
    );
  });

  describe('custom tiers', () => {
    test(
      'loads the badge (svg)',
      async () => {
        const resText = await fetchText('/apex/tiers/sponsors/badge.svg');
        expect(resText).toMatch(/sponsors<\/text>/i);
      },
      timeout,
    );

    test(
      'loads the banner (svg)',
      async () => {
        const res = await fetchResponse('/apex/tiers/backers.svg');
        expect(res.status).toEqual(200);
      },
      timeout,
    );

    test.skip(
      'loads the banner (png)',
      async () => {
        const res = await fetchResponse('/apex/tiers/backers.png');
        expect(res.status).toEqual(200);
      },
      timeout,
    );

    test(
      'loads the first member avatar.svg',
      async () => {
        const resText = await fetchText('/apex/tiers/sponsors/0/avatar.svg?isActive=false');
        expect(resText).toMatch(
          /<svg xmlns="http:\/\/www.w3.org\/2000\/svg" xmlns:xlink="http:\/\/www.w3.org\/1999\/xlink"/,
        );
      },
      timeout,
    );
  });

  describe('contributors.svg', () => {
    test(
      'loads the mosaic',
      async () => {
        const res = await fetchResponse('/apex/contributors.svg?width=500');
        expect(res.status).toEqual(200);
        expect(res.headers.get('content-type')).toMatch('image/svg+xml');
        expect(res.headers.get('content-type')).toMatch('charset=utf-8');
        expect(res.headers.get('cache-control')).toMatch(/public, max-age=[1-9][0-9]{2,5}/);
        const text = await res.text();
        expect(text.length).toBeGreaterThan(800000);
      },
      timeout,
    );
  });

  describe('collective logo', () => {
    test(
      'loads the logo in ascii',
      async () => {
        const res = await fetchResponse('/railsgirlsatl/logo.txt');
        expect(res.status).toEqual(200);
        expect(res.headers.get('content-type')).toEqual('text/plain; charset=utf-8');
        expect(res.headers.get('cache-control')).toMatch(/public, max-age=[1-9][0-9]{3,7}/);
        const text = await res.text();
        expect(text.length).toBeGreaterThan(600);
        expect(text.length).toBeLessThan(1000);
      },
      timeout,
    );
  });
});
