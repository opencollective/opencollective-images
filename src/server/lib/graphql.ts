import { ApolloClient, ApolloLink, CombinedGraphQLErrors, HttpLink, InMemoryCache } from '@apollo/client/core';
import debug from 'debug';
import type { DocumentNode, GraphQLFormattedError } from 'graphql';
import gqlV1 from 'graphql-tag';
import { flatten, pick, uniqBy } from 'lodash';

// Apollo Client 4 only accepts the default options declared in this namespace
declare module '@apollo/client/core/defaultOptions' {
  namespace DeclareDefaultOptions {
    interface WatchQuery {
      errorPolicy: 'all';
    }
    interface Query {
      errorPolicy: 'all';
    }
  }
}

// Alternative setup with GraphQLClient from graphql-request
// import { GraphQLClient } from 'graphql-request';
import cache from './cache';
import fetch from './fetch';
import { md5, queryString, randomInteger, sleep } from './utils';

const oneDayInSeconds = 24 * 60 * 60;

const thirtyMinutesInSeconds = 30 * 60;

const oneMinuteInSeconds = 60;

const debugGraphql = debug('graphql');

interface ParentCollective {
  id: number;
  image: string;
  backgroundImage: string;
}

interface Collective {
  id: number;
  name: string;
  type: string;
  image: string;
  backgroundImage: string;
  isGuest: boolean;
  parentCollective?: ParentCollective;
}

interface Member {
  id?: number;
  type: string;
  slug: string;
  name: string;
  isGuest?: boolean;
  image: string;
  website: string;
  twitterHandle: string;
}

interface MembersStats {
  name: string;
  count: number;
  slug?: string;
}

type CollectiveResponse = { Collective: Collective };

type MembersStatsResponse = {
  Collective: {
    id: number;
    stats: { id: number; backers: { all: number; users: number; organizations: number } };
  };
};

type MembersStatsForTierResponse = {
  Collective: {
    id: number;
    tiers: Array<{ id: number; slug: string; name: string; stats: { totalDistinctOrders: number } }>;
  };
};

type MembersWithRoleResponse = { allMembers: Array<{ member: Member }> };

type MembersWithTierResponse = {
  Collective: { id: number; tiers: Array<{ id: number; orders: Array<{ id: number; fromCollective: Member }> }> };
};

type MembersStatsParams = {
  collectiveSlug?: string;
  backerType?: string;
  tierSlug?: string;
};

type MembersParams = {
  collectiveSlug?: string;
  tierSlug?: string | string[];
  backerType?: string;
  isActive?: boolean;
};

const getGraphqlUrl = ({ version = 'v1' }: { version?: string } = {}): string => {
  const apiKey = process.env.API_KEY;
  const baseApiUrl = process.env.API_URL;
  return `${baseApiUrl}/graphql/${version}${apiKey ? `?api_key=${apiKey}` : ''}`;
};

let client: ApolloClient;

/**
 * @returns {ApolloClient}
 */
function getClient(): ApolloClient {
  if (!client) {
    client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ApolloLink.from([
        new HttpLink({
          fetch,
          uri: getGraphqlUrl({ version: 'v1' }),
        }),
      ]),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'no-cache',
          errorPolicy: 'all',
        },
        query: {
          fetchPolicy: 'no-cache',
          errorPolicy: 'all',
        },
      },
    });
  }
  return client;
}

async function graphqlRequest<TData>(
  query: DocumentNode,
  variables: Record<string, unknown>,
): Promise<{ data: TData; errors?: readonly GraphQLFormattedError[] }> {
  // With GraphQLClient from graphql-request
  // return getClient().request(query, variables);

  // With ApolloClient as client
  const { data, error } = await getClient().query({ query, variables, fetchPolicy: 'no-cache' });
  // `graphql-tag` documents are untyped: the response shape is declared by each caller
  const result = data as TData;
  if (!error) {
    return { data: result };
  }
  // With `errorPolicy: 'all'`, Apollo Client 4 returns GraphQL errors as a single `error`:
  // expose them as `errors` like before, and throw network errors like Apollo Client 3 did
  if (CombinedGraphQLErrors.is(error)) {
    return { data: result, errors: error.errors };
  }
  throw error;
}

/*
Used by:
  - logo.js: requires `type`, `name` and `image`
  - background.js: requires `backgroundImage`
*/
export async function fetchCollective(collectiveSlug: string): Promise<Collective> {
  const query = gqlV1 /* GraphQL */ `
    query Collective($collectiveSlug: String) {
      Collective(slug: $collectiveSlug) {
        id
        name
        type
        image
        backgroundImage
        isGuest
        parentCollective {
          id
          image
          backgroundImage
        }
      }
    }
  `;

  const { data, errors } = await graphqlRequest<CollectiveResponse>(query, { collectiveSlug });
  if (errors?.length) {
    throw new Error(errors[0].message);
  }

  return data.Collective;
}

export async function fetchCollectiveWithCache(
  collectiveSlug: string,
  options: { hash?: string } = {},
): Promise<Collective> {
  let cacheKey: string;
  if (options.hash) {
    cacheKey = `collective_v2_${collectiveSlug}_${options.hash}`;
  } else {
    cacheKey = `collective_v2_${collectiveSlug}`;
  }
  let collective = await cache.get<Collective>(cacheKey);
  if (!collective) {
    collective = await fetchCollective(collectiveSlug);
    cache.set(cacheKey, collective, oneDayInSeconds + randomInteger(3600));
  }
  return collective;
}

export async function fetchMembersStats(variables: MembersStatsParams): Promise<MembersStats> {
  const { backerType, tierSlug } = variables;
  let query: DocumentNode;
  let processResult: (result: MembersStatsResponse | MembersStatsForTierResponse) => MembersStats;

  if (backerType) {
    query = gqlV1 /* GraphQL */ `
      query MembersStats($collectiveSlug: String) {
        Collective(slug: $collectiveSlug) {
          id
          stats {
            id
            backers {
              all
              users
              organizations
            }
          }
        }
      }
    `;
    processResult = (res: MembersStatsResponse) => {
      let name, count;
      if (backerType.match(/sponsor/i) || backerType.match(/organization/i)) {
        count = res.Collective.stats.backers.organizations;
        name = backerType;
      } else if (backerType.match(/backer/i) || backerType.match(/individual/i)) {
        count = res.Collective.stats.backers.users;
        name = backerType;
      } else {
        count = res.Collective.stats.backers.all;
        name = 'financial contributors';
      }
      return { name, count };
    };
  } else if (tierSlug) {
    query = gqlV1 /* GraphQL */ `
      query MembersStatsForTier($collectiveSlug: String, $tierSlug: String) {
        Collective(slug: $collectiveSlug) {
          id
          tiers(slug: $tierSlug) {
            id
            slug
            name
            stats {
              totalDistinctOrders
            }
          }
        }
      }
    `;
    processResult = (result: MembersStatsForTierResponse) => {
      if (result.Collective.tiers.length === 0) {
        throw new Error('Tier not found');
      }
      return {
        count: result.Collective.tiers[0].stats.totalDistinctOrders,
        slug: result.Collective.tiers[0].slug,
        name: result.Collective.tiers[0].name,
      };
    };
  }
  const { data, errors } = await graphqlRequest<MembersStatsResponse | MembersStatsForTierResponse>(query, variables);
  if (errors?.length) {
    throw new Error(errors[0].message);
  }
  const count = processResult(data);
  return count;
}

export async function fetchMembersStatsWithCache(params: MembersStatsParams): Promise<MembersStats> {
  const cacheKey = `members_stats_${md5(queryString.stringify(params))}`;
  let stats = await cache.get<MembersStats>(cacheKey);
  if (!stats) {
    stats = await fetchMembersStats(params);
    cache.set(cacheKey, stats, thirtyMinutesInSeconds + randomInteger(300));
  }
  return stats;
}

/*
Used by:
  - avatar.js: requires `type`, `name`, `image` and `slug`
  - website.js: requires `website`, `twitterHandle` and `slug`
  - banner.js: requires `type`, `name`, `image`, `website` and `slug` (generateSvgBanner)
*/
export async function fetchMembers({
  collectiveSlug,
  tierSlug,
  backerType,
  isActive,
}: MembersParams): Promise<Member[]> {
  // Optimize some 404s that are heavily sent
  if (
    [
      'algorithmvisualizer',
      'angular-universal-pwa',
      'hexo-helper-live2d',
      'imagesharp',
      'jquery-adaptive-backgrounds',
      'live2d-widgetjs',
      'lottie-web',
      'material-ui',
      'opencollective', // 75k+ backers, fetching them exhausts the API memory
      'ory-hydra',
      'p3x-onenote',
      'p3x-redis-ui',
      'postwoman',
      'react-native-camera-mlkit',
      'react-native-iap',
      'reakit',
      'uform',
      'vsc-material-theme',
      'WeChatTweak-macOS',
      'xdanangelxoqenpm',
    ].includes(collectiveSlug)
  ) {
    throw new Error('Collective not found.');
  }

  let query: DocumentNode;
  let processResult: (result: MembersWithRoleResponse | MembersWithTierResponse) => Member[];
  let type: string;
  let role: string;
  if (backerType) {
    if (backerType.match(/sponsor/i) || backerType.match(/organization/i)) {
      type = 'ORGANIZATION,COLLECTIVE,FUND';
    } else {
      type = 'USER';
    }
    role = 'BACKER';
    query = gqlV1 /* GraphQL */ `
      query MembersWithRole($collectiveSlug: String!, $type: String!, $role: String!, $isActive: Boolean) {
        allMembers(
          collectiveSlug: $collectiveSlug
          type: $type
          role: $role
          isActive: $isActive
          orderBy: "totalDonations"
        ) {
          member {
            type
            slug
            name
            image
            website
            twitterHandle
          }
        }
      }
    `;
    processResult = (result: MembersWithRoleResponse) =>
      uniqBy(
        result.allMembers.map((m) => m.member),
        (m) => m.slug,
      );
  } else if (tierSlug) {
    tierSlug = typeof tierSlug === 'string' ? tierSlug.split(',') : tierSlug;
    query = gqlV1 /* GraphQL */ `
      query MembersWithTier($collectiveSlug: String, $tierSlug: [String], $isActive: Boolean) {
        Collective(slug: $collectiveSlug) {
          id
          tiers(slugs: $tierSlug) {
            id
            orders(isActive: $isActive, isProcessed: true) {
              id
              fromCollective {
                id
                type
                slug
                name
                isGuest
                image
                website
                twitterHandle
              }
            }
          }
        }
      }
    `;
    processResult = (result: MembersWithTierResponse) => {
      const allOrders = flatten(result.Collective.tiers.map((t) => t.orders));
      const allCollectives = allOrders.map((o) => o.fromCollective).filter(Boolean);
      return uniqBy(allCollectives, (c) => c.slug);
    };
  }

  const { data, errors } = await graphqlRequest<MembersWithRoleResponse | MembersWithTierResponse>(query, {
    collectiveSlug,
    tierSlug,
    type,
    role,
    isActive,
  });
  if (errors?.length) {
    throw new Error(errors[0].message);
  }
  const members = processResult(data);
  return members;
}

export async function fetchMembersWithCache(params: MembersParams): Promise<Member[]> {
  params = pick(params, ['collectiveSlug', 'tierSlug', 'backerType', 'isActive']);
  const cacheKey = `users_${md5(queryString.stringify(params))}`;
  const cacheKeyFetching = `${cacheKey}_fetching`;
  let users = await cache.get<Member[]>(cacheKey);
  if (!users) {
    debugGraphql(`fetchMembersWithCache ${params.collectiveSlug} ${cacheKey} miss`);
    let fetching = await cache.has(cacheKeyFetching);
    if (fetching) {
      while (fetching) {
        debugGraphql(`fetchMembersWithCache ${params.collectiveSlug} ${cacheKey} waiting`);
        await sleep(100);
        fetching = await cache.has(cacheKeyFetching);
      }
      debugGraphql(`fetchMembersWithCache ${params.collectiveSlug} ${cacheKey} available`);
      users = await cache.get<Member[]>(cacheKey);
    }
    if (!users) {
      debugGraphql(`fetchMembersWithCache ${params.collectiveSlug} ${cacheKey} fetching`);
      cache.set(cacheKeyFetching, true, oneMinuteInSeconds);
      try {
        users = await fetchMembers(params);
        cache.set(cacheKey, users, thirtyMinutesInSeconds + randomInteger(300));
        debugGraphql(`fetchMembersWithCache ${params.collectiveSlug} ${cacheKey} set`);
        cache.delete(cacheKeyFetching);
      } catch (e) {
        cache.delete(cacheKeyFetching);
        throw e;
      }
    }
  } else {
    debugGraphql(`fetchMembersWithCache ${params.collectiveSlug} ${cacheKey} hit`);
  }
  return users;
}
