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
import { outweighs, readCss, ruleFor, ruleNaming, rulesWith } from "../../test/css.js";
import { MOTION_ATTR } from "../helpers/motion.js";
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

describe("the app's motion choice on <html>, for the kit's other stylesheets", () => {
  const choice = () => document.documentElement.getAttribute(MOTION_ATTR);

  it("writes nothing for an app that names no switch", async () => {
    await mount();
    expect(choice()).toBeNull();
  });

  it("says reduce while the app's switch does, and takes it back when the switch turns off", async () => {
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]' });
    expect(choice()).toBeNull();
    await set(document.documentElement, "data-motion", "reduce");
    expect(choice()).toBe("reduce");
    await set(document.documentElement, "data-motion", null);
    expect(choice()).toBeNull();
  });

  it("says full while the app's switch says Full, so the system's setting stands aside", async () => {
    systemReducesMotion = true;
    await mount({ reducedMotionSelector: 'html[data-motion="reduced"]', fullMotionSelector: 'html[data-motion="full"]' });
    expect(choice()).toBeNull();
    await set(document.documentElement, "data-motion", "full");
    expect(choice()).toBe("full");
    await set(document.documentElement, "data-motion", "reduced");
    expect(choice()).toBe("reduce");
  });

  it("lets the app's Reduce win where both selectors match", async () => {
    document.documentElement.setAttribute("data-motion", "reduce");
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]', fullMotionSelector: "html[data-motion]" });
    expect(choice()).toBe("reduce");
  });

  it("takes the choice off as the toaster unmounts", async () => {
    document.documentElement.setAttribute("data-motion", "reduce");
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]' });
    expect(choice()).toBe("reduce");
    await act(async () => {
      root.render(null);
    });
    expect(choice()).toBeNull();
  });
});

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
    expect(ruleFor(css, SPINNER)).toContain("animation: toast-spin 2.4s linear infinite !important");
  });

  // Every app also has one blanket rule for reduced motion: each element and
  // pseudo-element gets `animation-duration` near 0 and one iteration, with
  // !important. These are the selectors the four apps write it under.
  const BLANKETS = [
    'html[data-motion="reduced"] *',
    'html[data-motion="reduced"] *::before',
    'html:not([data-motion="full"]) *::after',
    ":root[data-reduced-motion] *",
    ":root[data-reduced-motion] *::before",
    'html[data-motion="reduce"] *:not([data-countdown])',
    'html[data-motion="reduce"] *::before',
  ];
  const SPINNER = "[data-sonner-toaster].toast-still [data-sonner-toast] .toast-spinner";
  const SWEEP = `[data-sonner-toaster][data-y-position="bottom"].toast-still [data-sonner-toast].toast-progress:not([data-swiping="true"], [data-removed="true"])::before`;

  it.each(BLANKETS)("keeps the spinner turning under an app's blanket rule: %s", (blanket) => {
    // The whole shorthand, with !important, from a heavier selector: the
    // blanket's duration and its single iteration both lose to it.
    expect(ruleFor(css, SPINNER)).toMatch(/animation: toast-spin 2\.4s linear infinite !important/);
    expect(outweighs(SPINNER, blanket)).toBe(true);
  });

  it.each(BLANKETS)("holds the progress segment still under an app's blanket rule: %s", (blanket) => {
    expect(ruleFor(css, SWEEP)).toContain("animation: none !important");
    expect(outweighs(SWEEP, blanket)).toBe(true);
  });

  it("rests the progress segment mid bar, so a sweep an app's rule cut short does not end at the left", () => {
    // With no `toast-still` (the app passed no selector) a blanket rule ends
    // the sweep at once, and the bar shows its resting place.
    const PHONE = '[data-sonner-toaster][data-y-position="bottom"]:where(.toast-phone)';
    const resting = ruleFor(css, `${PHONE} [data-sonner-toast].toast-progress:not([data-swiping="true"], [data-removed="true"])::before`);
    expect(resting.replace(/\s+/g, " ")).toContain("background-position: 50% 0, 0 0");
    expect(resting).toContain("animation: toast-bar-sweep 1.5s");
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
      expect(ruleNaming(css, `.toast-${kind}`), kind).toContain("var(--dl-toast-glass) !important");
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
