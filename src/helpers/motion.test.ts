/**
 * @vitest-environment jsdom
 *
 * One place for the app's motion switch. The `<Toaster>` is handed the
 * switch as selectors; the band, the pill's swipe and the close fade are
 * script, and they follow the same answer without being handed a reader.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "../toast/toaster.js";
import { LEAVING_ATTR, leaveInPlace, watchLeaving } from "./leaving.js";
import { motionReaderFor, reducesMotion, setMotionReader, setToasterMotionReader, systemReducesMotion } from "./motion.js";

let system = false;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") && system,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  system = false;
});

afterEach(() => {
  setMotionReader(null);
  setToasterMotionReader(null);
  for (const name of ["data-motion", "data-reduced-motion"]) document.documentElement.removeAttribute(name);
  document.body.replaceChildren();
});

describe("reducesMotion", () => {
  it("is the system's setting with nothing said", () => {
    expect(reducesMotion()).toBe(false);
    system = true;
    expect(systemReducesMotion()).toBe(true);
    expect(reducesMotion()).toBe(true);
  });

  it("is the app's reader once it names one, and the system's again when it takes it away", () => {
    system = true;
    const forget = setMotionReader(() => false);
    expect(reducesMotion()).toBe(false);
    forget();
    expect(reducesMotion()).toBe(true);
  });

  it("puts the app's reader over the toaster's", () => {
    setToasterMotionReader(() => true);
    expect(reducesMotion()).toBe(true);
    setMotionReader(() => false);
    expect(reducesMotion()).toBe(false);
  });

  it("does not let an old reader's cleanup take a newer one away", () => {
    const forgetFirst = setMotionReader(() => true);
    setMotionReader(() => false);
    forgetFirst();
    system = true;
    expect(reducesMotion()).toBe(false);
  });
});

describe("motionReaderFor", () => {
  it("reduces while the app's reduce switch matches (calendar's attribute)", () => {
    const read = motionReaderFor('html[data-motion="reduced"]', 'html[data-motion="full"]');
    expect(read()).toBe(false);
    document.documentElement.setAttribute("data-motion", "reduced");
    expect(read()).toBe(true);
  });

  it("follows the system's setting unless the app says Full", () => {
    const read = motionReaderFor('html[data-motion="reduced"]', 'html[data-motion="full"]');
    system = true;
    expect(read()).toBe(true);
    document.documentElement.setAttribute("data-motion", "full");
    expect(read()).toBe(false);
  });

  it("reads an app whose one attribute is the whole answer (notes)", () => {
    const read = motionReaderFor(":root[data-reduced-motion]", ":root:not([data-reduced-motion])");
    system = true;
    expect(read()).toBe(false);
    document.documentElement.setAttribute("data-reduced-motion", "");
    expect(read()).toBe(true);
  });

  it("treats a selector the browser can't parse as naming nothing", () => {
    expect(motionReaderFor("html[", undefined)()).toBe(false);
  });
});

describe("<Toaster> names the switch for the kit's script", () => {
  let host: HTMLElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  const mount = async (props: Parameters<typeof Toaster>[0]) => {
    await act(async () => {
      root.render(createElement(Toaster, props));
    });
  };

  it("answers from its selectors while it is mounted", async () => {
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]' });
    expect(reducesMotion()).toBe(false);
    document.documentElement.setAttribute("data-motion", "reduce");
    expect(reducesMotion()).toBe(true);
  });

  it("lets the app's Full choice win over the system for the script too", async () => {
    system = true;
    await mount({
      reducedMotionSelector: 'html[data-motion="reduced"]',
      fullMotionSelector: 'html[data-motion="full"]',
    });
    expect(reducesMotion()).toBe(true);
    document.documentElement.setAttribute("data-motion", "full");
    expect(reducesMotion()).toBe(false);
  });

  it("leaves the system's setting in charge when it is handed no selector", async () => {
    system = true;
    await mount({});
    expect(reducesMotion()).toBe(true);
  });

  it("hands the answer back to the system when it unmounts", async () => {
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]' });
    document.documentElement.setAttribute("data-motion", "reduce");
    await act(async () => {
      root.render(null);
    });
    expect(reducesMotion()).toBe(false);
  });

  it("stops the close fade with no reader passed to it", async () => {
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]' });
    const stop = watchLeaving({ selectors: [".menu"] });
    const fades = async () => {
      const menu = document.createElement("div");
      menu.className = "menu";
      document.body.appendChild(menu);
      await Promise.resolve();
      menu.remove();
      await Promise.resolve();
      const left = document.querySelector(`.menu[${LEAVING_ATTR}]`) !== null;
      vi.advanceTimersByTime(500);
      return left;
    };
    expect(await fades()).toBe(true);
    document.documentElement.setAttribute("data-motion", "reduce");
    expect(await fades()).toBe(false);
    stop();
  });

  it("stops an in-place fade the same way", async () => {
    await mount({ reducedMotionSelector: 'html[data-motion="reduce"]' });
    document.documentElement.setAttribute("data-motion", "reduce");
    const el = document.createElement("div");
    el.className = "menu";
    document.body.appendChild(el);
    leaveInPlace(el);
    expect(document.querySelector(`[${LEAVING_ATTR}]`)).toBeNull();
  });
});
