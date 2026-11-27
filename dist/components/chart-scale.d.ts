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
export declare function niceCeil(peak: number): number;
/** The scale's lines: zero, the top, and the middle only where it is a whole number. */
export declare function scaleTicks(top: number): number[];
/** A figure the chart can draw: a missing, negative or non-finite one counts as nothing. */
export declare function barValue(v: number | null | undefined): number;
/** Each bar's total when its series are stacked. */
export declare function stackTotals(series: ReadonlyArray<{
    values: readonly number[];
}>, count: number): number[];
/** A label's width at the chart's 12px, rounded up. Measured once: 7px a character holds Inter's digits and capitals. */
export declare const TICK_CH = 7;
/**
 * Which bars get a date under them.
 *
 * `every` names each bar where the names fit side by side, and otherwise
 * every second, third and so on, always keeping the last. Calendar's own
 * rule thinned a seven-day week to three names because it never asked
 * whether they fit. `ends` names the first and the last, and the middle
 * one where the plot is wide enough to hold three.
 */
export declare function axisMarks(mode: "ends" | "every", labels: readonly string[], slot: number, plotWidth: number): number[];
export type TipPlace = {
    left: number;
    top: number;
};
/**
 * Where the callout stands, its top left corner, inside the chart's box.
 * Over its bar where there is room, held inside the sides. A bar that
 * reaches the top has no room over it, so the callout stands beside it: on
 * its left where that side has the room, and else on its right.
 */
export declare function placeTip(x: number, barTop: number, slot: number, tip: {
    w: number;
    h: number;
}, box: {
    left: number;
    right: number;
}): TipPlace;
//# sourceMappingURL=chart-scale.d.ts.map