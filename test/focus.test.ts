/**
 * The keyboard ring: every kit control that can take focus draws the
 * family's ring from the focus tokens (--dl-focus-ring, --dl-focus-w and
 * --dl-focus-offset in tokens.css).
 */
import { describe, expect, it } from "vitest";
import { readCss, ruleNaming, rulesWith } from "./css.js";

const RING = "var(--dl-focus-w, 2px) solid var(--dl-focus-ring, var(--dl-fg, #fff))";

describe("the keyboard ring", () => {
  it("rings the palette's Esc cap, outside it", () => {
    const rule = ruleNaming(readCss("palette"), ".dl-palette-close:focus-visible");
    expect(rule).toContain(`outline: ${RING}`);
    expect(rule).toContain("outline-offset: var(--dl-focus-offset, 2px)");
  });

  it("rings the toast's action inside its segment, over Sonner's shadow", () => {
    const rule = ruleNaming(readCss("toast"), "[data-sonner-toast] [data-button]:focus-visible");
    expect(rule).toContain(`outline: ${RING} !important`);
    expect(rule).toContain("outline-offset: calc(-1 * var(--dl-focus-w, 2px)) !important");
    expect(rule).toContain("box-shadow: none !important");
  });

  it.each(["create", "wordmark", "phone", "palette", "toast", "menu", "empty"] as const)(
    "draws every ring in %s.css from the focus tokens",
    (sheet) => {
      for (const [selector, body] of rulesWith(readCss(sheet), ":focus-visible")) {
        const ring = /(?:outline|border):\s*([^;]+);/.exec(body)?.[1] ?? "";
        if (ring === "none" || ring === "") continue;
        expect(ring, selector).toContain("var(--dl-focus-w, 2px)");
        expect(ring, selector).toContain("var(--dl-focus-ring");
      }
    },
  );
});
