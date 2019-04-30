import { GraphQLClient } from 'graphql-request';
import { flatten, uniqBy } from 'lodash';

export const getGraphqlUrl = () => {
  const apiKey = process.env.API_KEY;
  const baseApiUrl = process.env.API_URL;
  return `${baseApiUrl}/graphql${apiKey ? `?api_key=${apiKey}` : ''}`;
};

let client;

function getClient() {
  if (!client) {
    client = new GraphQLClient(getGraphqlUrl(), { headers: {} });
  }
  return client;
}

export async function fetchCollectiveImage(collectiveSlug) {
  const query = `
  query Collective($collectiveSlug: String) {
    Collective(slug:$collectiveSlug) {
      id
      slug
      type
      image
      backgroundImage
    }
  }
  `;

  const result = await getClient().request(query, { collectiveSlug });
  return result.Collective;
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
      const count = backerType.match(/sponsor/)
        ? res.Collective.stats.backers.organizations
        : res.Collective.stats.backers.users;
      return {
        name: backerType,
        count,
      };
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

export async function fetchMembers({ collectiveSlug, tierSlug, backerType, isActive }, options = {}) {
  let query, processResult, type, role;
  if (backerType === 'contributors') {
    query = `
    query Collective($collectiveSlug: String) {
      Collective(slug:$collectiveSlug) {
        id
        data
      }
    }
    `;
    processResult = res => {
      const users = res.Collective.data.githubContributors;
      return Object.keys(users).map(username => {
        const commits = users[username];
        return {
          slug: username,
          type: 'USER',
          image: `https://avatars.githubusercontent.com/${username}?s=96`,
          website: `https://github.com/${username}`,
          stats: { c: commits },
        };
      });
    };
  } else if (backerType) {
    type = backerType.match(/sponsor/i) ? 'ORGANIZATION' : 'USER';
    if (backerType.match(/(backer|sponsor)/)) {
      role = 'BACKER';
    }
    query = `
    query allMembers($collectiveSlug: String!, $type: String!, $role: String!, $isActive: Boolean) {
      allMembers(collectiveSlug: $collectiveSlug, type: $type, role: $role, isActive: $isActive, orderBy: "totalDonations") {
        id
        createdAt
        member {
          id
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
    processResult = res => uniqBy(res.allMembers.map(m => m.member), m => m.id);
  } else if (tierSlug) {
    tierSlug = tierSlug.split(',');
    query = `
    query Collective($collectiveSlug: String, $tierSlug: [String], $isActive: Boolean) {
      Collective(slug:$collectiveSlug) {
        tiers(slugs: $tierSlug) {
          orders(isActive: $isActive) {
            id
            createdAt
            fromCollective {
              id
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
      return uniqBy(allCollectives, c => c.id);
    };
  }

  const result = await (options.client || getClient()).request(query, {
    collectiveSlug,
    tierSlug,
    type,
    role,
    isActive,
  });
  const members = processResult(result);
  return members;
}
