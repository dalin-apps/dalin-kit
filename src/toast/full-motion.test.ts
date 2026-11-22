/**
 * @vitest-environment jsdom
 *
 * <Toaster fullMotionSelector>: an app's own Full motion choice wins over
 * the system's reduced-motion setting. Two things have to give way for it:
 * the kit's `toast-still`, and Sonner's own rule, which stops every toast's
 * transitions and animations under the system's setting from a stylesheet
 * the kit does not write.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { Toaster, type ToasterProps } from "./toaster.js";

let host: HTMLElement;
let root: Root;
let systemReducesMotion = true;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") && systemReducesMotion,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  vi.useFakeTimers();
  systemReducesMotion = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => {
    toast.dismiss();
    vi.advanceTimersByTime(1000);
    root.unmount();
  });
  host.remove();
  for (const name of ["data-motion", "data-reduced-motion"]) document.documentElement.removeAttribute(name);
  vi.useRealTimers();
});

async function mount(props: ToasterProps = {}) {
  await act(async () => {
    root.render(createElement(Toaster, props));
  });
  await act(async () => {
    toast("hello");
  });
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}

async function set(name: string, value: string | null) {
  await act(async () => {
    if (value === null) document.documentElement.removeAttribute(name);
    else document.documentElement.setAttribute(name, value);
    await Promise.resolve();
  });
}

const has = (name: string) => document.querySelector("[data-sonner-toaster]")?.classList.contains(name) ?? false;

/** The selectors of Sonner's own rule for the system's reduced-motion setting. */
function sonnerReducedRule(): string {
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      const media = (rule as CSSMediaRule).media?.mediaText ?? "";
      if (!media.includes("prefers-reduced-motion")) continue;
      for (const inner of (rule as CSSMediaRule).cssRules) {
        const selector = (inner as CSSStyleRule).selectorText ?? "";
        if (selector.includes("[data-sonner-toast]")) return selector;
      }
    }
  }
  throw new Error("Sonner's reduced-motion rule was not found");
}

// First, while Sonner's sheet is as Sonner wrote it.
describe("with no full-motion selector named", () => {
  it("leaves Sonner's own rule alone, and the system's setting decides", async () => {
    const before = sonnerReducedRule();
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]' });
    expect(sonnerReducedRule()).toBe(before);
    expect(before).not.toContain("toast-motion");
    expect(has("toast-still")).toBe(true);
    expect(has("toast-motion")).toBe(false);
  });
});

describe("<Toaster fullMotionSelector>", () => {
  const drive = { reducedMotionSelector: 'html[data-motion="reduce"]', fullMotionSelector: 'html[data-motion="full"]' };

  it("keeps motion on while the app's Full choice matches, whatever the system asks", async () => {
    await mount(drive);
    expect(has("toast-still")).toBe(true);
    await set("data-motion", "full");
    expect(has("toast-still")).toBe(false);
    expect(has("toast-motion")).toBe(true);
    await set("data-motion", null);
    expect(has("toast-still")).toBe(true);
    expect(has("toast-motion")).toBe(false);
  });

  it("still reduces motion when the app's own switch says so", async () => {
    await mount(drive);
    await set("data-motion", "reduce");
    expect(has("toast-still")).toBe(true);
    expect(has("toast-motion")).toBe(false);
  });

  it("lets the app's reduce switch win where both selectors match", async () => {
    document.documentElement.setAttribute("data-motion", "reduce");
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]', fullMotionSelector: "html" });
    expect(has("toast-still")).toBe(true);
    expect(has("toast-motion")).toBe(false);
  });

  it("reads the absence of an attribute as the choice: notes has one attribute and no other answer", async () => {
    await mount({
      reducedMotionSelector: ":root[data-reduced-motion]",
      fullMotionSelector: ":root:not([data-reduced-motion])",
    });
    expect(has("toast-still")).toBe(false);
    expect(has("toast-motion")).toBe(true);
    await set("data-reduced-motion", "");
    expect(has("toast-still")).toBe(true);
    expect(has("toast-motion")).toBe(false);
  });

  it("changes nothing where the system asks for nothing", async () => {
    systemReducesMotion = false;
    await mount(drive);
    expect(has("toast-still")).toBe(false);
    await set("data-motion", "full");
    expect(has("toast-still")).toBe(false);
  });

  it("frees its toasts from Sonner's own system rule, and no other toaster's", async () => {
    await mount(drive);
    const rule = sonnerReducedRule();
    const card = document.querySelector("[data-sonner-toast]")!;
    // No Full choice yet: Sonner's rule still takes this toaster's cards.
    expect(card.matches(rule)).toBe(true);
    await set("data-motion", "full");
    expect(card.matches(rule)).toBe(false);
    // A toaster the kit did not mount never carries the class.
    const other = document.createElement("ol");
    other.setAttribute("data-sonner-toaster", "");
    other.innerHTML = "<li data-sonner-toast><div data-content></div></li>";
    document.body.appendChild(other);
    expect(other.querySelector("[data-sonner-toast]")!.matches(rule)).toBe(true);
    expect(other.querySelector("[data-content]")!.matches(rule)).toBe(true);
    other.remove();
  });
});
