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

describe('avatar.routes.test.js', () => {
  describe('Size Normalization', () => {
    describe('avatarHeight normalization', () => {
      test(
        'should cap avatarHeight at 512px when requesting 2000px',
        async () => {
          const res = await fetchResponse('/apex/backers/0/avatar.png?avatarHeight=2000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(512); // Capped at MAX_AVATAR_HEIGHT
        },
        timeout,
      );

      test(
        'should normalize 1px avatarHeight to 8px minimum',
        async () => {
          const res = await fetchResponse('/apex/backers/0/avatar.png?avatarHeight=1');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(8); // Minimum size
        },
        timeout,
      );

      test(
        'should round avatarHeight to next power of 2 (200px -> 256px)',
        async () => {
          const res = await fetchResponse('/apex/backers/0/avatar.png?avatarHeight=200');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(256); // Next power of 2
        },
        timeout,
      );

      test(
        'should keep exact power of 2 avatarHeight unchanged (128px)',
        async () => {
          const res = await fetchResponse('/apex/backers/0/avatar.png?avatarHeight=128');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(128); // Already power of 2
        },
        timeout,
      );
    });

    describe('different backer types and tiers maintain normalization', () => {
      test(
        'should normalize size for sponsors',
        async () => {
          const res = await fetchResponse('/apex/sponsors/0/avatar.png?avatarHeight=1000');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(64); // Capped at MAX_AVATAR_HEIGHT
        },
        timeout,
      );

      test(
        'should normalize size for tier-specific avatars',
        async () => {
          const res = await fetchResponse('/apex/tiers/backers/0/avatar.png?avatarHeight=3');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(64); // Minimum size
        },
        timeout,
      );

      test(
        'should normalize size for organization avatars',
        async () => {
          const res = await fetchResponse('/apex/organizations/0/avatar.png?avatarHeight=75');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(128); // Next power of 2 (75 -> 128)
        },
        timeout,
      );
    });

    describe('default size handling with tier multipliers', () => {
      test(
        'should respect size normalization even with tier multipliers',
        async () => {
          // Test with a size that would exceed MAX_AVATAR_HEIGHT after tier multiplier
          const res = await fetchResponse('/apex/tiers/diamond/0/avatar.png?avatarHeight=300');
          expect(res.status).toEqual(200);

          const buffer = await res.buffer();
          const metadata = await sharp(buffer).metadata();
          expect(metadata.height).toEqual(64); // Should be capped despite multiplier
        },
        timeout,
      );
    });
  });
});
