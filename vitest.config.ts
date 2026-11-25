import { defineConfig } from "vitest/config";

/**
 * The suite runs on the Base UI the dev dependency pins, 1.9.0. That is
 * the floor of the peer range (the sheet is built on its Drawer) and the
 * version all four apps ship, so there is no second one to run against.
 *
 * When an app moves past it, install the newer one beside this as
 * `base-ui-next` (`npm i -D base-ui-next@npm:@base-ui/react@<version>`)
 * and run `BASE_UI=next npx vitest run src/components`: the alias below
 * points every `@base-ui/react` import there.
 */
const next = process.env.BASE_UI === "next";

export default defineConfig({
  resolve: {
    alias: next ? [{ find: /^@base-ui\/react(\/|$)/, replacement: "base-ui-next$1" }] : [],
  },
});
