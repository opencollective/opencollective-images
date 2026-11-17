import { fetchBackers, hasOwnImage, MAX_BACKERS, toMember } from '../../src/server/lib/backers';

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

const response = (accounts) => ({
  data: { account: { id: 'abc', members: { nodes: accounts.map((a, i) => ({ id: `m${i}`, account: a })) } } },
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

  describe('fetchBackers', () => {
    test('queries v2 for individuals, most contributed first, all backers unless active only is asked', async () => {
      graphqlRequestMock.mockResolvedValue(response([account()]));

      await fetchBackers({ collectiveSlug: 'babel', backerType: 'backers', isActive: false });

      const [, variables, options] = graphqlRequestMock.mock.calls[0];
      expect(variables).toEqual({
        slug: 'babel',
        accountType: ['INDIVIDUAL'],
        isActive: undefined,
        limit: MAX_BACKERS,
      });
      expect(options).toEqual({ version: 'v2' });
    });

    test('queries organizations, collectives and funds for sponsors, active only when asked', async () => {
      graphqlRequestMock.mockResolvedValue(response([]));

      await fetchBackers({ collectiveSlug: 'babel', backerType: 'sponsors', isActive: true });

      expect(graphqlRequestMock.mock.calls[0][1]).toMatchObject({
        accountType: ['ORGANIZATION', 'COLLECTIVE', 'FUND'],
        isActive: true,
      });
    });

    test('keeps the first entry of an account that backs several times', async () => {
      graphqlRequestMock.mockResolvedValue(
        response([account(), account({ slug: 'john', name: 'John' }), account(), null]),
      );

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
