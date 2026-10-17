import fs from 'fs';
import path from 'path';

import { imageRequest } from '../../src/server/lib/request';
import { generateSvgBanner } from '../../src/server/lib/svg-banner';

// Run the image requests right away instead of through the concurrency limiter
jest.mock('p-limit', () => () => jest.fn((fn, ...args) => fn(...args)));

jest.mock('../../src/server/lib/request', () => ({
  imageRequest: jest.fn(),
}));

const png = fs.readFileSync(path.resolve(__dirname, '../../src/static/images/default-collective-logo-1.png'));

const users = [
  { slug: 'alice', type: 'USER', name: 'Alice', website: 'https://alice.example' },
  { slug: 'bob', type: 'USER', name: 'Bob', website: 'https://bob.example' },
  { slug: 'carol', type: 'USER', name: 'Carol', website: 'https://carol.example' },
];

const getLinks = (svg) =>
  [...svg.matchAll(/<a xlink:href="([^"]+)"[^>]* id="([^"]+)"/g)].map(([, href, id]) => ({ href, id }));

describe('svg-banner', () => {
  beforeEach(() => {
    imageRequest.mockResolvedValue({ statusCode: 200, headers: { 'content-type': 'image/png' }, body: png });
  });

  test('links the button to the collective when the limit is lower than the number of members', async () => {
    const svg = await generateSvgBanner(users, {
      limit: 2,
      buttonImage: 'https://images.example/static/images/become_backer.svg',
      collectiveSlug: 'test-collective',
    });

    expect(getLinks(svg)).toEqual([
      { href: 'https://alice.example', id: 'alice' },
      { href: 'https://bob.example', id: 'bob' },
      { href: expect.stringMatching(/\/test-collective#support$/), id: 'test-collective' },
    ]);
  });

  test('links every member and the button when there is no limit', async () => {
    const svg = await generateSvgBanner(users, {
      limit: Infinity,
      buttonImage: 'https://images.example/static/images/become_backer.svg',
      collectiveSlug: 'test-collective',
    });

    expect(getLinks(svg).map(({ id }) => id)).toEqual(['alice', 'bob', 'carol', 'test-collective']);
  });
});
