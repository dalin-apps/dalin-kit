/**
 * @vitest-environment jsdom
 *
 * The family's sheet: what it renders, how a drag starts and ends, who may
 * refuse a close, where focus goes, how sheets stack, and what the toaster
 * and the system's back are told. The real Base UI Drawer runs under it.
 *
 * jsdom has no layout, so a test gives the panel a height, answers
 * `elementFromPoint` with the element a touch landed on, and writes each
 * event's time itself.
 */
import { StrictMode, act, useRef, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { outweighs, readCss, ruleFor, rulesWith, splitList } from "../../test/css.js";
import { all, click, key, mount, one, press, settle, withDom, withToast } from "../../test/dom.js";
import { INPUT_ATTR } from "../helpers/input-modality.js";
import { setMotionReader } from "../helpers/motion.js";
import { readToastCovered } from "../toast/toast-dock.js";
import { SHEET_DISMISS_PX } from "./sheet-release.js";
import {
  SHEET_HELD_ATTR,
  SHEET_NO_DRAG_ATTR,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  noSheetDrag,
  type SheetActions,
  type SheetChangeDetails,
  type SheetContentProps,
  type SheetProps,
} from "./sheet.js";

withDom();

const css = readCss("sheet");
const panel = () => one(".dl-sheet");
const scrim = () => one(".dl-sheet-scrim");
const viewport = () => one(".dl-sheet-viewport");
const layers = (): unknown[] => ((window.history.state as { dalinKit?: unknown[] } | null)?.dalinKit ?? []);

/** The page's clock, read once the sheet's open guard is well past. */
let now = 0;
beforeEach(() => {
  now = performance.now() + 5000;
});
afterEach(() => {
  delete (document as { elementFromPoint?: unknown }).elementFromPoint;
  document.documentElement.removeAttribute(INPUT_ATTR);
  window.getSelection()?.removeAllRanges();
});

/** One touch event on an element, at a height on the screen and a time. */
function touch(type: string, el: Element, y: number, at: number): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = { clientX: 100, clientY: y, identifier: 1, target: el };
  const lifted = type === "touchend" || type === "touchcancel";
  Object.defineProperty(event, "touches", { value: lifted ? [] : [point] });
  Object.defineProperty(event, "changedTouches", { value: [point] });
  Object.defineProperty(event, "timeStamp", { value: at });
  el.dispatchEvent(event);
}

type Step = [y: number, ms: number];

/**
 * A finger put down on an element and moved through the steps, each a
 * height and the ms since the last. Base UI takes the first move as the
 * drag's origin, so the travel is counted from the first step. Left down.
 */
async function drag(el: Element, steps: readonly Step[], start = 300): Promise<void> {
  (document as { elementFromPoint?: unknown }).elementFromPoint = () => el;
  fingerY = start;
  await act(async () => {
    touch("touchstart", el, start, now);
  });
  await act(async () => {
    for (const [y, ms] of steps) {
      now += ms;
      fingerY = y;
      touch("touchmove", el, y, now);
    }
  });
}

/** Where the finger of `drag()` last was: a lift carries the finger's own place, as a phone's does. */
let fingerY = 0;

/** The finger lifts `after` ms on, where it last moved to, or at `y`: a loaded frame can hold back the last move. */
async function release(el: Element, after = 2, type = "touchend", y = fingerY): Promise<void> {
  now += after;
  await act(async () => {
    touch(type, el, y, now);
  });
  await settle(80);
}

/** One mouse pointer event on an element, `ms` after the last, with its buttons as given. */
async function mouse(el: Element, type: string, y: number, ms: number, buttons: number): Promise<void> {
  (document as { elementFromPoint?: unknown }).elementFromPoint = () => el;
  now += ms;
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, buttons, clientX: 100, clientY: y });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  Object.defineProperty(event, "pointerId", { value: 1 });
  Object.defineProperty(event, "timeStamp", { value: now });
  await act(async () => {
    el.dispatchEvent(event);
  });
}

/** A tap as a finger makes one: a click that no key made. */
async function tap(el: Element | null | undefined): Promise<void> {
  if (!el) throw new Error("nothing to tap");
  await act(async () => {
    for (const name of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      el.dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true, button: 0, detail: 1 }));
    }
  });
  await settle(60);
}

/** How far down Base UI has the panel, in px. */
const travel = () => Number.parseFloat(panel()!.style.getPropertyValue("--drawer-swipe-movement-y"));
const dragged = () => panel()!.style.transform !== "";

type DemoProps = Partial<SheetProps> & {
  content?: Partial<SheetContentProps>;
  body?: ReactNode;
  log?: string[];
  height?: number;
};

/** An open sheet 600px tall, with a title and two buttons in its body. */
function Demo({ content, body, log, height = 600, onOpenChange, ...props }: DemoProps): ReactNode {
  return (
    <Sheet
      defaultOpen={props.open === undefined ? true : undefined}
      {...props}
      onOpenChange={(open, details) => {
        onOpenChange?.(open, details);
        if (!details.isCanceled) log?.push(`${open ? "open" : "close"}:${details.reason}`);
      }}
    >
      <SheetContent
        {...content}
        ref={(node: HTMLDivElement | null) => {
          if (node) Object.defineProperty(node, "offsetHeight", { value: height, configurable: true });
        }}
      >
        <SheetBody>
          <SheetTitle>Move to</SheetTitle>
          {body ?? (
            <>
              <button type="button">First</button>
              <button type="button">Last</button>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

async function open(props: DemoProps = {}): Promise<string[]> {
  const log = props.log ?? [];
  await mount(<Demo {...props} log={log} />);
  await settle(60);
  return log;
}

describe("<Sheet>, what it draws", () => {
  it("draws a scrim, a box that places the panel, and the panel with its handle first", async () => {
    await open();
    expect(scrim()?.dataset.slot).toBe("sheet-scrim");
    expect(viewport()?.contains(panel())).toBe(true);
    expect(panel()?.getAttribute("role")).toBe("dialog");
    const first = panel()!.firstElementChild!;
    expect(first.className).toBe("dl-sheet-handle");
    expect(first.getAttribute("aria-hidden")).toBe("true");
    expect(first.firstElementChild?.className).toBe("dl-sheet-handle-pill");
  });

  it("is named by its title, or by `label` where it has none", async () => {
    await open();
    expect(panel()?.getAttribute("aria-labelledby")).toBe(one(".dl-sheet-title")?.id);

    await mount(
      <Sheet defaultOpen>
        <SheetContent label="More actions">
          <SheetBody>Rows</SheetBody>
        </SheetContent>
      </Sheet>,
    );
    await settle();
    expect(panel()?.getAttribute("aria-label")).toBe("More actions");
  });

  it("puts a class and a data-slot on every part, and keeps the app's own class beside it", async () => {
    await mount(
      <Sheet defaultOpen>
        <SheetContent className="mine" scrimClassName="dim" viewportClassName="box" data-kind="move">
          <SheetHeader className="h">
            <SheetTitle className="t">Move to</SheetTitle>
          </SheetHeader>
          <SheetBody className="b">
            <SheetDescription className="d">Pick a folder.</SheetDescription>
          </SheetBody>
          <SheetFooter className="f">
            <SheetClose className="c">Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    await settle();
    expect(panel()?.className).toBe("dl-sheet mine");
    expect(panel()?.dataset.kind).toBe("move");
    expect(scrim()?.className).toBe("dl-sheet-scrim dim");
    expect(viewport()?.className).toBe("dl-sheet-viewport box");
    const slots = (selector: string) => one(selector)?.dataset.slot;
    expect(one(".dl-sheet-header")?.className).toBe("dl-sheet-header h");
    expect(slots(".dl-sheet-header")).toBe("sheet-header");
    expect(one(".dl-sheet-title")?.className).toBe("dl-sheet-title t");
    expect(slots(".dl-sheet-title")).toBe("sheet-title");
    expect(one(".dl-sheet-body")?.className).toBe("dl-sheet-body b");
    expect(slots(".dl-sheet-body")).toBe("sheet-body");
    expect(one(".dl-sheet-description")?.className).toBe("dl-sheet-description d");
    expect(one(".dl-sheet-footer")?.className).toBe("dl-sheet-footer f");
    expect(one(".c")?.dataset.slot).toBe("sheet-close");
    expect(one(".dl-sheet-handle")?.dataset.slot).toBe("sheet-handle");
    // Each part says which layout it is drawn in, for the app's own rules.
    for (const part of [scrim(), viewport(), panel()]) expect(part?.dataset.layout).toBe("sheet");
  });

  it("draws no handle when told not to", async () => {
    await open({ content: { handle: false } });
    expect(one(".dl-sheet-handle")).toBeNull();
  });

  it("is drawn into the app's own element when one is named", async () => {
    const home = document.createElement("div");
    home.id = "search-dialog";
    document.body.appendChild(home);
    await open({ content: { container: home } });
    expect(home.contains(panel())).toBe(true);
    expect(home.contains(scrim())).toBe(true);
  });

  it("carries no transform, and no filter of its own, while it rests", async () => {
    await open();
    expect(panel()!.style.transform).toBe("");
    expect(panel()!.style.getPropertyValue("translate")).toBe("");
    expect(panel()!.style.filter).toBe("");
    expect(panel()!.style.willChange).toBe("");
  });
});

describe("<Sheet>, the drag", () => {
  it("drags from anywhere on it: a finger on the body moves the panel", async () => {
    await open();
    const body = one(".dl-sheet-body")!;
    await drag(body, [
      [300, 16],
      [340, 100],
    ]);
    expect(dragged()).toBe(true);
    expect(travel()).toBe(40);
    await release(body, 200);
  });

  it("drags from the handle and from a button, as a finger does not tell them apart", async () => {
    await open();
    for (const target of [one(".dl-sheet-handle")!, one(".dl-sheet-body button")!]) {
      await drag(target, [
        [300, 16],
        [330, 100],
      ]);
      expect(travel()).toBe(30);
      await release(target, 200);
      expect(dragged()).toBe(false);
    }
  });

  it("closes past 96px on a 600px sheet, where Base UI's own rule would settle it", async () => {
    const log = await open();
    const title = one(".dl-sheet-title")!;
    // 110px over most of a second: no flick, and far short of half the height.
    await drag(title, [
      [300, 50],
      [360, 300],
      [410, 400],
    ]);
    expect(travel()).toBe(110);
    await release(title, 200);
    expect(log).toEqual(["close:swipe"]);
    expect(panel()).toBeNull();
  });

  it("settles back short of 96px when the finger was slow", async () => {
    const log = await open();
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 50],
      [390, 600],
    ]);
    await release(title, 200);
    expect(log).toEqual([]);
    expect(panel()).not.toBeNull();
    // Back where it rests, with nothing left on it from the drag.
    expect(dragged()).toBe(false);
    expect(panel()!.style.transition).toBe("");
    expect(travel()).toBe(0);
  });

  it("closes a short sheet past 40% of its height", async () => {
    const log = await open({ height: 200 });
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 50],
      [385, 600],
    ]);
    await release(title, 200);
    expect(log).toEqual(["close:swipe"]);
  });

  it("keeps a short Settings sheet open short of its flat 96px, where the default rule closes it", async () => {
    // 200px tall: the default closes past 80px, the Settings sheets past 96px.
    const log = await open({ height: 200, dismissDistance: SHEET_DISMISS_PX });
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 50],
      [385, 600],
    ]);
    await release(title, 200);
    expect(log).toEqual([]);
    expect(panel()).not.toBeNull();
    expect(dragged()).toBe(false);

    now += 500;
    await drag(title, [
      [300, 50],
      [400, 600],
    ]);
    await release(title, 200);
    expect(log).toEqual(["close:swipe"]);
  });

  it("holds the flat 96px against Base UI as well, which would close a 150px sheet at half its height", async () => {
    const log = await open({ height: 150, dismissDistance: SHEET_DISMISS_PX });
    const title = one(".dl-sheet-title")!;
    // 85px is past Base UI's 75px and short of 96px.
    await drag(title, [
      [300, 50],
      [385, 600],
    ]);
    await release(title, 200);
    expect(log).toEqual([]);
    expect(panel()).not.toBeNull();
    expect(panel()!.hasAttribute("data-ending-style")).toBe(false);
    expect(dragged()).toBe(false);
  });

  it("closes that same 150px sheet at 85px under the default rule", async () => {
    const log = await open({ height: 150 });
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 50],
      [385, 600],
    ]);
    await release(title, 200);
    expect(log).toEqual(["close:swipe"]);
  });

  it("closes a Settings sheet on the same flick as any other", async () => {
    const log = await open({ height: 200, dismissDistance: SHEET_DISMISS_PX });
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 16],
      [320, 20],
    ]);
    await release(title, 2);
    expect(log).toEqual(["close:swipe"]);
  });

  it("takes its closing distance as a function of its height", async () => {
    const log = await open({ dismissDistance: (height) => height / 2 });
    const title = one(".dl-sheet-title")!;
    // 110px closes a 600px sheet by default, and not at half its height.
    await drag(title, [
      [300, 50],
      [410, 700],
    ]);
    await release(title, 200);
    expect(log).toEqual([]);
    expect(panel()).not.toBeNull();
  });

  it("closes on a flick after 16px, which Base UI alone would not count", async () => {
    const log = await open();
    const title = one(".dl-sheet-title")!;
    // 20px in 20ms, lifted at once: 1px/ms at the release.
    await drag(title, [
      [300, 16],
      [320, 20],
    ]);
    await release(title, 2);
    expect(log).toEqual(["close:swipe"]);
  });

  it("does not close on a twitch: fast, and short of 16px", async () => {
    const log = await open();
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 16],
      [312, 8],
    ]);
    await release(title, 2);
    expect(log).toEqual([]);
    expect(dragged()).toBe(false);
  });

  it("refuses a close Base UI asks for when the finger had stopped before it lifted", async () => {
    const log = await open();
    const title = one(".dl-sheet-title")!;
    // 41px in 70ms is Base UI's flick, measured over the whole drag. But
    // the last 30ms moved one pixel: the finger had stopped.
    await drag(title, [
      [300, 16],
      [340, 40],
      [341, 30],
    ]);
    await release(title, 2);
    expect(log).toEqual([]);
    expect(panel()).not.toBeNull();
    expect(dragged()).toBe(false);
    expect(panel()!.hasAttribute("data-ending-style")).toBe(false);
  });

  it("asks once for a release both rules accept, and Base UI runs the close", async () => {
    const log = await open();
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 16],
      [450, 100],
      [700, 100],
    ]);
    await release(title, 2);
    expect(log).toEqual(["close:swipe"]);
  });

  it("settles a drag the system took away, however far it had gone", async () => {
    const log = await open();
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 16],
      [800, 400],
    ]);
    await release(title, 200, "touchcancel");
    expect(log).toEqual([]);
    expect(panel()).not.toBeNull();
  });

  it("resists an upward pull: the panel gives a little and never follows the finger", async () => {
    await open();
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 16],
      [200, 200],
    ]);
    // Base UI's own curve: the square root of the pull.
    expect(travel()).toBe(-10);
    await release(title, 200);
    expect(dragged()).toBe(false);
  });

  it("tells the scrim how far the panel has gone", async () => {
    await open();
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 16],
      [600, 400],
    ]);
    expect(scrim()!.style.getPropertyValue("--drawer-swipe-progress")).toBe("0.5");
    expect(scrim()!.hasAttribute("data-swiping")).toBe(true);
    await release(title, 200, "touchcancel");
    expect(scrim()!.style.getPropertyValue("--drawer-swipe-progress")).toBe("0");
  });

  it("drags under a mouse from the handle, and closes by the same rule", async () => {
    const log = await open();
    const grip = one(".dl-sheet-handle")!;
    await mouse(grip, "pointerdown", 300, 0, 1);
    await mouse(grip, "pointermove", 300, 16, 1);
    await mouse(grip, "pointermove", 420, 600, 1);
    expect(dragged()).toBe(true);
    expect(travel()).toBe(120);
    await mouse(grip, "pointerup", 420, 200, 0);
    await settle(80);
    expect(log).toEqual(["close:swipe"]);
  });

  it("closes for a mouse whose release arrives as a move with no button down", async () => {
    const log = await open();
    const grip = one(".dl-sheet-handle")!;
    await mouse(grip, "pointerdown", 300, 0, 1);
    await mouse(grip, "pointermove", 300, 16, 1);
    await mouse(grip, "pointermove", 420, 600, 1);
    await mouse(grip, "pointermove", 420, 200, 0);
    await settle(80);
    expect(log).toEqual(["close:swipe"]);
  });

  it("leaves the body to a mouse, which selects text there", async () => {
    await open();
    const title = one(".dl-sheet-title")!;
    await mouse(title, "pointerdown", 300, 0, 1);
    await mouse(title, "pointermove", 300, 16, 1);
    await mouse(title, "pointermove", 420, 600, 1);
    expect(dragged()).toBe(false);
    await mouse(title, "pointerup", 420, 200, 0);
    expect(panel()).not.toBeNull();
  });

  it("does not drag with `swipe` off: the gesture is the app's own", async () => {
    await open({ swipe: false });
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 16],
      [500, 300],
    ]);
    expect(dragged()).toBe(false);
    await release(title);
    expect(panel()).not.toBeNull();
  });
});

describe("<Sheet>, when a drag may start", () => {
  const far: readonly Step[] = [
    [300, 16],
    [360, 100],
  ];

  it("starts no drag in the sheet's first 150ms", async () => {
    // Read before the sheet mounts, so the press below is inside the guard however long the mount took.
    const before = performance.now();
    await open();
    const title = one(".dl-sheet-title")!;
    now = before + 100;
    await drag(title, far);
    expect(dragged()).toBe(false);
    // Held past the guard, the press is still the one that was ignored.
    await release(title, 400);
    expect(dragged()).toBe(false);
    expect(panel()!.hasAttribute(SHEET_HELD_ATTR)).toBe(false);
  });

  it("takes a drag from a press 200ms after it opened, which the old half second ignored", async () => {
    await open();
    const title = one(".dl-sheet-title")!;
    // After the mount and its settle: 200ms on is past the guard and well inside 500.
    now = performance.now() + 200;
    await drag(title, far);
    expect(dragged()).toBe(true);
    await release(title, 200);
  });

  it("starts none for a tenth of a second after the body scrolled", async () => {
    await open();
    const body = one(".dl-sheet-body")!;
    const scrolled = new Event("scroll");
    Object.defineProperty(scrolled, "timeStamp", { value: now - 50 });
    body.dispatchEvent(scrolled);
    await drag(body, far);
    expect(dragged()).toBe(false);
    await release(body);
    now += 200;
    await drag(body, far);
    expect(dragged()).toBe(true);
    await release(body, 200);
  });

  it("starts none while the body is scrolled off its top, and one from its top", async () => {
    await open();
    const body = one(".dl-sheet-body")!;
    body.style.overflowY = "auto";
    Object.defineProperty(body, "scrollHeight", { value: 1200, configurable: true });
    Object.defineProperty(body, "clientHeight", { value: 400, configurable: true });
    body.scrollTop = 80;
    await drag(body, far);
    expect(dragged()).toBe(false);
    await release(body);
    body.scrollTop = 0;
    now += 500;
    await drag(body, far);
    expect(dragged()).toBe(true);
    await release(body, 200);
  });

  it("starts none on a select", async () => {
    await open({
      body: (
        <select aria-label="Folder">
          <option>Inbox</option>
        </select>
      ),
    });
    const select = one("select")!;
    await drag(select, far);
    expect(dragged()).toBe(false);
    await release(select);
  });

  it("starts none while text in the sheet is selected", async () => {
    await open({ body: <p id="words">Some words to select</p> });
    const words = one("#words")!;
    const range = document.createRange();
    range.selectNodeContents(words);
    // Focus on the panel left a caret there, and a second range is not added beside one.
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    expect(window.getSelection()!.isCollapsed).toBe(false);
    await drag(words, far);
    expect(dragged()).toBe(false);
    await release(words);
    // With the selection dropped, the same press drags.
    window.getSelection()!.removeAllRanges();
    now += 500;
    await drag(words, far);
    expect(dragged()).toBe(true);
    await release(words, 200);
  });

  it("leaves alone a region that owns its gestures, and the rest of the sheet still drags", async () => {
    await open({
      body: (
        <div id="scrubber" {...noSheetDrag()}>
          <span id="thumb">thumb</span>
        </div>
      ),
    });
    const thumb = one("#thumb")!;
    await drag(thumb, far);
    expect(dragged()).toBe(false);
    await release(thumb);
    // The kit's mark and Base UI's own, both written by React.
    expect(one("#scrubber")!.getAttribute(SHEET_NO_DRAG_ATTR)).toBe("");
    expect(one("#scrubber")!.getAttribute("data-base-ui-swipe-ignore")).toBe("");

    now += 500;
    const title = one(".dl-sheet-title")!;
    await drag(title, far);
    expect(dragged()).toBe(true);
    await release(title, 200);
  });

  it("gives a sideways region its own axis: down still drags the sheet", async () => {
    await open({
      body: (
        <div id="files" {...noSheetDrag("x")}>
          file
        </div>
      ),
    });
    expect(noSheetDrag("x")).toEqual({ [SHEET_NO_DRAG_ATTR]: "x", "data-base-ui-swipe-ignore": "x" });
    const files = one("#files")!;
    await drag(files, far);
    expect(files.getAttribute("data-base-ui-swipe-ignore")).toBe("x");
    expect(dragged()).toBe(true);
    await release(files, 200);
  });
});

describe("<Sheet>, refusing a close", () => {
  const refuse = (_open: boolean, details: SheetChangeDetails) => details.cancel();

  it("lets the app refuse a press on the scrim", async () => {
    const seen: string[] = [];
    await open({
      onOpenChange: (_open, details) => {
        seen.push(details.reason);
        details.cancel();
      },
    });
    await press(scrim());
    expect(seen).toEqual(["outside-press"]);
    expect(panel()).not.toBeNull();
  });

  it("lets the app refuse Escape, a Close and its own close()", async () => {
    const seen: string[] = [];
    const actions = { current: null as SheetActions | null };
    const then = vi.fn();
    await open({
      actionsRef: actions,
      body: <SheetClose>Cancel</SheetClose>,
      onOpenChange: (_open, details) => {
        seen.push(details.reason);
        details.cancel();
        expect(details.isCanceled).toBe(true);
      },
    });
    await key("Escape");
    await tap(one("[data-slot='sheet-close']"));
    await act(async () => actions.current!.close(then));
    await settle();
    expect(seen).toEqual(["escape-key", "close-press", "imperative-action"]);
    expect(panel()).not.toBeNull();
    // What waited on the close does not run for one that was refused.
    expect(then).not.toHaveBeenCalled();
  });

  it("settles a refused swipe back where it rests", async () => {
    const log = await open({ onOpenChange: refuse });
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 50],
      [450, 400],
    ]);
    await release(title, 200);
    expect(log).toEqual([]);
    expect(panel()).not.toBeNull();
    expect(dragged()).toBe(false);
    expect(travel()).toBe(0);
    expect(panel()!.hasAttribute("data-ending-style")).toBe(false);
  });

  it("settles a refused swipe that Base UI itself asked for", async () => {
    const seen: string[] = [];
    await open({
      onOpenChange: (_open, details) => {
        seen.push(details.reason);
        details.cancel();
      },
    });
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 16],
      [450, 100],
      [700, 100],
    ]);
    await release(title, 2);
    expect(seen).toEqual(["swipe"]);
    expect(panel()).not.toBeNull();
    expect(dragged()).toBe(false);
    expect(panel()!.hasAttribute("data-ending-style")).toBe(false);
  });

  it("stays open for an app that owns `open` and does not change it", async () => {
    const onOpenChange = vi.fn();
    await mount(<Demo open onOpenChange={onOpenChange} />);
    await settle(60);
    await key("Escape");
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(panel()).not.toBeNull();
  });

  it("lets a close through later, once the app has asked its question", async () => {
    function Editor(): ReactNode {
      const [isOpen, setOpen] = useState(true);
      const [asking, setAsking] = useState(false);
      return (
        <>
          <Demo
            open={isOpen}
            onOpenChange={(next, details) => {
              if (next) return;
              details.cancel();
              setAsking(true);
            }}
          />
          {asking ? (
            <button type="button" id="discard" onClick={() => setOpen(false)}>
              Discard
            </button>
          ) : null}
        </>
      );
    }
    await mount(<Editor />);
    await settle(60);
    await key("Escape");
    expect(panel()).not.toBeNull();
    await click(one("#discard"));
    await settle(80);
    expect(panel()).toBeNull();
  });
});

describe("<Sheet>, Escape", () => {
  it("leaves Escape to a field that says it owns it, and closes once the field lets go", async () => {
    const log: string[] = [];
    const heard = vi.fn();
    await mount(
      <Demo
        log={log}
        ownsEscape={(target) => target?.closest("[data-own-escape]") != null}
        body={<input aria-label="People" data-own-escape="" onKeyDown={(event) => heard(event.key)} />}
      />,
    );
    await settle(60);
    const field = one<HTMLInputElement>("input")!;
    field.focus();
    await key("Escape", field);
    expect(log).toEqual([]);
    expect(panel()).not.toBeNull();
    // The key reached the field, which is where its text is dropped.
    expect(heard).toHaveBeenCalledWith("Escape");

    field.removeAttribute("data-own-escape");
    await key("Escape", field);
    expect(log).toEqual(["close:escape-key"]);
  });

  it("closes only the top sheet of a stack", async () => {
    const log: string[] = [];
    await mount(<Stack log={log} />);
    await settle(60);
    await tap(one("#open-top"));
    expect(all(".dl-sheet")).toHaveLength(2);
    await key("Escape");
    await settle(80);
    expect(log).toEqual(["top:escape-key"]);
    expect(all(".dl-sheet")).toHaveLength(1);
    await key("Escape");
    await settle(80);
    expect(log).toEqual(["top:escape-key", "under:escape-key"]);
    expect(all(".dl-sheet")).toHaveLength(0);
  });
});

/** A file sheet with a peek that opens over it. */
function Stack({ log }: { log: string[] }): ReactNode {
  const [top, setTop] = useState(false);
  return (
    <Sheet defaultOpen onOpenChange={(next, details) => !next && log.push(`under:${details.reason}`)}>
      <SheetContent className="under" label="File">
        <SheetBody>
          <button type="button" id="open-top" onClick={() => setTop(true)}>
            Peek
          </button>
          <Sheet
            open={top}
            onOpenChange={(next, details) => {
              if (!next) log.push(`top:${details.reason}`);
              setTop(next);
            }}
          >
            <SheetContent className="top" label="Place">
              <SheetBody>
                <button type="button" id="in-top">
                  Open place
                </button>
              </SheetBody>
            </SheetContent>
          </Sheet>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

describe("<Sheet>, a sheet over a sheet", () => {
  it("marks the one behind and leaves it where it is", async () => {
    await mount(<Stack log={[]} />);
    await settle(60);
    await tap(one("#open-top"));
    const under = one(".dl-sheet.under")!;
    expect(under.hasAttribute("data-nested-drawer-open")).toBe(true);
    expect(under.style.transform).toBe("");
    // Nothing in the stylesheet moves or shrinks the one behind.
    expect(rulesWith(css, "data-nested-drawer-open")).toEqual([]);
  });

  it("dims the one behind with a scrim of its own, one step up the ladder", async () => {
    await mount(<Stack log={[]} />);
    await settle(60);
    await tap(one("#open-top"));
    const scrims = all(".dl-sheet-scrim");
    expect(scrims).toHaveLength(2);
    expect(scrims[0]!.style.getPropertyValue("--dl-sheet-depth")).toBe("");
    expect(scrims[1]!.style.getPropertyValue("--dl-sheet-depth")).toBe("1");
    expect(one(".dl-sheet.top")!.parentElement!.style.getPropertyValue("--dl-sheet-depth")).toBe("1");
    expect(ruleFor(css, ".dl-sheet-scrim")).toContain("+ var(--dl-sheet-depth, 0))");
  });

  it("closes the top one alone on a press outside it", async () => {
    const log: string[] = [];
    await mount(<Stack log={log} />);
    await settle(60);
    await tap(one("#open-top"));
    await press(all(".dl-sheet-scrim")[1]);
    await settle(80);
    expect(log).toEqual(["top:outside-press"]);
    expect(all(".dl-sheet")).toHaveLength(1);
  });

  it("drags the top one, and not the one behind while it is covered", async () => {
    const log: string[] = [];
    await mount(<Stack log={log} />);
    await settle(60);
    await tap(one("#open-top"));
    now = performance.now() + 5000;
    const top = one(".dl-sheet.top")!;
    Object.defineProperty(top, "offsetHeight", { value: 300, configurable: true });
    const inTop = one("#in-top")!;
    await drag(inTop, [
      [300, 50],
      [450, 400],
    ]);
    expect(top.style.transform).not.toBe("");
    expect(one<HTMLElement>(".dl-sheet.under")!.style.transform).toBe("");
    await release(inTop, 200);
    expect(log).toEqual(["top:swipe"]);
    expect(all(".dl-sheet")).toHaveLength(1);
  });
});

describe("<Sheet>, focus", () => {
  function WithOpener(props: Partial<SheetContentProps> & { modal?: SheetProps["modal"] }): ReactNode {
    const { modal, ...content } = props;
    return (
      <>
        <button type="button" id="page">
          On the page
        </button>
        <Sheet modal={modal}>
          <SheetTrigger id="opener">Open</SheetTrigger>
          <SheetContent {...content}>
            <SheetBody>
              <SheetTitle>Move to</SheetTitle>
              <input aria-label="Filter" id="field" />
              <SheetClose id="done">Done</SheetClose>
            </SheetBody>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  it("lands on the panel, not on the field inside it, which would raise the phone's keyboard", async () => {
    await mount(<WithOpener />);
    await tap(one("#opener"));
    expect(document.activeElement).toBe(panel());
  });

  it("lands on the target an app names", async () => {
    function Named(): ReactNode {
      const done = useRef<HTMLButtonElement | null>(null);
      return (
        <Sheet defaultOpen>
          <SheetContent initialFocus={done}>
            <SheetBody>
              <input aria-label="Filter" />
              <button type="button" ref={done} id="named">
                Done
              </button>
            </SheetBody>
          </SheetContent>
        </Sheet>
      );
    }
    await mount(<Named />);
    await settle(60);
    expect(document.activeElement?.id).toBe("named");
  });

  it("goes back to what opened the sheet", async () => {
    await mount(<WithOpener />);
    one<HTMLElement>("#opener")!.focus();
    await tap(one("#opener"));
    await tap(one("#done"));
    await settle(80);
    expect(panel()).toBeNull();
    expect(document.activeElement?.id).toBe("opener");
  });

  it("holds the page while it is modal: everything outside it is out of reach, and Tab is fenced in", async () => {
    await mount(<WithOpener />);
    await tap(one("#opener"));
    expect(one("#page")!.closest("[aria-hidden='true']")).not.toBeNull();
    // Base UI's guards stand on either side of the panel and turn Tab back.
    expect(viewport()!.querySelectorAll("[data-base-ui-focus-guard]")).toHaveLength(2);
  });

  it("leaves the page in use when it is not modal", async () => {
    await mount(<WithOpener modal={false} />);
    await tap(one("#opener"));
    expect(panel()).not.toBeNull();
    expect(one("#page")!.closest("[aria-hidden='true']")).toBeNull();
    expect(one("#page")!.closest("[inert]")).toBeNull();
    expect(panel()!.getAttribute("aria-modal")).not.toBe("true");
  });
});

describe("<Sheet>, the toaster", () => {
  it("tells the toaster it covers the bottom bar while it is open, and not once it is closing", async () => {
    expect(readToastCovered()).toBe(false);
    await mount(<Demo open content={{ keepMounted: true }} />);
    await settle(60);
    expect(readToastCovered()).toBe(true);
    expect(panel()!.hasAttribute("data-dl-leaving")).toBe(false);

    await mount(<Demo open={false} content={{ keepMounted: true }} />);
    await settle(80);
    expect(readToastCovered()).toBe(false);
    // The closing sheet wears the mark of something on its way out, so a
    // toaster that names it by selector does not count it as a cover.
    expect(panel()!.hasAttribute("data-dl-leaving")).toBe(true);
    expect(scrim()!.hasAttribute("data-dl-leaving")).toBe(true);
  });

  it("is no cover when the app says so", async () => {
    await open({ content: { toastCover: false } });
    expect(readToastCovered()).toBe(false);
  });

  it("keeps a toast's action in the sheet's Tab loop", async () => {
    await open();
    const { toast, action } = withToast();
    const buttons = all<HTMLButtonElement>(".dl-sheet-body button");
    const last = buttons[buttons.length - 1]!;
    last.focus();
    await key("Tab", last);
    expect(document.activeElement).toBe(toast);
    action.focus();
    await key("Tab", action);
    expect(document.activeElement).toBe(buttons[0]);
    await key("Tab", buttons[0], { shiftKey: true });
    expect(document.activeElement).toBe(action);
  });

  it("keeps the sheet open for a press on a toast", async () => {
    const log = await open();
    const { action } = withToast();
    await press(action);
    expect(log).toEqual([]);
    expect(panel()).not.toBeNull();
  });
});

describe("<Sheet>, the dialog layout", () => {
  it("draws no handle and an X that closes it", async () => {
    const log = await open({ layout: "dialog" });
    expect(one(".dl-sheet-handle")).toBeNull();
    const x = one(".dl-sheet-x")!;
    expect(x.tagName).toBe("BUTTON");
    expect(x.getAttribute("aria-label")).toBe("Close");
    expect(x.querySelector("svg")).not.toBeNull();
    for (const part of [scrim(), viewport(), panel()]) expect(part?.dataset.layout).toBe("dialog");
    await tap(x);
    await settle(80);
    expect(log).toEqual(["close:close-press"]);
  });

  it("draws no X in the phone's layout", async () => {
    await open();
    expect(one(".dl-sheet-x")).toBeNull();
  });

  it("names its X in the app's own words", async () => {
    await open({ layout: "dialog", content: { closeLabel: "Close settings" } });
    expect(one(".dl-sheet-x")!.getAttribute("aria-label")).toBe("Close settings");
  });

  it("does not drag", async () => {
    await open({ layout: "dialog" });
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 16],
      [500, 300],
    ]);
    expect(dragged()).toBe(false);
    await release(title);
    expect(panel()).not.toBeNull();
  });
});

describe("<Sheet>, the system's back", () => {
  it("leaves history alone unless asked", async () => {
    const before = window.history.length;
    await open();
    expect(layers()).toHaveLength(0);
    expect(window.history.length).toBe(before);
  });

  it("pushes one entry as it opens, and the system's back closes it", async () => {
    const log = await open({ systemBack: true });
    expect(layers()).toHaveLength(1);
    await act(async () => window.history.back());
    await settle(80);
    expect(log).toEqual(["close:system-back"]);
    expect(panel()).toBeNull();
    expect(layers()).toHaveLength(0);
  });

  it("pushes one entry, not two, under strict mode's double mount", async () => {
    await mount(
      <StrictMode>
        <Demo systemBack />
      </StrictMode>,
    );
    await settle(80);
    expect(layers()).toHaveLength(1);
    await key("Escape");
    await settle(80);
    expect(layers()).toHaveLength(0);
  });

  it("takes its entry off when the app unmounts the sheet to close it", async () => {
    await open({ systemBack: true });
    expect(layers()).toHaveLength(1);
    await mount(<p>gone</p>);
    await settle(80);
    expect(layers()).toHaveLength(0);
  });

  it("takes its entry off when it closes from the screen", async () => {
    const log = await open({ systemBack: true });
    await key("Escape");
    await settle(80);
    expect(log).toEqual(["close:escape-key"]);
    expect(layers()).toHaveLength(0);
  });

  it("keeps an entry under a sheet that refused the back, so the next back asks again", async () => {
    const seen: string[] = [];
    await open({
      systemBack: true,
      onOpenChange: (_open, details) => {
        seen.push(details.reason);
        if (seen.length === 1) details.cancel();
      },
    });
    await act(async () => window.history.back());
    await settle(80);
    expect(panel()).not.toBeNull();
    expect(layers()).toHaveLength(1);
    await act(async () => window.history.back());
    await settle(80);
    expect(seen).toEqual(["system-back", "system-back"]);
    expect(panel()).toBeNull();
  });
});

describe("<Sheet>, what the app hears", () => {
  it("says why it opened and why it closed, then that each has finished", async () => {
    const heard: string[] = [];
    await mount(
      <Sheet
        onOpenChange={(next, details) => heard.push(`${next ? "open" : "close"}:${details.reason}`)}
        onOpenChangeComplete={(next) => heard.push(`done:${next ? "open" : "closed"}`)}
      >
        <SheetTrigger id="opener">Open</SheetTrigger>
        <SheetContent>
          <SheetBody>
            <SheetClose id="done">Done</SheetClose>
          </SheetBody>
        </SheetContent>
      </Sheet>,
    );
    await tap(one("#opener"));
    await settle(80);
    await tap(one("#done"));
    await settle(80);
    expect(heard).toEqual(["open:trigger-press", "done:open", "close:close-press", "done:closed"]);
  });

  it("runs what waits on close() once the exit has finished", async () => {
    const order: string[] = [];
    const actions = { current: null as SheetActions | null };
    await open({ actionsRef: actions, onOpenChangeComplete: (next) => order.push(next ? "opened" : "closed") });
    order.length = 0;
    await act(async () => actions.current!.close(() => order.push("then")));
    await settle(80);
    expect(order).toEqual(["closed", "then"]);
    expect(panel()).toBeNull();
  });

  it("runs it only after the sheet's history entry has gone as well", async () => {
    const seen: number[] = [];
    const actions = { current: null as SheetActions | null };
    await open({ actionsRef: actions, systemBack: true });
    await act(async () => actions.current!.close(() => seen.push(layers().length)));
    await settle(120);
    expect(seen).toEqual([0]);
  });

  it("runs it at once for a sheet that is already closed", async () => {
    const actions = { current: null as SheetActions | null };
    await mount(<Demo open={false} actionsRef={actions} />);
    const then = vi.fn();
    actions.current!.close(then);
    expect(then).toHaveBeenCalledTimes(1);
  });
});

describe("<Sheet>, landing at once", () => {
  function Timed(): ReactNode {
    return (
      <Sheet>
        <SheetTrigger id="opener">Open</SheetTrigger>
        <SheetContent>
          <SheetBody>
            <SheetClose id="done">Done</SheetClose>
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  it("slides for a pointer", async () => {
    await mount(<Timed />);
    await tap(one("#opener"));
    expect(panel()!.hasAttribute("data-instant")).toBe(false);
    expect(scrim()!.hasAttribute("data-instant")).toBe(false);
  });

  it("lands at once when a key opened it: Enter on its button is a click no pointer made", async () => {
    await mount(<Timed />);
    await click(one("#opener"));
    expect(panel()!.hasAttribute("data-instant")).toBe(true);
    expect(scrim()!.hasAttribute("data-instant")).toBe(true);
  });

  it("lands at once when the last thing done was a key, for a sheet the app opens itself", async () => {
    document.documentElement.setAttribute(INPUT_ATTR, "keyboard");
    await mount(<Demo open={false} />);
    await mount(<Demo open />);
    await settle(60);
    expect(panel()!.hasAttribute("data-instant")).toBe(true);
  });

  it("leaves at once on Escape, after a pointer opened it", async () => {
    await mount(
      <Sheet>
        <SheetTrigger id="opener">Open</SheetTrigger>
        <SheetContent keepMounted>
          <SheetBody>Rows</SheetBody>
        </SheetContent>
      </Sheet>,
    );
    await tap(one("#opener"));
    expect(panel()!.hasAttribute("data-instant")).toBe(false);
    await key("Escape");
    expect(panel()!.hasAttribute("data-instant")).toBe(true);
  });

  it("lands at once under the app's reduced motion", async () => {
    const off = setMotionReader(() => true);
    try {
      await mount(<Timed />);
      await tap(one("#opener"));
      expect(panel()!.hasAttribute("data-instant")).toBe(true);
    } finally {
      off();
    }
  });
});

describe("<Sheet>, a sheet mounted already open", () => {
  /**
   * What the scrim and the panel carried as they were added to the page:
   * `stop()` returns one line for each, the scrim first. An observer hears
   * of a node in the microtask after it is added, so before the frame in
   * which Base UI takes the starting style off. Reading the panel after
   * `mount()` would race that frame.
   */
  function arrivals(): () => string[] {
    const parts = [".dl-sheet-scrim", ".dl-sheet"] as const;
    const seen = new Map<string, string>();
    const watch = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          for (const part of parts) {
            const el = node.matches(part) ? node : node.querySelector(part);
            if (!el || seen.has(part)) continue;
            const marks = ["data-starting-style", "data-instant"].filter((name) => el.hasAttribute(name));
            seen.set(part, [part, ...marks].join(" "));
          }
        }
      }
    });
    watch.observe(document.body, { childList: true, subtree: true });
    return () => {
      watch.disconnect();
      return parts.map((part) => seen.get(part) ?? `${part} never arrived`);
    };
  }
  const Open = (props: Partial<SheetProps>): ReactNode => (
    <Sheet {...props}>
      <SheetContent label="Event">
        <SheetBody>Rows</SheetBody>
      </SheetContent>
    </Sheet>
  );

  it.each([
    ["the app's `open`", { open: true }],
    ["`defaultOpen`", { defaultOpen: true }],
  ] as const)("rises: with %s the panel and the dim mount in their starting style, and leave it a frame on", async (_, props) => {
    const stop = arrivals();
    await mount(<Open {...props} />);
    await settle(60);
    // Base UI alone draws a sheet that is open on its first render at rest, with no starting style.
    expect(stop()).toEqual([".dl-sheet-scrim data-starting-style", ".dl-sheet data-starting-style"]);
    expect(panel()!.hasAttribute("data-starting-style")).toBe(false);
    expect(scrim()!.hasAttribute("data-starting-style")).toBe(false);
    expect(panel()!.hasAttribute("data-open")).toBe(true);
    expect(panel()!.hasAttribute("data-instant")).toBe(false);
  });

  it("rises under strict mode too", async () => {
    const stop = arrivals();
    await mount(
      <StrictMode>
        <Open open />
      </StrictMode>,
    );
    await settle(60);
    expect(stop()).toEqual([".dl-sheet-scrim data-starting-style", ".dl-sheet data-starting-style"]);
    expect(panel()!.hasAttribute("data-starting-style")).toBe(false);
    expect(panel()!.hasAttribute("data-open")).toBe(true);
  });

  it("tells the app it opened, once, and never that it closed", async () => {
    const heard: string[] = [];
    await mount(
      <Open
        open
        onOpenChange={(next) => heard.push(next ? "open" : "close")}
        onOpenChangeComplete={(next) => heard.push(next ? "done:open" : "done:closed")}
      />,
    );
    await settle(80);
    expect(heard).toEqual(["done:open"]);
  });

  it("takes focus on the panel and covers the bar for the toaster, as a sheet opened later does", async () => {
    await mount(<Open open />);
    await settle(60);
    expect(document.activeElement).toBe(panel());
    expect(readToastCovered()).toBe(true);
  });

  it("lands at once when the last thing done was a key: no slide to skip a frame late", async () => {
    document.documentElement.setAttribute(INPUT_ATTR, "keyboard");
    const stop = arrivals();
    await mount(<Open open />);
    await settle(60);
    expect(stop()).toEqual([".dl-sheet-scrim data-starting-style data-instant", ".dl-sheet data-starting-style data-instant"]);
    expect(panel()!.hasAttribute("data-instant")).toBe(true);
  });

  it("lands at once under the app's reduced motion", async () => {
    const off = setMotionReader(() => true);
    try {
      const stop = arrivals();
      await mount(<Open open />);
      await settle(60);
      expect(stop()).toEqual([".dl-sheet-scrim data-starting-style data-instant", ".dl-sheet data-starting-style data-instant"]);
    } finally {
      off();
    }
  });

  it("closes as any sheet does once the app turns `open` off", async () => {
    const done = vi.fn();
    await mount(<Open open onOpenChangeComplete={done} />);
    await settle(60);
    await mount(<Open open={false} onOpenChangeComplete={done} />);
    await settle(80);
    expect(panel()).toBeNull();
    expect(done.mock.calls.map(([next]) => next)).toEqual([true, false]);
  });

  it("leaves a sheet mounted closed closed", async () => {
    const done = vi.fn();
    await mount(<Open open={false} onOpenChangeComplete={done} />);
    await settle(60);
    expect(panel()).toBeNull();
    expect(done).not.toHaveBeenCalled();
  });

  it("leaves the dialog layout as it was: mounted open, it stands in place at once", async () => {
    const stop = arrivals();
    await mount(<Open open layout="dialog" />);
    await settle(60);
    expect(stop()).toEqual([".dl-sheet-scrim", ".dl-sheet"]);
  });
});

describe("<Sheet>, the mark of a sheet that has been held", () => {
  const far: readonly Step[] = [
    [300, 16],
    [360, 100],
  ];

  it("has none as it rises, and takes it on the panel and the dim from the first press that may drag", async () => {
    await open();
    expect(panel()!.hasAttribute(SHEET_HELD_ATTR)).toBe(false);
    expect(scrim()!.hasAttribute(SHEET_HELD_ATTR)).toBe(false);
    const title = one(".dl-sheet-title")!;
    await drag(title, far);
    expect(panel()!.hasAttribute(SHEET_HELD_ATTR)).toBe(true);
    expect(scrim()!.hasAttribute(SHEET_HELD_ATTR)).toBe(true);
    // Let go short of the distance: the settle back runs with the mark still on.
    await release(title, 200);
    expect(panel()).not.toBeNull();
    expect(dragged()).toBe(false);
    expect(panel()!.hasAttribute(SHEET_HELD_ATTR)).toBe(true);
  });

  it("takes none from a press that may not drag: a sheet with `swipe` off, or the dialog layout", async () => {
    await open({ swipe: false });
    await drag(one(".dl-sheet-title")!, far);
    expect(panel()!.hasAttribute(SHEET_HELD_ATTR)).toBe(false);
    await release(one(".dl-sheet-title")!, 200);
    await mount(<Demo layout="dialog" />);
    await settle(60);
    await mouse(one(".dl-sheet-title")!, "pointerdown", 300, 600, 1);
    expect(panel()!.hasAttribute(SHEET_HELD_ATTR)).toBe(false);
    await mouse(one(".dl-sheet-title")!, "pointerup", 300, 16, 0);
  });

  it("drops it as a sheet kept mounted opens again, so that rise takes the rise's time", async () => {
    const Kept = ({ shown }: { shown: boolean }): ReactNode => <Demo open={shown} content={{ keepMounted: true }} />;
    await mount(<Kept shown />);
    await settle(60);
    const title = one(".dl-sheet-title")!;
    await drag(title, far);
    await release(title, 200);
    expect(panel()!.hasAttribute(SHEET_HELD_ATTR)).toBe(true);
    await mount(<Kept shown={false} />);
    await settle(80);
    await mount(<Kept shown />);
    expect(panel()!.hasAttribute(SHEET_HELD_ATTR)).toBe(false);
    expect(scrim()!.hasAttribute(SHEET_HELD_ATTR)).toBe(false);
  });
});

describe("<Sheet>, the keyboard", () => {
  it("leaves Base UI's keyboard handling off, and reads the app's inset", async () => {
    await open();
    expect(viewport()!.hasAttribute("data-kb")).toBe(false);
    expect(ruleFor(css, ".dl-sheet-viewport")).toContain("--dl-sheet-kb-now: var(--dl-sheet-kb, var(--kb-inset, 0px))");
  });

  it("turns it on when asked, and reads Base UI's inset then", async () => {
    await open({ virtualKeyboard: true });
    expect(viewport()!.dataset.kb).toBe("base");
    expect(ruleFor(css, '.dl-sheet-viewport[data-kb="base"]')).toContain("--dl-sheet-kb-now: var(--drawer-keyboard-inset, 0px)");
  });
});

describe("a part outside its sheet", () => {
  it("says what it needs", async () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(mount(<SheetContent />)).rejects.toThrow("<SheetContent> must be inside a <Sheet>.");
    quiet.mockRestore();
  });
});

/** One touch event for several fingers: `id` is the one that changed, `down` the others still on the glass. */
function finger(type: string, el: Element, id: number, y: number, at: number, down: readonly [id: number, y: number][] = []): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = (n: number, py: number) => ({ clientX: 100, clientY: py, identifier: n, target: el });
  const lifted = type === "touchend" || type === "touchcancel";
  const others = down.map(([n, py]) => point(n, py));
  Object.defineProperty(event, "touches", { value: lifted ? others : [...others, point(id, y)] });
  Object.defineProperty(event, "changedTouches", { value: [point(id, y)] });
  Object.defineProperty(event, "timeStamp", { value: at });
  el.dispatchEvent(event);
}

/** 120px down over most of a second: past the kit's 96px, short of Base UI's half, and no flick. */
const slow: readonly Step[] = [
  [300, 50],
  [360, 300],
  [420, 400],
];

describe("<Sheet>, a release that is not the drag's own", () => {
  it("follows one finger: a second one lifting elsewhere does not close the sheet under the first", async () => {
    const log = await open();
    const title = one(".dl-sheet-title")!;
    await drag(title, slow);
    expect(travel()).toBe(120);
    // A second finger, down and up on the page outside the sheet.
    now += 100;
    await act(async () => {
      finger("touchend", document.body, 2, 600, now, [[1, 420]]);
    });
    await settle(80);
    expect(log).toEqual([]);
    expect(dragged()).toBe(true);
    // The first finger's own lift is the release.
    await release(title, 2);
    expect(log).toEqual(["close:swipe"]);
  });

  it("finishes a release that something in the sheet kept from the window", async () => {
    const log = await open();
    const title = one(".dl-sheet-title")!;
    const stop = (event: Event) => event.stopPropagation();
    // After Base UI has had it, on its way up to the window.
    document.addEventListener("touchend", stop);
    try {
      await drag(title, slow);
      await release(title, 200);
    } finally {
      document.removeEventListener("touchend", stop);
    }
    expect(log).toEqual(["close:swipe"]);
  });

  it("does not close on a later move after a release Base UI never heard", async () => {
    const log = await open();
    const grip = one(".dl-sheet-handle")!;
    await mouse(grip, "pointerdown", 300, 0, 1);
    await mouse(grip, "pointermove", 300, 16, 1);
    await mouse(grip, "pointermove", 420, 600, 1);
    expect(travel()).toBe(120);
    // A region that keeps its pointerup to itself: neither Base UI nor the window hears it.
    const stop = (event: Event) => event.stopPropagation();
    grip.addEventListener("pointerup", stop);
    await mouse(grip, "pointerup", 420, 200, 0);
    grip.removeEventListener("pointerup", stop);
    await settle(80);
    await mouse(document.body, "pointermove", 430, 50, 0);
    await mouse(document.body, "pointermove", 440, 50, 0);
    await settle(80);
    expect(log).toEqual([]);
    expect(panel()).not.toBeNull();
  });

  it("counts a mouse's last move, the one that carries the release, before it judges", async () => {
    const log = await open();
    const grip = one(".dl-sheet-handle")!;
    await mouse(grip, "pointerdown", 300, 0, 1);
    await mouse(grip, "pointermove", 300, 16, 1);
    await mouse(grip, "pointermove", 330, 600, 1);
    // The button comes up on a move that takes the panel from 30px to 120px.
    await mouse(grip, "pointermove", 420, 16, 0);
    await settle(80);
    expect(log).toEqual(["close:swipe"]);
  });
});

describe("<Sheet>, the travel a phone keeps back", () => {
  // A phone sends its first touchmove some 15px from the press, and Base UI
  // takes its origin from that move. The family's distance is the finger's.
  it("closes a slow drag from the handle past 96px of the finger, though Base UI has the panel at 84px", async () => {
    const log = await open();
    const grip = one(".dl-sheet-handle")!;
    await drag(grip, [
      [316, 50],
      [356, 300],
      [400, 400],
    ]);
    expect(travel()).toBe(84);
    await release(grip, 200);
    expect(log).toEqual(["close:swipe"]);
  });

  it("closes the same drag from the body", async () => {
    const log = await open();
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [316, 50],
      [356, 300],
      [400, 400],
    ]);
    await release(title, 200);
    expect(log).toEqual(["close:swipe"]);
  });

  it("settles a drag of 90px of the finger", async () => {
    const log = await open();
    const grip = one(".dl-sheet-handle")!;
    await drag(grip, [
      [316, 50],
      [356, 300],
      [390, 400],
    ]);
    await release(grip, 200);
    expect(log).toEqual([]);
    expect(dragged()).toBe(false);
  });

  it("closes a short sheet past 40% of its height in finger travel", async () => {
    // A 225px sheet on a short screen closes past 90px of the finger.
    const log = await open({ height: 225 });
    const grip = one(".dl-sheet-handle")!;
    await drag(grip, [
      [316, 50],
      [350, 300],
      [392, 400],
    ]);
    await release(grip, 200);
    expect(log).toEqual(["close:swipe"]);
  });
});

describe("<Sheet>, the dim over the travel a phone keeps back", () => {
  /** The scrim's opacity by sheet.css's rule, from what the kit and Base UI wrote on it. */
  const dim = (lift = 0.55) => {
    const style = scrim()!.style;
    const progress = Number.parseFloat(style.getPropertyValue("--drawer-swipe-progress")) || 0;
    const pull = Number.parseFloat(style.getPropertyValue("--dl-sheet-pull")) || 0;
    return 1 - Math.min(1, progress + pull) * lift;
  };

  // Notes pins the family's rule: the dim is 1 - travel / height x 0.55,
  // for all the travel the panel shows, the kit's share with Base UI's.
  for (const part of [".dl-sheet-handle", ".dl-sheet-title"]) {
    it(`follows all 60px of a finger on a 300px sheet, from ${part === ".dl-sheet-handle" ? "the handle" : "the body"}`, async () => {
      await open({ height: 300 });
      const el = one(part)!;
      await drag(el, [
        [316, 50],
        [340, 200],
        [360, 200],
      ]);
      // Base UI has the panel at 44px, and the kit draws the 16px it dropped.
      expect(travel()).toBe(44);
      expect(panel()!.style.getPropertyValue("translate")).toBe("0 16px");
      expect(dim()).toBeCloseTo(1 - (60 / 300) * 0.55, 3);
      await release(el, 200, "touchcancel");
      expect(scrim()!.style.getPropertyValue("--dl-sheet-pull")).toBe("");
      expect(dim()).toBe(1);
    });
  }

  it("settles back to a full dim on a release that settles", async () => {
    const log = await open({ height: 300 });
    const grip = one(".dl-sheet-handle")!;
    await drag(grip, [
      [316, 50],
      [340, 300],
      [360, 300],
    ]);
    expect(dim()).toBeLessThan(0.9);
    await release(grip, 200);
    expect(log).toEqual([]);
    expect(dragged()).toBe(false);
    expect(scrim()!.style.getPropertyValue("--dl-sheet-pull")).toBe("");
    expect(dim()).toBe(1);
  });
});

describe("<Sheet>, a press inside its open guard", () => {
  it("lets a tap on a button and on an option through, and holds back only a drag", async () => {
    const pressed = vi.fn();
    const picked = vi.fn();
    const before = performance.now();
    await open({
      body: (
        <>
          <button type="button" id="early" onClick={pressed}>
            Archive
          </button>
          <div role="option" aria-selected="false" id="option" tabIndex={-1} onClick={picked}>
            Inbox
          </div>
        </>
      ),
    });
    // Just opened: every time below is inside the guard, counted from before the mount.
    now = before + 20;
    for (const target of [one("#early")!, one("#option")!]) {
      (document as { elementFromPoint?: unknown }).elementFromPoint = () => target;
      await act(async () => {
        touch("touchstart", target, 300, now);
        now += 30;
        touch("touchend", target, 300, now);
        for (const name of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
          target.dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true, button: 0, detail: 1 }));
        }
      });
      await settle(30);
    }
    expect(pressed).toHaveBeenCalledTimes(1);
    expect(picked).toHaveBeenCalledTimes(1);
    expect(panel()).not.toBeNull();
    // The same window holds a drag back.
    now += 20;
    const title = one(".dl-sheet-title")!;
    await drag(title, [
      [300, 16],
      [360, 100],
    ]);
    expect(dragged()).toBe(false);
    await release(title);
  });
});

describe("<Sheet>, an opt-out that changes", () => {
  function Pdf({ mark }: { mark: "" | "x" | null }): ReactNode {
    return (
      <Demo
        body={
          <div id="pdf" {...(mark === null ? {} : noSheetDrag(mark === "" ? undefined : mark))}>
            page
          </div>
        }
      />
    );
  }
  const far: readonly Step[] = [
    [300, 16],
    [360, 100],
  ];

  it("drags again once the region stops opting out, and follows a change of axis", async () => {
    await mount(<Pdf mark="" />);
    await settle(60);
    const pdf = () => one("#pdf")!;
    await drag(pdf(), far);
    expect(dragged()).toBe(false);
    await release(pdf());
    // Zoomed back out: the region's gestures are no longer its own.
    await mount(<Pdf mark={null} />);
    expect(pdf().hasAttribute("data-base-ui-swipe-ignore")).toBe(false);
    now += 500;
    await drag(pdf(), far);
    expect(dragged()).toBe(true);
    await release(pdf(), 200);
    // Sideways alone: a downward drag moves the sheet.
    await mount(<Pdf mark="x" />);
    expect(pdf().getAttribute("data-base-ui-swipe-ignore")).toBe("x");
    now += 500;
    await drag(pdf(), far);
    expect(dragged()).toBe(true);
    await release(pdf(), 200);
  });
});

describe("<Sheet>, the system's back and an app that unmounts it", () => {
  function Gone({ log }: { log: string[] }): ReactNode {
    const [shown, setShown] = useState(true);
    return shown ? (
      <Demo
        systemBack
        onOpenChange={(next, details) => {
          log.push(details.reason);
          if (!next) setShown(false);
        }}
      />
    ) : (
      <p>closed</p>
    );
  }

  it("leaves no entry behind for a sheet the app unmounted on the back", async () => {
    const log: string[] = [];
    await mount(<Gone log={log} />);
    await settle(60);
    expect(layers()).toHaveLength(1);
    await act(async () => window.history.back());
    await settle(120);
    expect(log).toEqual(["system-back"]);
    expect(panel()).toBeNull();
    expect(layers()).toHaveLength(0);
  });
});

describe("<Sheet>, close(then) and a close that did not happen", () => {
  it("drops `then` for a close an app that owns `open` let pass and kept open", async () => {
    const actions = { current: null as SheetActions | null };
    const then = vi.fn();
    await mount(<Demo open actionsRef={actions} />);
    await settle(60);
    await act(async () => actions.current!.close(then));
    await settle(60);
    expect(panel()).not.toBeNull();
    // Later the app closes the sheet for a reason of its own.
    await mount(<Demo open={false} actionsRef={actions} />);
    await settle(120);
    expect(panel()).toBeNull();
    expect(then).not.toHaveBeenCalled();
  });

  it("waits for the newest entry, not one taken off before the sheet opened again", async () => {
    const seen: number[] = [];
    const actions = { current: null as SheetActions | null };
    function Again({ shown }: { shown: boolean }): ReactNode {
      return <Demo open={shown} systemBack actionsRef={actions} />;
    }
    await mount(<Again shown />);
    await settle(60);
    expect(layers()).toHaveLength(1);
    // Closed and opened again before the first entry's traversal lands.
    await mount(<Again shown={false} />);
    await mount(<Again shown />);
    await settle(60);
    expect(layers()).toHaveLength(1);
    await act(async () => actions.current!.close(() => seen.push(layers().length)));
    await mount(<Again shown={false} />);
    // A traversal lands on a later task, which a loaded run can hold back.
    for (let waited = 0; seen.length === 0 && waited < 2000; waited += 50) await settle(50);
    expect(seen).toEqual([0]);
  });
});

describe("<Sheet>, a toast over a stack", () => {
  it("brings Tab back from the toast to the top sheet, not the one it covers", async () => {
    await mount(<Stack log={[]} />);
    await settle(60);
    await tap(one("#open-top"));
    const { action } = withToast();
    action.focus();
    await key("Tab", action);
    expect(document.activeElement?.id).toBe("in-top");
  });
});

describe("<Sheet>, a variable for one sheet", () => {
  it("writes `vars` on the scrim and on the box around the panel", async () => {
    await open({ content: { vars: { "--dl-sheet-z": 72, "--dl-sheet-kb": "40px", "--dl-sheet-lift": 0 } } });
    for (const part of [scrim()!, viewport()!]) {
      expect(part.style.getPropertyValue("--dl-sheet-z")).toBe("72");
      expect(part.style.getPropertyValue("--dl-sheet-kb")).toBe("40px");
      expect(part.style.getPropertyValue("--dl-sheet-lift")).toBe("0");
    }
    // The panel inherits them from the box it sits in.
    expect(panel()!.parentElement).toBe(viewport());
    expect(panel()!.hasAttribute("vars")).toBe(false);
  });

  it("keeps a stacked sheet's depth beside its variables", async () => {
    function Over(): ReactNode {
      return (
        <Sheet defaultOpen>
          <SheetContent label="Under">
            <Sheet defaultOpen>
              <SheetContent label="Over" vars={{ "--dl-sheet-scrim": "red" }} />
            </Sheet>
          </SheetContent>
        </Sheet>
      );
    }
    await mount(<Over />);
    await settle(60);
    const top = all(".dl-sheet-scrim")[1]!;
    expect(top.style.getPropertyValue("--dl-sheet-scrim")).toBe("red");
    expect(top.style.getPropertyValue("--dl-sheet-depth")).toBe("1");
  });
});

describe("sheet.css", () => {
  const rest = ruleFor(css, ".dl-sheet");

  it("gives the resting panel no transform, filter, backdrop filter or will-change", () => {
    expect(rest).not.toMatch(/(^|;)\s*transform\s*:/);
    expect(css).not.toMatch(/(^|;)\s*translate\s*:/);
    expect(rest).not.toMatch(/(^|;)\s*(-webkit-)?backdrop-filter\s*:/);
    expect(rest).not.toMatch(/(^|;)\s*filter\s*:/);
    expect(rest).not.toContain("will-change");
    expect(rest).not.toMatch(/(^|;)\s*contain\s*:/);
    expect(css).not.toContain("will-change");
    // The stacking context its frost needs, made without a containing block.
    expect(rest).toContain("isolation: isolate");
  });

  it("sets a transform only on a panel on its way in or out", () => {
    const moving = rulesWith(css, "")
      .filter(([, body]) => /(^|;)\s*transform\s*:(?!\s*none)/.test(body))
      .map(([selector]) => selector);
    expect(moving).toEqual([
      ".dl-sheet:is([data-starting-style], [data-ending-style])",
      '.dl-sheet[data-layout="dialog"]:is([data-starting-style], [data-ending-style])',
    ]);
  });

  it("draws the frost behind the content, on the overlay glass", () => {
    const frost = ruleFor(css, ".dl-sheet::before");
    expect(frost).toContain("z-index: -1");
    expect(frost).toContain("border-radius: inherit");
    expect(frost).toContain("background: var(--dl-sheet-fill, var(--dl-overlay,");
    expect(frost).toContain("var(--dl-overlay-blur,");
    expect(frost).toContain("var(--dl-overlay-level,");
    expect(rest).toContain("background: transparent");
  });

  it("rounds the top corners with the sheet's token and squares the foot", () => {
    expect(rest).toContain("border-radius: var(--dl-r-sheet, 14px) var(--dl-r-sheet, 14px) 0 0");
    expect(rest).toContain("border: 1px solid var(--dl-overlay-edge, #3d3d3d)");
    expect(rest).toContain("border-bottom: 0");
  });

  it("rises over 220ms and leaves over 180ms, on the family's curve (0.14; both were 260ms)", () => {
    const tokens = readCss("tokens");
    expect(tokens).toMatch(/--dl-t-sheet: 220ms;/);
    expect(tokens).toMatch(/--dl-t-sheet-out: 180ms;/);
    expect(tokens).toMatch(/--dl-ease: cubic-bezier\(0\.2, 0\.8, 0\.2, 1\);/);
    // The rule at rest is the rise's: a transition takes its time from the style it moves to.
    expect(rest).toMatch(/transition:\s*transform var\(--dl-t-sheet, 220ms\) var\(--dl-ease,[^;]*,\s*translate var\(--dl-t-sheet, 220ms\) var\(--dl-ease,/);
    expect(ruleFor(css, ".dl-sheet:is([data-starting-style], [data-ending-style])")).toBe("transform: translateY(100%);");
    expect(css).not.toContain("260ms");
  });

  it("runs a close for Base UI's share of the way out's time, never longer", () => {
    expect(ruleFor(css, ".dl-sheet[data-ending-style]")).toBe(
      "transition-duration: calc(var(--drawer-swipe-strength, 1) * var(--dl-t-sheet-out, 180ms));",
    );
  });

  it("settles a held sheet back over the way out's time, and a flick's close still wins", () => {
    const held = ".dl-sheet[data-dl-held]";
    expect(SHEET_HELD_ATTR).toBe("data-dl-held");
    expect(ruleFor(css, held)).toBe("transition-duration: var(--dl-t-sheet-out, 180ms);");
    // As heavy as the rules that must beat it, and earlier in the sheet.
    for (const later of [".dl-sheet[data-ending-style]", '.dl-sheet[data-layout="dialog"]']) {
      expect(outweighs(held, later)).toBe(false);
      expect(css.indexOf(`${later} {`)).toBeGreaterThan(css.indexOf(`${held} {`));
    }
    expect(css.indexOf(":is(.dl-sheet, .dl-sheet-scrim)[data-instant]")).toBeGreaterThan(css.indexOf(`${held} {`));
  });

  it("clears the home indicator, and hands that room to the keyboard while it is up", () => {
    expect(rest).toContain("padding-bottom: max(0px, env(safe-area-inset-bottom, 0px) - var(--dl-sheet-kb-now, 0px))");
  });

  it("stops short of the safe top and of the keyboard", () => {
    expect(rest.replace(/\s+/g, " ")).toContain(
      "max-height: calc( 100dvh - env(safe-area-inset-top, 0px) - var(--dl-sheet-top, 28px) - var(--dl-sheet-kb-now, 0px) )",
    );
    expect(ruleFor(css, ".dl-sheet-viewport")).toContain("padding-bottom: var(--dl-sheet-kb-now)");
  });

  it("dims the page with the family's scrim, lifting as the panel goes down", () => {
    const dim = ruleFor(css, ".dl-sheet-scrim");
    expect(dim).toContain("background: var(--dl-sheet-scrim, var(--dl-scrim, rgb(0 0 0 / 0.62)))");
    expect(dim.replace(/\s+/g, " ")).toContain(
      "--dl-sheet-dim: calc( 1 - min(1, var(--drawer-swipe-progress, 0) + var(--dl-sheet-pull, 0)) * var(--dl-sheet-lift, 0.55) )",
    );
    expect(dim).toContain("opacity: var(--dl-sheet-dim);");
    expect(dim).toContain("transition: opacity var(--dl-t-sheet, 220ms)");
    expect(ruleFor(css, ".dl-sheet-scrim:is([data-dl-held], [data-ending-style])")).toBe(
      "transition-duration: var(--dl-t-sheet-out, 180ms);",
    );
    expect(ruleFor(css, ".dl-sheet-scrim[data-swiping]")).toBe("transition: none;");
    expect(ruleFor(css, ".dl-sheet-scrim:is([data-starting-style], [data-ending-style])")).toBe("opacity: 0;");
  });

  it("scales nothing behind the sheet: the page is dimmed and no more", () => {
    expect(css).not.toContain("data-active");
    expect(css).not.toContain("Indent");
  });

  it("draws the handle from the handle's tokens", () => {
    const pill = ruleFor(css, ".dl-sheet-handle-pill");
    expect(pill).toContain("width: var(--dl-sheet-handle-w, 40px)");
    expect(pill).toContain("height: var(--dl-sheet-handle-h, 4px)");
    expect(pill).toContain("background: var(--dl-sheet-handle, rgb(255 255 255 / 0.22))");
    expect(ruleFor(css, ".dl-sheet-handle")).toContain("touch-action: none");
  });

  it("stands on the kit's ladder, under an app's own number", () => {
    expect(ruleFor(css, ".dl-sheet-scrim")).toContain("z-index: calc(var(--dl-sheet-z, var(--dl-z-sheet, 55))");
    expect(ruleFor(css, ".dl-sheet-viewport")).toContain("z-index: calc(var(--dl-sheet-z, var(--dl-z-sheet, 55))");
    expect(readCss("tokens")).toMatch(/--dl-z-search: 50;\s*--dl-z-sheet: 55;\s*--dl-z-toast: 60;/);
    // The dialog layout opens over the Settings dialog.
    expect(ruleFor(css, '.dl-sheet-scrim[data-layout="dialog"]')).toContain(
      "z-index: calc(var(--dl-sheet-z, calc(var(--dl-z-dialog, 80) + 2))",
    );
  });

  it("keeps five stacked sheets over the phone's search and under the toaster, each over the last", () => {
    const tokens = readCss("tokens");
    const step = (name: string) => Number(new RegExp(`--dl-z-${name}: (\\d+);`).exec(tokens)![1]);
    const z = (selector: string, depth: number) => {
      const expr = /z-index: (calc\(.*\));/.exec(ruleFor(css, selector))![1]!;
      const value = expr
        .replace("var(--dl-sheet-z, var(--dl-z-sheet, 55))", String(step("sheet")))
        .replace("var(--dl-sheet-depth, 0)", String(depth))
        .replace(/calc/g, "");
      return Function(`return ${value}`)() as number;
    };
    for (let depth = 0; depth < 5; depth++) {
      for (const part of [".dl-sheet-scrim", ".dl-sheet-viewport"]) {
        expect(z(part, depth)).toBeGreaterThan(step("search"));
        expect(z(part, depth)).toBeLessThan(step("toast"));
      }
      // The box is drawn after its scrim, so the same number stands over it.
      expect(z(".dl-sheet-viewport", depth)).toBeGreaterThanOrEqual(z(".dl-sheet-scrim", depth));
      expect(z(".dl-sheet-scrim", depth + 1)).toBeGreaterThan(z(".dl-sheet-viewport", depth));
    }
  });

  it("makes the dialog layout a small centred panel with the family's 150ms open and close", () => {
    const box = ruleFor(css, '.dl-sheet-viewport[data-layout="dialog"]');
    expect(box).toContain("justify-content: center");
    const dialog = ruleFor(css, '.dl-sheet[data-layout="dialog"]');
    expect(dialog).toContain("max-width: var(--dl-sheet-dialog-w, 28rem)");
    expect(dialog).toContain("border-radius: var(--dl-r-sheet, 14px)");
    expect(dialog).toContain("transform var(--dl-sheet-dialog-t, var(--dl-t-open, 150ms))");
    expect(ruleFor(css, '.dl-sheet[data-layout="dialog"][data-ending-style]')).toBe(
      "transition-duration: var(--dl-sheet-dialog-t, var(--dl-t-open, 150ms));",
    );
  });

  it("draws the X with no box behind it", () => {
    const x = ruleFor(css, ".dl-sheet-x");
    expect(x).toContain("background: none");
    expect(x).toContain("border: 0");
    expect(rulesWith(css, ".dl-sheet-x:hover").every(([, body]) => !body.includes("background"))).toBe(true);
  });

  it("moves nothing for a key or under reduced motion, and draws the panel where it rests", () => {
    const still = rulesWith(css, "").filter(([, body]) => body === "transition: none;").map(([selector]) => selector);
    expect(still).toContain(':is(.dl-sheet, .dl-sheet-scrim)[data-instant], html[data-input="keyboard"] :is(.dl-sheet, .dl-sheet-scrim)');
    expect(still).toContain('html[data-dl-motion="reduce"] :is(.dl-sheet, .dl-sheet-scrim)');
    expect(still).toContain('html:not([data-dl-motion="full"]) :is(.dl-sheet, .dl-sheet-scrim)');
    const placed = rulesWith(css, "").filter(([, body]) => body === "transform: none;").map(([selector]) => selector);
    expect(placed).toHaveLength(3);
    // The dim stands at its strength beside it: with no fade, a clear start is a frame of undimmed page.
    const dimmed = rulesWith(css, "").filter(([, body]) => body === "opacity: var(--dl-sheet-dim);").map(([selector]) => selector);
    expect(dimmed).toEqual(placed.map((selector) => selector.replaceAll(".dl-sheet:is(", ".dl-sheet-scrim:is(").replace(".dl-sheet[data-instant]", ".dl-sheet-scrim[data-instant]")));
    for (const selector of dimmed) {
      for (const part of splitList(selector)) {
        expect(outweighs(part, ".dl-sheet-scrim:is([data-starting-style], [data-ending-style])"), part).toBe(true);
      }
    }
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps the close fade's rule off a closing sheet, which has its own exit", () => {
    expect(ruleFor(css, ":is(.dl-sheet, .dl-sheet-scrim)[data-dl-leaving]")).toBe("animation: none !important;");
  });
});

/**
 * A Tab as the browser takes one: the keydown, and where nothing took it,
 * focus on to the next stop in the page's order, or the one before with
 * Shift. Base UI's guards are stops too, as they are in a browser.
 */
function browserTab(shift = false): void {
  const from = document.activeElement ?? document.body;
  const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey: shift, bubbles: true, cancelable: true });
  from.dispatchEvent(event);
  if (event.defaultPrevented) return;
  const stops = all<HTMLElement>("a[href], button, input, select, textarea, [tabindex]").filter(
    (el) => el.tabIndex >= 0 && !el.hasAttribute("disabled") && !el.closest("[inert]"),
  );
  const way = shift ? Node.DOCUMENT_POSITION_PRECEDING : Node.DOCUMENT_POSITION_FOLLOWING;
  const ahead = stops.filter((el) => from.compareDocumentPosition(el) & way && !(shift && el.contains(from)));
  const to = (shift ? ahead[ahead.length - 1] : ahead[0]) ?? (shift ? stops[stops.length - 1] : stops[0]);
  to?.focus();
}

/** Tab pressed `times` over inside one frame: nothing a frame later runs in between. */
async function tabs(times: number, shift = false): Promise<void> {
  await act(async () => {
    for (let i = 0; i < times; i++) browserTab(shift);
  });
}

describe("<Sheet>, Tab inside a modal sheet", () => {
  /** A page with stops before and after the sheet, which Tab must not reach while it is open. */
  function Page({ modal, stops = true }: { modal?: SheetProps["modal"]; stops?: boolean }): ReactNode {
    return (
      <>
        <button type="button" id="before">
          Before
        </button>
        <Sheet defaultOpen modal={modal}>
          <SheetContent label="Move to">
            <SheetBody>
              {stops ? (
                <>
                  <button type="button" id="first">
                    First
                  </button>
                  <button type="button" id="last">
                    Last
                  </button>
                </>
              ) : (
                <p>Nothing to press</p>
              )}
            </SheetBody>
          </SheetContent>
        </Sheet>
        <button type="button" id="after">
          After
        </button>
      </>
    );
  }
  const focused = () => (document.activeElement === panel() ? "panel" : document.activeElement?.id || "elsewhere");

  it("holds two quick Tabs off the last stop, inside one frame", async () => {
    await mount(<Page />);
    await settle(60);
    one<HTMLElement>("#last")!.focus();
    await tabs(2);
    expect(focused()).toBe("last");
    await settle(60);
    expect(focused()).toBe("last");
    await tabs(1);
    expect(focused()).toBe("first");
  });

  it("holds two quick Shift+Tabs off the first stop, and off the panel itself", async () => {
    await mount(<Page />);
    await settle(60);
    one<HTMLElement>("#first")!.focus();
    await tabs(2, true);
    expect(focused()).toBe("first");
    panel()!.focus();
    await tabs(1, true);
    expect(focused()).toBe("last");
    await settle(60);
    expect(focused()).toBe("last");
  });

  it("keeps Tab on the panel when there is nothing in it to press", async () => {
    await mount(<Page stops={false} />);
    await settle(60);
    panel()!.focus();
    await tabs(2);
    expect(focused()).toBe("panel");
    await tabs(2, true);
    expect(focused()).toBe("panel");
  });

  it("holds Tab under `\"trap-focus\"` as well", async () => {
    await mount(<Page modal="trap-focus" />);
    await settle(60);
    one<HTMLElement>("#last")!.focus();
    await tabs(2);
    expect(focused()).toBe("last");
  });

  it("leaves Tab to the page when it is not modal", async () => {
    await mount(<Page modal={false} />);
    await settle(60);
    one<HTMLElement>("#last")!.focus();
    await tabs(1);
    expect(focused()).toBe("after");
  });

  it("still runs the loop through a toast: off the last stop to the toast, and back to the first", async () => {
    await mount(<Page />);
    await settle(60);
    const { toast, action } = withToast();
    one<HTMLElement>("#last")!.focus();
    await tabs(1);
    expect(document.activeElement).toBe(toast);
    await tabs(1);
    expect(document.activeElement).toBe(action);
    await tabs(1);
    expect(focused()).toBe("first");
    await tabs(1, true);
    expect(document.activeElement).toBe(action);
  });

  it("is held by the top sheet of a stack alone", async () => {
    await mount(<Stack log={[]} />);
    await settle(60);
    await tap(one("#open-top"));
    one<HTMLElement>("#in-top")!.focus();
    await tabs(2);
    expect(document.activeElement?.id).toBe("in-top");
    await tabs(2, true);
    expect(document.activeElement?.id).toBe("in-top");
  });
});

describe("<Sheet>, what a screen reader is told", () => {
  /** A page beside the sheet, to see what a screen reader is left. */
  function Beside({ modal }: { modal?: SheetProps["modal"] }): ReactNode {
    return (
      <>
        <button type="button" id="page">
          On the page
        </button>
        <Demo modal={modal} />
      </>
    );
  }

  it("marks a modal sheet's panel modal, as the page behind it is hidden", async () => {
    await mount(<Beside />);
    await settle(60);
    expect(panel()!.getAttribute("aria-modal")).toBe("true");
    expect(one("#page")!.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("marks one that holds only Tab modal too, since Base UI hides the page behind it as well", async () => {
    await mount(<Beside modal="trap-focus" />);
    await settle(60);
    expect(panel()!.getAttribute("aria-modal")).toBe("true");
    expect(one("#page")!.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("does not mark a sheet that is not modal", async () => {
    await mount(<Beside modal={false} />);
    await settle(60);
    expect(panel()!.hasAttribute("aria-modal")).toBe(false);
    expect(one("#page")!.closest("[aria-hidden='true']")).toBeNull();
  });
});

describe("<Sheet>, a flick through a loaded frame", () => {
  // A flick at some 2.8px/ms over 90px, as a phone under load hands it on:
  // the last move comes 60ms late, then Android's still move before the lift.
  const late: readonly Step[] = [
    [316, 6],
    [338, 8],
    [360, 8],
    [390, 60],
    [390, 2],
  ];
  for (const part of [".dl-sheet-handle", ".dl-sheet-title"]) {
    const from = part === ".dl-sheet-handle" ? "the handle" : "the body";

    it(`closes on a flick whose last move a loaded frame held back, from ${from}`, async () => {
      const log = await open();
      const el = one(part)!;
      await drag(el, late);
      await release(el, 2);
      expect(log).toEqual(["close:swipe"]);
    });

    it(`counts the travel a lift carries past the last move, from ${from}`, async () => {
      // The frame held the last move back until the lift: Base UI's panel
      // stands at 45px of the finger's 90px, and the lift comes 90ms on.
      const log = await open();
      const el = one(part)!;
      await drag(el, [
        [316, 6],
        [345, 10],
      ]);
      await release(el, 90, "touchend", 390);
      expect(log).toEqual(["close:swipe"]);
    });

    it(`keeps a slow drag slow through a loaded frame, from ${from}`, async () => {
      const log = await open();
      const el = one(part)!;
      await drag(el, [
        [316, 50],
        [340, 300],
        [360, 300],
        [380, 60],
      ]);
      await release(el, 2);
      expect(log).toEqual([]);
      expect(dragged()).toBe(false);
    });
  }
});
