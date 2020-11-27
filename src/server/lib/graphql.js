import debug from 'debug';

import gql from 'graphql-tag';
import ApolloClient from 'apollo-boost';
import { flatten, uniqBy, pick } from 'lodash';

// Alternative setup with GraphQLClient from graphql-request
// import { GraphQLClient } from 'graphql-request';

import cache from './cache';
import fetch from './fetch';
import { queryString, md5, sleep, randomInteger } from './utils';

const oneDayInSeconds = 24 * 60 * 60;

const thirtyMinutesInSeconds = 30 * 60;

const oneMinuteInSeconds = 60;

const debugGraphql = debug('graphql');

const getGraphqlUrl = ({ version = 'v1' } = {}) => {
  const apiKey = process.env.API_KEY;
  const baseApiUrl = process.env.API_URL;
  return `${baseApiUrl}/graphql/${version}${apiKey ? `?api_key=${apiKey}` : ''}`;
};

let client;

function getClient() {
  if (!client) {
    // client = new GraphQLClient(getGraphqlUrl(), { headers });
    client = new ApolloClient({ fetch, uri: getGraphqlUrl({ version: 'v1' }) });
  }
  return client;
}

function graphqlRequest(query, variables) {
  // With GraphQLClient from graphql-request
  // return getClient().request(query, variables);

  // With ApolloClient as client
  return getClient()
    .query({ query, variables, fetchPolicy: 'network-only' })
    .then((result) => result.data);
}

/*
Used by:
  - logo.js: requires `type`, `name` and `image`
  - background.js: requires `backgroundImage`
*/
export async function fetchCollective(collectiveSlug) {
  const query = gql`
    query fetchCollective($collectiveSlug: String) {
      Collective(slug: $collectiveSlug) {
        name
        type
        image
        backgroundImage
        isGuest
        parentCollective {
          image
          backgroundImage
        }
      }
    }
  `;

  const result = await graphqlRequest(query, { collectiveSlug });

  return result.Collective;
}

export async function fetchCollectiveWithCache(collectiveSlug, options = {}) {
  let cacheKey;
  if (options.hash) {
    cacheKey = `collective_v2_${collectiveSlug}_${options.hash}`;
  } else {
    cacheKey = `collective_v2_${collectiveSlug}`;
  }
  let collective = await cache.get(cacheKey);
  if (!collective) {
    collective = await fetchCollective(collectiveSlug);
    cache.set(cacheKey, collective, oneDayInSeconds + randomInteger(3600));
  }
  return collective;
}

export async function fetchMembersStats(variables) {
  const { backerType, tierSlug } = variables;
  let query, processResult;

  if (backerType) {
    query = gql`
      query fetchMembersStats($collectiveSlug: String) {
        Collective(slug: $collectiveSlug) {
          stats {
            backers {
              all
              users
              organizations
            }
          }
        }
      }
    `;
    processResult = (res) => {
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
    query = gql`
      query fetchMembersStatsForTier($collectiveSlug: String, $tierSlug: String) {
        Collective(slug: $collectiveSlug) {
          tiers(slug: $tierSlug) {
            slug
            name
            stats {
              totalDistinctOrders
            }
          }
        }
      }
    `;
    processResult = (result) => {
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
  const result = await graphqlRequest(query, variables);
  const count = processResult(result);
  return count;
}

export async function fetchMembersStatsWithCache(params) {
  const cacheKey = `members_stats_${md5(queryString.stringify(params))}`;
  let stats = await cache.get(cacheKey);
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
export async function fetchMembers({ collectiveSlug, tierSlug, backerType, isActive }) {
  // Optimize some 404s that are heavily sent
  if (['angular-universal-pwa', 'vsc-material-theme'].includes(collectiveSlug)) {
    throw new Error('Collective not found.');
  }

  let query, processResult, type, role;
  if (backerType === 'contributors') {
    query = gql`
      query fetchContributors($collectiveSlug: String) {
        Collective(slug: $collectiveSlug) {
          githubContributors
        }
      }
    `;
    processResult = (result) => {
      const users = result.Collective.githubContributors;
      return Object.keys(users).map((username) => {
        return {
          slug: username,
          type: 'GITHUB_USER',
          image: `https://avatars.githubusercontent.com/${username}?s=96`,
          website: `https://github.com/${username}`,
        };
      });
    };
  } else if (backerType) {
    if (backerType.match(/sponsor/i) || backerType.match(/organization/i)) {
      type = 'ORGANIZATION,COLLECTIVE';
    } else {
      type = 'USER';
    }
    role = 'BACKER';
    query = gql`
      query fetchMembersWithRole($collectiveSlug: String!, $type: String!, $role: String!, $isActive: Boolean) {
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
    processResult = (result) =>
      uniqBy(
        result.allMembers.map((m) => m.member),
        (m) => m.slug,
      );
  } else if (tierSlug) {
    tierSlug = tierSlug.split(',');
    query = gql`
      query fetchMembersWithTier($collectiveSlug: String, $tierSlug: [String], $isActive: Boolean) {
        Collective(slug: $collectiveSlug) {
          tiers(slugs: $tierSlug) {
            orders(isActive: $isActive) {
              fromCollective {
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
    processResult = (result) => {
      const allOrders = flatten(result.Collective.tiers.map((t) => t.orders));
      const allCollectives = allOrders.map((o) => o.fromCollective);
      return uniqBy(allCollectives, (c) => c.slug);
    };
  }

  const result = await graphqlRequest(query, {
    collectiveSlug,
    tierSlug,
    type,
    role,
    isActive,
  });
  const members = processResult(result);
  return members;
}

export async function fetchMembersWithCache(params) {
  params = pick(params, ['collectiveSlug', 'tierSlug', 'backerType', 'isActive']);
  const cacheKey = `users_${md5(queryString.stringify(params))}`;
  const cacheKeyFetching = `${cacheKey}_fetching`;
  let users = await cache.get(cacheKey);
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
      users = await cache.get(cacheKey);
    }
    if (!users) {
      debugGraphql(`fetchMembersWithCache ${params.collectiveSlug} ${cacheKey} fetching`);
      cache.set(cacheKeyFetching, true, oneMinuteInSeconds);
      try {
        users = await fetchMembers(params);
        cache.set(cacheKey, users, thirtyMinutesInSeconds + randomInteger(300));
        debugGraphql(`fetchMembersWithCache ${params.collectiveSlug} ${cacheKey} set`);
        cache.del(cacheKeyFetching);
      } catch (e) {
        cache.del(cacheKeyFetching);
        throw e;
      }
    }
  } else {
    debugGraphql(`fetchMembersWithCache ${params.collectiveSlug} ${cacheKey} hit`);
  }
  return users;
}
