import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "script",
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-this-alias": "off",
      "no-var": "off",
      "no-undef": "off",
      "no-empty": "off",
      "no-useless-escape": "off",
      "prefer-const": "off",
    },
  }
);
