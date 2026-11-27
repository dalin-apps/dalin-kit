"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useLayoutEffect, useRef, useState } from "react";
import { cx } from "./cx.js";
import { TICK_CH, axisMarks, niceCeil, placeTip, scaleTicks, stackTotals } from "./chart-scale.js";
/** Room for the scale on the left, a hair on the right, half a label on top, the dates underneath. Drive's. */
const PAD = { right: 6, top: 10, bottom: 20 };
const TIP_H = 22;
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const plain = (value) => whole.format(value);
/** The box's width, read before the first paint and kept current as it resizes. */
function useBoxWidth(box, fixed) {
    const [width, setWidth] = useState(fixed ?? 0);
    useLayoutEffect(() => {
        if (fixed !== undefined) {
            setWidth(fixed);
            return;
        }
        const el = box.current;
        if (!el)
            return;
        const read = () => setWidth((was) => (was === el.clientWidth ? was : el.clientWidth));
        read();
        if (typeof ResizeObserver === "undefined")
            return;
        const watch = new ResizeObserver(read);
        watch.observe(el);
        return () => watch.disconnect();
    }, [box, fixed]);
    return width;
}
/** Everything the drawing needs from the figures and the box, worked out once per render. */
function layout(props, width, height) {
    const { series, labels, mirror, formatValue } = props;
    const n = labels.length;
    const totals = mirror ? (series[0]?.values ?? []).slice(0, n).map((v) => Math.max(0, v)) : stackTotals(series, n);
    const top = niceCeil(Math.max(0, ...totals));
    const low = mirror ? niceCeil(Math.max(0, ...(series[1]?.values ?? []).slice(0, n))) : 0;
    const marks = mirror ? [top, 0, -low] : scaleTicks(top);
    const texts = marks.map((m) => formatValue(Math.abs(m)));
    const left = Math.max(30, Math.max(...texts.map((t) => t.length)) * TICK_CH + 12);
    const right = width - PAD.right;
    const plotTop = PAD.top;
    const bottom = height - PAD.bottom;
    const plotH = bottom - plotTop;
    // Mirrored, the half that rises takes most of the height: it is the larger series in every use so far.
    const up = mirror ? plotH * 0.7 : plotH;
    const zero = plotTop + up;
    const y = (v) => (v >= 0 ? zero - (up * v) / top : zero + ((plotH - up) * -v) / (low || 1));
    const slot = (right - left) / Math.max(1, n);
    const x = (i) => left + slot * (i + 0.5);
    return {
        left,
        right,
        slot,
        zero,
        x,
        y,
        ticks: marks.map((m, i) => ({ at: y(m), text: texts[i] })),
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
export function BarChart({ series, labels, axis = "ends", height = 180, mirror = false, formatValue = plain, describe, summary, width: fixed, className, }) {
    const box = useRef(null);
    const width = useBoxWidth(box, fixed);
    // The bar being read, and whether a key chose it: only then is it spoken.
    const [at, setAt] = useState(null);
    const [spoken, setSpoken] = useState("");
    const n = labels.length;
    // The data can shrink under a selection: a bar that is gone is not read.
    const sel = at !== null && at < n ? at : null;
    const say = (i) => describe?.(i) ?? `${labels[i]}: ${series.map((s) => `${formatValue(s.values[i] ?? 0)} ${s.name}`).join(", ")}`;
    const ready = width > 0 && n > 0;
    const g = ready ? layout({ series, labels, mirror, formatValue }, width, height) : null;
    const barAt = (e) => {
        if (!g)
            return null;
        const rect = e.currentTarget.getBoundingClientRect();
        // A zoomed page reports the rect in zoomed pixels, so scale back to the box's own.
        const scale = rect.width > 0 ? width / rect.width : 1;
        const i = Math.floor(((e.clientX - rect.left) * scale - g.left) / g.slot);
        return Math.max(0, Math.min(n - 1, i));
    };
    const point = (e) => setAt(barAt(e));
    const leave = () => setAt(null);
    const key = (e) => {
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (step === 0 || n === 0)
            return;
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
    const tip = sel !== null && g ? placeTip(g.x(sel), g.tops[sel] ?? g.zero, g.slot, { w: tipW, h: TIP_H }, { left: 0, right: width }) : null;
    return (_jsxs("div", { ref: box, "data-slot": "bar-chart", className: cx("dl-chart", className), style: { height }, role: "group", "aria-label": `${summary}. Arrow keys read each bar.`, tabIndex: 0, onKeyDown: key, onBlur: () => {
            setAt(null);
            setSpoken("");
        }, children: [g ? (_jsxs("svg", { className: "dl-chart-svg", width: width, height: height, viewBox: `0 0 ${width} ${height}`, "aria-hidden": "true", onPointerDown: point, onPointerMove: point, onPointerLeave: leave, onPointerCancel: leave, children: [g.ticks.map((t, i) => (_jsxs("g", { children: [_jsx("line", { x1: g.left, x2: g.right, y1: t.at, y2: t.at, className: t.at === g.zero ? "dl-chart-zero" : "dl-chart-grid" }), _jsx("text", { x: g.left - 8, y: t.at, className: "dl-chart-tick", textAnchor: "end", dominantBaseline: "central", children: t.text })] }, i))), sel !== null ? (_jsx("rect", { className: "dl-chart-col", x: g.x(sel) - g.slot / 2, y: PAD.top, width: g.slot, height: height - PAD.top - PAD.bottom })) : null, labels.map((_, i) => (mirror ? mirrored(series, i, g, bw, rx) : stacked(series, i, g, bw, rx))), axisMarks(axis, labels, g.slot, g.right - g.left).map((i, j, all) => {
                        const ends = axis === "ends" && all.length > 1;
                        const first = ends && j === 0;
                        const last = ends && j === all.length - 1;
                        // A name centred under its bar is held inside the chart, so the
                        // first and last never run past the card's edge.
                        const half = ((labels[i] ?? "").length * TICK_CH) / 2;
                        const centred = Math.min(Math.max(g.x(i), half), width - half);
                        return (_jsx("text", { className: "dl-chart-tick", x: first ? g.left : last ? g.right : centred, y: height - 5, textAnchor: first ? "start" : last ? "end" : "middle", children: labels[i] }, i));
                    })] })) : null, tip ? (_jsx("span", { className: "dl-chart-tip", style: { left: tip.left, top: tip.top, maxWidth: width }, "aria-hidden": "true", children: text })) : null, _jsx("span", { className: "dl-chart-live", "aria-live": "polite", children: spoken })] }));
}
/** One bar's series, stacked from the zero line up, a hair apart. */
function stacked(series, i, g, bw, rx) {
    let sum = 0;
    return (_jsx("g", { children: series.map((s, k) => {
            const v = Math.max(0, s.values[i] ?? 0);
            if (v === 0)
                return null;
            const top = g.y(sum + v);
            const h = g.y(sum) - top - (sum > 0 ? 1.5 : 0);
            sum += v;
            return _jsx("rect", { x: g.x(i) - bw / 2, y: top, width: bw, height: Math.max(1, h), rx: rx, fill: s.color }, k);
        }) }, i));
}
/** One bar's two series, either side of the zero line. */
function mirrored(series, i, g, bw, rx) {
    const up = Math.max(0, series[0]?.values[i] ?? 0);
    const down = Math.max(0, series[1]?.values[i] ?? 0);
    return (_jsxs("g", { children: [up > 0 ? (_jsx("rect", { x: g.x(i) - bw / 2, y: g.y(up), width: bw, height: Math.max(1, g.zero - g.y(up) - 1), rx: rx, fill: series[0].color })) : null, down > 0 ? (_jsx("rect", { x: g.x(i) - bw / 2, y: g.zero + 1, width: bw, height: Math.max(1, g.y(-down) - g.zero - 1), rx: rx, fill: series[1].color })) : null] }, i));
}
/**
 * A chart's key, for the heading's line: each series as a coloured word
 * with its total after it. It stands in for a row of coloured squares under
 * the plot, which the family doesn't use.
 */
export function ChartKey({ items, className }) {
    return (_jsx("span", { "data-slot": "chart-key", className: cx("dl-chart-key", className), children: items.map((item) => (_jsxs("span", { children: [_jsx("b", { style: { color: item.color }, children: item.name }), item.value !== undefined ? _jsxs(_Fragment, { children: [" ", item.value] }) : null] }, item.name))) }));
}
//# sourceMappingURL=bar-chart.js.map