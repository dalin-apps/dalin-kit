/**
 * @vitest-environment jsdom
 *
 * A toast leaves whichever way it is pushed, on the desktop as on the phone.
 * Sonner derives its swipe directions from `position`, and "bottom-right"
 * yields down and right alone: a push the other way is damped to a fraction
 * of the pointer and never reaches the 45px it takes to dismiss. Drive's and
 * calendar's own toasters passed all four on every layout. Runs the real
 * <Toaster> and pushes a card with real pointer events.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { setToastsExpanded } from "./toast-stack.js";
import { Toaster } from "./toaster.js";

let host: HTMLElement;
let root: Root;
let phone = false;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => ({
    matches: phone && query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  // jsdom has no pointer capture, and Sonner takes it on the way down.
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
});

beforeEach(async () => {
  vi.useFakeTimers();
  phone = false;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => {
    toast.dismiss();
    setToastsExpanded(false);
    vi.advanceTimersByTime(1000);
    root.unmount();
  });
  host.remove();
  vi.useRealTimers();
});

const card = () => document.querySelector<HTMLElement>("[data-sonner-toast]")!;

async function raise() {
  await act(async () => {
    root.render(createElement(Toaster));
  });
  await act(async () => {
    toast("Archived");
  });
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}

/** Pushes the card 60px one way, slowly enough that only the distance can dismiss it. */
async function push(dx: number, dy: number) {
  const at = (type: string, x: number, y: number) =>
    act(async () => {
      card().dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: x, clientY: y, button: 0 }));
    });
  await at("pointerdown", 200, 200);
  // The first move tells Sonner the axis, the second moves the card.
  await at("pointermove", 200 + dx / 10, 200 + dy / 10);
  await at("pointermove", 200 + dx, 200 + dy);
  await act(async () => {
    vi.advanceTimersByTime(1000);
  });
  await at("pointerup", 200 + dx, 200 + dy);
}

describe.each([
  ["the desktop", false],
  ["the phone", true],
])("swiping a toast away on %s", (_where, isPhone) => {
  it.each([
    ["up", 0, -60],
    ["right", 60, 0],
    ["down", 0, 60],
    ["left", -60, 0],
  ])("dismisses it when pushed %s", async (_way, dx, dy) => {
    phone = isPhone;
    await raise();
    if (isPhone) {
      // The phone's cards take the pointer only while the stack is fanned.
      await act(async () => {
        vi.advanceTimersByTime(1150 + 720);
        setToastsExpanded(true);
      });
    }
    expect(card().getAttribute("data-swipe-out")).toBe("false");
    await push(dx, dy);
    expect(card().getAttribute("data-swipe-out")).toBe("true");
  });
});
