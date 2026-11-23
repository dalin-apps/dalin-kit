/**
 * base.css: the page-level rules. Selected text reads the selection tokens,
 * with the tokens' own values as the fallback.
 */
import { describe, expect, it } from "vitest";
import { readCss, ruleFor } from "./css.js";

const css = readCss("base");

describe("base.css", () => {
  it("draws selected text with the selection tokens, in one rule", () => {
    expect(css.match(/::selection/g)).toHaveLength(1);
    const rule = ruleFor(css, "::selection");
    expect(rule).toMatch(/background:\s*var\(--dl-selection-bg\b/);
    expect(rule).toMatch(/color:\s*var\(--dl-selection-fg\b/);
  });

  it("falls back to the accent and its ink where tokens.css is not loaded", () => {
    const rule = ruleFor(css, "::selection");
    expect(rule).toContain("var(--dl-selection-bg, var(--dl-accent))");
    expect(rule).toContain("oklch(0.16 0 0)");
  });
});
