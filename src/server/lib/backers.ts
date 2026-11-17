import gql from 'graphql-tag';
import { uniqBy } from 'lodash';

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

type BackersResponse = {
  account: { id: string; members: { nodes: Array<{ id: string; account: BackerAccount | null }> } } | null;
};

/**
 * The v2 API caps a page of members at 1,000. Banners and README avatar lists never need more: the
 * deepest position requested in production is under 400.
 */
export const MAX_BACKERS = 1000;

const backersQuery = gql /* GraphQL */ `
  query BackersForImages($slug: String!, $accountType: [AccountType], $isActive: Boolean, $limit: Int!) {
    account(slug: $slug) {
      id
      members(
        role: [BACKER]
        accountType: $accountType
        isActive: $isActive
        orderByTotalContributed: DESC
        includeInherited: false
        limit: $limit
      ) {
        nodes {
          id
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

/**
 * The backers of `collectiveSlug` (`/:slug/:backerType.svg` and the per-position avatar and website
 * routes), most contributed first, like v1 `allMembers(orderBy: "totalDonations")`. Organizations
 * (and collectives and funds) for sponsor/organization backer types, individuals otherwise.
 *
 * `isActive: true` keeps active backers only; otherwise all of them, as v1 did (v2's `isActive: false`
 * would select inactive backers only).
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
  const { data, errors } = await graphqlRequest<BackersResponse>(
    backersQuery,
    { slug: collectiveSlug, accountType, isActive: isActive === true ? true : undefined, limit: MAX_BACKERS },
    { version: 'v2' },
  );
  if (errors?.length) {
    throw new Error(errors[0].message);
  }
  if (!data?.account) {
    throw new Error('Collective not found.');
  }
  const accounts = data.account.members.nodes.map((node) => node.account).filter(Boolean);
  // An account can be a backer several times (one member per tier): keep its first, highest-ranked entry
  return uniqBy(accounts.map(toMember), (member) => member.slug);
}
