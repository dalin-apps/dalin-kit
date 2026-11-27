"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { cx } from "./cx.js";
import { TICK_CH, axisMarks, barValue, niceCeil, placeTip, scaleTicks, stackTotals } from "./chart-scale.js";

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

/** Room for the scale on the left, a hair on the right, half a label on top, the dates underneath. Drive's. */
const PAD = { right: 6, top: 10, bottom: 20 };
const TIP_H = 22;

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const plain = (value: number) => whole.format(value);

/** The box's width, read before the first paint and kept current as it resizes. */
function useBoxWidth(box: RefObject<HTMLDivElement | null>, fixed: number | undefined): number {
  const [width, setWidth] = useState(fixed ?? 0);
  useLayoutEffect(() => {
    if (fixed !== undefined) {
      setWidth(fixed);
      return;
    }
    const el = box.current;
    if (!el) return;
    const read = () => setWidth((was) => (was === el.clientWidth ? was : el.clientWidth));
    read();
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(read);
    watch.observe(el);
    return () => watch.disconnect();
  }, [box, fixed]);
  return width;
}

type Geometry = {
  left: number;
  right: number;
  slot: number;
  zero: number;
  x: (i: number) => number;
  y: (value: number) => number;
  ticks: Array<{ at: number; text: string }>;
  tops: number[];
};

/** Everything the drawing needs from the figures and the box, worked out once per render. */
function layout(props: Required<Pick<BarChartProps, "series" | "labels" | "mirror" | "formatValue">>, width: number, height: number): Geometry | null {
  const { series, labels, mirror, formatValue } = props;
  const n = labels.length;
  const totals = mirror ? Array.from({ length: n }, (_, i) => barValue(series[0]?.values[i])) : stackTotals(series, n);
  const top = niceCeil(Math.max(0, ...totals));
  const low = mirror ? niceCeil(Math.max(0, ...Array.from({ length: n }, (_, i) => barValue(series[1]?.values[i])))) : 0;
  const marks = mirror ? [top, 0, -low] : scaleTicks(top);
  const texts = marks.map((m) => formatValue(Math.abs(m)));
  const left = Math.max(30, Math.max(...texts.map((t) => t.length)) * TICK_CH + 12);
  const right = width - PAD.right;
  const plotTop = PAD.top;
  const bottom = height - PAD.bottom;
  const plotH = bottom - plotTop;
  // A box too narrow or too short for a plot draws nothing rather than bars of negative size.
  if (right - left < n || plotH < 20) return null;
  // Mirrored, the half that rises takes most of the height: it is the larger series in every use so far.
  const up = mirror ? plotH * 0.7 : plotH;
  const zero = plotTop + up;
  const y = (v: number) => (v >= 0 ? zero - (up * v) / top : zero + ((plotH - up) * -v) / (low || 1));
  const slot = (right - left) / Math.max(1, n);
  const x = (i: number) => left + slot * (i + 0.5);
  return {
    left,
    right,
    slot,
    zero,
    x,
    y,
    ticks: marks.map((m, i) => ({ at: y(m), text: texts[i]! })),
    tops: totals.map((t) => y(t)),
  };
}

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
export function BarChart({
  series,
  labels,
  axis = "ends",
  height = 180,
  mirror = false,
  formatValue = plain,
  describe,
  summary,
  width: fixed,
  className,
}: BarChartProps): ReactNode {
  const box = useRef<HTMLDivElement | null>(null);
  const width = useBoxWidth(box, fixed);
  // The bar being read, and whether a key chose it: only then is it spoken.
  const [at, setAt] = useState<number | null>(null);
  const [spoken, setSpoken] = useState("");
  const n = labels.length;
  // The data can shrink under a selection: a bar that is gone is not read.
  const sel = at !== null && at < n ? at : null;
  const say = (i: number) => describe?.(i) ?? defaultLine(series, labels, formatValue, i);

  const ready = width > 0 && n > 0;
  const g = ready ? layout({ series, labels, mirror, formatValue }, width, height) : null;
  const reads = g !== null;

  const barAt = (e: PointerEvent<SVGSVGElement>) => {
    if (!g || g.slot <= 0) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    // A zoomed page reports the rect in zoomed pixels, so scale back to the box's own.
    const scale = rect.width > 0 ? width / rect.width : 1;
    const i = Math.floor(((e.clientX - rect.left) * scale - g.left) / g.slot);
    return Math.max(0, Math.min(n - 1, i));
  };
  const point = (e: PointerEvent<SVGSVGElement>) => setAt(barAt(e));
  // A finger keeps reading the bars as it drifts above or below the chart.
  const press = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== "mouse") e.currentTarget.setPointerCapture?.(e.pointerId);
    point(e);
  };
  const leave = () => setAt(null);
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && sel !== null) {
      e.preventDefault();
      setAt(null);
      setSpoken("");
      return;
    }
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step === 0 || !reads) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(n - 1, (sel ?? (step > 0 ? -1 : n)) + step));
    setAt(next);
    setSpoken(say(next));
  };

  const bw = g ? Math.max(1, g.slot * 0.7) : 0;
  const rx = Math.min(2.5, bw / 2);
  const text = sel !== null && g ? say(sel) : "";
  // The callout is never wider than the chart. A longer line is cut on
  // screen, and a key press still speaks it whole.
  const tipW = Math.min(text.length * TICK_CH + 16, width);
  const tip =
    sel !== null && g ? placeTip(g.x(sel), g.tops[sel] ?? g.zero, g.slot, { w: tipW, h: TIP_H }, { left: 0, right: width }) : null;

  return (
    <div
      ref={box}
      data-slot="bar-chart"
      className={cx("dl-chart", className)}
      style={{ height }}
      role="group"
      aria-label={reads ? `${summary}. Arrow keys read each bar.` : summary}
      tabIndex={reads ? 0 : undefined}
      onKeyDown={key}
      onBlur={() => {
        setAt(null);
        setSpoken("");
      }}
    >
      {g ? (
        <svg
          className="dl-chart-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          onPointerDown={press}
          onPointerMove={point}
          onPointerUp={(e) => {
            if (e.pointerType !== "mouse") leave();
          }}
          onPointerLeave={leave}
          onPointerCancel={leave}
        >
          {g.ticks.map((t, i) => (
            <g key={i}>
              <line x1={g.left} x2={g.right} y1={t.at} y2={t.at} className={t.at === g.zero ? "dl-chart-zero" : "dl-chart-grid"} />
              <text x={g.left - 8} y={t.at} className="dl-chart-tick" textAnchor="end" dominantBaseline="central">
                {t.text}
              </text>
            </g>
          ))}
          {sel !== null ? (
            <rect className="dl-chart-col" x={g.x(sel) - g.slot / 2} y={PAD.top} width={g.slot} height={height - PAD.top - PAD.bottom} />
          ) : null}
          {labels.map((_, i) => (mirror ? mirrored(series, i, g, bw, rx) : stacked(series, i, g, bw, rx)))}
          {axisMarks(axis, labels, g.slot, g.right - g.left).map((i, j, all) => {
            const ends = axis === "ends" && all.length > 1;
            const first = ends && j === 0;
            const last = ends && j === all.length - 1;
            // A name centred under its bar is held inside the chart, so the
            // first and last never run past the card's edge.
            const half = ((labels[i] ?? "").length * TICK_CH) / 2;
            const centred = Math.min(Math.max(g.x(i), half), width - half);
            return (
              <text
                key={i}
                className="dl-chart-tick"
                x={first ? g.left : last ? g.right : centred}
                y={height - 5}
                textAnchor={first ? "start" : last ? "end" : "middle"}
              >
                {labels[i]}
              </text>
            );
          })}
        </svg>
      ) : null}
      {tip ? (
        <span className="dl-chart-tip" style={{ left: tip.left, top: tip.top, maxWidth: width }} aria-hidden="true">
          {text}
        </span>
      ) : null}
      <span className="dl-chart-live" aria-live="polite">
        {spoken}
      </span>
    </div>
  );
}

/**
 * The callout's line when the app gives none: the bar's name, then each
 * series' figure and name. With more than two series, one with nothing in
 * it that day is left out, so the line stays short enough to read.
 */
function defaultLine(series: readonly BarSeries[], labels: readonly string[], formatValue: (v: number) => string, i: number): string {
  const all = series.map((s) => ({ s, v: barValue(s.values[i]) }));
  const some = series.length > 2 && all.some((x) => x.v > 0) ? all.filter((x) => x.v > 0) : all;
  return `${labels[i]}: ${some.map((x) => `${formatValue(x.v)} ${x.s.name}`).join(", ")}`;
}

/** One bar's series, stacked from the zero line up, a hair apart. */
function stacked(series: readonly BarSeries[], i: number, g: Geometry, bw: number, rx: number): ReactNode {
  let sum = 0;
  return (
    <g key={i}>
      {series.map((s, k) => {
        const v = barValue(s.values[i]);
        if (v === 0) return null;
        const base = g.y(sum) - (sum > 0 ? 1.5 : 0);
        const h = Math.max(1, base - g.y(sum + v));
        sum += v;
        return <rect key={k} x={g.x(i) - bw / 2} y={base - h} width={bw} height={h} rx={rx} fill={s.color} />;
      })}
    </g>
  );
}

/** One bar's two series, either side of the zero line. */
function mirrored(series: readonly BarSeries[], i: number, g: Geometry, bw: number, rx: number): ReactNode {
  const up = barValue(series[0]?.values[i]);
  const down = barValue(series[1]?.values[i]);
  const upH = Math.max(1, g.zero - 1 - g.y(up));
  return (
    <g key={i}>
      {up > 0 ? <rect x={g.x(i) - bw / 2} y={g.zero - 1 - upH} width={bw} height={upH} rx={rx} fill={series[0]!.color} /> : null}
      {down > 0 ? (
        <rect x={g.x(i) - bw / 2} y={g.zero + 1} width={bw} height={Math.max(1, g.y(-down) - g.zero - 1)} rx={rx} fill={series[1]!.color} />
      ) : null}
    </g>
  );
}

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
export function ChartKey({ items, className }: { items: readonly ChartKeyItem[]; className?: string }): ReactNode {
  return (
    <span data-slot="chart-key" className={cx("dl-chart-key", className)}>
      {items.map((item) => (
        <span key={item.name}>
          <b style={{ color: item.color }}>{item.name}</b>
          {item.value !== undefined ? <> {item.value}</> : null}
        </span>
      ))}
    </span>
  );
}
