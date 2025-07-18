const { defineConfig } = require("@fullstacksjs/eslint-config");

module.exports = defineConfig({
  prettier: true,
  languageOptions: {
    globals: {
      chrome: "readonly",
    },
  },
  rules: {
    "no-alert": "off",
  },
});
