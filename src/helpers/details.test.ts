/**
 * @vitest-environment jsdom
 *
 * The helpers and tokens behind three family details from the drive pass
 * (0.13): rows that change at once, the first tooltip's wait, and the
 * settle of a phone tab's glyph. The press that the settle now starts from
 * (0.14) is in press.test.ts.
 */
import { afterEach, describe, expect, it } from "vitest";
import { readCss, ruleFor, ruleNaming } from "../../test/css.js";
import { INPUT_ATTR } from "./input-modality.js";
import { setMotionReader } from "./motion.js";
import { TAB_SETTLE_CLASS, settleTab } from "./tab-settle.js";
import { TIP_DELAY_MS, TIP_GROUP_MS } from "./tip-delay.js";

const tokens = readCss("tokens");
const motion = readCss("motion");

/** A token's value as written. */
const token = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(tokens)?.[1]?.trim();

afterEach(() => {
  document.documentElement.removeAttribute(INPUT_ATTR);
  document.body.innerHTML = "";
});

describe("rows that change at once", () => {
  it("is one switch for the family: --dl-t-row, at 0ms", () => {
    expect(token("--dl-t-row")).toBe("0ms");
    // The hover token keeps its 120ms for everything that is not a row.
    expect(token("--dl-t-hover")).toBe("120ms");
  });
});

describe("the first tooltip's wait", () => {
  it("is about 800ms, and a group stays warm for Base UI's 400ms", () => {
    expect(TIP_DELAY_MS).toBe(800);
    expect(TIP_GROUP_MS).toBe(400);
  });
});

describe("settleTab", () => {
  const glyph = () => {
    const el = document.createElement("span");
    document.body.appendChild(el);
    return el;
  };

  it("settles the glyph, and lets the class go when the settle ends, so nothing runs at rest", () => {
    const stop = setMotionReader(() => false);
    const el = glyph();
    expect(settleTab(el)).toBe(true);
    expect(el.classList.contains(TAB_SETTLE_CLASS)).toBe(true);
    // An animation inside it ending is not its own.
    const inner = document.createElement("i");
    el.appendChild(inner);
    inner.dispatchEvent(new Event("animationend", { bubbles: true }));
    expect(el.classList.contains(TAB_SETTLE_CLASS)).toBe(true);
    el.dispatchEvent(new Event("animationend"));
    expect(el.classList.contains(TAB_SETTLE_CLASS)).toBe(false);
    stop();
  });

  it("plays from its first frame on a second tap", () => {
    const stop = setMotionReader(() => false);
    const el = glyph();
    settleTab(el);
    const removed: string[] = [];
    const remove = el.classList.remove.bind(el.classList);
    el.classList.remove = (...names: string[]) => {
      removed.push(...names);
      remove(...names);
    };
    expect(settleTab(el)).toBe(true);
    expect(removed).toContain(TAB_SETTLE_CLASS);
    expect(el.classList.contains(TAB_SETTLE_CLASS)).toBe(true);
    stop();
  });

  it("plays nothing when the tab was opened from the keyboard", () => {
    const stop = setMotionReader(() => false);
    document.documentElement.setAttribute(INPUT_ATTR, "keyboard");
    const el = glyph();
    expect(settleTab(el)).toBe(false);
    expect(el.classList.contains(TAB_SETTLE_CLASS)).toBe(false);
    stop();
  });

  it("plays nothing while motion is reduced, by the app's switch or its own reader", () => {
    const stop = setMotionReader(() => true);
    expect(settleTab(glyph())).toBe(false);
    stop();
    expect(settleTab(glyph(), { reducedMotion: () => true })).toBe(false);
  });

  it("asks nothing of a missing glyph", () => {
    expect(settleTab(null)).toBe(false);
  });
});

describe("motion.css, the tab's settle", () => {
  it("grows the glyph from the pressed size to 1 over --dl-t-tab-settle, on the family's curve, as scale", () => {
    expect(ruleFor(motion, ".dl-tab-settle")).toContain(
      "animation: dl-tab-settle var(--dl-t-tab-settle, 140ms) var(--dl-ease, cubic-bezier(0.2, 0.8, 0.2, 1))",
    );
    const frames = /@keyframes dl-tab-settle\s*\{([\s\S]*?)\n\}/.exec(motion)?.[1] ?? "";
    // From 0.14 it starts where the press left the tab (0.97), not at 0.9, which multiplied with the press.
    expect(frames).toMatch(/from\s*\{\s*scale: var\(--dl-press-scale, 0\.97\);/);
    expect(motion).not.toContain("0.9;");
    expect(frames).toMatch(/to\s*\{\s*scale: 1;/);
    expect(frames).not.toContain("transform");
    expect(token("--dl-t-tab-settle")).toBe("140ms");
  });

  it("is still from the keyboard and under reduced motion, the app's switch or the system's", () => {
    const off = ruleNaming(motion, 'html[data-input="keyboard"] .dl-tab-settle');
    expect(off).toBe("animation: none;");
    expect(ruleNaming(motion, 'html[data-dl-motion="reduce"] .dl-tab-settle')).toBe(off);
    expect(motion).toContain('html:not([data-dl-motion="full"]) .dl-tab-settle {\n    animation: none;');
  });
});
