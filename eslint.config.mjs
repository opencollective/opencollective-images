import graphqlPlugin from '@graphql-eslint/eslint-plugin'; // eslint-disable-line import/no-unresolved
import nodeConfig from 'eslint-config-opencollective/eslint-node.config.cjs';
import globals from 'globals';

export default [
  ...nodeConfig,
  {
    files: ['**/*.{js,ts}'],

    // Lint GraphQL queries embedded in `gql` / `gqlV1` tags against the schemas (see graphql.config.js)
    processor: graphqlPlugin.processor,

    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
  },
  {
    rules: {
      'no-console': 'warn',
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
  {
    files: ['test/**/*.{js,ts}'],
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      // Tests dynamically require modules to control their state between cases
      '@typescript-eslint/no-require-imports': 'off',
      // Tests require the converted modules by their extensionless path
      'n/no-missing-require': ['error', { tryExtensions: ['.js', '.ts', '.json', '.node'] }],
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
