/**
 * The tokens sheet: what it must stay (custom properties only, no
 * specificity), and the one token whose value is a claim about contrast.
 */
import { describe, expect, it } from "vitest";
import { readCss, rulesWith } from "./css.js";

const css = readCss("tokens");

/* OKLCH to linear sRGB (Björn Ottosson's matrices), and WCAG contrast. */
type Rgb = [number, number, number];
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

function oklch(L: number, C: number, H: number): Rgb {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const inGamut = (rgb: Rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
const clip = (rgb: Rgb) => rgb.map((v) => Math.min(1, Math.max(0, v))) as Rgb;

/** A colour outside sRGB, drawn the two ways a browser may: channels clipped, or chroma brought in. */
const RENDER = {
  clipped: (L: number, C: number, H: number) => clip(oklch(L, C, H)),
  mapped: (L: number, C: number, H: number) => {
    if (inGamut(oklch(L, C, H))) return oklch(L, C, H);
    let [lo, hi] = [0, C];
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklch(L, mid, H))) lo = mid;
      else hi = mid;
    }
    return clip(oklch(L, lo, H));
  },
};

const luminance = (rgb: Rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
const hex = (h: string) => [1, 3, 5].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255)) as Rgb;
function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** `top` at `alpha` over `under`, composited in sRGB as a browser does. */
function over(top: Rgb, alpha: number, under: Rgb): Rgb {
  return top.map((v, i) => toLinear(alpha * toSrgb(v) + (1 - alpha) * toSrgb(under[i]!))) as Rgb;
}

/** Each app's --dl-accent, as its own stylesheet sets it. */
const ACCENTS: Record<string, [number, number, number]> = {
  mail: [0.64, 0.28, 285],
  calendar: [0.64, 0.16, 50],
  notes: [0.85, 0.175, 95],
  drive: [0.64, 0.16, 240],
};
/** The panes small accent text sits on: the sidebar, the list and the content. */
const PANES = ["#151515", "#181818", "#1c1c1c"];

/** A token's value as written, with one level of var() followed. */
function token(name: string): string {
  const value = new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim() ?? "";
  const ref = /^var\((--dl-[\w-]+)\)$/.exec(value)?.[1];
  return ref ? token(ref) : value;
}

describe("tokens.css", () => {
  it("defines custom properties and nothing else", () => {
    const rules = rulesWith(css, "");
    expect(rules.map(([selector]) => selector)).toEqual([":where(:root)"]);
    for (const line of rules[0]![1].split(";").map((d) => d.trim()).filter(Boolean)) {
      expect(line.startsWith("--dl-"), line).toBe(true);
    }
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
    ["--dl-hover-sidebar", "--dl-sidebar", "--dl-list"],
    ["--dl-hover-list", "--dl-list", "--dl-content"],
    ["--dl-hover-content", "--dl-content", "--dl-raised"],
  ])("%s is one notch above its pane, and under the selected lift", (hover, pane, notch) => {
    expect(token(hover)).toBe(token(notch));
    expect(luminance(hex(token(hover)))).toBeGreaterThan(luminance(hex(token(pane))));
    expect(luminance(hex(token(hover)))).toBeLessThan(luminance(hex(token("--dl-selected"))));
  });
});

describe("--dl-accent-text", () => {
  const value = /--dl-accent-text:\s*([^;]+);/.exec(css)?.[1] ?? "";
  const floor = Number(/max\(l,\s*([\d.]+)\)/.exec(value)?.[1]);

  it("is the accent with its lightness raised to at least 0.78, hue and chroma kept", () => {
    expect(value).toBe("oklch(from var(--dl-accent) max(l, 0.78) c h)");
    expect(floor).toBe(0.78);
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
