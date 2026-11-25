import type { CodegenConfig } from '@graphql-codegen/cli';

const sharedConfig = {
  defaultScalarType: 'any',
  namingConvention: {
    enumValues: 'keep', // Otherwise we end up with duplicate enum value, e.g. in PaymentMethodType where we have "creditcard" (deprecated) and "CREDITCARD"
  },
};

const config: CodegenConfig = {
  generates: {
    // V2 documents use the `gql` identifier
    './src/graphql/types/v2/': {
      preset: 'client',
      presetConfig: {
        fragmentMasking: false,
      },
      schema: './src/graphql/schemaV2.graphql',
      documents: ['src/server/lib/backers.ts'],
      config: sharedConfig,
    },
    // V1 documents use the `gqlV1` identifier
    './src/graphql/types/v1/': {
      preset: 'client',
      presetConfig: {
        fragmentMasking: false,
      },
      schema: './src/graphql/schema.graphql',
      documents: ['src/server/lib/graphql.ts'],
      config: sharedConfig,
    },
  },
  pluckConfig: {
    globalGqlIdentifierName: ['gql', 'gqlV1'],
  },
};

// config file
export default config;
