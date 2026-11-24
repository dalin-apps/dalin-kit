/**
 * The segmented control (seg.css): mail's and calendar's look, made the
 * family's by the owner's pick on 2026-11-23. A #333 edge around a #1f1f1f
 * track, the picked segment a #3a3a3a lift with white words, the others
 * muted. The font size is the app's, so the kit sets none.
 */
import { describe, expect, it } from "vitest";
import { outweighs, readCss, ruleFor, rulesWith } from "./css.js";

const css = readCss("seg");
const READY = ':not(:is(:disabled, [aria-disabled="true"], [aria-busy="true"]))';

describe("the segmented control", () => {
  it("draws the track with a plain #333 line and the #1f1f1f fill", () => {
    const track = ruleFor(css, ".dl-seg");
    expect(track).toContain("border: 1px solid #333");
    expect(track).toContain("background: #1f1f1f");
    expect(track).toContain("border-radius: var(--dl-r-control, 7px)");
  });

  it("lifts the picked segment to #3a3a3a with white words and one small shadow, no ring", () => {
    const picked = ruleFor(css, '.dl-seg-option[aria-checked="true"]');
    expect(picked).toContain("background: #3a3a3a");
    expect(picked).toContain("color: var(--dl-fg, #fff)");
    expect(picked).toContain("box-shadow: 0 1px 2px oklch(0 0 0 / 0.45)");
    expect(picked).not.toContain("inset");
  });

  it("mutes the other segments and leaves the font size to the app", () => {
    const option = ruleFor(css, ".dl-seg-option");
    expect(option).toContain("color: var(--dl-fg-muted, #b8b8b8)");
    expect(option).not.toMatch(/font-size/);
    expect(css).not.toMatch(/font-size/);
  });

  it("whitens an unpicked segment under the pointer only where there is hover", () => {
    expect(css).toMatch(/@media \(hover: hover\) \{\s*\.dl-seg-option\[aria-checked="false"\]:hover \{\s*color: var\(--dl-fg, #fff\);/);
  });

  it("presses one step darker on the desktop, and shrinks and brightens on the phone", () => {
    const desk = ruleFor(css, `.dl-seg-option:active${READY}`);
    expect(desk).toContain("filter: brightness(var(--dl-press-dim, 0.92))");
    const phoneList = `.dl-phone .dl-seg-option:active${READY}`;
    const phone = ruleFor(css, phoneList);
    expect(phone).toContain("scale: var(--dl-press-scale, 0.97)");
    expect(phone).toContain("filter: brightness(var(--dl-press-bright, 1.12))");
    expect(phone).not.toContain("transform");
    const still = rulesWith(css, ".dl-phone .dl-seg-option:active").filter(([, body]) => body.includes("scale: none"));
    expect(still).toHaveLength(2);
    for (const [selector] of still) expect(outweighs(selector, phoneList), selector).toBe(true);
  });

  it("gives a phone's thumb 44px up and down", () => {
    expect(ruleFor(css, ".dl-phone .dl-seg-option::before")).toContain("inset: calc(50% - 22px) 0");
  });

  it("is 45% opaque with the normal cursor when disabled", () => {
    const off = ruleFor(css, '.dl-seg-option:is(:disabled, [aria-disabled="true"])');
    expect(off).toContain("opacity: var(--dl-disabled-opacity, 0.45)");
    expect(off).toContain("cursor: default");
  });
});
