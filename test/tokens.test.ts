/**
 * The tokens sheet: what it must stay (custom properties only, no
 * specificity), and the one token whose value is a claim about contrast.
 */
import { describe, expect, it } from "vitest";
import { ACCENTS, PANES, RENDER, contrast, hex, luminance, over, toSrgb, type Rgb } from "./color.js";
import { readCss, rulesWith } from "./css.js";

const css = readCss("tokens");

/** A token's value as written, with one level of var() followed. */
function token(name: string): string {
  const value = new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim() ?? "";
  const ref = /^var\((--dl-[\w-]+)\)$/.exec(value)?.[1];
  return ref ? token(ref) : value;
}

describe("tokens.css", () => {
  it("defines custom properties and the page's colour scheme, and nothing else", () => {
    const rules = rulesWith(css, "");
    expect(rules.map(([selector]) => selector)).toEqual([":where(:root)"]);
    for (const line of rules[0]![1].split(";").map((d) => d.trim()).filter(Boolean)) {
      if (line.startsWith("color-scheme")) continue;
      expect(line.startsWith("--dl-"), line).toBe(true);
    }
  });

  it("draws the browser's own parts dark: the family is dark only", () => {
    expect(rulesWith(css, "")[0]![1]).toMatch(/(^|;)\s*color-scheme:\s*dark;/);
  });
});

describe("tokens new in 0.7", () => {
  it.each([
    ["--dl-press-dim", "0.92"],
    ["--dl-press-scale", "0.97"],
    ["--dl-press-bright", "1.12"],
    ["--dl-disabled-opacity", "0.45"],
  ])("%s is %s", (name, value) => {
    expect(token(name)).toBe(value);
  });
});

describe("tokens new in 0.6", () => {
  it.each([
    ["--dl-focus-w", "2px"],
    ["--dl-focus-offset", "2px"],
    ["--dl-t-base", "180ms"],
    ["--dl-accent-fg", "oklch(0.16 0 0)"],
  ])("%s is %s", (name, value) => {
    expect(token(name)).toBe(value);
  });

  it.each([
    ["--dl-focus-ring", "var(--dl-accent)"],
    ["--dl-selection-bg", "var(--dl-accent)"],
    ["--dl-selection-fg", "var(--dl-accent-fg)"],
  ])("%s is %s", (name, value) => {
    expect(new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim()).toBe(value);
  });

  it("names a system monospace stack, ending in the generic family", () => {
    expect(token("--dl-font-mono")).toMatch(/^ui-monospace,.*monospace$/);
  });

  it("keeps the z ladder at today's numbers, low to high", () => {
    const ladder = ["bar", "search", "toast", "overlay", "dialog", "palette", "tooltip"].map((step) => Number(token(`--dl-z-${step}`)));
    expect(ladder).toEqual([30, 50, 60, 70, 80, 90, 95]);
  });

  // The selection's ink on the selection's fill, on each app's accent.
  describe.each(Object.entries(ACCENTS))("selected text in %s", (_app, [L, C, H]) => {
    it.each(Object.keys(RENDER) as Array<keyof typeof RENDER>)("clears 4.5:1 (%s)", (how) => {
      const draw = RENDER[how];
      expect(contrast(draw(L, C, H), draw(0.16, 0, 0))).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe("the surface ladder", () => {
  const LADDER = ["--dl-sidebar", "--dl-list", "--dl-content", "--dl-raised", "--dl-selected"];

  it("is the owner's values, by position", () => {
    expect(LADDER.map(token)).toEqual(["#151515", "#181818", "#1c1c1c", "#242424", "#262626"]);
  });

  it("steps up, each surface lighter than the one before", () => {
    const light = LADDER.map((name) => luminance(hex(token(name))));
    for (let i = 1; i < light.length; i++) expect(light[i]!).toBeGreaterThan(light[i - 1]!);
  });

  it.each([
    ["--dl-hover-sidebar", "--dl-sidebar", "#232323"],
    ["--dl-hover-list", "--dl-list", "#202020"],
    ["--dl-hover-content", "--dl-content", "#242424"],
  ])("%s plainly lightens its pane and stays under the selected lift", (hover, pane, value) => {
    expect(token(hover)).toBe(value);
    const level = (h: string) => parseInt(h.slice(1, 3), 16);
    // At least 6 levels of grey above its pane, so the hover reads.
    expect(level(token(hover)) - level(token(pane))).toBeGreaterThanOrEqual(6);
    expect(luminance(hex(token(hover)))).toBeLessThan(luminance(hex(token("--dl-selected"))));
  });
});

describe("sidebar rows", () => {
  it.each([
    ["--dl-row-h", "32px"],
    ["--dl-row-text", "14px"],
    ["--dl-row-dense-h", "28px"],
    ["--dl-row-dense-text", "13px"],
    ["--dl-row-icon", "17px"],
  ])("%s is %s", (name, value) => {
    expect(token(name)).toBe(value);
  });

  it("selects a plain row with the lift and a white icon", () => {
    expect(token("--dl-row-selected")).toBe("#262626");
    expect(token("--dl-row-selected-icon")).toBe("#ffffff");
  });

  it("keeps a long list denser than the navigation over it", () => {
    expect(parseFloat(token("--dl-row-dense-h"))).toBeLessThan(parseFloat(token("--dl-row-h")));
    expect(parseFloat(token("--dl-row-dense-text"))).toBeLessThan(parseFloat(token("--dl-row-text")));
  });

  it("keeps a meaning colour for each place that has one", () => {
    for (const place of ["archive", "starred", "spam"]) {
      expect(token(`--dl-meaning-${place}`)).toMatch(/^oklch\(/);
    }
  });

  it("holds each meaning colour at 3:1 or better as an icon on the selected lift", () => {
    const parse = (value: string) => value.match(/[\d.]+/g)!.map(Number) as [number, number, number];
    for (const place of ["archive", "starred", "spam"]) {
      const [L, C, H] = parse(token(`--dl-meaning-${place}`));
      for (const draw of Object.values(RENDER)) {
        expect(contrast(draw(L, C, H), hex("#262626"))).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("the overlay glass and what is written on it", () => {
  const parse = (value: string) => value.match(/[\d.]+/g)!.map(Number);
  /** The glass over a pane, and a highlighted row on it: white at 8% over that. */
  const glassOver = (pane: string) => over(hex("#202020"), 0.72, hex(pane));
  const WHITE: Rgb = [1, 1, 1];

  it("is #202020 at 72%, with a highlight of white at 8%", () => {
    expect(token("--dl-overlay")).toBe("rgb(32 32 32 / 0.72)");
    expect(token("--dl-overlay-hover")).toBe("oklch(1 0 0 / 0.08)");
    expect(token("--dl-overlay-edge")).toBe("#3d3d3d");
  });

  it.each(PANES)("keeps muted words at 4.5:1 on a highlighted row over %s", (pane) => {
    const highlighted = over(WHITE, 0.08, glassOver(pane));
    expect(contrast(hex(token("--dl-fg-muted")), highlighted)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PANES)("keeps the destructive red at 4.5:1 on the glass over %s", (pane) => {
    const [L, C, H] = parse(token("--dl-danger")) as [number, number, number];
    for (const draw of Object.values(RENDER)) {
      expect(contrast(draw(L, C, H), glassOver(pane))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("needs the text step on a highlighted row: the red itself falls under 4.5:1 there", () => {
    const [L, C, H] = parse(token("--dl-danger")) as [number, number, number];
    const highlighted = over(WHITE, 0.08, glassOver("#1c1c1c"));
    expect(contrast(RENDER.mapped(L, C, H), highlighted)).toBeLessThan(4.5);
  });

  it.each(PANES)("keeps the destructive text step at 4.5:1 on a highlighted row over %s", (pane) => {
    const value = /--dl-danger-text:\s*([^;]+);/.exec(css)?.[1] ?? "";
    expect(value).toBe("oklch(from var(--dl-danger) max(l, 0.74) c h)");
    const [L, C, H] = parse(token("--dl-danger")) as [number, number, number];
    const highlighted = over(WHITE, 0.08, glassOver(pane));
    for (const draw of Object.values(RENDER)) {
      expect(contrast(draw(Math.max(L, 0.74), C, H), highlighted)).toBeGreaterThanOrEqual(4.5);
    }
  });

  /** What `--dl-overlay-level` does to a grey behind the glass: contrast(0.709), then brightness(0.468). */
  const levelled = (channel: number) => ((channel - 0.5) * 0.709 + 0.5) * 0.468;
  const greyOf = (channel: number): Rgb => [channel, channel, channel].map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as Rgb;
  const glassOverGrey = (channel: number) => over(hex("#202020"), 0.72, greyOf(channel));

  it("levels what is behind the glass: a white page comes down, a dark pane stays where it is", () => {
    expect(token("--dl-overlay-level")).toBe("contrast(0.709) brightness(0.468)");
    expect(Math.round(levelled(1) * 255)).toBe(102);
    for (const pane of [0x15, 0x18, 0x1c]) expect(Math.abs(Math.round(levelled(pane / 255) * 255) - pane)).toBeLessThanOrEqual(3);
  });

  it("is needed: over a white page the bare glass drops muted words and the red under 4.5:1", () => {
    const bare = glassOverGrey(1);
    expect(contrast(hex(token("--dl-fg-muted")), bare)).toBeLessThan(4.5);
    const [L, C, H] = parse(token("--dl-danger")) as [number, number, number];
    expect(contrast(RENDER.mapped(L, C, H), bare)).toBeLessThan(3);
  });

  it("holds muted words and the destructive text step at 4.5:1 over a white page, once levelled", () => {
    const glass = glassOverGrey(levelled(1));
    expect(contrast(hex(token("--dl-fg-muted")), glass)).toBeGreaterThanOrEqual(4.5);
    const [L, C, H] = parse(token("--dl-danger")) as [number, number, number];
    for (const draw of Object.values(RENDER)) {
      expect(contrast(draw(Math.max(L, 0.74), C, H), glass)).toBeGreaterThanOrEqual(4.5);
    }
    // The red itself does not, which is why a row's words read the text step.
    expect(contrast(RENDER.mapped(L, C, H), glass)).toBeLessThan(4.5);
  });

  it("draws the arrow in the grey the frost comes to over the panes, within two levels", () => {
    const solid = parseInt(token("--dl-overlay-solid").slice(1, 3), 16);
    for (const pane of PANES) {
      const level = Math.round(toSrgb(glassOver(pane)[0]!) * 255);
      expect(Math.abs(level - solid)).toBeLessThanOrEqual(2);
    }
  });
});

describe("the scrim, a sheet's handle and the sidebar's width", () => {
  it.each([
    ["--dl-scrim", "rgb(0 0 0 / 0.62)"],
    ["--dl-sheet-handle", "rgb(255 255 255 / 0.22)"],
    ["--dl-sheet-handle-w", "40px"],
    ["--dl-sheet-handle-h", "4px"],
    ["--dl-sidebar-w", "240px"],
  ])("%s is %s", (name, value) => {
    expect(token(name)).toBe(value);
  });
});

describe("--dl-accent-text", () => {
  const value = /--dl-accent-text:\s*([^;]+);/.exec(css)?.[1] ?? "";
  const floor = Number(/max\(l,\s*([\d.]+)\)/.exec(value)?.[1]);

  it("is the accent with its lightness raised to at least 0.80, hue and chroma kept", () => {
    expect(value).toBe("oklch(from var(--dl-accent) max(l, 0.8) c h)");
    expect(floor).toBe(0.8);
  });

  // #2f2f2f is the lightest surface small text sits on, and the one mail's
  // violet failed on at the old floor.
  describe.each(Object.entries(ACCENTS))("%s over #2f2f2f", (_app, [L, C, H]) => {
    it.each(Object.keys(RENDER) as Array<keyof typeof RENDER>)("clears 4.5:1 on a 14%% accent tint (%s)", (how) => {
      const draw = RENDER[how];
      const tint = over(draw(L, C, H), 0.14, hex("#2f2f2f"));
      expect(contrast(draw(Math.max(L, floor), C, H), tint)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("needed the new floor: at 0.78 mail's violet read 4.46:1 on its tint over #2f2f2f", () => {
    const [L, C, H] = ACCENTS.mail!;
    const tint = over(RENDER.clipped(L, C, H), 0.14, hex("#2f2f2f"));
    const old = contrast(RENDER.clipped(Math.max(L, 0.78), C, H), tint);
    expect(old).toBeLessThan(4.5);
    expect(old).toBeCloseTo(4.46, 2);
    expect(contrast(RENDER.clipped(Math.max(L, floor), C, H), tint)).toBeCloseTo(4.77, 2);
  });

  describe.each(Object.entries(ACCENTS))("%s", (_app, [L, C, H]) => {
    it.each(
      PANES.flatMap((pane) => (Object.keys(RENDER) as Array<keyof typeof RENDER>).map((how) => [pane, how] as const)),
    )("clears 4.5:1 on a 14%% accent tint over %s (%s)", (pane, how) => {
      const draw = RENDER[how];
      const tint = over(draw(L, C, H), 0.14, hex(pane));
      const text = draw(Math.max(L, floor), C, H);
      expect(contrast(text, tint)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("is needed: three of the four accents fail as text at their own lightness", () => {
    const failing = Object.entries(ACCENTS).filter(([, [L, C, H]]) => {
      const tint = over(RENDER.mapped(L, C, H), 0.14, hex("#1c1c1c"));
      return contrast(RENDER.mapped(L, C, H), tint) < 4.5;
    });
    expect(failing.map(([app]) => app).sort()).toEqual(["calendar", "drive", "mail"]);
  });

  it("leaves an accent that is already light enough as it is", () => {
    const [L] = ACCENTS.notes!;
    expect(Math.max(L, floor)).toBe(L);
  });
});

describe("the kit's own z-indexes read the ladder", () => {
  it.each([
    ["menu", "var(--dl-overlay-z, var(--dl-z-overlay, 70))"],
    ["palette", "var(--dl-palette-z, var(--dl-z-palette, 90))"],
    ["phone", "var(--dl-phone-search-z, var(--dl-z-search, 50))"],
    ["toast", "--dl-bar-z: var(--dl-z-bar, 30)"],
    ["toast", "--dl-toast-over-z: var(--dl-z-toast, 60)"],
  ] as const)("%s.css reads %s", (sheet, text) => {
    expect(readCss(sheet)).toContain(text);
  });

  it("leaves no bare number as a z-index in a kit sheet, past the small steps inside a part", () => {
    for (const sheet of ["menu", "palette", "phone", "toast", "create", "wordmark", "empty", "base"] as const) {
      for (const [, value] of readCss(sheet).matchAll(/z-index:\s*(-?\d+)/g)) {
        expect(Math.abs(Number(value)), `${sheet}.css z-index ${value}`).toBeLessThan(10);
      }
    }
  });
});
