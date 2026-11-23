/**
 * @vitest-environment jsdom
 *
 * <Toaster scrim>: a tap anywhere off a fanned phone stack tucks it. The
 * band already does that from the bar's dead space; this is the rest of the
 * screen, as mail's own toaster had it. Off unless the app asks.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { readCss, ruleFor } from "../../test/css.js";
import { withPill } from "../../test/pill.js";
import { registerToastDock } from "./toast-dock.js";
import { readToastsExpanded, setToastsExpanded } from "./toast-stack.js";
import { Toaster, type ToasterProps } from "./toaster.js";

withPill();

let host: HTMLElement;
let root: Root;
let phone = true;
const undo: Array<() => void> = [];

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => ({
    matches: phone && query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
});

beforeEach(() => {
  vi.useFakeTimers();
  phone = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => {
    toast.dismiss();
    setToastsExpanded(false);
    while (undo.length) undo.pop()?.();
    vi.advanceTimersByTime(1000);
    root.unmount();
  });
  host.remove();
  vi.useRealTimers();
});

/** Mounts the toaster, raises one toast and lets it tuck. */
async function tuckedStack(props: ToasterProps) {
  await act(async () => {
    root.render(createElement(Toaster, props));
  });
  await act(async () => {
    toast("hello");
  });
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
  await act(async () => {
    vi.advanceTimersByTime(4000 + 720);
  });
}
async function fan(open: boolean) {
  await act(async () => {
    setToastsExpanded(open);
  });
}
const scrim = () => document.querySelector<HTMLElement>(".toast-scrim");

describe("<Toaster scrim>", () => {
  it("is off by default: a fanned stack lays nothing over the page", async () => {
    await tuckedStack({});
    await fan(true);
    expect(scrim()).toBeNull();
  });

  it("lies under a fanned stack alone, hidden from a screen reader", async () => {
    await tuckedStack({ scrim: true });
    expect(scrim()).toBeNull();
    await fan(true);
    expect(scrim()).not.toBeNull();
    expect(scrim()?.getAttribute("aria-hidden")).toBe("true");
    await fan(false);
    expect(scrim()).toBeNull();
  });

  it("tucks the stack on a tap, and plays the app's tick once", async () => {
    const onScrimTuck = vi.fn();
    await tuckedStack({ scrim: true, onScrimTuck });
    await fan(true);
    await act(async () => scrim()?.click());
    expect(readToastsExpanded()).toBe(false);
    expect(onScrimTuck).toHaveBeenCalledTimes(1);
    expect(scrim()).toBeNull();
  });

  it("sits just under the toaster wherever the toaster is: over another surface's line too", async () => {
    await act(async () => {
      undo.push(registerToastDock(null, { kind: "line", line: 100, rank: 35 }));
    });
    await tuckedStack({ scrim: true });
    await fan(true);
    expect(scrim()?.classList.contains("toast-scrim-over")).toBe(true);
    await act(async () => undo.pop()?.());
    expect(scrim()?.classList.contains("toast-scrim-over")).toBe(false);
  });

  it("fades in, and lands at once while the app's motion switch is on", async () => {
    await tuckedStack({ scrim: true, reducedMotionSelector: 'html[data-motion="reduce"]' });
    await fan(true);
    expect(scrim()?.classList.contains("toast-scrim-still")).toBe(false);
    await act(async () => {
      document.documentElement.setAttribute("data-motion", "reduce");
      await Promise.resolve();
    });
    expect(scrim()?.classList.contains("toast-scrim-still")).toBe(true);
    document.documentElement.removeAttribute("data-motion");
  });

  it("is the phone's: the desktop column has no fan to tap off", async () => {
    phone = false;
    await tuckedStack({ scrim: true });
    await fan(true);
    expect(scrim()).toBeNull();
  });
});

describe("toast.css, the scrim", () => {
  const css = readCss("toast");

  it("covers the screen one step under the toaster, so the fanned toasts still take their taps", () => {
    const body = ruleFor(css, ".toast-scrim");
    expect(body).toContain("position: fixed");
    expect(body).toContain("inset: 0");
    // The toaster is two under the bar, the band one.
    expect(body).toContain("z-index: calc(var(--dl-bar-z) - 3)");
    expect(ruleFor(css, ".toast-scrim.toast-scrim-over")).toContain("z-index: calc(var(--dl-toast-over-z) - 1)");
  });

  it("draws nothing unless the app gives it a fill", () => {
    expect(ruleFor(css, ".toast-scrim")).toContain("background: var(--dl-toast-scrim, transparent)");
  });

  it("takes a fill of its own off the pill, from a variable and no class of the kit's", () => {
    expect(ruleFor(css, ".toast-scrim.toast-scrim-over")).toContain(
      "background: var(--dl-toast-scrim-over, var(--dl-toast-scrim, transparent))",
    );
  });

  it("fades its fill in over mail's 200ms, from clear", () => {
    expect(ruleFor(css, ".toast-scrim")).toContain("animation: toast-scrim-in var(--dl-toast-scrim-fade, 200ms)");
    expect(css).toMatch(/@keyframes toast-scrim-in\s*\{\s*from\s*\{\s*opacity: 0;\s*\}\s*\}/);
  });

  it("does not fade under reduced motion", () => {
    expect(ruleFor(css, ".toast-scrim.toast-scrim-still")).toContain("animation: none");
  });
});
