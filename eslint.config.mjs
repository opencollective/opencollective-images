import globals from 'globals';
import nodeConfig from 'eslint-config-opencollective/eslint-node.config.cjs';

export default [
  ...nodeConfig,
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
    ignores: ['dist/**'],
  },
];
