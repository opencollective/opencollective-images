import graphqlPlugin from '@graphql-eslint/eslint-plugin'; // eslint-disable-line import/no-unresolved
import nodeConfig from 'eslint-config-opencollective/eslint-node.config.cjs';
import globals from 'globals';

export default [
  ...nodeConfig,
  {
    files: ['**/*.js'],

    // Lint GraphQL queries embedded in `gql` / `gqlV1` tags against the schemas (see graphql.config.js)
    processor: graphqlPlugin.processor,
  },
  {
    rules: {
      'no-console': 'warn',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    files: ['**/*.graphql'],

    languageOptions: {
      parser: graphqlPlugin.parser,
    },
    plugins: {
      '@graphql-eslint': graphqlPlugin,
    },

    rules: {
      '@graphql-eslint/no-deprecated': 'warn',
      '@graphql-eslint/fields-on-correct-type': 'error',
      '@graphql-eslint/no-duplicate-fields': 'error',
      '@graphql-eslint/naming-convention': [
        'error',
        {
          VariableDefinition: 'camelCase',

          OperationDefinition: {
            style: 'PascalCase',
            forbiddenPrefixes: ['get', 'fetch'],
            forbiddenSuffixes: ['Query', 'Mutation', 'Fragment'],
          },
        },
      ],
    },
  },
  {
    ignores: ['dist/**', 'src/graphql/*.graphql'],
  },
];
