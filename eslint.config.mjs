// @ts-check
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
      "ignores": [
        "**/dist/**",
        "**/node_modules/**",
        "**/out-tsc/**",
        "**/test-output/**",
        "**/vite.config.*.timestamp*",
        "**/vitest.config.*.timestamp*",
        "**/test-output"
      ]
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs['recommended'].rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  prettierConfig,
];
