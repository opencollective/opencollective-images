/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type CollectiveQueryVariables = Exact<{
  collectiveSlug?: string | null | undefined;
}>;

export type CollectiveQuery = {
  Collective:
    | {
        id: number | null;
        name: string | null;
        type: string | null;
        image: string | null;
        backgroundImage: string | null;
        isGuest: boolean | null;
        parentCollective:
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | null;
      }
    | {
        id: number | null;
        name: string | null;
        type: string | null;
        image: string | null;
        backgroundImage: string | null;
        isGuest: boolean | null;
        parentCollective:
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | null;
      }
    | {
        id: number | null;
        name: string | null;
        type: string | null;
        image: string | null;
        backgroundImage: string | null;
        isGuest: boolean | null;
        parentCollective:
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | null;
      }
    | {
        id: number | null;
        name: string | null;
        type: string | null;
        image: string | null;
        backgroundImage: string | null;
        isGuest: boolean | null;
        parentCollective:
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | null;
      }
    | {
        id: number | null;
        name: string | null;
        type: string | null;
        image: string | null;
        backgroundImage: string | null;
        isGuest: boolean | null;
        parentCollective:
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | null;
      }
    | {
        id: number | null;
        name: string | null;
        type: string | null;
        image: string | null;
        backgroundImage: string | null;
        isGuest: boolean | null;
        parentCollective:
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | null;
      }
    | {
        id: number | null;
        name: string | null;
        type: string | null;
        image: string | null;
        backgroundImage: string | null;
        isGuest: boolean | null;
        parentCollective:
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | null;
      }
    | {
        id: number | null;
        name: string | null;
        type: string | null;
        image: string | null;
        backgroundImage: string | null;
        isGuest: boolean | null;
        parentCollective:
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | { id: number | null; image: string | null; backgroundImage: string | null }
          | null;
      }
    | null;
};

export type MembersStatsQueryVariables = Exact<{
  collectiveSlug?: string | null | undefined;
}>;

export type MembersStatsQuery = {
  Collective:
    | {
        id: number | null;
        stats: {
          id: number | null;
          backers: { all: number | null; users: number | null; organizations: number | null } | null;
        } | null;
      }
    | {
        id: number | null;
        stats: {
          id: number | null;
          backers: { all: number | null; users: number | null; organizations: number | null } | null;
        } | null;
      }
    | {
        id: number | null;
        stats: {
          id: number | null;
          backers: { all: number | null; users: number | null; organizations: number | null } | null;
        } | null;
      }
    | {
        id: number | null;
        stats: {
          id: number | null;
          backers: { all: number | null; users: number | null; organizations: number | null } | null;
        } | null;
      }
    | {
        id: number | null;
        stats: {
          id: number | null;
          backers: { all: number | null; users: number | null; organizations: number | null } | null;
        } | null;
      }
    | {
        id: number | null;
        stats: {
          id: number | null;
          backers: { all: number | null; users: number | null; organizations: number | null } | null;
        } | null;
      }
    | {
        id: number | null;
        stats: {
          id: number | null;
          backers: { all: number | null; users: number | null; organizations: number | null } | null;
        } | null;
      }
    | {
        id: number | null;
        stats: {
          id: number | null;
          backers: { all: number | null; users: number | null; organizations: number | null } | null;
        } | null;
      }
    | null;
};

export type MembersStatsForTierQueryVariables = Exact<{
  collectiveSlug?: string | null | undefined;
  tierSlug?: string | null | undefined;
}>;

export type MembersStatsForTierQuery = {
  Collective:
    | {
        id: number | null;
        tiers: Array<{
          id: number | null;
          slug: string | null;
          name: string | null;
          stats: { totalDistinctOrders: number | null } | null;
        } | null> | null;
      }
    | {
        id: number | null;
        tiers: Array<{
          id: number | null;
          slug: string | null;
          name: string | null;
          stats: { totalDistinctOrders: number | null } | null;
        } | null> | null;
      }
    | {
        id: number | null;
        tiers: Array<{
          id: number | null;
          slug: string | null;
          name: string | null;
          stats: { totalDistinctOrders: number | null } | null;
        } | null> | null;
      }
    | {
        id: number | null;
        tiers: Array<{
          id: number | null;
          slug: string | null;
          name: string | null;
          stats: { totalDistinctOrders: number | null } | null;
        } | null> | null;
      }
    | {
        id: number | null;
        tiers: Array<{
          id: number | null;
          slug: string | null;
          name: string | null;
          stats: { totalDistinctOrders: number | null } | null;
        } | null> | null;
      }
    | {
        id: number | null;
        tiers: Array<{
          id: number | null;
          slug: string | null;
          name: string | null;
          stats: { totalDistinctOrders: number | null } | null;
        } | null> | null;
      }
    | {
        id: number | null;
        tiers: Array<{
          id: number | null;
          slug: string | null;
          name: string | null;
          stats: { totalDistinctOrders: number | null } | null;
        } | null> | null;
      }
    | {
        id: number | null;
        tiers: Array<{
          id: number | null;
          slug: string | null;
          name: string | null;
          stats: { totalDistinctOrders: number | null } | null;
        } | null> | null;
      }
    | null;
};

export const CollectiveDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'Collective' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'collectiveSlug' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'Collective' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'slug' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'collectiveSlug' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                { kind: 'Field', name: { kind: 'Name', value: 'image' } },
                { kind: 'Field', name: { kind: 'Name', value: 'backgroundImage' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isGuest' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'parentCollective' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'image' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'backgroundImage' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CollectiveQuery, CollectiveQueryVariables>;
export const MembersStatsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'MembersStats' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'collectiveSlug' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'Collective' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'slug' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'collectiveSlug' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stats' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'backers' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'all' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'users' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'organizations' } },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MembersStatsQuery, MembersStatsQueryVariables>;
export const MembersStatsForTierDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'MembersStatsForTier' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'collectiveSlug' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'tierSlug' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'Collective' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'slug' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'collectiveSlug' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'tiers' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'slug' },
                      value: { kind: 'Variable', name: { kind: 'Name', value: 'tierSlug' } },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'stats' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [{ kind: 'Field', name: { kind: 'Name', value: 'totalDistinctOrders' } }],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MembersStatsForTierQuery, MembersStatsForTierQueryVariables>;
