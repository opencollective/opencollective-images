import express from 'express';

import { loadRoutes } from '../../src/server/routes';

// Route matching only: every controller answers with the route params it received.
jest.mock('../../src/server/controllers', () => {
  const echo = (name) => (req, res) => res.json({ controller: name, params: req.params });
  return {
    __esModule: true,
    default: {
      avatar: echo('avatar'),
      background: echo('background'),
      badge: echo('badge'),
      banner: echo('banner'),
      logo: echo('logo'),
      proxy: echo('proxy'),
      website: echo('website'),
    },
  };
});

let server, baseUrl, savedDebugSentryKey;

beforeAll(async () => {
  savedDebugSentryKey = process.env.DEBUG_SENTRY_KEY;
  process.env.DEBUG_SENTRY_KEY = 'shared-secret';
  const app = express();
  loadRoutes(app);
  app.use((req, res) => res.status(404).json({ controller: null }));
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => {
  if (savedDebugSentryKey === undefined) {
    delete process.env.DEBUG_SENTRY_KEY;
  } else {
    process.env.DEBUG_SENTRY_KEY = savedDebugSentryKey;
  }
  return server.close();
});

const route = async (path) => (await fetch(`${baseUrl}${path}`)).json();

const logo = (params) => ({ controller: 'logo', params });
const background = (params) => ({ controller: 'background', params });
const avatar = (params) => ({ controller: 'avatar', params });

describe('routes.test.js', () => {
  test.each([
    ['/apex/logo.png', logo({ collectiveSlug: 'apex', image: 'logo', format: 'png' })],
    ['/apex/avatar.txt', { controller: null }],
    ['/proxy/images?src=https%3A%2F%2Fexample.com%2Fa.png', { controller: 'proxy', params: {} }],
    ['/apex/logo/100.png', logo({ collectiveSlug: 'apex', image: 'logo', height: '100', format: 'png' })],
    [
      '/apex/logo/100/200.png',
      logo({ collectiveSlug: 'apex', image: 'logo', height: '100', width: '200', format: 'png' }),
    ],
    ['/apex/logo/rounded.png', logo({ collectiveSlug: 'apex', image: 'logo', style: 'rounded', format: 'png' })],
    [
      '/apex/logo/rounded/100.png',
      logo({ collectiveSlug: 'apex', image: 'logo', style: 'rounded', height: '100', format: 'png' }),
    ],
    [
      '/apex/logo/rounded/100/200.png',
      logo({ collectiveSlug: 'apex', image: 'logo', style: 'rounded', height: '100', width: '200', format: 'png' }),
    ],
    ['/apex/abc123/logo.png', logo({ collectiveSlug: 'apex', hash: 'abc123', image: 'logo', format: 'png' })],
    [
      '/apex/abc123/logo/100.png',
      logo({ collectiveSlug: 'apex', hash: 'abc123', image: 'logo', height: '100', format: 'png' }),
    ],
    [
      '/apex/abc123/avatar/square/64/64.svg',
      logo({
        collectiveSlug: 'apex',
        hash: 'abc123',
        image: 'avatar',
        style: 'square',
        height: '64',
        width: '64',
        format: 'svg',
      }),
    ],
    // Express string routes are case-insensitive and non-strict about the trailing slash
    ['/apex/LOGO.png', logo({ collectiveSlug: 'apex', image: 'LOGO', format: 'png' })],
    ['/apex/logo.png/', logo({ collectiveSlug: 'apex', image: 'logo', format: 'png' })],
    ['/apex/background.png/', background({ collectiveSlug: 'apex', format: 'png' })],
    ['/apex/backers/0/AVATAR', avatar({ collectiveSlug: 'apex', backerType: 'backers', position: '0' })],
    [
      '/apex/tiers/gold/0/avatar.svg/',
      avatar({ collectiveSlug: 'apex', tierSlug: 'gold', position: '0', format: 'svg' }),
    ],
    ['/apex/logo.gif', { controller: null }],
    ['/apex/background.png', background({ collectiveSlug: 'apex', format: 'png' })],
    [
      '/apex/background/100/300.jpg',
      background({ collectiveSlug: 'apex', height: '100', width: '300', format: 'jpg' }),
    ],
    [
      '/apex/abc123/background/100.png',
      background({ collectiveSlug: 'apex', hash: 'abc123', height: '100', format: 'png' }),
    ],
    ['/apex/background.gif', { controller: null }],
    ['/apex/backers.svg', { controller: 'banner', params: { collectiveSlug: 'apex', backerType: 'backers' } }],
    ['/apex/backers/badge.svg', { controller: 'badge', params: { collectiveSlug: 'apex', backerType: 'backers' } }],
    [
      '/apex/backers/0/website',
      { controller: 'website', params: { collectiveSlug: 'apex', backerType: 'backers', position: '0' } },
    ],
    ['/apex/backers/0/avatar', avatar({ collectiveSlug: 'apex', backerType: 'backers', position: '0' })],
    [
      '/apex/backers/0/avatar.png',
      avatar({ collectiveSlug: 'apex', backerType: 'backers', position: '0', format: 'png' }),
    ],
    ['/apex/backers/0/avatar.gif', { controller: null }],
    ['/apex/tiers/gold.svg', { controller: 'banner', params: { collectiveSlug: 'apex', tierSlug: 'gold' } }],
    ['/apex/tiers/gold/badge.svg', { controller: 'badge', params: { collectiveSlug: 'apex', tierSlug: 'gold' } }],
    [
      '/apex/tiers/gold/0/website',
      { controller: 'website', params: { collectiveSlug: 'apex', tierSlug: 'gold', position: '0' } },
    ],
    ['/apex/tiers/gold/0/avatar', avatar({ collectiveSlug: 'apex', tierSlug: 'gold', position: '0' })],
    [
      '/apex/tiers/gold/0/avatar.svg',
      avatar({ collectiveSlug: 'apex', tierSlug: 'gold', position: '0', format: 'svg' }),
    ],
  ])('%s', async (path, expected) => {
    expect(await route(path)).toEqual(expected);
  });

  test('requires the configured key to trigger the Sentry debug error', async () => {
    const notFound = await fetch(`${baseUrl}/debug-sentry?key=wrong-secret`);
    expect(notFound.status).toBe(404);

    const triggered = await fetch(`${baseUrl}/debug-sentry?key=shared-secret`);
    expect(triggered.status).toBe(500);
  });
});
