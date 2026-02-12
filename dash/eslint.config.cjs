const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");

const baseRules = {
  ...js.configs.recommended.rules,
  ...tsPlugin.configs.recommended.rules,
  "no-console": [
    "warn",
    {
      allow: ["log", "warn", "error"]
    }
  ],
  "@typescript-eslint/no-unused-vars": [
    "warn",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_"
    }
  ],
  "@typescript-eslint/no-explicit-any": "warn",
  "quotes": ["error", "double", { avoidEscape: true }],
  "semi": ["error", "always"],
  "comma-dangle": ["error", "never"]
};

module.exports = [
  {
    ignores: ["node_modules", "dist", "*.js"]
  },
  {
    files: ["dashboard.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: {
        window: "readonly",
        document: "readonly",
        WebSocket: "readonly",
        MessageEvent: "readonly",
        Event: "readonly",
        console: "readonly",
        setInterval: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: baseRules
  },
  {
    files: ["backend-server.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: {
        __dirname: "readonly",
        process: "readonly",
        console: "readonly",
        setInterval: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: baseRules
  }
];
