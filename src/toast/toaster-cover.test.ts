/**
 * @vitest-environment jsdom
 *
 * Two ways an app reaches the toaster without restating the kit's clock: its
 * own classes on Sonner's list, and a selector for the surfaces that cover
 * the phone's bottom bar. Runs the real <Toaster>.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ToastBand } from "./toast-band.js";
import { Toaster, type ToasterProps } from "./toaster.js";
import { measureToastCover, readToastCovered } from "./toast-dock.js";
import { readToastsExpanded, setToastsExpanded } from "./toast-stack.js";
import { withPill } from "../../test/pill.js";

// These are the docked stack's tests, and a stack docks only beside a pill.
withPill();

let host: HTMLElement;
let root: Root;
let phone = true;
const made: HTMLElement[] = [];

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
    root.unmount();
  });
  while (made.length) made.pop()?.remove();
  host.remove();
  vi.useRealTimers();
});

/** A sheet whose top edge is `top` px down an 800px viewport. */
function sheet(top: number, className = "sheet"): HTMLElement {
  const el = document.createElement("div");
  el.className = className;
  el.getBoundingClientRect = () => ({ top, bottom: 800, left: 0, right: 390, width: 390, height: 800 - top }) as DOMRect;
  document.body.appendChild(el);
  made.push(el);
  return el;
}

async function mount(props: ToasterProps = {}) {
  await act(async () => {
    root.render(createElement(Toaster, props));
  });
}

async function raiseToast(message = "hello") {
  await act(async () => {
    toast(message);
  });
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}

const list = () => document.querySelector<HTMLElement>("[data-sonner-toaster]");
const has = (name: string) => list()?.classList.contains(name) ?? false;

describe("<Toaster className>", () => {
  it("puts the app's classes on the list beside the kit's own", async () => {
    await mount({ className: "mail-toasts over-panel" });
    await raiseToast();
    expect(has("mail-toasts")).toBe(true);
    expect(has("over-panel")).toBe(true);
    expect(has("toast-phone")).toBe(true);
    expect(has("toast-announcing")).toBe(true);
  });

  it("keeps them through the phases, so a rule can key on both", async () => {
    await mount({ className: "mail-toasts" });
    await raiseToast();
    await act(async () => {
      vi.advanceTimersByTime(1150);
    });
    expect(has("toast-slotting")).toBe(true);
    expect(has("mail-toasts")).toBe(true);
  });
});

describe("measureToastCover", () => {
  it("is null with no cover on screen", () => {
    expect(measureToastCover(".sheet")).toBeNull();
  });

  it("takes the highest top edge among the covers that are up", () => {
    sheet(500);
    sheet(350);
    expect(measureToastCover(".sheet")).toEqual({ kind: "cover", line: 450 });
  });

  it("ignores a cover with no box, and a copy that is fading out", () => {
    const hidden = sheet(200);
    hidden.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }) as DOMRect;
    sheet(300).setAttribute("data-dl-leaving", "");
    expect(measureToastCover(".sheet")).toBeNull();
  });
});

describe("<Toaster cover>", () => {
  it("announces a toast above a cover that is up when it arrives", async () => {
    await mount({ cover: ".sheet, .dialog" });
    sheet(400, "dialog");
    await raiseToast();
    expect(has("toast-over")).toBe(true);
    expect(list()?.style.getPropertyValue("--dl-dock-line")).toBe("400px");
  });

  it("holds the mark for the announce and the dive, then lets go on its own", async () => {
    await mount({ cover: ".sheet" });
    sheet(400);
    await raiseToast();
    await act(async () => {
      vi.advanceTimersByTime(1150);
    });
    expect(has("toast-slotting")).toBe(true);
    expect(has("toast-over")).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(720);
    });
    // The sheet is still up; the stack now waits behind the pill it hides.
    expect(has("toast-over")).toBe(false);
  });

  it("does nothing with no cover up, and nothing on the desktop", async () => {
    await mount({ cover: ".sheet" });
    await raiseToast();
    expect(has("toast-over")).toBe(false);
    await act(async () => {
      toast.dismiss();
      vi.advanceTimersByTime(2000);
    });
    phone = false;
    await mount({ cover: ".sheet", className: "x" });
    sheet(400);
    await raiseToast();
    expect(has("toast-tuck")).toBe(true);
    expect(has("toast-over")).toBe(false);
  });

  it("tucks a fanned stack when a toast arrives under a cover", async () => {
    await mount({ cover: ".sheet" });
    await raiseToast("one");
    await act(async () => {
      vi.advanceTimersByTime(1150 + 720);
      setToastsExpanded(true);
    });
    sheet(400);
    await raiseToast("two");
    expect(readToastsExpanded()).toBe(false);
  });
});

describe("<Toaster cover>, watched live", () => {
  /** Lets the watcher's observer report and its frame run. */
  async function frame() {
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(20);
    });
  }
  /** Lets the plain hold and the dive run out, so the stack is tucked. */
  async function tucked() {
    await act(async () => {
      vi.advanceTimersByTime(1150 + 720);
    });
  }
  async function mountWithBand(props: ToasterProps) {
    await act(async () => {
      root.render(createElement("div", null, createElement(Toaster, { key: "t", ...props }), createElement(ToastBand, { key: "b" })));
    });
  }
  const band = () => document.querySelector<HTMLButtonElement>(".toast-band");

  it("tucks a fanned stack when a cover opens over it, with no toast arriving", async () => {
    await mount({ cover: ".sheet" });
    await raiseToast();
    await tucked();
    await act(async () => {
      setToastsExpanded(true);
    });
    expect(has("toast-stack-open")).toBe(true);
    sheet(400);
    await frame();
    expect(readToastsExpanded()).toBe(false);
    expect(has("toast-stack-open")).toBe(false);
  });

  it("knows a cover is up between toasts, and that it has gone", async () => {
    await mount({ cover: ".sheet" });
    await raiseToast();
    await tucked();
    expect(readToastCovered()).toBe(false);
    const el = sheet(400);
    await frame();
    expect(readToastCovered()).toBe(true);
    // The mark on the list is still the arriving toast's alone.
    expect(has("toast-over")).toBe(false);
    el.remove();
    await frame();
    expect(readToastCovered()).toBe(false);
  });

  it("follows a cover that is named by an attribute", async () => {
    await mount({ cover: '.sheet:not([data-state="closing"])' });
    await raiseToast();
    await tucked();
    const el = sheet(400);
    await frame();
    expect(readToastCovered()).toBe(true);
    el.setAttribute("data-state", "closing");
    await frame();
    expect(readToastCovered()).toBe(false);
  });

  it("makes the band inert and takes it out of the tab order while a cover is up", async () => {
    await mountWithBand({ cover: ".sheet" });
    await raiseToast();
    await tucked();
    expect(band()?.hasAttribute("inert")).toBe(false);
    expect(band()?.tabIndex).toBe(0);
    const el = sheet(400);
    await frame();
    expect(band()?.hasAttribute("inert")).toBe(true);
    expect(band()?.tabIndex).toBe(-1);
    el.remove();
    await frame();
    expect(band()?.hasAttribute("inert")).toBe(false);
    expect(band()?.tabIndex).toBe(0);
  });

  it("watches nothing on the desktop, and nothing with no selector", async () => {
    await mount();
    await raiseToast();
    sheet(400);
    await frame();
    expect(readToastCovered()).toBe(false);
    await act(async () => {
      toast.dismiss();
      vi.advanceTimersByTime(2000);
    });
    phone = false;
    await mount({ cover: ".sheet", className: "x" });
    await raiseToast();
    await frame();
    expect(readToastCovered()).toBe(false);
  });

  it("names nothing with a selector the browser can't parse", async () => {
    await mount({ cover: ".sheet[[" });
    await raiseToast();
    await frame();
    expect(readToastCovered()).toBe(false);
    expect(has("toast-announcing")).toBe(true);
  });
});
