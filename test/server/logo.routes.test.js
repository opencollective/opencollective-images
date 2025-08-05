import '../../src/server/env';

import fetch from 'node-fetch';
import sharp from 'sharp';

const imagesUrl = process.env.IMAGES_URL;
const timeout = 30000;
const cacheBurst = `cacheBurst=${Math.round(Math.random() * 100000)}`;

const fetchResponse = (path) => {
  const pathWithCacheBurst = [path, cacheBurst].join(path.indexOf('?') === -1 ? '?' : '&');
  return fetch(`${imagesUrl}${pathWithCacheBurst}`);
};

describe('logo.routes.test.js', () => {
  describe('Size Normalization', () => {
    describe('height normalization', () => {
      test(
        'should cap height at 512px when requesting 2000px',
        async () => {
          const res = await fetchResponse('/railsgirlsatl/logo.png?height=2000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(512); // Capped at MAX_AVATAR_HEIGHT
        },
        timeout,
      );

      test(
        'should normalize 1px height to 8px minimum',
        async () => {
          const res = await fetchResponse('/railsgirlsatl/logo.png?height=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(8); // Minimum size
        },
        timeout,
      );

      test(
        'should round height to next power of 2 (100px -> 128px)',
        async () => {
          const res = await fetchResponse('/railsgirlsatl/logo.png?height=100');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(128); // Next power of 2
        },
        timeout,
      );

      test(
        'should keep exact power of 2 height unchanged (64px)',
        async () => {
          const res = await fetchResponse('/railsgirlsatl/logo.png?height=64');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(64); // Already power of 2
        },
        timeout,
      );
    });

    describe('width normalization', () => {
      test(
        'should cap width at 512px when requesting 2000px',
        async () => {
          const res = await fetchResponse('/railsgirlsatl/logo.png?width=2000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(512); // Capped at MAX_AVATAR_HEIGHT
        },
        timeout,
      );

      test(
        'should normalize 1px width to 8px minimum',
        async () => {
          const res = await fetchResponse('/railsgirlsatl/logo.png?width=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(8); // Minimum size
        },
        timeout,
      );

      test(
        'should round width to next power of 2 (50px -> 64px)',
        async () => {
          const res = await fetchResponse('/railsgirlsatl/logo.png?width=50');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(64); // Next power of 2
        },
        timeout,
      );
    });

    describe('combined width and height normalization', () => {
      test(
        'should normalize both dimensions independently',
        async () => {
          const res = await fetchResponse('/railsgirlsatl/logo.png?width=3000&height=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(512); // Capped
          expect(metadata.height).toEqual(8); // Minimum
        },
        timeout,
      );
    });
  });
});
