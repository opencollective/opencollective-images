/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  '\n  query BackersForImages($slug: String!, $accountType: [AccountType], $limit: Int!, $offset: Int!) {\n    account(slug: $slug) {\n      id\n      members(\n        role: [BACKER]\n        accountType: $accountType\n        orderByTotalContributed: DESC\n        includeInherited: false\n        limit: $limit\n        offset: $offset\n      ) {\n        totalCount\n        nodes {\n          id\n          isActive\n          tier {\n            id\n          }\n          account {\n            slug\n            name\n            type\n            imageUrl\n            website\n            twitterHandle\n            ... on Individual {\n              isGuest\n            }\n          }\n        }\n      }\n    }\n  }\n': typeof types.BackersForImagesDocument;
  '\n  query ActiveOrdersForImages($slug: String!, $limit: Int!, $offset: Int!) {\n    account(slug: $slug) {\n      id\n      orders(filter: INCOMING, status: [ACTIVE], frequency: [MONTHLY, YEARLY], limit: $limit, offset: $offset) {\n        totalCount\n        nodes {\n          fromAccount {\n            slug\n          }\n        }\n      }\n    }\n  }\n': typeof types.ActiveOrdersForImagesDocument;
  '\n  query TiersForImages($slug: String!) {\n    account(slug: $slug) {\n      id\n      ... on AccountWithContributions {\n        tiers(limit: 1000, onlyValid: false) {\n          nodes {\n            id\n            slug\n            frequency\n          }\n        }\n      }\n    }\n  }\n': typeof types.TiersForImagesDocument;
  '\n  query TierOrdersForImages($tierId: String!, $limit: Int!, $offset: Int!) {\n    tier(tier: { id: $tierId }) {\n      id\n      orders(limit: $limit, offset: $offset) {\n        totalCount\n        nodes {\n          createdAt\n          processedAt\n          lastChargedAt\n          fromAccount {\n            slug\n            name\n            type\n            imageUrl\n            website\n            twitterHandle\n            ... on Individual {\n              isGuest\n            }\n          }\n        }\n      }\n    }\n  }\n': typeof types.TierOrdersForImagesDocument;
};
const documents: Documents = {
  '\n  query BackersForImages($slug: String!, $accountType: [AccountType], $limit: Int!, $offset: Int!) {\n    account(slug: $slug) {\n      id\n      members(\n        role: [BACKER]\n        accountType: $accountType\n        orderByTotalContributed: DESC\n        includeInherited: false\n        limit: $limit\n        offset: $offset\n      ) {\n        totalCount\n        nodes {\n          id\n          isActive\n          tier {\n            id\n          }\n          account {\n            slug\n            name\n            type\n            imageUrl\n            website\n            twitterHandle\n            ... on Individual {\n              isGuest\n            }\n          }\n        }\n      }\n    }\n  }\n':
    types.BackersForImagesDocument,
  '\n  query ActiveOrdersForImages($slug: String!, $limit: Int!, $offset: Int!) {\n    account(slug: $slug) {\n      id\n      orders(filter: INCOMING, status: [ACTIVE], frequency: [MONTHLY, YEARLY], limit: $limit, offset: $offset) {\n        totalCount\n        nodes {\n          fromAccount {\n            slug\n          }\n        }\n      }\n    }\n  }\n':
    types.ActiveOrdersForImagesDocument,
  '\n  query TiersForImages($slug: String!) {\n    account(slug: $slug) {\n      id\n      ... on AccountWithContributions {\n        tiers(limit: 1000, onlyValid: false) {\n          nodes {\n            id\n            slug\n            frequency\n          }\n        }\n      }\n    }\n  }\n':
    types.TiersForImagesDocument,
  '\n  query TierOrdersForImages($tierId: String!, $limit: Int!, $offset: Int!) {\n    tier(tier: { id: $tierId }) {\n      id\n      orders(limit: $limit, offset: $offset) {\n        totalCount\n        nodes {\n          createdAt\n          processedAt\n          lastChargedAt\n          fromAccount {\n            slug\n            name\n            type\n            imageUrl\n            website\n            twitterHandle\n            ... on Individual {\n              isGuest\n            }\n          }\n        }\n      }\n    }\n  }\n':
    types.TierOrdersForImagesDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  query BackersForImages($slug: String!, $accountType: [AccountType], $limit: Int!, $offset: Int!) {\n    account(slug: $slug) {\n      id\n      members(\n        role: [BACKER]\n        accountType: $accountType\n        orderByTotalContributed: DESC\n        includeInherited: false\n        limit: $limit\n        offset: $offset\n      ) {\n        totalCount\n        nodes {\n          id\n          isActive\n          tier {\n            id\n          }\n          account {\n            slug\n            name\n            type\n            imageUrl\n            website\n            twitterHandle\n            ... on Individual {\n              isGuest\n            }\n          }\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  query BackersForImages($slug: String!, $accountType: [AccountType], $limit: Int!, $offset: Int!) {\n    account(slug: $slug) {\n      id\n      members(\n        role: [BACKER]\n        accountType: $accountType\n        orderByTotalContributed: DESC\n        includeInherited: false\n        limit: $limit\n        offset: $offset\n      ) {\n        totalCount\n        nodes {\n          id\n          isActive\n          tier {\n            id\n          }\n          account {\n            slug\n            name\n            type\n            imageUrl\n            website\n            twitterHandle\n            ... on Individual {\n              isGuest\n            }\n          }\n        }\n      }\n    }\n  }\n'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  query ActiveOrdersForImages($slug: String!, $limit: Int!, $offset: Int!) {\n    account(slug: $slug) {\n      id\n      orders(filter: INCOMING, status: [ACTIVE], frequency: [MONTHLY, YEARLY], limit: $limit, offset: $offset) {\n        totalCount\n        nodes {\n          fromAccount {\n            slug\n          }\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  query ActiveOrdersForImages($slug: String!, $limit: Int!, $offset: Int!) {\n    account(slug: $slug) {\n      id\n      orders(filter: INCOMING, status: [ACTIVE], frequency: [MONTHLY, YEARLY], limit: $limit, offset: $offset) {\n        totalCount\n        nodes {\n          fromAccount {\n            slug\n          }\n        }\n      }\n    }\n  }\n'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  query TiersForImages($slug: String!) {\n    account(slug: $slug) {\n      id\n      ... on AccountWithContributions {\n        tiers(limit: 1000, onlyValid: false) {\n          nodes {\n            id\n            slug\n            frequency\n          }\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  query TiersForImages($slug: String!) {\n    account(slug: $slug) {\n      id\n      ... on AccountWithContributions {\n        tiers(limit: 1000, onlyValid: false) {\n          nodes {\n            id\n            slug\n            frequency\n          }\n        }\n      }\n    }\n  }\n'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  query TierOrdersForImages($tierId: String!, $limit: Int!, $offset: Int!) {\n    tier(tier: { id: $tierId }) {\n      id\n      orders(limit: $limit, offset: $offset) {\n        totalCount\n        nodes {\n          createdAt\n          processedAt\n          lastChargedAt\n          fromAccount {\n            slug\n            name\n            type\n            imageUrl\n            website\n            twitterHandle\n            ... on Individual {\n              isGuest\n            }\n          }\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  query TierOrdersForImages($tierId: String!, $limit: Int!, $offset: Int!) {\n    tier(tier: { id: $tierId }) {\n      id\n      orders(limit: $limit, offset: $offset) {\n        totalCount\n        nodes {\n          createdAt\n          processedAt\n          lastChargedAt\n          fromAccount {\n            slug\n            name\n            type\n            imageUrl\n            website\n            twitterHandle\n            ... on Individual {\n              isGuest\n            }\n          }\n        }\n      }\n    }\n  }\n'];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
