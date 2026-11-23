import { defineConfig } from "vitest/config";

/**
 * The suite runs on the Base UI the dev dependency pins, 1.4.1, the oldest
 * the peer range allows and the one mail ships. `npm run test:base-ui-next`
 * runs it again on the newest the apps ship (calendar's 1.9.0), installed
 * beside it as `base-ui-next`, by pointing every `@base-ui/react` import
 * there.
 */
const next = process.env.BASE_UI === "next";

export default defineConfig({
  resolve: {
    alias: next ? [{ find: /^@base-ui\/react(\/|$)/, replacement: "base-ui-next$1" }] : [],
  },
});
