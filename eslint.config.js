import js from "@eslint/js";

export default [
  {
    ignores: [
      "node_modules/",
      "docs/",
      ".claude/",
      ".agents/",
      ".gate/",
      "mods/*/gpui-kit.d.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["mods/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { localStorage: "readonly" },
    },
  },
  {
    files: ["tests/**/*.js", "scripts/**/*.js", "*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { process: "readonly", console: "readonly", URL: "readonly" },
    },
  },
];
