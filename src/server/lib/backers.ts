import gql from 'graphql-tag';
import { groupBy, uniqBy } from 'lodash';

import { graphqlRequest } from './graphql-client';

/** A member as the avatar, website and banner controllers read it (the v1 `Member.member` shape) */
export interface Member {
  id?: number;
  type: string;
  slug: string;
  name: string;
  isGuest?: boolean;
  image: string;
  website: string;
  twitterHandle: string;
}

type BackerAccount = {
  slug: string;
  name: string | null;
  type: string;
  imageUrl: string | null;
  website: string | null;
  twitterHandle: string | null;
  isGuest?: boolean;
};

type BackerRow = { id: string; isActive: boolean; tier: { id: string } | null; account: BackerAccount | null };

type BackersResponse = {
  account: { id: string; members: { totalCount: number; nodes: BackerRow[] } } | null;
};

/**
 * At most 1,000 backers per list. Banners and README avatar lists never need more: the deepest README
 * position requested in production is under 200.
 */
export const MAX_BACKERS = 1000;

/** The v2 API returns at most 1,000 members per page: read up to 5 pages of member rows */
const PAGE_SIZE = 1000;
const MAX_PAGES = 5;

const backersQuery = gql /* GraphQL */ `
  query BackersForImages($slug: String!, $accountType: [AccountType], $limit: Int!, $offset: Int!) {
    account(slug: $slug) {
      id
      members(
        role: [BACKER]
        accountType: $accountType
        orderByTotalContributed: DESC
        includeInherited: false
        limit: $limit
        offset: $offset
      ) {
        totalCount
        nodes {
          id
          isActive
          tier {
            id
          }
          account {
            slug
            name
            type
            imageUrl
            website
            twitterHandle
            ... on Individual {
              isGuest
            }
          }
        }
      }
    }
  }
`;

/**
 * `imageUrl` is always set in v2. The API builds it as `<images>/<slug>/<hash>/<avatar|logo>…` when the
 * account has its own image, and without the hash otherwise (`getCollectiveAvatarUrl`): the hash tells
 * whether v1's `image` was set, which the banner uses to skip anonymous members without an image.
 */
export const hasOwnImage = (imageUrl: string | null): boolean => {
  if (!imageUrl) {
    return false;
  }
  try {
    return /^\/[^/]+\/[0-9a-f]{7}\/(?:avatar|logo)\b/.test(new URL(imageUrl).pathname);
  } catch {
    return false;
  }
};

export const toMember = (account: BackerAccount): Member => ({
  // The controllers check v1 types: v2 calls users INDIVIDUAL
  type: account.type === 'INDIVIDUAL' ? 'USER' : account.type,
  slug: account.slug,
  name: account.name,
  isGuest: account.isGuest,
  image: hasOwnImage(account.imageUrl) ? account.imageUrl : null,
  website: account.website,
  twitterHandle: account.twitterHandle,
});

type ActiveOrdersResponse = {
  account: {
    id: string;
    orders: { totalCount: number; nodes: Array<{ fromAccount: { slug: string } | null }> };
  } | null;
};

/** The accounts with a running monthly or yearly contribution to the collective, with or without a tier */
const activeOrdersQuery = gql /* GraphQL */ `
  query ActiveOrdersForImages($slug: String!, $limit: Int!, $offset: Int!) {
    account(slug: $slug) {
      id
      orders(filter: INCOMING, status: [ACTIVE], frequency: [MONTHLY, YEARLY], limit: $limit, offset: $offset) {
        totalCount
        nodes {
          fromAccount {
            slug
          }
        }
      }
    }
  }
`;

async function fetchActiveContributorSlugs(collectiveSlug: string): Promise<Set<string>> {
  const slugs = new Set<string>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, errors } = await graphqlRequest<ActiveOrdersResponse>(
      activeOrdersQuery,
      { slug: collectiveSlug, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      { version: 'v2' },
    );
    if (errors?.length) {
      throw new Error(errors[0].message);
    }
    const orders = data?.account?.orders;
    (orders?.nodes || []).forEach((order) => order.fromAccount && slugs.add(order.fromAccount.slug));
    if (!orders || (page + 1) * PAGE_SIZE >= orders.totalCount || orders.nodes.length < PAGE_SIZE) {
      break;
    }
  }
  return slugs;
}

/**
 * Whether to show an account in an active-only list, from all its memberships. The intent of v1's active lists
 * (opencollective/opencollective#972): a recurring sponsor that stopped paying isn't advertised any more.
 * - An account with a running monthly or yearly contribution (`hasActiveContribution`, tier or not) is shown.
 * - An account with a membership on a tier is judged on those memberships: shown if one of them is active (v2
 *   `Member.isActive`: a recent contribution for monthly and yearly tiers, always for the others).
 * - An account with only memberships without a tier is shown: one-off contributions don't lapse (whether they
 *   should is opencollective/opencollective#9129).
 *
 * v2's `isActive` filter can't be used directly: it judges each membership separately, and a membership without a
 * tier is always active, so a lapsed recurring sponsor with an old one-off contribution would be shown.
 */
export const isActiveBacker = (
  rows: Array<Pick<BackerRow, 'isActive' | 'tier'>>,
  hasActiveContribution = false,
): boolean => {
  const tierRows = rows.filter((row) => row.tier);
  return hasActiveContribution || tierRows.length === 0 || tierRows.some((row) => row.isActive);
};

/**
 * The backers of `collectiveSlug` (`/:slug/:backerType.svg` and the per-position avatar and website
 * routes), most contributed first, like v1 `allMembers(orderBy: "totalDonations")`. Organizations
 * (and collectives and funds) for sponsor/organization backer types, individuals otherwise.
 *
 * `isActive: true` keeps the accounts `isActiveBacker` accepts (one more request for the running contributions);
 * otherwise all of them. Reads the member rows
 * page by page (up to `MAX_PAGES`); an account's rows share its total, so they come out together.
 */
export async function fetchBackers({
  collectiveSlug,
  backerType,
  isActive,
}: {
  collectiveSlug: string;
  backerType: string;
  isActive?: boolean;
}): Promise<Member[]> {
  const accountType = /sponsor|organization/i.test(backerType)
    ? ['ORGANIZATION', 'COLLECTIVE', 'FUND']
    : ['INDIVIDUAL'];

  const rows: BackerRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, errors } = await graphqlRequest<BackersResponse>(
      backersQuery,
      { slug: collectiveSlug, accountType, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      { version: 'v2' },
    );
    if (errors?.length) {
      throw new Error(errors[0].message);
    }
    if (!data?.account) {
      throw new Error('Collective not found.');
    }
    rows.push(...data.account.members.nodes);
    if (rows.length >= data.account.members.totalCount || data.account.members.nodes.length < PAGE_SIZE) {
      break;
    }
  }

  // Rows without a visible account (incognito backers) are left out, as v2 hides them
  const visibleRows = rows.filter((row) => row.account);
  const rowsByAccount = groupBy(visibleRows, (row) => row.account.slug);
  const activeContributors = isActive === true ? await fetchActiveContributorSlugs(collectiveSlug) : null;
  return uniqBy(visibleRows, (row) => row.account.slug)
    .filter(
      (row) =>
        isActive !== true || isActiveBacker(rowsByAccount[row.account.slug], activeContributors.has(row.account.slug)),
    )
    .slice(0, MAX_BACKERS)
    .map((row) => toMember(row.account));
}
