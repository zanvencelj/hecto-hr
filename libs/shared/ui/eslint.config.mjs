import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import baseConfig from "../../../eslint.config.mjs";

export default [
    ...baseConfig,
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { '@typescript-eslint': tsPlugin },
        rules: {},
    },
    {
        ignores: ["**/out-tsc"],
    },
];
