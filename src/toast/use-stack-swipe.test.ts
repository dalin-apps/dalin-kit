/**
 * @vitest-environment jsdom
 *
 * The swipe on the nav pill, run through the real hook: what a tap, a pull
 * and a tuck do, and the three things an app may add (a second element for
 * the lift, a tick per direction, and a pill that draws no pull). The
 * arithmetic of a drag is pinned in stack-swipe.test.ts.
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SWIPE_SLOP_PX, SWIPE_TUCK_PX } from "./stack-swipe.js";
import { ToastBand } from "./toast-band.js";
import { readToastsExpanded, setToastCount, setToastsExpanded } from "./toast-stack.js";
import { useStackSwipe, type StackSwipeHost } from "./use-stack-swipe.js";

/** A pill whose top edge is at 700, pressed in its middle. */
const PILL = { top: 700, bottom: 758, left: 100 };
const START_Y = 729;

let host: HTMLDivElement;
let root: Root;
let list: HTMLElement;
const onTab = vi.fn();

function Bar({ swipeHost, pillClass = "pill" }: { swipeHost: StackSwipeHost; pillClass?: string }) {
  const swipe = useStackSwipe({ zone: "pill", ...swipeHost });
  return createElement(
    "div",
    { className: "bar" },
    createElement(
      "nav",
      { "data-dl-pill": "", className: pillClass, ...swipe },
      createElement("button", { type: "button", onClick: onTab }, "Inbox"),
    ),
    createElement("button", { type: "button", className: "reply" }, "Reply"),
  );
}

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  // Sonner's list, where the hook writes the lift for the peeking cards.
  list = document.createElement("ol");
  list.setAttribute("data-sonner-toaster", "");
  list.setAttribute("data-y-position", "bottom");
  document.body.append(list);
  setToastsExpanded(false);
  setToastCount(2);
  onTab.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  list.remove();
  setToastCount(0);
  setToastsExpanded(false);
});

function mount(swipeHost: StackSwipeHost = {}, pillClass?: string) {
  act(() => root.render(createElement(Bar, { swipeHost, pillClass })));
  pill().getBoundingClientRect = () => ({ ...PILL }) as DOMRect;
}

const pill = () => host.querySelector<HTMLElement>("[data-dl-pill]")!;
const tab = () => pill().querySelector("button")!;
const reply = () => host.querySelector<HTMLElement>(".reply")!;
const lift = (el: HTMLElement) => el.style.getPropertyValue("--pull-lift");

function pointer(type: string, y: number, x = 200, on: Element = tab()) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: "touch" } });
  act(() => {
    on.dispatchEvent(event);
  });
}

function click(on: Element = tab()) {
  act(() => {
    on.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
  });
}

/** Presses and pulls up just past the slop, short of the line. */
function pull() {
  pointer("pointerdown", START_Y);
  pointer("pointermove", START_Y - SWIPE_SLOP_PX - 8);
}

describe("the swipe as version 0 had it", () => {
  it("lets a tap on a tab through and leaves the stack alone", () => {
    mount();
    pointer("pointerdown", START_Y);
    pointer("pointermove", START_Y - 4, 201);
    pointer("pointerup", START_Y - 4, 201);
    click();
    expect(onTab).toHaveBeenCalledTimes(1);
    expect(readToastsExpanded()).toBe(false);
    expect(pill().dataset.pull).toBeUndefined();
  });

  it("paints the pull on the pill and lifts the cards with it", () => {
    mount();
    pull();
    expect(pill().dataset.pull).toBe("on");
    expect(lift(pill())).toBe("2.00px");
    expect(lift(list)).toBe("2.00px");
    expect(list.hasAttribute("data-pulling")).toBe(true);
    pointer("pointerup", START_Y - SWIPE_SLOP_PX - 8);
    expect(pill().dataset.pull).toBeUndefined();
    expect(lift(pill())).toBe("");
    expect(lift(list)).toBe("");
    expect(list.hasAttribute("data-pulling")).toBe(false);
  });

  it("fans the stack out past the line with one tick, and swallows the click after", () => {
    const onTick = vi.fn();
    mount({ onTick, reducedMotion: () => false });
    pull();
    pointer("pointermove", PILL.top - 20);
    expect(readToastsExpanded()).toBe(true);
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(pill().dataset.pull).toBe("swell");
    pointer("pointerup", PILL.top - 20);
    click();
    expect(onTab).not.toHaveBeenCalled();
  });

  it("tucks a fanned stack on a pull down, with the same one tick", () => {
    const onTick = vi.fn();
    mount({ onTick });
    setToastsExpanded(true);
    pointer("pointerdown", START_Y);
    pointer("pointermove", START_Y + SWIPE_SLOP_PX);
    pointer("pointermove", START_Y + SWIPE_SLOP_PX + SWIPE_TUCK_PX);
    expect(readToastsExpanded()).toBe(false);
    expect(onTick).toHaveBeenCalledTimes(1);
  });
});

describe("a tick per direction", () => {
  it("plays onFan as the stack fans out and onTuck as it tucks, and not onTick", () => {
    const [onTick, onFan, onTuck] = [vi.fn(), vi.fn(), vi.fn()];
    mount({ onTick, onFan, onTuck });
    pull();
    pointer("pointermove", PILL.top - 20);
    pointer("pointerup", PILL.top - 20);
    expect([onFan.mock.calls.length, onTuck.mock.calls.length]).toEqual([1, 0]);
    pointer("pointerdown", START_Y);
    pointer("pointermove", START_Y + SWIPE_SLOP_PX);
    pointer("pointermove", START_Y + SWIPE_SLOP_PX + SWIPE_TUCK_PX);
    expect([onFan.mock.calls.length, onTuck.mock.calls.length]).toEqual([1, 1]);
    expect(onTick).not.toHaveBeenCalled();
  });

  it("falls back to onTick for a direction with no tick of its own", () => {
    const [onTick, onFan] = [vi.fn(), vi.fn()];
    mount({ onTick, onFan });
    setToastsExpanded(true);
    pointer("pointerdown", START_Y);
    pointer("pointermove", START_Y + SWIPE_SLOP_PX);
    pointer("pointermove", START_Y + SWIPE_SLOP_PX + SWIPE_TUCK_PX);
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(onFan).not.toHaveBeenCalled();
  });

  it("gives the band's tap the same two ticks", () => {
    const [onFan, onTuck] = [vi.fn(), vi.fn()];
    act(() => root.render(createElement(ToastBand, { onFan, onTuck })));
    const band = host.querySelector<HTMLButtonElement>(".toast-band")!;
    click(band);
    expect(readToastsExpanded()).toBe(true);
    expect([onFan.mock.calls.length, onTuck.mock.calls.length]).toEqual([1, 0]);
    click(band);
    expect(readToastsExpanded()).toBe(false);
    expect([onFan.mock.calls.length, onTuck.mock.calls.length]).toEqual([1, 1]);
  });
});

describe("a second element for the lift", () => {
  it("writes --pull-lift on the app's element too, and takes it away with the pill's", () => {
    mount({ liftTarget: ".reply" });
    pull();
    expect(lift(reply())).toBe("2.00px");
    expect(lift(reply())).toBe(lift(pill()));
    pointer("pointerup", START_Y - SWIPE_SLOP_PX - 8);
    expect(lift(reply())).toBe("");
  });

  it("clears it when the stack moves, as it clears the pill's", () => {
    mount({ liftTarget: ".reply" });
    pull();
    pointer("pointermove", PILL.top - 20);
    expect(readToastsExpanded()).toBe(true);
    expect(lift(reply())).toBe("");
  });

  it("writes only the lift there, never the pull's other marks", () => {
    mount({ liftTarget: ".reply" });
    pull();
    expect(reply().dataset.pull).toBeUndefined();
    expect(reply().style.getPropertyValue("--pull")).toBe("");
  });

  it("goes on without it when the selector matches nothing", () => {
    mount({ liftTarget: ".not-there" });
    pull();
    expect(lift(pill())).toBe("2.00px");
  });
});

describe("a pill that draws no pull", () => {
  it("still fans the stack out, ticks, and swallows the click", () => {
    const onFan = vi.fn();
    mount({ pullOn: ".tabs", onFan }, "selection");
    pull();
    pointer("pointermove", PILL.top - 20);
    expect(readToastsExpanded()).toBe(true);
    expect(onFan).toHaveBeenCalledTimes(1);
    pointer("pointerup", PILL.top - 20);
    click();
    expect(onTab).not.toHaveBeenCalled();
  });

  it("writes nothing on the pill, the second element or the cards", () => {
    mount({ pullOn: ".tabs", liftTarget: ".reply", reducedMotion: () => false }, "selection");
    pull();
    expect(pill().dataset.pull).toBeUndefined();
    expect(pill().getAttribute("style") ?? "").toBe("");
    expect(lift(reply())).toBe("");
    expect(lift(list)).toBe("");
    expect(list.hasAttribute("data-pulling")).toBe(false);
    pointer("pointermove", PILL.top - 20);
    // No swell either: there is no lens on this bar to swell.
    expect(pill().dataset.pull).toBeUndefined();
  });

  it("draws as before on a pill that does match", () => {
    mount({ pullOn: ".tabs" }, "tabs");
    pull();
    expect(pill().dataset.pull).toBe("on");
    expect(lift(list)).toBe("2.00px");
  });
});
