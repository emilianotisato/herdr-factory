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
    // Herdr's own code, kept byte-identical so a re-clone diffs cleanly.
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
