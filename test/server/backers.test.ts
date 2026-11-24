import {
  fetchBackers,
  fetchTierBackers,
  hasOwnImage,
  isActiveBacker,
  isActiveTierOrder,
  toMember,
} from '../../src/server/lib/backers';

jest.mock('../../src/server/lib/graphql-client', () => ({
  graphqlRequest: jest.fn(),
}));

const graphqlRequestMock = jest.requireMock('../../src/server/lib/graphql-client').graphqlRequest;

const account = (overrides = {}) => ({
  slug: 'jane',
  name: 'Jane',
  type: 'INDIVIDUAL',
  imageUrl: 'https://images.opencollective.com/jane/avatar.png',
  website: null,
  twitterHandle: null,
  isGuest: false,
  ...overrides,
});

// Member rows: an account, or [account, { tier, isActive }] for its membership details
type TestAccount = ReturnType<typeof account>;
type RowDetails = { tier?: string | null; isActive?: boolean };
type RowEntry = TestAccount | null | [TestAccount, RowDetails?];

const row = (entry: RowEntry, i: number) => {
  const [a, details]: [TestAccount | null, RowDetails?] = Array.isArray(entry) ? entry : [entry];
  const { tier = null, isActive = true } = details ?? {};
  return { id: `m${i}`, isActive, tier: tier ? { id: tier } : null, account: a };
};
const response = (entries: RowEntry[], totalCount = entries.length) => ({
  data: { account: { id: 'abc', members: { totalCount, nodes: entries.map(row) } } },
});

describe('backers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasOwnImage', () => {
    test('is true when the image URL has the hash of an uploaded image', () => {
      expect(hasOwnImage('https://images.opencollective.com/jane/4d2a1b3/avatar.png')).toBe(true);
      expect(hasOwnImage('https://images.opencollective.com/acme/0f3c9e1/logo/64.png')).toBe(true);
    });

    test('is false for the default image, or no URL', () => {
      expect(hasOwnImage('https://images.opencollective.com/jane/avatar.png')).toBe(false);
      expect(hasOwnImage('https://images.opencollective.com/acme/logo/64.png')).toBe(false);
      expect(hasOwnImage(null)).toBe(false);
      expect(hasOwnImage('not a url')).toBe(false);
    });
  });

  describe('toMember', () => {
    test('maps v2 accounts to the v1 member shape the controllers read', () => {
      expect(
        toMember(
          account({
            imageUrl: 'https://images.opencollective.com/jane/4d2a1b3/avatar.png',
            website: 'https://jane.dev',
            twitterHandle: 'jane',
            isGuest: true,
          }),
        ),
      ).toEqual({
        type: 'USER',
        slug: 'jane',
        name: 'Jane',
        isGuest: true,
        image: 'https://images.opencollective.com/jane/4d2a1b3/avatar.png',
        website: 'https://jane.dev',
        twitterHandle: 'jane',
      });
      expect(toMember(account({ type: 'ORGANIZATION', slug: 'acme' })).type).toBe('ORGANIZATION');
      expect(toMember(account()).image).toBeNull();
    });
  });

  describe('isActiveBacker', () => {
    test('judges an account with tier memberships on those memberships only', () => {
      expect(isActiveBacker([{ tier: { id: 't' }, isActive: true }])).toBe(true);
      expect(isActiveBacker([{ tier: { id: 't' }, isActive: false }])).toBe(false);
      // A lapsed recurring sponsor with an old one-off contribution (always active without a tier) stays out
      expect(
        isActiveBacker([
          { tier: { id: 't' }, isActive: false },
          { tier: null, isActive: true },
        ]),
      ).toBe(false);
      expect(
        isActiveBacker([
          { tier: { id: 't1' }, isActive: false },
          { tier: { id: 't2' }, isActive: true },
        ]),
      ).toBe(true);
    });

    test('keeps accounts with only one-off contributions (no tier)', () => {
      expect(isActiveBacker([{ tier: null, isActive: true }])).toBe(true);
    });

    test('keeps accounts with a running monthly or yearly contribution, even if their tier lapsed', () => {
      expect(isActiveBacker([{ tier: { id: 't' }, isActive: false }], true)).toBe(true);
    });
  });

  describe('fetchBackers', () => {
    test('queries v2 for individuals, or organizations, collectives and funds for sponsors', async () => {
      graphqlRequestMock.mockResolvedValue(response([account()]));

      await fetchBackers({ collectiveSlug: 'babel', backerType: 'backers' });
      await fetchBackers({ collectiveSlug: 'babel', backerType: 'sponsors' });

      const [, variables, options] = graphqlRequestMock.mock.calls[0];
      expect(variables).toEqual({ slug: 'babel', accountType: ['INDIVIDUAL'], limit: 1000, offset: 0 });
      expect(options).toEqual({ version: 'v2' });
      expect(graphqlRequestMock.mock.calls[1][1].accountType).toEqual(['ORGANIZATION', 'COLLECTIVE', 'FUND']);
    });

    test('reads the next pages until every row is read', async () => {
      const page = (prefix: string) => Array.from({ length: 1000 }, (_, i) => account({ slug: `${prefix}-${i}` }));
      graphqlRequestMock
        .mockResolvedValueOnce(response(page('a'), 2500))
        .mockResolvedValueOnce(response(page('b'), 2500))
        .mockResolvedValueOnce(response(page('c').slice(0, 500), 2500));

      const members = await fetchBackers({ collectiveSlug: 'babel', backerType: 'backers' });

      expect(graphqlRequestMock.mock.calls.map((call: [unknown, { offset: number }]) => call[1].offset)).toEqual([
        0, 1000, 2000,
      ]);
      // At most 1,000 backers in the list
      expect(members).toHaveLength(1000);
    });

    test('active only: per account, a lapsed tier is not saved by a one-off contribution', async () => {
      graphqlRequestMock.mockResolvedValue(
        response([
          [account({ slug: 'lapsed-sponsor' }), { tier: 'monthly', isActive: false }],
          [account({ slug: 'lapsed-sponsor' }), { isActive: true }], // An old one-off contribution
          [account({ slug: 'one-off' }), { isActive: true }],
          [account({ slug: 'current-sponsor' }), { tier: 'monthly', isActive: true }],
          [account({ slug: 'lapsed-backer' }), { tier: 'yearly', isActive: false }],
        ]),
      );

      const active = await fetchBackers({ collectiveSlug: 'babel', backerType: 'sponsors', isActive: true });
      expect(active.map((m) => m.slug)).toEqual(['one-off', 'current-sponsor']);

      const all = await fetchBackers({ collectiveSlug: 'babel', backerType: 'sponsors', isActive: false });
      expect(all.map((m) => m.slug)).toEqual(['lapsed-sponsor', 'one-off', 'current-sponsor', 'lapsed-backer']);
    });

    test('active only: a running contribution without a tier keeps an account whose tier lapsed', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce(
          response([
            [account({ slug: 'gitbook' }), { tier: 'monthly', isActive: false }],
            [account({ slug: 'gitbook' }), { isActive: true }],
            [account({ slug: 'lapsed' }), { tier: 'monthly', isActive: false }],
          ]),
        )
        .mockResolvedValueOnce({
          data: { account: { id: 'abc', orders: { totalCount: 1, nodes: [{ fromAccount: { slug: 'gitbook' } }] } } },
        });

      const active = await fetchBackers({ collectiveSlug: 'webpack', backerType: 'sponsors', isActive: true });

      expect(active.map((m) => m.slug)).toEqual(['gitbook']);
      expect(graphqlRequestMock.mock.calls[1][1]).toEqual({ slug: 'webpack', limit: 1000, offset: 0 });
    });

    test('leaves out rows without a visible account (incognito)', async () => {
      graphqlRequestMock.mockResolvedValue(response([account(), null, account({ slug: 'john', name: 'John' })]));

      const members = await fetchBackers({ collectiveSlug: 'babel', backerType: 'backers' });

      expect(members.map((m) => m.slug)).toEqual(['jane', 'john']);
    });

    test('throws on GraphQL errors and unknown accounts', async () => {
      graphqlRequestMock.mockResolvedValueOnce({ data: { account: null }, errors: [{ message: 'Account Not Found' }] });
      await expect(fetchBackers({ collectiveSlug: 'nope', backerType: 'backers' })).rejects.toThrow(
        'Account Not Found',
      );

      graphqlRequestMock.mockResolvedValueOnce({ data: { account: null } });
      await expect(fetchBackers({ collectiveSlug: 'nope', backerType: 'backers' })).rejects.toThrow(
        'Collective not found.',
      );
    });
  });

  describe('isActiveTierOrder', () => {
    const now = new Date('2026-11-17T12:00:00Z');
    const charged = (lastChargedAt: string | null) => ({
      createdAt: '2020-01-01T00:00:00Z',
      processedAt: '2020-01-01T00:00:00Z',
      lastChargedAt,
      fromAccount: null,
    });

    test('one-time tiers: every processed order', () => {
      expect(isActiveTierOrder(charged(null), 'ONETIME', now)).toBe(true);
    });

    test('monthly tiers: charged within a month and 5 days', () => {
      expect(isActiveTierOrder(charged('2026-10-13T12:00:00Z'), 'MONTHLY', now)).toBe(true);
      expect(isActiveTierOrder(charged('2026-10-11T12:00:00Z'), 'MONTHLY', now)).toBe(false);
      expect(isActiveTierOrder(charged(null), 'MONTHLY', now)).toBe(false);
    });

    test('yearly and flexible tiers: charged within a year and 5 days', () => {
      expect(isActiveTierOrder(charged('2025-11-13T12:00:00Z'), 'YEARLY', now)).toBe(true);
      expect(isActiveTierOrder(charged('2025-11-11T12:00:00Z'), 'YEARLY', now)).toBe(false);
      expect(isActiveTierOrder(charged('2025-11-13T12:00:00Z'), 'FLEXIBLE', now)).toBe(true);
    });

    test('end of a shorter month: the previous month is clamped, as v1 did', () => {
      // March 31 minus a month is February 28, so the window starts on February 23
      const march31 = new Date('2026-03-31T12:00:00Z');
      expect(isActiveTierOrder(charged('2026-02-24T12:00:00Z'), 'MONTHLY', march31)).toBe(true);
      expect(isActiveTierOrder(charged('2026-02-22T12:00:00Z'), 'MONTHLY', march31)).toBe(false);
      // February 29 minus a year is February 28, so the window starts on February 23
      const leapDay = new Date('2028-02-29T12:00:00Z');
      expect(isActiveTierOrder(charged('2027-02-24T12:00:00Z'), 'YEARLY', leapDay)).toBe(true);
      expect(isActiveTierOrder(charged('2027-02-22T12:00:00Z'), 'YEARLY', leapDay)).toBe(false);
    });
  });

  describe('fetchTierBackers', () => {
    const order = (
      slug: string,
      createdAt: string,
      {
        processedAt = createdAt,
        lastChargedAt = new Date().toISOString(),
      }: { processedAt?: string | null; lastChargedAt?: string | null } = {},
    ) => ({
      createdAt,
      processedAt,
      lastChargedAt,
      fromAccount: account({ slug }),
    });
    const tiersResponse = {
      data: {
        account: {
          id: 'abc',
          tiers: {
            nodes: [
              { id: 'tier-gold', slug: 'gold', frequency: 'MONTHLY' },
              { id: 'tier-silver', slug: 'silver', frequency: 'ONETIME' },
            ],
          },
        },
      },
    };
    const ordersResponse = (orders: unknown[], totalCount = orders.length) => ({
      data: { tier: { id: 't', orders: { totalCount, nodes: orders } } },
    });

    test('reads the processed orders of the requested tiers, in the API order, unknown tiers adding nobody', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce(tiersResponse)
        .mockResolvedValueOnce(
          ordersResponse([
            order('zoe', '2024-01-01T00:00:00Z'),
            order('never-paid', '2024-02-01T00:00:00Z', { processedAt: null }),
            order('adam', '2023-01-01T00:00:00Z'),
          ]),
        )
        .mockResolvedValueOnce(
          ordersResponse([order('adam', '2022-01-01T00:00:00Z'), order('eve', '2022-02-01T00:00:00Z')]),
        );

      const members = await fetchTierBackers({ collectiveSlug: 'babel', tierSlugs: ['gold', 'unknown', 'silver'] });

      expect(members.map((m) => m.slug)).toEqual(['zoe', 'adam', 'eve']);
      expect(graphqlRequestMock).toHaveBeenCalledTimes(3);
      expect(graphqlRequestMock.mock.calls[1][1]).toEqual({ tierId: 'tier-gold', limit: 1000, offset: 0 });
      expect(graphqlRequestMock.mock.calls[2][1]).toEqual({ tierId: 'tier-silver', limit: 1000, offset: 0 });
    });

    test('large tiers: reads every page, so active orders beyond the first 1,000 are kept', async () => {
      const lapsed = { lastChargedAt: '2020-01-01T00:00:00Z' };
      const firstPage = Array.from({ length: 1000 }, (_, i) => order(`lapsed-${i}`, '2020-01-01T00:00:00Z', lapsed));
      graphqlRequestMock
        .mockResolvedValueOnce(tiersResponse)
        .mockResolvedValueOnce(ordersResponse(firstPage, 1001))
        .mockResolvedValueOnce(ordersResponse([order('active', '2024-01-01T00:00:00Z')], 1001));

      const members = await fetchTierBackers({ collectiveSlug: 'babel', tierSlugs: ['gold'], isActive: true });

      expect(members.map((m) => m.slug)).toEqual(['active']);
      expect(graphqlRequestMock).toHaveBeenCalledTimes(3);
      expect(graphqlRequestMock.mock.calls[2][1]).toEqual({ tierId: 'tier-gold', limit: 1000, offset: 1000 });
    });

    test('one-time tiers, active: every processed order, in the API order, as v1', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce(tiersResponse)
        .mockResolvedValueOnce(
          ordersResponse([
            order('zoe', '2024-01-01T00:00:00Z', { lastChargedAt: null }),
            order('adam', '2023-01-01T00:00:00Z', { lastChargedAt: null }),
          ]),
        );

      const members = await fetchTierBackers({ collectiveSlug: 'babel', tierSlugs: ['silver'], isActive: true });

      expect(members.map((m) => m.slug)).toEqual(['zoe', 'adam']);
    });

    test('active only: keeps active orders, oldest first', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce(tiersResponse)
        .mockResolvedValueOnce(
          ordersResponse([
            order('recent', '2024-01-01T00:00:00Z'),
            order('lapsed', '2023-06-01T00:00:00Z', { lastChargedAt: '2020-01-01T00:00:00Z' }),
            order('older', '2023-01-01T00:00:00Z'),
          ]),
        );

      const members = await fetchTierBackers({ collectiveSlug: 'babel', tierSlugs: ['gold'], isActive: true });

      expect(members.map((m) => m.slug)).toEqual(['older', 'recent']);
    });

    test('throws on unknown accounts', async () => {
      graphqlRequestMock.mockResolvedValueOnce({ data: { account: null }, errors: [{ message: 'Account Not Found' }] });
      await expect(fetchTierBackers({ collectiveSlug: 'nope', tierSlugs: ['gold'] })).rejects.toThrow(
        'Account Not Found',
      );
    });
  });
});
