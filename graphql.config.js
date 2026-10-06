module.exports = {
  projects: {
    default: {
      schema: 'src/graphql/schemaV2.graphql',
      extensions: {
        endpoints: {
          dev: 'http://localhost:3060/graphql/v2',
          prod: 'https://api.opencollective.com/graphql/v2',
        },
        pluckConfig: {
          globalGqlIdentifierName: 'gql',
        },
      },
    },
    graphqlV1: {
      schema: 'src/graphql/schema.graphql',
      // Files that only use `gqlV1`; everything else is checked against the V2 schema
      documents: ['src/server/lib/graphql.js'],
      extensions: {
        endpoints: {
          dev: 'http://localhost:3060/graphql/v1',
          prod: 'https://api.opencollective.com/graphql/v1',
        },
        pluckConfig: {
          globalGqlIdentifierName: 'gqlV1',
        },
      },
    },
  },
};
