/**
 * @vitest-environment jsdom
 *
 * The family's meter, the bar in a row and the bar chart, with data.css.
 */
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { contrast, hex, oklch } from "../../test/color.js";
import { readCss, ruleFor } from "../../test/css.js";
import { mount, withDom } from "../../test/dom.js";
import { FILL_FULL, FILL_HIGH, fillLevel, fillPercent, fillWord } from "../helpers/fill-level.js";
import { BarChart, ChartKey } from "./bar-chart.js";
import { axisMarks, barValue, niceCeil, placeTip, scaleTicks, stackTotals } from "./chart-scale.js";
import { Meter, MeterWord } from "./meter.js";
import { RowBar } from "./row-bar.js";

withDom();
const css = readCss("data");

function render(node: React.ReactElement): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(node);
  return host.firstElementChild as HTMLElement;
}

describe("fillLevel", () => {
  it("warns from 80% and is full from 95%, the rule drive had", () => {
    expect([FILL_HIGH, FILL_FULL]).toEqual([0.8, 0.95]);
    expect([0, 0.5, 0.799].map(fillLevel)).toEqual(["ok", "ok", "ok"]);
    expect([0.8, 0.9, 0.949].map(fillLevel)).toEqual(["high", "high", "high"]);
    expect([0.95, 1, 1.4].map(fillLevel)).toEqual(["full", "full", "full"]);
  });

  it("reads a place with no ceiling as fine", () => {
    expect([null, undefined, Number.NaN].map(fillLevel)).toEqual(["ok", "ok", "ok"]);
  });

  it("names the two warning levels and says nothing before them", () => {
    expect(["ok", "high", "full"].map((l) => fillWord(l as never))).toEqual(["", "Nearly full", "Full"]);
  });

  it("never calls a place that holds something 0%, or one with room left 100%", () => {
    expect([0, -1, null].map((s) => fillPercent(s))).toEqual([0, 0, 0]);
    expect(fillPercent(0.0001)).toBe(1);
    expect(fillPercent(0.999)).toBe(99);
    expect([1, 3].map(fillPercent)).toEqual([100, 100]);
    expect(fillPercent(0.62)).toBe(62);
  });
});

describe("<Meter>", () => {
  it("is a meter with a name and a reading", () => {
    const el = render(<Meter share={0.62} label="dalin space, used" valueText="620 MB of 1 GB" />);
    expect(el.getAttribute("role")).toBe("meter");
    expect(el.getAttribute("aria-label")).toBe("dalin space, used");
    expect(el.getAttribute("aria-valuenow")).toBe("62");
    expect(el.getAttribute("aria-valuetext")).toBe("620 MB of 1 GB");
    expect([el.getAttribute("aria-valuemin"), el.getAttribute("aria-valuemax")]).toEqual(["0", "100"]);
  });

  it("reads as a percent where no reading is given", () => {
    expect(render(<Meter share={0.4} label="x" />).getAttribute("aria-valuetext")).toBe("40 percent");
  });

  it("carries its level only once there is something to warn of", () => {
    expect(render(<Meter share={0.5} label="x" />).hasAttribute("data-level")).toBe(false);
    expect(render(<Meter share={0.85} label="x" />).getAttribute("data-level")).toBe("high");
    expect(render(<Meter share={0.97} label="x" />).getAttribute("data-level")).toBe("full");
  });

  it("never warns where full is the aim", () => {
    const el = render(<Meter share={0.99} label="Previews" warns={false} thin />);
    expect(el.hasAttribute("data-level")).toBe(false);
    expect(el.querySelector(".dl-meter-tick")).toBeNull();
  });

  it("draws no fill for an empty place and at least 1% for one holding anything", () => {
    expect(render(<Meter share={0} label="x" />).querySelector(".dl-meter-fill")).toBeNull();
    const sliver = render(<Meter share={0.0002} label="x" />).querySelector<HTMLElement>(".dl-meter-fill");
    expect(sliver?.style.width).toBe("1%");
    expect(render(<Meter share={0.62} label="x" />).querySelector<HTMLElement>(".dl-meter-fill")?.style.width).toBe("62%");
  });

  it("holds a share outside 0 to 1 to the nearest end", () => {
    expect(render(<Meter share={4} label="x" />).querySelector<HTMLElement>(".dl-meter-fill")?.style.width).toBe("100%");
    expect(render(<Meter share={-2} label="x" />).querySelector(".dl-meter-fill")).toBeNull();
  });

  it("takes a source's colour as a variable, so the warning colours can replace it", () => {
    const el = render(<Meter share={0.3} label="x" color="oklch(0.66 0.17 303)" />);
    expect(el.style.getPropertyValue("--dl-meter-c")).toBe("oklch(0.66 0.17 303)");
  });

  it("in its thin form adds the tick and the percent, hidden from a screen reader that has the reading", () => {
    const el = render(<Meter share={0.62} label="x" thin />);
    expect(el.className).toBe("dl-meter dl-meter--thin");
    expect(el.querySelector(".dl-meter-tick")).not.toBeNull();
    const pct = el.querySelector(".dl-meter-pct");
    expect(pct?.textContent).toBe("62%");
    expect(pct?.getAttribute("aria-hidden")).toBe("true");
    expect(render(<Meter share={0.62} label="x" />).querySelector(".dl-meter-pct")).toBeNull();
  });

  it("reads no figure as empty", () => {
    for (const share of [null, undefined, Number.NaN]) {
      const el = render(<Meter share={share} label="x" />);
      expect(el.getAttribute("aria-valuenow")).toBe("0");
      expect(el.querySelector(".dl-meter-fill")).toBeNull();
    }
  });

  it("writes a share too small to round as under one percent, on screen and aloud", () => {
    const el = render(<Meter share={0.0001} label="x" thin />);
    expect(el.querySelector(".dl-meter-pct")?.textContent).toBe("<1%");
    expect(el.getAttribute("aria-valuetext")).toBe("under 1 percent");
    expect(render(<Meter share={0} label="x" thin />).querySelector(".dl-meter-pct")?.textContent).toBe("0%");
  });
});

describe("<MeterWord>", () => {
  it("says nothing until 80%", () => {
    expect(renderToStaticMarkup(<MeterWord share={0.79} />)).toBe("");
    expect(renderToStaticMarkup(<MeterWord share={null} />)).toBe("");
  });

  it("says Nearly full, then Full, in its level's ink", () => {
    const high = render(<MeterWord share={0.8} />);
    expect([high.textContent, high.getAttribute("data-level")]).toEqual(["Nearly full", "high"]);
    const full = render(<MeterWord share={0.95} />);
    expect([full.textContent, full.getAttribute("data-level")]).toEqual(["Full", "full"]);
  });
});

describe("<RowBar>", () => {
  it("is decoration beside its figure", () => {
    const el = render(<RowBar share={0.5} />);
    expect(el.className).toBe("dl-rowbar");
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.querySelector<HTMLElement>(".dl-rowbar-fill")?.style.width).toBe("50%");
  });

  it("keeps its track and draws no fill for a row holding nothing", () => {
    expect(render(<RowBar share={0} />).querySelector(".dl-rowbar-fill")).toBeNull();
    expect(render(<RowBar share={Number.NaN} />).querySelector(".dl-rowbar-fill")).toBeNull();
  });

  it("takes the row's own colour", () => {
    expect(render(<RowBar share={1} color="#0a84d0" />).style.getPropertyValue("--dl-rowbar-c")).toBe("#0a84d0");
  });
});

describe("the chart's arithmetic", () => {
  it("ends its scale on a round figure", () => {
    expect([0, 1, 2, 3, 7, 11, 54, 369, 1000].map(niceCeil)).toEqual([2, 2, 2, 5, 10, 20, 100, 500, 1000]);
    expect(niceCeil(Number.NaN)).toBe(2);
  });

  it("draws a middle line only where it is a whole number", () => {
    expect(scaleTicks(10)).toEqual([0, 5, 10]);
    expect(scaleTicks(5)).toEqual([0, 5]);
  });

  it("stacks each bar's series", () => {
    expect(stackTotals([{ values: [2, 5, 0] }, { values: [1, 2] }], 3)).toEqual([3, 7, 0]);
  });

  it("counts a missing, negative or non-finite figure as nothing", () => {
    expect([undefined, null, -3, Number.NaN, Number.POSITIVE_INFINITY, 4].map(barValue)).toEqual([0, 0, 0, 0, 0, 4]);
    expect(stackTotals([{ values: [Number.NaN, 50] }], 2)).toEqual([0, 50]);
  });

  it("names every day of a week when the names fit, which calendar's own rule did not", () => {
    const week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    expect(axisMarks("every", week, 60, 420)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("thins the names evenly when they would touch, and keeps the last", () => {
    const weeks = Array.from({ length: 12 }, (_, i) => `Nov ${i + 10}`);
    const marks = axisMarks("every", weeks, 24, 288);
    expect(marks[0]).toBe(0);
    expect(marks[marks.length - 1]).toBe(11);
    expect(marks.length).toBeLessThan(12);
    for (let i = 1; i < marks.length; i++) expect(marks[i]! - marks[i - 1]!).toBeGreaterThanOrEqual(2);
  });

  it("names the ends, and the middle only in a plot wide enough for three", () => {
    const days = Array.from({ length: 30 }, (_, i) => `d${i}`);
    expect(axisMarks("ends", days, 20, 600)).toEqual([0, 15, 29]);
    expect(axisMarks("ends", days, 6, 180)).toEqual([0, 29]);
    expect(axisMarks("ends", [], 10, 100)).toEqual([]);
  });

  it("stands the callout over its bar, held inside the box", () => {
    expect(placeTip(100, 80, 20, { w: 60, h: 22 }, { left: 0, right: 300 })).toEqual({ left: 70, top: 50 });
    expect(placeTip(10, 80, 20, { w: 60, h: 22 }, { left: 0, right: 300 }).left).toBe(0);
    expect(placeTip(295, 80, 20, { w: 60, h: 22 }, { left: 0, right: 300 }).left).toBe(240);
  });

  it("stands the callout beside a bar that reaches the top, never over the heading", () => {
    const place = placeTip(200, 12, 20, { w: 60, h: 22 }, { left: 0, right: 300 });
    expect(place).toEqual({ left: 122, top: 12 });
    expect(placeTip(30, 12, 20, { w: 60, h: 22 }, { left: 0, right: 300 })).toEqual({ left: 48, top: 12 });
  });
});

describe("<BarChart>", () => {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const series = [
    { name: "h Personal", values: [2, 5, 4, 6, 3, 4.5, 1], color: "orange" },
    { name: "h School", values: [1, 2, 1.5, 1, 2, 0.5, 0], color: "blue" },
  ];

  it("keeps its height and draws nothing until it knows its width", () => {
    const el = render(<BarChart series={series} labels={labels} summary="Hours booked" />);
    expect(el.style.height).toBe("180px");
    expect(el.querySelector("svg")).toBeNull();
  });

  it("draws in real pixels at the width it is given", () => {
    const el = render(<BarChart series={series} labels={labels} summary="Hours booked" width={460} axis="every" />);
    const svg = el.querySelector("svg")!;
    expect([svg.getAttribute("width"), svg.getAttribute("viewBox")]).toEqual(["460", "0 0 460 180"]);
    // 7 hours at most, so the scale ends on 10 with a line at 5.
    const ticks = [...svg.querySelectorAll("text.dl-chart-tick")].map((t) => t.textContent);
    expect(ticks.slice(0, 3)).toEqual(["0", "5", "10"]);
    expect(ticks.slice(3)).toEqual(labels);
  });

  it("stacks a bar per series and skips a series that is zero that day", () => {
    const el = render(<BarChart series={series} labels={labels} summary="Hours booked" width={460} />);
    expect(el.querySelectorAll("svg rect[fill]")).toHaveLength(13);
  });

  it("draws a mirrored pair either side of the zero line, each half on its own scale", () => {
    const el = render(
      <BarChart
        mirror
        width={400}
        labels={["a", "b"]}
        summary="Mail"
        series={[
          { name: "received", values: [40, 54], color: "violet" },
          { name: "sent", values: [6, 0], color: "lavender" },
        ]}
      />,
    );
    const zero = Number(el.querySelector(".dl-chart-zero")!.getAttribute("y1"));
    const bars = [...el.querySelectorAll<SVGRectElement>("svg rect[fill]")];
    expect(bars).toHaveLength(3);
    const up = bars.filter((b) => b.getAttribute("fill") === "violet");
    const down = bars.filter((b) => b.getAttribute("fill") === "lavender");
    for (const b of up) expect(Number(b.getAttribute("y")) + Number(b.getAttribute("height"))).toBeLessThanOrEqual(zero);
    for (const b of down) expect(Number(b.getAttribute("y"))).toBeGreaterThan(zero);
    expect([...el.querySelectorAll("text.dl-chart-tick")].slice(0, 3).map((t) => t.textContent)).toEqual(["100", "0", "10"]);
  });

  it("names itself for a screen reader and hides the drawing", () => {
    const el = render(<BarChart series={series} labels={labels} summary="Hours booked by calendar" width={460} />);
    expect(el.getAttribute("role")).toBe("group");
    expect(el.getAttribute("aria-label")).toBe("Hours booked by calendar. Arrow keys read each bar.");
    expect(el.getAttribute("tabindex")).toBe("0");
    expect(el.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("reads a bar in one line when an arrow key lands on it, and lets go on blur", async () => {
    const host = await mount(<BarChart series={series} labels={labels} summary="Hours booked" width={460} />);
    const chart = host.querySelector<HTMLElement>(".dl-chart")!;
    const press = (key: string) => act(async () => void chart.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
    await press("ArrowRight");
    expect(host.querySelector(".dl-chart-tip")?.textContent).toBe("Sun: 2 h Personal, 1 h School");
    expect(host.querySelector(".dl-chart-live")?.textContent).toBe("Sun: 2 h Personal, 1 h School");
    await press("ArrowLeft");
    expect(host.querySelector(".dl-chart-tip")?.textContent).toContain("Sun");
    await press("ArrowRight");
    expect(host.querySelector(".dl-chart-tip")?.textContent).toBe("Mon: 5 h Personal, 2 h School");
    await act(async () => void chart.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
    expect(host.querySelector(".dl-chart-tip")).toBeNull();
  });

  it("starts from the last bar when the first key is the left arrow", async () => {
    const host = await mount(<BarChart series={series} labels={labels} summary="Hours booked" width={460} />);
    const chart = host.querySelector<HTMLElement>(".dl-chart")!;
    await act(async () => void chart.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })));
    expect(host.querySelector(".dl-chart-tip")?.textContent).toContain("Sat");
  });

  it("uses the app's own line for the callout where it gives one", async () => {
    const host = await mount(
      <BarChart series={series} labels={labels} summary="x" width={460} describe={(i) => `${labels[i]}, busy`} />,
    );
    const chart = host.querySelector<HTMLElement>(".dl-chart")!;
    await act(async () => void chart.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(host.querySelector(".dl-chart-tip")?.textContent).toBe("Sun, busy");
  });

  it("lets go of a selection whose bar the new data no longer has", async () => {
    const three = [{ name: "x", values: [1, 2, 3], color: "c" }];
    const host = await mount(<BarChart series={three} labels={["a", "b", "c"]} summary="x" width={300} />);
    const chart = host.querySelector<HTMLElement>(".dl-chart")!;
    await act(async () => void chart.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })));
    expect(host.querySelector(".dl-chart-tip")?.textContent).toBe("c: 3 x");
    const describe = (i: number) => ["only"][i]!.toUpperCase();
    await mount(<BarChart series={[{ name: "x", values: [5], color: "c" }]} labels={["a"]} summary="x" width={300} describe={describe} />);
    expect(host.querySelector(".dl-chart-tip")).toBeNull();
    expect(host.querySelector(".dl-chart-col")).toBeNull();
  });

  it("keeps the names at either end of the axis inside the chart", () => {
    const labels = Array.from({ length: 30 }, () => "Nov 12");
    const el = render(
      <BarChart axis="every" width={200} labels={labels} summary="x" series={[{ name: "x", values: labels.map(() => 1), color: "c" }]} />,
    );
    const names = [...el.querySelectorAll("text.dl-chart-tick")].filter((t) => t.textContent === "Nov 12");
    const half = (6 * 7) / 2;
    for (const t of names) {
      const x = Number(t.getAttribute("x"));
      expect(x - half).toBeGreaterThanOrEqual(0);
      expect(x + half).toBeLessThanOrEqual(200);
    }
  });

  it("never draws the callout wider than the chart, and still speaks it whole", async () => {
    const long = "A very long description of this one bar, longer than the chart";
    const host = await mount(
      <BarChart series={[{ name: "x", values: [1, 2], color: "c" }]} labels={["a", "b"]} summary="x" width={300} describe={() => long} />,
    );
    const chart = host.querySelector<HTMLElement>(".dl-chart")!;
    await act(async () => void chart.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    const tip = host.querySelector<HTMLElement>(".dl-chart-tip")!;
    expect(tip.style.maxWidth).toBe("300px");
    expect(Number.parseFloat(tip.style.left)).toBeGreaterThanOrEqual(0);
    expect(host.querySelector(".dl-chart-live")?.textContent).toBe(long);
  });

  it("scales to the bars it can draw when one figure is not a number", () => {
    const el = render(<BarChart width={300} labels={["a", "b"]} summary="x" series={[{ name: "x", values: [Number.NaN, 50], color: "c" }]} />);
    expect(el.innerHTML).not.toContain("NaN");
    expect([...el.querySelectorAll("text.dl-chart-tick")].slice(0, 3).map((t) => t.textContent)).toEqual(["0", "25", "50"]);
    expect(el.querySelectorAll("svg rect[fill]")).toHaveLength(1);
  });

  it("never lets a bar too small to see cross the zero line or the bar beneath it", () => {
    const el = render(
      <BarChart
        mirror
        width={300}
        labels={["a", "b"]}
        summary="x"
        series={[
          { name: "in", values: [0.5, 100], color: "violet" },
          { name: "out", values: [5, 0], color: "lavender" },
        ]}
      />,
    );
    const zero = Number(el.querySelector(".dl-chart-zero")!.getAttribute("y1"));
    for (const b of el.querySelectorAll('svg rect[fill="violet"]')) {
      expect(Number(b.getAttribute("y")) + Number(b.getAttribute("height"))).toBeLessThanOrEqual(zero);
    }
    const stacked = render(
      <BarChart width={300} labels={["a"]} summary="x" series={[{ name: "a", values: [100], color: "p" }, { name: "b", values: [0.1], color: "q" }]} />,
    );
    const lower = stacked.querySelector('svg rect[fill="p"]')!;
    const upper = stacked.querySelector('svg rect[fill="q"]')!;
    expect(Number(upper.getAttribute("y")) + Number(upper.getAttribute("height"))).toBeLessThanOrEqual(Number(lower.getAttribute("y")));
  });

  it("draws nothing in a box too small for a plot, and takes no focus then", () => {
    const el = render(<BarChart width={36} labels={["a", "b"]} summary="Mail" series={[{ name: "x", values: [1, 2], color: "c" }]} />);
    expect(el.querySelector("svg")).toBeNull();
    expect(el.hasAttribute("tabindex")).toBe(false);
    expect(el.getAttribute("aria-label")).toBe("Mail");
  });

  it("names only the series with something in them when a bar stacks more than two", async () => {
    const four = ["Personal", "School", "Work", "Family"].map((name, k) => ({ name, values: [k === 0 ? 2 : 0], color: "c" }));
    const host = await mount(<BarChart series={four} labels={["Sun"]} summary="x" width={300} formatValue={(v) => `${v} h`} />);
    const chart = host.querySelector<HTMLElement>(".dl-chart")!;
    await act(async () => void chart.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(host.querySelector(".dl-chart-tip")?.textContent).toBe("Sun: 2 h Personal");
  });

  it("lets Escape put the callout away", async () => {
    const host = await mount(<BarChart series={series} labels={labels} summary="x" width={460} />);
    const chart = host.querySelector<HTMLElement>(".dl-chart")!;
    const press = (key: string) => act(async () => void chart.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
    await press("ArrowRight");
    expect(host.querySelector(".dl-chart-tip")).not.toBeNull();
    await press("Escape");
    expect(host.querySelector(".dl-chart-tip")).toBeNull();
    expect(host.querySelector(".dl-chart-live")?.textContent).toBe("");
  });

  it("reads the bar under a pointer, through a zoom, and lets go when the pointer leaves or is cancelled", async () => {
    const host = await mount(<BarChart series={series} labels={labels} summary="x" width={460} />);
    const svg = host.querySelector<SVGSVGElement>("svg")!;
    // The page is zoomed to 200%: the rect is twice the box's own width.
    svg.getBoundingClientRect = () => ({ left: 100, top: 0, width: 920, height: 360, right: 1020, bottom: 360, x: 100, y: 0, toJSON: () => ({}) });
    // React builds its leave from the browser's pointerout, with nothing under the pointer after it.
    const fire = (type: string, clientX: number) =>
      act(async () => void svg.dispatchEvent(new PointerEvent(type, { clientX, pointerType: "mouse", bubbles: true, relatedTarget: document.body })));
    // The last bar's middle, in the box's own pixels, is near 400; at 200% that is 100 + 800.
    await fire("pointermove", 900);
    expect(host.querySelector(".dl-chart-tip")?.textContent).toContain("Sat");
    await fire("pointerout", 900);
    expect(host.querySelector(".dl-chart-tip")).toBeNull();
    await fire("pointerdown", 260);
    expect(host.querySelector(".dl-chart-tip")?.textContent).toContain("Sun");
    await fire("pointercancel", 260);
    expect(host.querySelector(".dl-chart-tip")).toBeNull();
  });

  it("draws nothing for no bars, and still keeps its place", () => {
    const el = render(<BarChart series={[]} labels={[]} summary="x" width={300} height={120} />);
    expect(el.querySelector("svg")).toBeNull();
    expect(el.style.height).toBe("120px");
  });
});

describe("<ChartKey>", () => {
  it("writes each series as a coloured word with its total after it", () => {
    const el = render(<ChartKey items={[{ name: "Received", color: "violet", value: "998" }, { name: "Sent", color: "lavender" }]} />);
    expect(el.className).toBe("dl-chart-key");
    expect(el.textContent).toBe("Received 998Sent");
    expect(el.querySelector("b")?.style.color).toBe("violet");
  });
});

describe("data.css", () => {
  it("keeps the meter's colour until a level replaces it", () => {
    expect(ruleFor(css, ".dl-meter")).toContain("--dl-meter-fill: var(--dl-meter-c, var(--dl-accent))");
    expect(ruleFor(css, '.dl-meter[data-level="high"]')).toContain("--dl-meter-fill: oklch(0.74 0.13 80)");
    expect(ruleFor(css, '.dl-meter[data-level="full"]')).toContain("--dl-meter-fill: oklch(0.58 0.18 25)");
  });

  it("puts the tick where amber starts, on the side the fill grows from", () => {
    expect(ruleFor(css, ".dl-meter-tick")).toContain("inset-inline-start: 80%");
    expect(ruleFor(css, ".dl-meter-fill")).toContain("inset-inline-start: 0");
  });

  it("writes the warning words and the percent in inks that clear 4.5:1 on a settings card", () => {
    const card = hex("#262626");
    expect(contrast(oklch(0.8, 0.13, 80), card)).toBeGreaterThan(4.5);
    expect(contrast(oklch(0.74, 0.15, 25), card)).toBeGreaterThan(4.5);
    // The fill's own red is why the word has an ink of its own.
    expect(contrast(oklch(0.58, 0.18, 25), card)).toBeLessThan(4.5);
    expect(ruleFor(css, '.dl-meter-word[data-level="full"]')).toContain("oklch(0.74 0.15 25)");
    expect(ruleFor(css, '.dl-meter[data-level="full"]')).toContain("--dl-meter-ink: oklch(0.74 0.15 25)");
    expect(ruleFor(css, '.dl-meter-word[data-level="high"]')).toContain("oklch(0.8 0.13 80)");
    expect(ruleFor(css, '.dl-meter[data-level="high"]')).toContain("--dl-meter-ink: oklch(0.8 0.13 80)");
  });

  it("draws the chart's type at 12px, never scaled with the box", () => {
    expect(ruleFor(css, ".dl-chart-tick")).toContain("font-size: 12px");
    expect(ruleFor(css, ".dl-chart-tip")).toContain("white-space: nowrap");
    expect(ruleFor(css, ".dl-chart-tip")).toContain("text-overflow: ellipsis");
  });

  it("lets a vertical drag on the chart scroll the page", () => {
    expect(ruleFor(css, ".dl-chart-svg")).toContain("touch-action: pan-y");
  });
});
