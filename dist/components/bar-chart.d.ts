import { type ReactNode } from "react";
export type BarSeries = {
    /** The series' name as the callout says it, after its figure: "received", "h Personal". */
    name: string;
    /** One figure per bar, oldest first. */
    values: readonly number[];
    /** The colour its bars wear: an accent, a calendar's colour. */
    color: string;
};
export type BarChartProps = {
    /**
     * What is drawn. Several series stack in one bar, the first at the
     * bottom. With `mirror`, the first rises from the zero line and the
     * second hangs under it.
     */
    series: readonly BarSeries[];
    /** One name per bar, as the axis and the callout write it: "Nov 12", "Wed", "Today". */
    labels: readonly string[];
    /** `ends` names the first bar, the last, and the middle where it fits. `every` names each bar that has the room. */
    axis?: "ends" | "every";
    /** The chart's height in px. 180 unless the place it sits in needs another. */
    height?: number;
    /** Two series either side of the zero line, each half on its own scale. */
    mirror?: boolean;
    /** How a figure is written on the scale and in the callout. Whole numbers with separators unless given. */
    formatValue?: (value: number) => string;
    /** The callout's one line for a bar. Built from the label and each series' figure and name unless given. */
    describe?: (index: number) => string;
    /** What the chart shows, for a screen reader: "Mail received and sent over the last 30 days". */
    summary: string;
    /** A width to draw at without measuring, for a test or a fixed layout. */
    width?: number;
    className?: string;
};
/**
 * A month of days, or a week, as bars.
 *
 * Notes, mail and calendar each drew this chart their own way, and none of
 * the three could be read: no figure on any of them, no hover, and in two
 * of them type that shrank with the window. The owner picked one chart for
 * the three on 2026-11-27, built the way drive's Home chart already was.
 *
 * It measures its box and draws in real pixels, so its type is 12px on a
 * phone and on a desktop. Its scale ends on a round figure. Pointing at a
 * bar, dragging a finger across the bars, or pressing the arrow keys with
 * the chart focused, names that bar in one line that never wraps.
 *
 * Nothing in it moves by itself, so it has no reduced-motion case. Until
 * the box has been measured it draws nothing and keeps its height, so
 * nothing under it shifts.
 *
 * `data.css` styles it.
 */
export declare function BarChart({ series, labels, axis, height, mirror, formatValue, describe, summary, width: fixed, className, }: BarChartProps): ReactNode;
export type ChartKeyItem = {
    /** The series' name, drawn in its colour. */
    name: string;
    /** A colour that reads as 12px text on the card: the series' colour, lifted where it is dark. */
    color: string;
    /** The series' total, written after its name in the plain grey. */
    value?: ReactNode;
};
/**
 * A chart's key, for the heading's line: each series as a coloured word
 * with its total after it. It stands in for a row of coloured squares under
 * the plot, which the family doesn't use.
 */
export declare function ChartKey({ items, className }: {
    items: readonly ChartKeyItem[];
    className?: string;
}): ReactNode;
//# sourceMappingURL=bar-chart.d.ts.map