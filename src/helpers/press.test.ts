/**
 * @vitest-environment jsdom
 *
 * The phone's press, from the pointer (0.14): `watchPress` marks a control
 * `data-pressed` as the pointer lands and `data-released` for the one
 * settle after the lift, and motion.css and create.css draw both. Before
 * it the press was `:active`, which a touch browser applies after the tap.
 *
 * jsdom has no hit test, so a test that needs one answers
 * `elementFromPoint` itself, and no animations, so a test ends a settle by
 * sending its `animationend` or by running the clock.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { outweighs, readCss, ruleFor, rulesWith, splitList } from "../../test/css.js";
import { INPUT_ATTR } from "./input-modality.js";
import { setMotionReader } from "./motion.js";
import { PRESSED_ATTR, PRESS_CLASS, PRESS_WATCH_ATTR, RELEASED_ATTR, pressTarget, watchPress } from "./press.js";
import { TAB_SETTLE_CLASS, settleTab } from "./tab-settle.js";

const html = document.documentElement;
let stop: (() => void) | null = null;
let quiet: (() => void) | null = null;

beforeEach(() => {
  // The system's setting is not the test's to depend on.
  quiet = setMotionReader(() => false);
});
afterEach(() => {
  stop?.();
  stop = null;
  quiet?.();
  quiet = null;
  vi.useRealTimers();
  delete (document as { elementFromPoint?: unknown }).elementFromPoint;
  html.removeAttribute(INPUT_ATTR);
  document.body.innerHTML = "";
});

/** One pointer event on an element, as a browser sends it: bubbling, with its pointer's id. */
function pointer(type: string, el: Element, init: { button?: number; id?: number; primary?: boolean } = {}): void {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: init.button ?? 0, clientX: 10, clientY: 10 });
  Object.defineProperty(event, "pointerId", { value: init.id ?? 1 });
  Object.defineProperty(event, "isPrimary", { value: init.primary ?? true });
  el.dispatchEvent(event);
}

/** The settle's own end, as the browser reports it. */
function settled(el: Element, name = "dl-press-settle"): void {
  const event = new Event("animationend", { bubbles: true });
  Object.defineProperty(event, "animationName", { value: name });
  el.dispatchEvent(event);
}

/** A phone bar: two tabs marked for the press, each with a glyph, and the create circle. */
function bar(): { tab: HTMLElement; glyph: HTMLElement; other: HTMLElement; plus: HTMLElement } {
  document.body.innerHTML = `
    <nav class="dl-phone">
      <button class="tab ${PRESS_CLASS}" id="agenda"><svg id="glyph"></svg><span>Agenda</span></button>
      <button class="tab ${PRESS_CLASS}" id="day"><svg></svg><span>Day</span></button>
      <button class="dl-create-glass" id="plus"><svg></svg></button>
    </nav>`;
  const get = (id: string) => document.getElementById(id) as HTMLElement;
  return { tab: get("agenda"), glyph: get("glyph"), other: get("day"), plus: get("plus") };
}

const pressed = (el: Element) => el.hasAttribute(PRESSED_ATTR);
const released = (el: Element) => el.hasAttribute(RELEASED_ATTR);

describe("the names", () => {
  it("are the attributes the stylesheets read, and the class an app marks a tab with", () => {
    expect(PRESSED_ATTR).toBe("data-pressed");
    expect(RELEASED_ATTR).toBe("data-released");
    expect(PRESS_WATCH_ATTR).toBe("data-dl-press");
    expect(PRESS_CLASS).toBe("dl-press");
  });
});

describe("watchPress, a press and its lift", () => {
  it("marks the control pressed as the pointer lands, before anything lifts", () => {
    const { tab, other } = bar();
    stop = watchPress();
    pointer("pointerdown", tab);
    expect(pressed(tab)).toBe(true);
    expect(released(tab)).toBe(false);
    // One control at a time, and no other is touched.
    expect(pressed(other)).toBe(false);
  });

  it("marks the tab, not the glyph the finger landed on", () => {
    const { tab, glyph } = bar();
    stop = watchPress();
    pointer("pointerdown", glyph);
    expect(pressed(tab)).toBe(true);
    expect(pressed(glyph)).toBe(false);
  });

  it("holds the press for as long as the pointer is down", () => {
    vi.useFakeTimers();
    const { tab } = bar();
    stop = watchPress();
    pointer("pointerdown", tab);
    vi.advanceTimersByTime(5000);
    pointer("pointermove", tab);
    expect(pressed(tab)).toBe(true);
  });

  it("lets go on the lift and marks the one settle, which goes when it ends", () => {
    const { tab, glyph } = bar();
    stop = watchPress();
    pointer("pointerdown", tab);
    pointer("pointerup", tab);
    expect(pressed(tab)).toBe(false);
    expect(released(tab)).toBe(true);
    // An animation of the glyph's ending, and another of the tab's own, are not the settle's.
    settled(glyph);
    settled(tab, "some-other");
    expect(released(tab)).toBe(true);
    settled(tab);
    expect(released(tab)).toBe(false);
  });

  it("drops the settle's mark by the clock where no animation reports its end", () => {
    vi.useFakeTimers();
    const { plus } = bar();
    stop = watchPress();
    pointer("pointerdown", plus);
    pointer("pointerup", plus);
    expect(released(plus)).toBe(true);
    vi.advanceTimersByTime(399);
    expect(released(plus)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(released(plus)).toBe(false);
  });

  it("starts from the press again on a second tap inside the settle", () => {
    vi.useFakeTimers();
    const { tab } = bar();
    stop = watchPress();
    pointer("pointerdown", tab);
    pointer("pointerup", tab);
    vi.advanceTimersByTime(60);
    pointer("pointerdown", tab);
    expect(pressed(tab)).toBe(true);
    expect(released(tab)).toBe(false);
    // The first settle's clock does not end the second's.
    pointer("pointerup", tab);
    vi.advanceTimersByTime(350);
    expect(released(tab)).toBe(true);
    vi.advanceTimersByTime(50);
    expect(released(tab)).toBe(false);
  });
});

describe("watchPress, a press that is no tap", () => {
  it("lets go with no settle when the touch is cancelled: a scroll took it", () => {
    const { tab } = bar();
    stop = watchPress();
    pointer("pointerdown", tab);
    pointer("pointercancel", tab);
    expect(pressed(tab)).toBe(false);
    expect(released(tab)).toBe(false);
  });

  it("lets go with no settle when the pointer slides off, and the lift that follows settles nothing", () => {
    const { tab, other } = bar();
    stop = watchPress();
    let under: Element = tab;
    (document as { elementFromPoint?: unknown }).elementFromPoint = () => under;
    pointer("pointerdown", tab);
    // Still on it, on the glyph inside it.
    under = tab.querySelector("svg")!;
    pointer("pointermove", tab);
    expect(pressed(tab)).toBe(true);
    under = other;
    pointer("pointermove", tab);
    expect(pressed(tab)).toBe(false);
    // A finger's events stay with the control it landed on.
    pointer("pointerup", tab);
    expect(released(tab)).toBe(false);
    expect(pressed(other)).toBe(false);
  });

  it("settles nothing for a lift that lands off the control", () => {
    const { tab, other } = bar();
    stop = watchPress();
    (document as { elementFromPoint?: unknown }).elementFromPoint = () => tab;
    pointer("pointerdown", tab);
    (document as { elementFromPoint?: unknown }).elementFromPoint = () => other;
    pointer("pointerup", tab);
    expect(pressed(tab)).toBe(false);
    expect(released(tab)).toBe(false);
  });

  it("lets go when the window loses focus under a held finger", () => {
    const { tab } = bar();
    stop = watchPress();
    pointer("pointerdown", tab);
    window.dispatchEvent(new Event("blur"));
    expect(pressed(tab)).toBe(false);
    expect(released(tab)).toBe(false);
  });

  it("follows the pointer that pressed: another one's lift ends nothing", () => {
    const { tab } = bar();
    stop = watchPress();
    pointer("pointerdown", tab, { id: 1 });
    pointer("pointerup", tab, { id: 2 });
    pointer("pointercancel", tab, { id: 2 });
    expect(pressed(tab)).toBe(true);
    pointer("pointerup", tab, { id: 1 });
    expect(pressed(tab)).toBe(false);
  });

  it("takes no press from a second finger or from a button that is not the first", () => {
    const { tab } = bar();
    stop = watchPress();
    pointer("pointerdown", tab, { primary: false });
    expect(pressed(tab)).toBe(false);
    pointer("pointerdown", tab, { button: 2 });
    expect(pressed(tab)).toBe(false);
  });

  it("moves nothing from the keyboard: a key's click sends no pointer event", () => {
    const { tab } = bar();
    stop = watchPress();
    tab.click();
    expect(pressed(tab)).toBe(false);
    expect(released(tab)).toBe(false);
  });
});

describe("watchPress, what takes the press", () => {
  it("is the create button, its glass alone, and the button around a glass layer", () => {
    document.body.innerHTML = `
      <button class="dl-create" id="whole"><i id="icon"></i></button>
      <button class="dl-create-glass" id="glass"></button>
      <button id="around"><span class="dl-create-glass" id="layer"></span><b id="label">Upload</b></button>`;
    const get = (id: string) => document.getElementById(id) as HTMLElement;
    expect(pressTarget(get("icon"))).toBe(get("whole"));
    expect(pressTarget(get("glass"))).toBe(get("glass"));
    // On the label beside the layer the button takes it, and the layer reads it from its parent.
    expect(pressTarget(get("label"))).toBe(get("around"));
    expect(pressTarget(get("around"))).toBe(get("around"));
    expect(pressTarget(get("layer"))).toBe(get("layer"));
  });

  it("is nothing the app has not marked", () => {
    document.body.innerHTML = `<button id="plain"><svg id="in"></svg></button>`;
    stop = watchPress();
    const plain = document.getElementById("plain")!;
    expect(pressTarget(document.getElementById("in"))).toBeNull();
    expect(pressTarget(null)).toBeNull();
    pointer("pointerdown", plain);
    expect(pressed(plain)).toBe(false);
  });

  it.each(["disabled", 'aria-disabled="true"', 'aria-busy="true"'])("leaves a control that is %s alone", (state) => {
    document.body.innerHTML = `<button class="${PRESS_CLASS}" id="off" ${state}><svg id="in"></svg></button>`;
    stop = watchPress();
    const off = document.getElementById("off")!;
    pointer("pointerdown", document.getElementById("in")!);
    pointer("pointerup", document.getElementById("in")!);
    expect(pressed(off)).toBe(false);
    expect(released(off)).toBe(false);
  });
});

describe("watchPress, reduced motion", () => {
  it("still marks the press, which only brightens, and plays no settle: the app's switch", () => {
    quiet?.();
    quiet = setMotionReader(() => true);
    const { tab } = bar();
    stop = watchPress();
    pointer("pointerdown", tab);
    expect(pressed(tab)).toBe(true);
    pointer("pointerup", tab);
    expect(pressed(tab)).toBe(false);
    expect(released(tab)).toBe(false);
  });

  it("takes its own reader, which wins for this watcher", () => {
    const { tab } = bar();
    stop = watchPress({ reducedMotion: () => true });
    pointer("pointerdown", tab);
    pointer("pointerup", tab);
    expect(released(tab)).toBe(false);
  });
});

describe("watchPress, the mark on <html>", () => {
  it("is on while a watcher runs, so the stylesheets leave :active alone, and off with the last", () => {
    expect(html.hasAttribute(PRESS_WATCH_ATTR)).toBe(false);
    const first = watchPress();
    const second = watchPress();
    expect(html.hasAttribute(PRESS_WATCH_ATTR)).toBe(true);
    first();
    // Stopping twice counts once.
    first();
    expect(html.hasAttribute(PRESS_WATCH_ATTR)).toBe(true);
    second();
    expect(html.hasAttribute(PRESS_WATCH_ATTR)).toBe(false);
  });

  it("leaves nothing pressed or settling behind when it stops, and hears nothing after", () => {
    const { tab, other } = bar();
    const end = watchPress();
    pointer("pointerdown", tab);
    pointer("pointerup", tab);
    pointer("pointerdown", other);
    end();
    expect(released(tab)).toBe(false);
    expect(pressed(other)).toBe(false);
    pointer("pointerdown", tab);
    expect(pressed(tab)).toBe(false);
  });
});

describe("settleTab beside the press", () => {
  it("plays nothing over the lift's own settle, so a tab moves once", () => {
    const { tab, glyph } = bar();
    stop = watchPress();
    pointer("pointerdown", glyph);
    pointer("pointerup", glyph);
    // The click follows the lift: the app's handler calls settleTab as it did in 0.13.
    expect(settleTab(glyph)).toBe(false);
    expect(glyph.classList.contains(TAB_SETTLE_CLASS)).toBe(false);
    // Once the settle has ended, a tab opened some other way settles as before.
    settled(tab);
    expect(settleTab(glyph)).toBe(true);
  });

  it("still settles the glyph of a tab the app has not marked", () => {
    document.body.innerHTML = `<button id="tab"><svg id="glyph"></svg></button>`;
    stop = watchPress();
    const glyph = document.getElementById("glyph")!;
    pointer("pointerdown", glyph);
    pointer("pointerup", glyph);
    expect(settleTab(glyph)).toBe(true);
  });
});

const READY = ':not(:is(:disabled, [aria-disabled="true"], [aria-busy="true"]))';
const SCALE = "scale: var(--dl-press-scale, 0.97);";
const BRIGHT = "filter: brightness(var(--dl-press-bright, 1.12));";
const SETTLE = "animation: dl-press-settle var(--dl-t-tab-settle, 140ms) var(--dl-ease, cubic-bezier(0.2, 0.8, 0.2, 1));";
/** A sheet's `dl-press-settle` keyframes, as one line. */
const frames = (css: string) => (/@keyframes dl-press-settle\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "").replace(/\s+/g, " ").trim();
const FROM_PRESSED = `from { ${SCALE} ${BRIGHT} }`;

describe("motion.css, a control marked dl-press", () => {
  const css = readCss("motion");

  it("is 0.97 and brighter while it is pressed, as scale, with no transition into it", () => {
    const body = ruleFor(css, `.dl-press[data-pressed]${READY}`);
    expect(body.replace(/\s+/g, " ")).toBe(`${SCALE} ${BRIGHT}`);
    expect(css).not.toMatch(/\.dl-press[^{]*\{[^}]*transition/);
    // Nothing here is drawn from :active, which a touch applies after the tap.
    expect(rulesWith(css, ".dl-press").some(([selector]) => selector.includes(":active"))).toBe(false);
  });

  it("settles back once over 140ms on the family's curve, from the pressed size to rest", () => {
    expect(ruleFor(css, ".dl-press[data-released]")).toBe(SETTLE);
    // No `to`: it ends on the control's own resting values.
    expect(frames(css)).toBe(FROM_PRESSED);
    expect(readCss("tokens")).toMatch(/--dl-t-tab-settle: 140ms;/);
  });

  it("only brightens under reduced motion, and plays no settle, the app's switch or the system's", () => {
    expect(ruleFor(css, 'html[data-dl-motion="reduce"] .dl-press[data-pressed]')).toBe("scale: none;");
    expect(ruleFor(css, 'html[data-dl-motion="reduce"] .dl-press[data-released]')).toBe("animation: none;");
    expect(ruleFor(css, 'html:not([data-dl-motion="full"]) .dl-press[data-pressed]')).toBe("scale: none;");
    expect(ruleFor(css, 'html:not([data-dl-motion="full"]) .dl-press[data-released]')).toBe("animation: none;");
    expect(outweighs('html[data-dl-motion="reduce"] .dl-press[data-pressed]', `.dl-press[data-pressed]${READY}`)).toBe(true);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html:not\(\[data-dl-motion="full"\]\) \.dl-press\[data-pressed\]/);
  });
});

describe("create.css, the create button on the phone", () => {
  const css = readCss("create");
  const [list, body] = rulesWith(css, ".dl-phone :is(.dl-create, .dl-create-glass)[data-pressed]:not(")[0]!;
  const selectors = splitList(list);

  it("is pressed from the pointer's mark: the button, the glass alone, and a glass layer in a pressed button", () => {
    expect(body.replace(/\s+/g, " ")).toBe(`${SCALE} ${BRIGHT}`);
    expect(selectors).toContain(`.dl-phone :is(.dl-create, .dl-create-glass)[data-pressed]${READY}`);
    expect(selectors).toContain(`.dl-phone [data-pressed]${READY} > .dl-create-glass`);
  });

  it("draws nothing from :active once the watcher has marked <html>, and keeps :active for an app without it", () => {
    const active = selectors.filter((selector) => selector.includes(":active"));
    expect(active).toHaveLength(2);
    for (const selector of active) expect(selector.startsWith(":where(html:not([data-dl-press])) .dl-phone ")).toBe(true);
    // The guard weighs nothing, so the press is as heavy either way.
    expect(outweighs(active[0]!, selectors[2]!)).toBe(false);
    expect(outweighs(selectors[2]!, active[0]!)).toBe(false);
  });

  it("settles back from the pressed size on the lift, with the same keyframes as motion.css", () => {
    expect(ruleFor(css, ".dl-phone :is(.dl-create, .dl-create-glass)[data-released], .dl-phone [data-released] > .dl-create-glass")).toBe(SETTLE);
    expect(frames(css)).toBe(FROM_PRESSED);
    expect(frames(css)).toBe(frames(readCss("motion")));
  });

  it("keeps the hover's 120ms ease off the press and the settle: a transition outranks an animation", () => {
    const quiet = ruleFor(
      css,
      ".dl-phone :is(.dl-create, .dl-create-glass):is([data-pressed], [data-released]), .dl-phone :is([data-pressed], [data-released]) > .dl-create-glass",
    );
    expect(quiet).toBe("transition-property: background, border-color;");
    // It has to beat the transition the glass and an app's own class state.
    expect(outweighs(".dl-phone :is(.dl-create, .dl-create-glass):is([data-pressed], [data-released])", ".dl-create")).toBe(true);
  });

  it("leaves the desktop's press to :active, where a mouse shows it at once", () => {
    const desk = rulesWith(css, ".dl-create:active:not(")[0]![0];
    expect(desk).toContain(".dl-phone *");
    expect(desk).not.toContain("data-pressed");
  });

  it("only brightens under reduced motion and plays no settle, either switch", () => {
    const still = rulesWith(css, "[data-pressed]").filter(([, rule]) => rule === "scale: none;");
    expect(still).toHaveLength(2);
    for (const [stillList] of still) {
      const each = splitList(stillList);
      expect(each).toHaveLength(selectors.length);
      each.forEach((selector, i) => expect(outweighs(selector, selectors[i]!), selector).toBe(true));
    }
    const calm = rulesWith(css, "[data-released]").filter(([, rule]) => rule === "animation: none;");
    expect(calm.map(([calmList]) => splitList(calmList)[0]!.split(" ")[0])).toEqual([
      'html[data-dl-motion="reduce"]',
      'html:not([data-dl-motion="full"])',
    ]);
  });
});
