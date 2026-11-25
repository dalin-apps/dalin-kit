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
import { readCss, ruleFor, rulesWith } from "../../test/css.js";
import { all, click, key, mount, one, press, settle, withDom, withToast } from "../../test/dom.js";
import { INPUT_ATTR } from "../helpers/input-modality.js";
import { setMotionReader } from "../helpers/motion.js";
import { readToastCovered } from "../toast/toast-dock.js";
import { SHEET_DISMISS_PX } from "./sheet-release.js";
import {
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

/** The page's clock, read once the sheet's first half second is well past. */
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
  await act(async () => {
    touch("touchstart", el, start, now);
  });
  await act(async () => {
    for (const [y, ms] of steps) {
      now += ms;
      touch("touchmove", el, y, now);
    }
  });
}

async function release(el: Element, after = 2, type = "touchend"): Promise<void> {
  now += after;
  await act(async () => {
    touch(type, el, 0, now);
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

  it("starts no drag in the sheet's first half second", async () => {
    await open();
    const title = one(".dl-sheet-title")!;
    now = performance.now() + 100;
    await drag(title, far);
    expect(dragged()).toBe(false);
    await release(title);
    // The same press a little later drags.
    now = performance.now() + 5000;
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
    // The kit's mark is handed to Base UI under its own name.
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
    expect(noSheetDrag("x")).toEqual({ [SHEET_NO_DRAG_ATTR]: "x" });
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

  it("dims the one behind with a scrim of its own, two steps up the ladder", async () => {
    await mount(<Stack log={[]} />);
    await settle(60);
    await tap(one("#open-top"));
    const scrims = all(".dl-sheet-scrim");
    expect(scrims).toHaveLength(2);
    expect(scrims[0]!.style.getPropertyValue("--dl-sheet-depth")).toBe("");
    expect(scrims[1]!.style.getPropertyValue("--dl-sheet-depth")).toBe("1");
    expect(one(".dl-sheet.top")!.parentElement!.style.getPropertyValue("--dl-sheet-depth")).toBe("1");
    expect(ruleFor(css, ".dl-sheet-scrim")).toContain("var(--dl-sheet-depth, 0) * 2");
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

describe("sheet.css", () => {
  const rest = ruleFor(css, ".dl-sheet");

  it("gives the resting panel no transform, filter, backdrop filter or will-change", () => {
    expect(rest).not.toMatch(/(^|;)\s*transform\s*:/);
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

  it("opens and closes over the sheet time, on the family's curve", () => {
    expect(rest).toContain("transition: transform var(--dl-t-sheet, 260ms) var(--dl-ease,");
    expect(ruleFor(css, ".dl-sheet:is([data-starting-style], [data-ending-style])")).toBe("transform: translateY(100%);");
  });

  it("runs a release for Base UI's share of the sheet time, never longer", () => {
    expect(ruleFor(css, ".dl-sheet[data-ending-style]")).toBe(
      "transition-duration: calc(var(--drawer-swipe-strength, 1) * var(--dl-t-sheet, 260ms));",
    );
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
    expect(dim).toContain("opacity: calc(1 - var(--drawer-swipe-progress, 0) * var(--dl-sheet-lift, 0.55))");
    expect(dim).toContain("transition: opacity var(--dl-t-sheet, 260ms)");
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
    expect(ruleFor(css, ".dl-sheet-viewport")).toMatch(/z-index: calc\(var\(--dl-sheet-z, var\(--dl-z-sheet, 55\)\).* \+ 1\)/);
    expect(readCss("tokens")).toMatch(/--dl-z-search: 50;\s*--dl-z-sheet: 55;\s*--dl-z-toast: 60;/);
    // The dialog layout opens over the Settings dialog.
    expect(ruleFor(css, '.dl-sheet-scrim[data-layout="dialog"]')).toContain(
      "z-index: calc(var(--dl-sheet-z, calc(var(--dl-z-dialog, 80) + 2))",
    );
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
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps the close fade's rule off a closing sheet, which has its own exit", () => {
    expect(ruleFor(css, ":is(.dl-sheet, .dl-sheet-scrim)[data-dl-leaving]")).toBe("animation: none !important;");
  });
});
