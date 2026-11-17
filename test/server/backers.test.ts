import { fetchBackers, hasOwnImage, isActiveBacker, toMember } from '../../src/server/lib/backers';

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
const row = (entry, i) => {
  const [a, { tier = null, isActive = true } = {}] = Array.isArray(entry) ? entry : [entry];
  return { id: `m${i}`, isActive, tier: tier ? { id: tier } : null, account: a };
};
const response = (entries, totalCount = entries.length) => ({
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
      const page = (prefix) => Array.from({ length: 1000 }, (_, i) => account({ slug: `${prefix}-${i}` }));
      graphqlRequestMock
        .mockResolvedValueOnce(response(page('a'), 2500))
        .mockResolvedValueOnce(response(page('b'), 2500))
        .mockResolvedValueOnce(response(page('c').slice(0, 500), 2500));

      const members = await fetchBackers({ collectiveSlug: 'babel', backerType: 'backers' });

      expect(graphqlRequestMock.mock.calls.map((call) => call[1].offset)).toEqual([0, 1000, 2000]);
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
});
