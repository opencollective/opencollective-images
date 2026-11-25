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
  '\n    query Collective($collectiveSlug: String) {\n      Collective(slug: $collectiveSlug) {\n        id\n        name\n        type\n        image\n        backgroundImage\n        isGuest\n        parentCollective {\n          id\n          image\n          backgroundImage\n        }\n      }\n    }\n  ': typeof types.CollectiveDocument;
  '\n      query MembersStats($collectiveSlug: String) {\n        Collective(slug: $collectiveSlug) {\n          id\n          stats {\n            id\n            backers {\n              all\n              users\n              organizations\n            }\n          }\n        }\n      }\n    ': typeof types.MembersStatsDocument;
  '\n      query MembersStatsForTier($collectiveSlug: String, $tierSlug: String) {\n        Collective(slug: $collectiveSlug) {\n          id\n          tiers(slug: $tierSlug) {\n            id\n            slug\n            name\n            stats {\n              totalDistinctOrders\n            }\n          }\n        }\n      }\n    ': typeof types.MembersStatsForTierDocument;
};
const documents: Documents = {
  '\n    query Collective($collectiveSlug: String) {\n      Collective(slug: $collectiveSlug) {\n        id\n        name\n        type\n        image\n        backgroundImage\n        isGuest\n        parentCollective {\n          id\n          image\n          backgroundImage\n        }\n      }\n    }\n  ':
    types.CollectiveDocument,
  '\n      query MembersStats($collectiveSlug: String) {\n        Collective(slug: $collectiveSlug) {\n          id\n          stats {\n            id\n            backers {\n              all\n              users\n              organizations\n            }\n          }\n        }\n      }\n    ':
    types.MembersStatsDocument,
  '\n      query MembersStatsForTier($collectiveSlug: String, $tierSlug: String) {\n        Collective(slug: $collectiveSlug) {\n          id\n          tiers(slug: $tierSlug) {\n            id\n            slug\n            name\n            stats {\n              totalDistinctOrders\n            }\n          }\n        }\n      }\n    ':
    types.MembersStatsForTierDocument,
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
  source: '\n    query Collective($collectiveSlug: String) {\n      Collective(slug: $collectiveSlug) {\n        id\n        name\n        type\n        image\n        backgroundImage\n        isGuest\n        parentCollective {\n          id\n          image\n          backgroundImage\n        }\n      }\n    }\n  ',
): (typeof documents)['\n    query Collective($collectiveSlug: String) {\n      Collective(slug: $collectiveSlug) {\n        id\n        name\n        type\n        image\n        backgroundImage\n        isGuest\n        parentCollective {\n          id\n          image\n          backgroundImage\n        }\n      }\n    }\n  '];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n      query MembersStats($collectiveSlug: String) {\n        Collective(slug: $collectiveSlug) {\n          id\n          stats {\n            id\n            backers {\n              all\n              users\n              organizations\n            }\n          }\n        }\n      }\n    ',
): (typeof documents)['\n      query MembersStats($collectiveSlug: String) {\n        Collective(slug: $collectiveSlug) {\n          id\n          stats {\n            id\n            backers {\n              all\n              users\n              organizations\n            }\n          }\n        }\n      }\n    '];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n      query MembersStatsForTier($collectiveSlug: String, $tierSlug: String) {\n        Collective(slug: $collectiveSlug) {\n          id\n          tiers(slug: $tierSlug) {\n            id\n            slug\n            name\n            stats {\n              totalDistinctOrders\n            }\n          }\n        }\n      }\n    ',
): (typeof documents)['\n      query MembersStatsForTier($collectiveSlug: String, $tierSlug: String) {\n        Collective(slug: $collectiveSlug) {\n          id\n          tiers(slug: $tierSlug) {\n            id\n            slug\n            name\n            stats {\n              totalDistinctOrders\n            }\n          }\n        }\n      }\n    '];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
