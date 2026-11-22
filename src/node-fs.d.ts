/**
 * The one Node call the tests make: reading a stylesheet to pin a rule in it.
 * Declared here so the kit needs no @types/node for it. Nothing in the built
 * package imports it (test/css.ts and the tests do).
 */
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}
