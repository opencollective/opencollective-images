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

describe('background.routes.test.js', () => {
  describe('Size Normalization', () => {
    describe('width normalization (max 1800px)', () => {
      test(
        'should cap width at 1800px when requesting 3000px',
        async () => {
          const res = await fetchResponse('/cloudflare/background.png?width=3000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(1800); // Capped at 1800
        },
        timeout,
      );

      test(
        'should normalize 1px width to 8px minimum',
        async () => {
          const res = await fetchResponse('/cloudflare/background.png?width=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(8); // Minimum size
        },
        timeout,
      );

      test(
        'should round width to next power of 2 (1000px -> 1024px)',
        async () => {
          const res = await fetchResponse('/cloudflare/background.png?width=1000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(1024); // Next power of 2
        },
        timeout,
      );

      test(
        'should keep exact power of 2 width unchanged (512px)',
        async () => {
          const res = await fetchResponse('/cloudflare/background.png?width=512');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(512); // Already power of 2
        },
        timeout,
      );
    });

    describe('height normalization (max 800px)', () => {
      test(
        'should cap height at 800px when requesting 2000px',
        async () => {
          const res = await fetchResponse('/cloudflare/background.png?height=2000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(800); // Capped at 800
        },
        timeout,
      );

      test(
        'should normalize 1px height to 8px minimum',
        async () => {
          const res = await fetchResponse('/cloudflare/background.png?height=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(8); // Minimum size
        },
        timeout,
      );

      test(
        'should round height to next power of 2 (300px -> 512px)',
        async () => {
          const res = await fetchResponse('/cloudflare/background.png?height=300');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(512); // Next power of 2
        },
        timeout,
      );

      test(
        'should keep exact power of 2 height unchanged (256px)',
        async () => {
          const res = await fetchResponse('/cloudflare/background.png?height=256');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(256); // Already power of 2
        },
        timeout,
      );
    });

    describe('combined width and height normalization', () => {
      test(
        'should normalize both dimensions with different maximums',
        async () => {
          const res = await fetchResponse('/cloudflare/background.png?width=5000&height=3000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(1800); // Capped at width max
          expect(metadata.height).toEqual(800); // Capped at height max
        },
        timeout,
      );

      test(
        'should normalize both dimensions to minimums',
        async () => {
          const res = await fetchResponse('/cloudflare/background.png?width=2&height=3');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(8); // Minimum
          expect(metadata.height).toEqual(8); // Minimum
        },
        timeout,
      );

      test(
        'should normalize mixed sizes (small width, large height)',
        async () => {
          const res = await fetchResponse('/cloudflare/background.png?width=5&height=1500');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(8); // Minimum
          expect(metadata.height).toEqual(800); // Capped
        },
        timeout,
      );
    });

    describe('edge cases and specific sizes', () => {
      test(
        'should handle typical profile hero dimensions correctly',
        async () => {
          // Test a size close to the typical 1800x800 profile hero
          const res = await fetchResponse('/cloudflare/background.png?width=1700&height=750');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.width).toEqual(1800); // 1700 -> 1800 (capped)
          expect(metadata.height).toEqual(800); // 750 -> 800 (capped)
        },
        timeout,
      );
    });
  });
});
