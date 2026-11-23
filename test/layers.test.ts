/**
 * Which kit stylesheets sit in the `dalin` cascade layer, and which stay out
 * of it. A layered rule loses to every rule in a later layer whatever its
 * weight, which is what lets a Tailwind utility an app passes through
 * `className` win over the kit's default.
 */
import { describe, expect, it } from "vitest";
import { readCss } from "./css.js";

const LAYERED = ["menu", "palette", "phone", "empty", "wordmark", "motion"] as const;

/** The text of a sheet outside any `@layer dalin { ... }` block. */
function outsideLayer(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf("@layer dalin {", i);
    if (at === -1) {
      out += css.slice(i);
      break;
    }
    out += css.slice(i, at);
    let depth = 0;
    let j = css.indexOf("{", at);
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) break;
    }
    i = j + 1;
  }
  return out;
}

describe("the dalin cascade layer", () => {
  it.each(LAYERED)("holds every rule of %s.css", (name) => {
    const css = readCss(name);
    expect(css).toContain("@layer dalin {");
    expect(outsideLayer(css).trim()).toBe("");
    // One block, closed where the sheet ends.
    expect(css.match(/@layer/g)).toHaveLength(1);
    expect(css.trim().endsWith("}")).toBe(true);
  });

  it("leaves the tokens out: they weigh nothing already, in :where(:root)", () => {
    const css = readCss("tokens");
    expect(css).not.toContain("@layer");
    expect(css.trim().startsWith(":where(:root) {")).toBe(true);
  });

  it("leaves the toast out: it has to beat the unlayered sheet Sonner appends, and a layered rule cannot", () => {
    expect(readCss("toast")).not.toContain("@layer");
  });

  it("leaves the create button out: its glass must beat a ring an app draws from inside a layer", () => {
    expect(readCss("create")).not.toContain("@layer");
  });

  it("names one layer and no order: the order is the app's to state, before Tailwind's", () => {
    for (const name of LAYERED) expect(readCss(name)).not.toMatch(/@layer\s+[\w-]+\s*,/);
  });
});
