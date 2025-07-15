const { defineConfig } = require("@fullstacksjs/eslint-config");

module.exports = defineConfig({
  prettier: true,
  regex: false,
  languageOptions: {
    globals: {
      chrome: "readonly",
    },
  },
  rules: {
    "no-alert": "off",
  },
});
