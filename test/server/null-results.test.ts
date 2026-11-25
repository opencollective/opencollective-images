import { fetchBackers, fetchTierBackers } from '../../src/server/lib/backers';
import { fetchCollective, fetchMembersStats } from '../../src/server/lib/graphql';

// The GraphQL schemas mark most fields as nullable. These tests check what the fetchers do when they actually get
// null values from the API.
jest.mock('../../src/server/lib/graphql-client', () => ({
  graphqlRequest: jest.fn(),
}));

const graphqlRequestMock = jest.requireMock('../../src/server/lib/graphql-client').graphqlRequest;

const respond = (data: unknown) => graphqlRequestMock.mockResolvedValueOnce({ data });

const account = (slug: string) => ({
  slug,
  name: slug,
  type: 'INDIVIDUAL',
  imageUrl: null,
  website: null,
  twitterHandle: null,
});

describe('null results', () => {
  beforeEach(() => {
    graphqlRequestMock.mockReset();
  });

  describe('fetchCollective', () => {
    test('throws the "No collective found" error the controllers turn into a 404', async () => {
      respond({ Collective: null });
      await expect(fetchCollective('unknown')).rejects.toThrow('No collective found');
    });
  });

  describe('fetchMembersStats', () => {
    test('throws "No collective found" for an unknown collective', async () => {
      respond({ Collective: null });
      await expect(fetchMembersStats({ collectiveSlug: 'unknown', backerType: 'backers' })).rejects.toThrow(
        'No collective found',
      );

      respond({ Collective: null });
      await expect(fetchMembersStats({ collectiveSlug: 'unknown', tierSlug: 'gold' })).rejects.toThrow(
        'No collective found',
      );
    });

    test('counts 0 backers when the stats are null', async () => {
      respond({ Collective: { id: 1, stats: null } });
      expect(await fetchMembersStats({ collectiveSlug: 'babel', backerType: 'sponsors' })).toEqual({
        name: 'sponsors',
        count: 0,
      });

      respond({ Collective: { id: 1, stats: { id: 1, backers: null } } });
      expect(await fetchMembersStats({ collectiveSlug: 'babel', backerType: 'all' })).toEqual({
        name: 'financial contributors',
        count: 0,
      });
    });

    test('reads the stats of a tier', async () => {
      respond({
        Collective: { id: 1, tiers: [{ id: 2, slug: 'gold', name: 'Gold', stats: { totalDistinctOrders: 12 } }] },
      });
      expect(await fetchMembersStats({ collectiveSlug: 'babel', tierSlug: 'gold' })).toEqual({
        count: 12,
        slug: 'gold',
        name: 'Gold',
      });
    });

    test('throws "Tier not found" without tiers, and counts 0 for null tier stats', async () => {
      respond({ Collective: { id: 1, tiers: [] } });
      await expect(fetchMembersStats({ collectiveSlug: 'babel', tierSlug: 'gold' })).rejects.toThrow('Tier not found');

      respond({ Collective: { id: 1, tiers: null } });
      await expect(fetchMembersStats({ collectiveSlug: 'babel', tierSlug: 'gold' })).rejects.toThrow('Tier not found');

      respond({ Collective: { id: 1, tiers: [{ id: 2, slug: 'gold', name: 'Gold', stats: null }] } });
      expect(await fetchMembersStats({ collectiveSlug: 'babel', tierSlug: 'gold' })).toMatchObject({ count: 0 });
    });
  });

  describe('fetchBackers', () => {
    test('ignores null rows and a null total', async () => {
      respond({
        account: {
          id: '1',
          members: {
            totalCount: null,
            nodes: [null, { id: 'm1', isActive: true, tier: null, account: account('jane') }],
          },
        },
      });
      const members = await fetchBackers({ collectiveSlug: 'babel', backerType: 'backers' });
      expect(members.map((member) => member.slug)).toEqual(['jane']);
      expect(graphqlRequestMock).toHaveBeenCalledTimes(1);
    });

    test('handles null member rows', async () => {
      respond({ account: { id: '1', members: { totalCount: null, nodes: null } } });
      expect(await fetchBackers({ collectiveSlug: 'babel', backerType: 'backers' })).toEqual([]);
    });
  });

  describe('fetchTierBackers', () => {
    test('ignores null tiers and orders', async () => {
      respond({ account: { id: '1', tiers: { nodes: [null, { id: 't1', slug: 'gold', frequency: 'ONETIME' }] } } });
      respond({
        tier: {
          id: 't1',
          orders: {
            totalCount: null,
            nodes: [
              null,
              {
                createdAt: '2026-01-01T00:00:00Z',
                processedAt: '2026-01-01T00:00:00Z',
                lastChargedAt: null,
                fromAccount: account('jane'),
              },
            ],
          },
        },
      });
      const members = await fetchTierBackers({ collectiveSlug: 'babel', tierSlugs: ['gold'] });
      expect(members.map((member) => member.slug)).toEqual(['jane']);
    });

    test('handles an account without tiers', async () => {
      respond({ account: { id: '1' } });
      expect(await fetchTierBackers({ collectiveSlug: 'babel', tierSlugs: ['gold'] })).toEqual([]);
    });
  });
});
