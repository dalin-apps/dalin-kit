/**
 * @vitest-environment jsdom
 *
 * A press on a progress toast (0.13): a click, or Enter or Space on the
 * focused toast, calls the app's handler on a computer, and nothing on a
 * phone, where a tap fans the stack. Runs the real <Toaster> and reads
 * toast.css for the pressed look.
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { readCss, ruleFor } from "../../test/css.js";
import { TOAST_PRESS_ATTR, pressToast, readToastPress } from "./toast-press.js";
import { Toaster } from "./toaster.js";
import { setPhoneMaxWidth } from "./use-phone-layout.js";

const css = readCss("toast");

let host: HTMLElement;
let root: Root;
let viewport = 1280;
const stops: Array<() => void> = [];

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // Sonner captures the pointer on a press, which jsdom has no call for.
  const proto = Element.prototype as { setPointerCapture?: (id: number) => void; releasePointerCapture?: (id: number) => void };
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  window.matchMedia = ((query: string) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    return {
      matches: max ? viewport <= Number(max[1]) : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    };
  }) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  vi.useFakeTimers();
  viewport = 1280;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  for (const stop of stops.splice(0)) stop();
  await act(async () => {
    toast.dismiss();
    vi.advanceTimersByTime(1000);
    root.unmount();
  });
  host.remove();
  setPhoneMaxWidth(null);
  vi.useRealTimers();
});

async function mount() {
  await act(async () => {
    root.render(createElement(Toaster));
  });
}

async function step(fire: () => void = () => {}) {
  await act(async () => {
    fire();
  });
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}

const card = () => document.querySelector<HTMLElement>("[data-sonner-toast]");

/** A click as a pointer makes one: down and up in one place, then the click. */
async function pointerClick(el: Element, moved = 0) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
    el.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0, clientX: 10 + moved, clientY: 10 }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, detail: 1, clientX: 10 + moved, clientY: 10 }));
  });
}

async function keyOn(el: Element, key: string) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  await act(async () => {
    el.dispatchEvent(event);
  });
  return event;
}

function press(id: string, onPress: () => void, description?: string) {
  const stop = pressToast(id, onPress, { description });
  stops.push(stop);
  return stop;
}

describe("a press on a progress toast, on a computer", () => {
  it("calls the app's handler on a click, and marks the toast as a button", async () => {
    const swap = vi.fn();
    await mount();
    await step(() => toast.loading("42%, 12 min left", { id: "up" }));
    await step(() => press("up", swap, "Click to show speed"));
    const el = card()!;
    expect(el.hasAttribute(TOAST_PRESS_ATTR)).toBe(true);
    expect(el.getAttribute("role")).toBe("button");
    expect(el.getAttribute("aria-description")).toBe("Click to show speed");
    await pointerClick(el.querySelector("[data-title]") ?? el);
    expect(swap).toHaveBeenCalledTimes(1);
  });

  it("calls it on Enter or Space while the toast has focus, and holds the key from the page", async () => {
    const swap = vi.fn();
    await mount();
    await step(() => toast.loading("42%, 12 min left", { id: "up" }));
    await step(() => press("up", swap));
    const enter = await keyOn(card()!, "Enter");
    const space = await keyOn(card()!, " ");
    expect(swap).toHaveBeenCalledTimes(2);
    expect(enter.defaultPrevented).toBe(true);
    expect(space.defaultPrevented).toBe(true);
    // A key held down repeats nothing.
    await act(async () => {
      card()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", repeat: true, bubbles: true, cancelable: true }));
    });
    expect(swap).toHaveBeenCalledTimes(2);
  });

  it("works the moment a toast is given a press, whichever came first", async () => {
    const swap = vi.fn();
    await mount();
    press("early", swap);
    await step(() => toast.loading("Preparing, 31%", { id: "early" }));
    expect(card()?.hasAttribute(TOAST_PRESS_ATTR)).toBe(true);
    await pointerClick(card()!);
    expect(swap).toHaveBeenCalledTimes(1);
  });

  it("leaves the toast's own button to the button", async () => {
    const swap = vi.fn();
    const stop = vi.fn();
    await mount();
    await step(() => toast.loading("42%, 12 min left", { id: "up", action: { label: "Stop", onClick: stop } }));
    await step(() => press("up", swap));
    await pointerClick(card()!.querySelector("[data-button]")!);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(swap).not.toHaveBeenCalled();
  });

  it("is no press when the pointer travelled, as a short swipe does", async () => {
    const swap = vi.fn();
    await mount();
    await step(() => toast.loading("42%", { id: "up" }));
    await step(() => press("up", swap));
    await pointerClick(card()!, 20);
    expect(swap).not.toHaveBeenCalled();
  });

  it("ends when the toast becomes its result under the same id", async () => {
    const swap = vi.fn();
    await mount();
    await step(() => toast.loading("42%, 12 min left", { id: "up" }));
    await step(() => press("up", swap));
    await step(() => toast.success("Uploaded 12 files", { id: "up" }));
    const el = card()!;
    expect(el.hasAttribute(TOAST_PRESS_ATTR)).toBe(false);
    expect(el.hasAttribute("role")).toBe(false);
    expect(el.hasAttribute("aria-description")).toBe(false);
    await pointerClick(el);
    await keyOn(el, "Enter");
    expect(swap).not.toHaveBeenCalled();
  });

  it("ends when the app takes the press off", async () => {
    const swap = vi.fn();
    await mount();
    await step(() => toast.loading("42%", { id: "up" }));
    const stop = press("up", swap);
    await step();
    await step(() => stop());
    expect(readToastPress("up")).toBeNull();
    expect(card()?.hasAttribute(TOAST_PRESS_ATTR)).toBe(false);
    await pointerClick(card()!);
    expect(swap).not.toHaveBeenCalled();
  });

  it("presses no other toast", async () => {
    const swap = vi.fn();
    await mount();
    await step(() => toast.loading("Moving", { id: "move" }));
    await step(() => press("up", swap));
    expect(card()?.hasAttribute(TOAST_PRESS_ATTR)).toBe(false);
    await pointerClick(card()!);
    expect(swap).not.toHaveBeenCalled();
  });

  it("takes a second press for the same id over the first, and null takes it off", () => {
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = pressToast("x", first);
    pressToast("x", second);
    // The first's stop no longer reaches the press that replaced it.
    stopFirst();
    expect(readToastPress("x")?.onPress).toBe(second);
    pressToast("x", null);
    expect(readToastPress("x")).toBeNull();
  });
});

describe("a press on a phone", () => {
  it("calls nothing and marks nothing: a tap fans the stack, as it always has", async () => {
    viewport = 390;
    const swap = vi.fn();
    await mount();
    await step(() => toast.loading("42%", { id: "up" }));
    await step(() => press("up", swap));
    expect(document.querySelector("[data-sonner-toaster]")?.classList.contains("toast-tuck")).toBe(false);
    expect(card()?.hasAttribute(TOAST_PRESS_ATTR)).toBe(false);
    await pointerClick(card()!);
    await keyOn(card()!, "Enter");
    expect(swap).not.toHaveBeenCalled();
  });
});

describe("toast.css, a pressable toast", () => {
  it("takes the family's desktop press, one step darker, unless its own button is the one pressed", () => {
    const body = ruleFor(
      css,
      "[data-sonner-toaster].toast-tuck [data-sonner-toast][data-dl-press]:active:not(:has([data-button]:active))",
    );
    expect(body).toContain("filter: brightness(var(--dl-press-dim, 0.92))");
  });

  it("draws the family's keyboard ring, inside the rim", () => {
    const body = ruleFor(css, "[data-sonner-toaster].toast-tuck [data-sonner-toast][data-dl-press]:focus-visible");
    expect(body).toContain("outline: var(--dl-focus-w, 2px) solid var(--dl-focus-ring, var(--dl-fg, #fff)) !important");
    expect(body).toContain("outline-offset: calc(-1 * var(--dl-focus-w, 2px)) !important");
  });

  it("draws the press only in the computer's column", () => {
    for (const line of css.split("\n").filter((l) => l.includes("[data-dl-press]"))) {
      expect(line).toContain(".toast-tuck");
    }
  });
});
