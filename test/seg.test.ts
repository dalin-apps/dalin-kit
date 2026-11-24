/**
 * The segmented control (seg.css): notes' Share switch, made the family's by
 * the owner's pick on 2026-11-23. A #2f2f2f rule around a #1c1c1c track, the
 * picked segment a #3d3d3d lift with a #5c5c5c line inside its edge and white
 * words, the others muted. The font size is the app's, so the kit sets none.
 */
import { describe, expect, it } from "vitest";
import { outweighs, readCss, ruleFor, rulesWith } from "./css.js";

const css = readCss("seg");
const READY = ':not(:is(:disabled, [aria-disabled="true"], [aria-busy="true"]))';

describe("the segmented control", () => {
  it("draws a sunken track: the content fill inside the family's rule", () => {
    const track = ruleFor(css, ".dl-seg");
    expect(track).toContain("border: 1px solid var(--dl-border, #2f2f2f)");
    expect(track).toContain("background: var(--dl-content, #1c1c1c)");
    expect(track).toContain("border-radius: var(--dl-r-control, 7px)");
  });

  it("lifts the picked segment to #3d3d3d with a #5c5c5c line inside its edge, white words and a small shadow", () => {
    const picked = ruleFor(css, '.dl-seg-option[aria-checked="true"]').replace(/\s+/g, " ");
    expect(picked).toContain("background: var(--dl-border-strong, #3d3d3d)");
    expect(picked).toContain("color: var(--dl-fg, #fff)");
    expect(picked).toContain("box-shadow: inset 0 0 0 1px var(--dl-kbd-edge, #5c5c5c), 0 1px 2px oklch(0 0 0 / 0.4)");
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

describe("the sliding lift", () => {
  const lift = ruleFor(css, ".dl-seg[data-dl-seg-slide]::before").replace(/\s+/g, " ");

  it("is drawn by the track once the helper has measured, with the picked segment's own look", () => {
    const picked = ruleFor(css, '.dl-seg-option[aria-checked="true"]').replace(/\s+/g, " ");
    for (const part of ["background: var(--dl-border-strong, #3d3d3d)", "inset 0 0 0 1px var(--dl-kbd-edge, #5c5c5c)", "0 1px 2px oklch(0 0 0 / 0.4)"]) {
      expect(lift).toContain(part);
      expect(picked).toContain(part);
    }
    expect(lift).toContain("transform: translate(var(--dl-seg-x, 0px), var(--dl-seg-y, 0px))");
    expect(lift).toContain("width: var(--dl-seg-w, 0px)");
    expect(lift).toContain("pointer-events: none");
  });

  it("slides only once live, and the picked segment then draws no lift of its own", () => {
    expect(ruleFor(css, '.dl-seg[data-dl-seg-slide="live"]::before')).toContain("transform var(--dl-t-base, 180ms)");
    expect(lift).not.toContain("transition");
    const own = ruleFor(css, '.dl-seg[data-dl-seg-slide] > .dl-seg-option[aria-checked="true"]');
    expect(own).toContain("background: none");
    expect(own).toContain("box-shadow: none");
    expect(outweighs('.dl-seg[data-dl-seg-slide] > .dl-seg-option[aria-checked="true"]', '.dl-seg-option[aria-checked="true"]')).toBe(true);
  });

  it("never slides from the keyboard or under reduced motion, either switch", () => {
    const still = rulesWith(css, ".dl-seg[data-dl-seg-slide]::before").filter(([, body]) => body.includes("transition: none"));
    const selectors = still.flatMap(([list]) => list.split(",").map((s) => s.trim()));
    expect(selectors).toEqual([
      'html[data-input="keyboard"] .dl-seg[data-dl-seg-slide]::before',
      'html[data-dl-motion="reduce"] .dl-seg[data-dl-seg-slide]::before',
      'html:not([data-dl-motion="full"]) .dl-seg[data-dl-seg-slide]::before',
    ]);
    for (const s of selectors) expect(outweighs(s, '.dl-seg[data-dl-seg-slide="live"]::before'), s).toBe(true);
  });
});
