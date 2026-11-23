/**
 * Colour math for the tests that pin a contrast claim: OKLCH to linear sRGB
 * (Björn Ottosson's matrices), the two ways a browser may draw a colour
 * outside sRGB, compositing, and WCAG contrast.
 */
export type Rgb = [number, number, number];
export const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
export const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

export function oklch(L: number, C: number, H: number): Rgb {
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
export const inGamut = (rgb: Rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
export const clip = (rgb: Rgb) => rgb.map((v) => Math.min(1, Math.max(0, v))) as Rgb;

/** A colour outside sRGB, drawn the two ways a browser may: channels clipped, or chroma brought in. */
export const RENDER = {
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

export const luminance = (rgb: Rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
export const hex = (h: string) => [1, 3, 5].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255)) as Rgb;
export function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** `top` at `alpha` over `under`, composited in sRGB as a browser does. */
export function over(top: Rgb, alpha: number, under: Rgb): Rgb {
  return top.map((v, i) => toLinear(alpha * toSrgb(v) + (1 - alpha) * toSrgb(under[i]!))) as Rgb;
}

/** Each app's --dl-accent, as its own stylesheet sets it. */
export const ACCENTS: Record<string, [number, number, number]> = {
  mail: [0.64, 0.28, 285],
  calendar: [0.64, 0.16, 50],
  notes: [0.85, 0.175, 95],
  drive: [0.64, 0.16, 240],
};
/** The panes small accent text sits on: the sidebar, the list and the content. */
export const PANES = ["#151515", "#181818", "#1c1c1c"];

