import { GraphQLClient } from 'graphql-request';
import { flatten, uniqBy } from 'lodash';

import cache from './cache';
import { queryString, md5 } from './utils';

const thirtyMinutesInSeconds = 30 * 60;

const tenMinutesInSeconds = 10 * 60;

const oneMinuteInSeconds = 60;

export const getGraphqlUrl = () => {
  const apiKey = process.env.API_KEY;
  const baseApiUrl = process.env.API_URL;
  return `${baseApiUrl}/graphql${apiKey ? `?api_key=${apiKey}` : ''}`;
};

let client;

function getClient() {
  if (!client) {
    client = new GraphQLClient(getGraphqlUrl());
  }
  return client;
}

function sleep(ms = 0) {
  return new Promise(r => setTimeout(r, ms));
}

function randomInteger(max) {
  return Math.floor(Math.random() * max);
}

/*
Used by:
  - logo.js: requires `type`, `name` and `image`
  - background.js: requires `backgroundImage`
*/
export async function fetchCollective(collectiveSlug) {
  const query = `
  query Collective($collectiveSlug: String) {
    Collective(slug:$collectiveSlug) {
      name
      type
      image
      backgroundImage
      parentCollective {
        image
        backgroundImage
      }
    }
  }
  `;

  const result = await getClient().request(query, { collectiveSlug });

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
    cache.set(cacheKey, collective, thirtyMinutesInSeconds + randomInteger(300));
  }
  return collective;
}

export async function fetchMembersStats(params) {
  const { backerType, tierSlug } = params;
  let query, processResult;

  if (backerType) {
    query = `
    query Collective($collectiveSlug: String) {
      Collective(slug:$collectiveSlug) {
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
    processResult = res => {
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
    query = `
    query Collective($collectiveSlug: String, $tierSlug: String) {
      Collective(slug:$collectiveSlug) {
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
    processResult = res => {
      if (res.Collective.tiers.length === 0) {
        throw new Error('Tier not found');
      }
      return {
        count: res.Collective.tiers[0].stats.totalDistinctOrders,
        slug: res.Collective.tiers[0].slug,
        name: res.Collective.tiers[0].name,
      };
    };
  }
  const result = await getClient().request(query, params);
  const count = processResult(result);
  return count;
}

export async function fetchMembersStatsWithCache(params) {
  const cacheKey = `members_stats_${md5(queryString.stringify(params))}`;
  let stats = await cache.get(cacheKey);
  if (!stats) {
    stats = await fetchMembersStats(params);
    cache.set(cacheKey, stats, tenMinutesInSeconds);
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
  let query, processResult, type, role;
  if (backerType === 'contributors') {
    query = `
    query Collective($collectiveSlug: String) {
      Collective(slug:$collectiveSlug) {
        data
      }
    }
    `;
    processResult = res => {
      const users = res.Collective.data.githubContributors;
      return Object.keys(users).map(username => {
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
    query = `
    query allMembers($collectiveSlug: String!, $type: String!, $role: String!, $isActive: Boolean) {
      allMembers(collectiveSlug: $collectiveSlug, type: $type, role: $role, isActive: $isActive, orderBy: "totalDonations") {
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
    processResult = res => uniqBy(res.allMembers.map(m => m.member), m => m.slug);
  } else if (tierSlug) {
    tierSlug = tierSlug.split(',');
    query = `
    query Collective($collectiveSlug: String, $tierSlug: [String], $isActive: Boolean) {
      Collective(slug:$collectiveSlug) {
        tiers(slugs: $tierSlug) {
          orders(isActive: $isActive) {
            fromCollective {
              type
              slug
              name
              image
              website
              twitterHandle
            }
          }
        }
      }
    }
    `;
    processResult = res => {
      const allOrders = flatten(res.Collective.tiers.map(t => t.orders));
      const allCollectives = allOrders.map(o => o.fromCollective);
      return uniqBy(allCollectives, c => c.slug);
    };
  }

  const result = await getClient().request(query, {
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
  const cacheKey = `users_${md5(queryString.stringify(params))}`;
  const cacheKeyFetching = `${cacheKey}_fetching`;
  let users = await cache.get(cacheKey);
  if (!users) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const fetching = await cache.has(cacheKeyFetching);
      if (!fetching) {
        break;
      }
      await sleep(100);
    }
    cache.set(cacheKeyFetching, true, oneMinuteInSeconds);
    users = await fetchMembers(params);
    cache.set(cacheKey, users, tenMinutesInSeconds + randomInteger(60));
    cache.del(cacheKeyFetching);
  }
  return users;
}
