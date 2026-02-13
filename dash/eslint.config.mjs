// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        allowDefaultProject: ['*.mjs', 'dist/*.js'],
        projectService: true,
      },
    },
  },
  [
    {
      rules: {
        "no-console": [
          "warn",
          {
            allow: ["log", "warn", "error"]
          }
        ],
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            "argsIgnorePattern": "^_",
            "varsIgnorePattern": "^_"
          }
        ],
        "@typescript-eslint/no-explicit-any": "warn",
        "quotes": ["error", "double", { avoidEscape: true }],
        "semi": ["error", "always"],
        "comma-dangle": ["error", "always-multiline"],
      }
    }
  ]
);
