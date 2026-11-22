/**
 * @vitest-environment jsdom
 *
 * The toaster re-sends Sonner a `pointerup` so a stuck `interacting` flag
 * clears, and that event bubbles to the document, where every gesture
 * listener in an app ends its drag on it. The rule under test
 * is that it is never delivered while a pointer is down, and that it still
 * arrives (after the real release) once none is. Runs the real <Toaster>.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { Toaster } from "./toaster.js";

let host: HTMLElement;
let root: Root;
let seen: PointerEvent[];
const onDocUp = (e: Event) => seen.push(e as PointerEvent);

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

beforeEach(async () => {
  vi.useFakeTimers();
  seen = [];
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement(Toaster));
  });
  document.addEventListener("pointerup", onDocUp);
});

afterEach(async () => {
  document.removeEventListener("pointerup", onDocUp);
  await act(async () => {
    toast.dismiss();
    root.unmount();
  });
  host.remove();
  vi.useRealTimers();
});

function press(type: "pointerdown" | "pointerup" | "pointercancel", id: number, on: Element = document.body) {
  on.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id }));
}

/** A synthetic one is the re-send: the tests only ever dispatch trusted-shaped events with an id >= 1. */
const resent = () => seen.filter((e) => e.pointerId === 0);

async function raiseToast() {
  await act(async () => {
    toast("hello");
  });
  // Sonner publishes on a timer.
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}

describe("toaster release re-send", () => {
  it("delivers nothing to the document while a pointer is down, then sends after the release", async () => {
    press("pointerdown", 7);
    await raiseToast();
    expect(document.querySelector("[data-sonner-toaster]")).not.toBeNull();
    expect(resent()).toHaveLength(0);

    const order: string[] = [];
    document.addEventListener("pointerup", (e) => order.push(e.pointerId === 0 ? "resend" : "real"), { once: false });
    press("pointerup", 7);
    // Deferred: not delivered inside the real release's own dispatch.
    expect(resent()).toHaveLength(0);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(resent()).toHaveLength(1);
    expect(order).toEqual(["real", "resend"]);
  });

  it("sends to Sonner's list on arrival, and again when a gesture that began in the toaster ends", async () => {
    await raiseToast();
    const list = document.querySelector("[data-sonner-toaster]");
    expect(list).not.toBeNull();
    // Arrival with no pointer down: one re-send, aimed at the list.
    expect(resent()).toHaveLength(1);
    expect(resent()[0]?.target).toBe(list);

    press("pointerdown", 4, list as Element);
    press("pointerup", 4, list as Element);
    expect(resent()).toHaveLength(1);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(resent()).toHaveLength(2);

    // A press elsewhere is not the toaster's gesture and sends nothing.
    press("pointerdown", 5);
    press("pointerup", 5);
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
    expect(resent()).toHaveLength(2);
  });

  it("waits for every pointer, a second finger included", async () => {
    press("pointerdown", 1);
    press("pointerdown", 2);
    await raiseToast();
    press("pointerup", 1);
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
    expect(resent()).toHaveLength(0);
    press("pointercancel", 2);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(resent()).toHaveLength(1);
  });

  it("does not send if a pointer lands between the release and the deferred send", async () => {
    press("pointerdown", 1);
    await raiseToast();
    press("pointerup", 1);
    press("pointerdown", 2);
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
    expect(resent()).toHaveLength(0);
    press("pointerup", 2);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(resent()).toHaveLength(1);
  });
});
