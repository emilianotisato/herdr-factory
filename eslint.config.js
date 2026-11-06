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
    // Herdr's spaces mod with the run strip added; its empty catches stay as Herdr wrote them.
    files: ["mods/factory-spaces/main.js"],
    rules: { "no-empty": ["error", { allowEmptyCatch: true }] },
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
