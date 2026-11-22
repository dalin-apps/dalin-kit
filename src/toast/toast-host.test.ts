/**
 * @vitest-environment jsdom
 *
 * The app's side of the toast: the gate the app closes when its bottom bar
 * leaves the screen, and the band's tap with the app's tick. Runs the real
 * <Toaster> and <ToastBand>.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ToastBand } from "./toast-band.js";
import { Toaster } from "./toaster.js";
import { readToastsExpanded, setToastsExpanded } from "./toast-stack.js";

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
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
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
    root.unmount();
  });
  host.remove();
  vi.useRealTimers();
});

async function render(...children: ReturnType<typeof createElement>[]) {
  await act(async () => {
    root.render(createElement("div", null, ...children));
  });
}

async function raiseToast() {
  await act(async () => {
    toast("hello");
  });
  // Sonner publishes on a timer.
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}

const list = () => document.querySelector("[data-sonner-toaster]");

describe("the toaster's gate", () => {
  it("is open by default: the desktop stack tucks and nothing is hidden", async () => {
    await render(createElement(Toaster, { key: "t" }));
    await raiseToast();
    expect(list()?.classList.contains("toast-tuck")).toBe(true);
    expect(list()?.classList.contains("toast-gate-closed")).toBe(false);
  });

  it("hides the stack while the app holds it closed", async () => {
    await render(createElement(Toaster, { key: "t", gateOpen: false }));
    await raiseToast();
    expect(list()?.classList.contains("toast-gate-closed")).toBe(true);
  });

  it("collapses a fanned phone stack when the gate closes", async () => {
    phone = true;
    await render(createElement(Toaster, { key: "t" }));
    await raiseToast();
    await act(async () => {
      setToastsExpanded(true);
    });
    expect(readToastsExpanded()).toBe(true);
    await render(createElement(Toaster, { key: "t", gateOpen: false }));
    expect(readToastsExpanded()).toBe(false);
  });
});

describe("the tap band", () => {
  it("renders only while a toast exists", async () => {
    await render(createElement(Toaster, { key: "t" }), createElement(ToastBand, { key: "b" }));
    expect(document.querySelector(".toast-band")).toBeNull();
    await raiseToast();
    expect(document.querySelector(".toast-band")).not.toBeNull();
  });

  it("toggles the fan on a tap and plays the app's tick", async () => {
    const onTick = vi.fn();
    await render(createElement(Toaster, { key: "t" }), createElement(ToastBand, { key: "b", onTick }));
    await raiseToast();
    const band = document.querySelector<HTMLButtonElement>(".toast-band");
    await act(async () => {
      band?.click();
    });
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(readToastsExpanded()).toBe(true);
    await act(async () => {
      band?.click();
    });
    expect(onTick).toHaveBeenCalledTimes(2);
    expect(readToastsExpanded()).toBe(false);
  });

  it("stays out of the tab order and silent to a screen reader", async () => {
    await render(createElement(Toaster, { key: "t" }), createElement(ToastBand, { key: "b" }));
    await raiseToast();
    const band = document.querySelector(".toast-band");
    expect(band?.getAttribute("tabindex")).toBe("-1");
    expect(band?.getAttribute("aria-hidden")).toBe("true");
  });
});
