/**
 * The arithmetic of the bar chart, apart from its drawing so it can be
 * tested on its own: the scale's top, where its lines go, which dates the
 * axis has room for, and where a callout stands.
 */

/**
 * The first of 2, 5, 10, 20, 50 and so on that holds `peak`. Drive's Home
 * chart has always scaled this way, so the top line is a figure a person
 * would have picked.
 */
export function niceCeil(peak: number): number {
  if (!Number.isFinite(peak) || peak <= 0) return 2;
  for (let decade = 1; ; decade *= 10) {
    for (const m of [1, 2, 5]) {
      const top = m * decade;
      if (top >= 2 && top >= peak) return top;
    }
  }
}

/** The scale's lines: zero, the top, and the middle only where it is a whole number. */
export function scaleTicks(top: number): number[] {
  return top % 2 === 0 ? [0, top / 2, top] : [0, top];
}

/** A figure the chart can draw: a missing, negative or non-finite one counts as nothing. */
export function barValue(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

/** Each bar's total when its series are stacked. */
export function stackTotals(series: ReadonlyArray<{ values: readonly number[] }>, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    let sum = 0;
    for (const s of series) sum += barValue(s.values[i]);
    out.push(sum);
  }
  return out;
}

/** A label's width at the chart's 12px, rounded up. Measured once: 7px a character holds Inter's digits and capitals. */
export const TICK_CH = 7;

/**
 * Which bars get a date under them.
 *
 * `every` names each bar where the names fit side by side, and otherwise
 * every second, third and so on, always keeping the last. Calendar's own
 * rule thinned a seven-day week to three names because it never asked
 * whether they fit. `ends` names the first and the last, and the middle
 * one where the plot is wide enough to hold three.
 */
export function axisMarks(mode: "ends" | "every", labels: readonly string[], slot: number, plotWidth: number): number[] {
  const n = labels.length;
  if (n === 0) return [];
  if (mode === "ends") {
    if (n === 1) return [0];
    const mid = Math.floor(n / 2);
    return n > 2 && plotWidth >= 240 ? [0, mid, n - 1] : [0, n - 1];
  }
  const widest = Math.max(...labels.map((l) => l.length)) * TICK_CH + 8;
  const step = Math.max(1, Math.ceil(widest / Math.max(1, slot)));
  const out: number[] = [];
  for (let i = 0; i < n; i += step) out.push(i);
  if (out[out.length - 1] !== n - 1) {
    // The last bar is today, or this week: it keeps its name, and a name it would touch gives way.
    if (n - 1 - out[out.length - 1]! < step) out.pop();
    out.push(n - 1);
  }
  return out;
}

export type TipPlace = { left: number; top: number };

/**
 * Where the callout stands, its top left corner, inside the chart's box.
 * Over its bar where there is room, held inside the sides. A bar that
 * reaches the top has no room over it, so the callout stands beside it: on
 * its left where that side has the room, and else on its right.
 */
export function placeTip(
  x: number,
  barTop: number,
  slot: number,
  tip: { w: number; h: number },
  box: { left: number; right: number },
): TipPlace {
  const over = barTop - 8 - tip.h;
  if (over >= 0) {
    return { left: Math.min(Math.max(x - tip.w / 2, box.left), Math.max(box.left, box.right - tip.w)), top: over };
  }
  const beside = Math.max(0, barTop);
  const onLeft = x - slot / 2 - 8 - tip.w;
  if (onLeft >= box.left) return { left: onLeft, top: beside };
  return { left: Math.min(x + slot / 2 + 8, Math.max(box.left, box.right - tip.w)), top: beside };
}
