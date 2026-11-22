/**
 * @vitest-environment jsdom
 *
 * The app's own switches: reduced motion and no transparency, each named to
 * the <Toaster> as a selector, each turned into one class toast.css keys on.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { outweighs, readCss, ruleFor, rulesWith } from "../../test/css.js";
import { Toaster, type ToasterProps } from "./toaster.js";

let host: HTMLElement;
let root: Root;
let systemReducesMotion = false;

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
  systemReducesMotion = false;
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
  for (const name of ["data-motion", "data-glass"]) {
    document.documentElement.removeAttribute(name);
    document.body.removeAttribute(name);
  }
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

/** Sets an attribute and lets the observer that watches for it report. */
async function set(el: HTMLElement, name: string, value: string | null) {
  await act(async () => {
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
    await Promise.resolve();
  });
}

const has = (name: string) => document.querySelector("[data-sonner-toaster]")?.classList.contains(name) ?? false;

describe("<Toaster reducedMotionSelector>", () => {
  it("is off with no switch on and no system setting", async () => {
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]' });
    expect(has("toast-still")).toBe(false);
  });

  it("follows the app's switch as it turns on and off", async () => {
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]' });
    await set(document.documentElement, "data-motion", "reduce");
    expect(has("toast-still")).toBe(true);
    await set(document.documentElement, "data-motion", "full");
    expect(has("toast-still")).toBe(false);
  });

  it("reads a switch that was already on at mount, and one kept on <body>", async () => {
    document.body.setAttribute("data-motion", "reduced");
    await mount({ reducedMotionSelector: 'body[data-motion="reduced"]' });
    expect(has("toast-still")).toBe(true);
    await set(document.body, "data-motion", null);
    expect(has("toast-still")).toBe(false);
  });

  it("follows the system's setting with no selector named", async () => {
    systemReducesMotion = true;
    await mount();
    expect(has("toast-still")).toBe(true);
  });

  it("stays on under the system's setting whatever the app's switch says", async () => {
    systemReducesMotion = true;
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]' });
    expect(has("toast-still")).toBe(true);
  });

  it("treats a selector the browser can't parse as naming nothing", async () => {
    await mount({ reducedMotionSelector: "html[[" });
    expect(has("toast-still")).toBe(false);
  });
});

describe("<Toaster reducedTransparencySelector>", () => {
  it("leaves the toast glass by default, whatever the page says", async () => {
    document.documentElement.setAttribute("data-glass", "off");
    await mount();
    expect(has("toast-solid")).toBe(false);
  });

  it("goes solid while the app's switch is on", async () => {
    await mount({ reducedTransparencySelector: 'html[data-glass="off"]' });
    expect(has("toast-solid")).toBe(false);
    await set(document.documentElement, "data-glass", "off");
    expect(has("toast-solid")).toBe(true);
    await set(document.documentElement, "data-glass", null);
    expect(has("toast-solid")).toBe(false);
  });
});

describe("toast.css, reduced motion", () => {
  const css = readCss("toast");
  const STILL = "[data-sonner-toaster].toast-still [data-sonner-toast]";

  it("does under the app's switch what Sonner does under the system's", () => {
    const [selector, body] = rulesWith(css, STILL)[0]!;
    expect(selector).toBe(`${STILL}, ${STILL} > *`);
    expect(body).toContain("transition: none !important");
    expect(body).toContain("animation: none !important");
  });

  it("stops the progress card's segment mid bar, over the rule that sweeps it", () => {
    const PHONE = '[data-sonner-toaster][data-y-position="bottom"]:where(.toast-phone)';
    const NOT = ':not([data-swiping="true"], [data-removed="true"])::before';
    const still = `[data-sonner-toaster][data-y-position="bottom"].toast-still [data-sonner-toast].toast-progress${NOT}`;
    const body = ruleFor(css, still);
    expect(body).toContain("animation: none !important");
    expect(body.replace(/\s+/g, " ")).toContain("background-position: 50% 0, 0 0");
    expect(outweighs(still, `${PHONE} [data-sonner-toast].toast-progress${NOT}`)).toBe(true);
  });

  it("slows the spinner instead of stopping the only sign the work is alive", () => {
    expect(ruleFor(css, "[data-sonner-toaster].toast-still .toast-spinner")).toContain("animation-duration: 2.4s");
  });

  it("keeps the desktop tuck's fade and drops its slide", () => {
    const tuck = '[data-sonner-toaster][data-y-position="bottom"].toast-still.toast-tuck [data-sonner-toast]';
    expect(ruleFor(css, tuck)).toMatch(/transition: opacity 200ms [^;]+ !important/);
    expect(outweighs(tuck, STILL)).toBe(true);
  });
});

describe("toast.css, no transparency", () => {
  const css = readCss("toast");

  it("swaps the glass for the solid fill and drops the blur", () => {
    expect(ruleFor(css, "[data-sonner-toaster].toast-solid")).toContain("--dl-toast-glass: var(--dl-toast-solid)");
    expect(ruleFor(css, "[data-sonner-toaster].toast-solid [data-sonner-toast]")).toContain(
      "backdrop-filter: none !important",
    );
  });

  it("layers every kind's tint over the glass variable, so each goes solid with it", () => {
    for (const kind of ["success", "error", "warning", "info", "progress"]) {
      expect(ruleFor(css, `.toast-${kind}`), kind).toContain("var(--dl-toast-glass) !important");
    }
  });

  it("is the grey the glass comes to over the family's dark page", () => {
    // A grey has no chroma, so mixing in oklch is mixing its lightness, which
    // is the cube root of its linear light.
    const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
    const lightness = (hex: number) => Math.cbrt(toLinear(hex / 255));
    // color-mix(in oklch, #2f2f2f 86%, white), then 30% of that over #1a1a1a.
    const glass = toSrgb((0.86 * lightness(0x2f) + 0.14 * 1) ** 3) * 255;
    const over = Math.round(0.3 * glass + 0.7 * 0x1a);
    expect(over).toBe(0x28);
    expect(css).toContain("--dl-toast-solid: #282828;");
  });
});
