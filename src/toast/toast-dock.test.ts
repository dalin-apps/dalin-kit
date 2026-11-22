/**
 * @vitest-environment jsdom
 *
 * The dock: which surface owns the bottom of the phone screen, where its line
 * is, and what the toaster and the band do about it. Runs the real <Toaster>
 * and <ToastBand>; jsdom has no layout, so each dock's box is stubbed.
 */
import { readFileSync } from "node:fs";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ToastBand } from "./toast-band.js";
import { Toaster } from "./toaster.js";
import { dockLine, readToastDock, registerToastDock } from "./toast-dock.js";
import { readToastsExpanded, setToastsExpanded } from "./toast-stack.js";

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
    while (undo.length) undo.pop()?.();
    toast.dismiss();
    setToastsExpanded(false);
    root.unmount();
  });
  host.remove();
  vi.useRealTimers();
});

/** An element whose top edge is `top` px down an 800px viewport. */
function surface(top: number, bottom = 800): HTMLElement {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({ top, bottom, left: 0, right: 390, width: 390, height: bottom - top }) as DOMRect;
  document.body.appendChild(el);
  undo.push(() => el.remove());
  return el;
}

async function dock(...args: Parameters<typeof registerToastDock>) {
  await act(async () => {
    undo.push(registerToastDock(...args));
  });
}

async function mount() {
  await act(async () => {
    root.render(createElement("div", null, createElement(Toaster, { key: "t" }), createElement(ToastBand, { key: "b" })));
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

describe("dockLine", () => {
  it("is the dock's edge when the strip above it has room for a toast", () => {
    // A 58px pill needs 58 * 1.1 + 12 + 76 = 151.8px above the line.
    expect(dockLine(300, 800, 58)).toBe(300);
    expect(dockLine(648, 800, 58)).toBe(648);
  });

  it("is 0 when a sheet leaves too little above it", () => {
    expect(dockLine(649, 800, 58)).toBe(0);
    expect(dockLine(736, 800, 58)).toBe(0);
  });

  it("never goes under the bottom edge", () => {
    expect(dockLine(-40, 800, 58)).toBe(0);
  });
});

describe("the dock registry", () => {
  it("is the pill with nothing registered, and for a registered pill", async () => {
    expect(readToastDock()).toBeNull();
    await dock(surface(730), { kind: "pill", rank: 10 });
    expect(readToastDock()).toBeNull();
  });

  it("measures a line from the element's top edge by default", async () => {
    await dock(surface(700), { kind: "line" });
    expect(readToastDock()).toEqual({ kind: "line", line: 100 });
  });

  it("measures from the bottom edge when asked, and takes a fixed line", async () => {
    await dock(surface(0, 800), { kind: "cover", edge: "bottom" });
    expect(readToastDock()).toEqual({ kind: "cover", line: 0 });
    await dock(null, { kind: "line", line: 120, rank: 5 });
    expect(readToastDock()).toEqual({ kind: "line", line: 120 });
  });

  it("gives the highest rank the dock, and the newest on a tie", async () => {
    await dock(surface(730), { kind: "pill", rank: 10 });
    await dock(surface(400), { kind: "cover", rank: 50 });
    expect(readToastDock()).toEqual({ kind: "cover", line: 400 });
    await dock(surface(650), { kind: "line", rank: 35 });
    expect(readToastDock()).toEqual({ kind: "cover", line: 400 });
    await dock(surface(300), { kind: "cover", rank: 50 });
    expect(readToastDock()).toEqual({ kind: "cover", line: 500 });
  });

  it("hands the dock back to the pill when the surface goes", async () => {
    await dock(surface(730), { kind: "pill", rank: 10 });
    let leave = () => {};
    await act(async () => {
      leave = registerToastDock(surface(400), { kind: "cover", rank: 50 });
    });
    expect(readToastDock()?.kind).toBe("cover");
    await act(async () => leave());
    expect(readToastDock()).toBeNull();
  });
});

describe("the toaster over a dock", () => {
  it("draws nothing extra while the pill is the dock", async () => {
    await mount();
    await raiseToast();
    expect(has("toast-phone")).toBe(true);
    expect(has("toast-over")).toBe(false);
    expect(list()?.style.getPropertyValue("--dl-dock-line")).toBe("");
  });

  it("stands on a cover's line and announces there", async () => {
    await mount();
    await dock(surface(400), { kind: "cover" });
    await raiseToast();
    expect(has("toast-over")).toBe(true);
    expect(has("toast-over-edge")).toBe(false);
    expect(has("toast-announcing")).toBe(true);
    expect(list()?.style.getPropertyValue("--dl-dock-line")).toBe("400px");
  });

  it("holds at the bottom edge when the cover leaves no room above it", async () => {
    await mount();
    await dock(surface(40), { kind: "cover" });
    await raiseToast();
    expect(has("toast-over")).toBe(true);
    expect(has("toast-over-edge")).toBe(true);
    expect(list()?.style.getPropertyValue("--dl-dock-line")).toBe("0px");
  });

  it("measures the dock again as each toast arrives", async () => {
    await mount();
    let top = 500;
    const sheet = surface(0);
    sheet.getBoundingClientRect = () => ({ top, bottom: 800, left: 0, right: 390, width: 390, height: 800 - top }) as DOMRect;
    await dock(sheet, { kind: "cover" });
    await raiseToast("one");
    expect(list()?.style.getPropertyValue("--dl-dock-line")).toBe("300px");
    // The sheet was dragged taller, with no resize or transition to say so.
    top = 300;
    await raiseToast("two");
    expect(list()?.style.getPropertyValue("--dl-dock-line")).toBe("500px");
  });

  it("finishes an announce over the line it began on when the cover closes", async () => {
    await mount();
    let leave = () => {};
    await act(async () => {
      leave = registerToastDock(surface(400), { kind: "cover" });
    });
    await raiseToast();
    await act(async () => leave());
    expect(readToastDock()).toBeNull();
    expect(has("toast-over")).toBe(true);
    // The phone's hold (1150ms) and the dive (720ms).
    await act(async () => {
      vi.advanceTimersByTime(1150 + 720);
    });
    expect(has("toast-announcing")).toBe(false);
    expect(has("toast-slotting")).toBe(false);
    expect(has("toast-over")).toBe(false);
  });

  it("tucks a fanned stack under a cover, and leaves it out over a line", async () => {
    await mount();
    await raiseToast();
    await act(async () => {
      vi.advanceTimersByTime(1150 + 720);
      setToastsExpanded(true);
    });
    expect(has("toast-stack-open")).toBe(true);
    await dock(surface(650), { kind: "line", rank: 1 });
    expect(readToastsExpanded()).toBe(true);
    expect(has("toast-stack-open")).toBe(true);
    await dock(surface(400), { kind: "cover", rank: 2 });
    expect(readToastsExpanded()).toBe(false);
    expect(has("toast-stack-open")).toBe(false);
  });

  it("leaves the desktop column alone", async () => {
    phone = false;
    await mount();
    await dock(surface(400), { kind: "cover" });
    await raiseToast();
    expect(has("toast-tuck")).toBe(true);
    expect(has("toast-over")).toBe(false);
  });
});

describe("the tap band and the dock", () => {
  it("stands down while the dock is not the pill", async () => {
    await mount();
    await raiseToast();
    expect(document.querySelector(".toast-band")).not.toBeNull();
    let leave = () => {};
    await act(async () => {
      leave = registerToastDock(surface(650), { kind: "line" });
    });
    expect(document.querySelector(".toast-band")).toBeNull();
    await act(async () => leave());
    expect(document.querySelector(".toast-band")).not.toBeNull();
  });
});

describe("toast.css over a line", () => {
  const css = readFileSync("css/toast.css", "utf8");

  it("clips with overflow, never clip-path, so the frost survives", () => {
    const rule = css.slice(css.indexOf(":where(.toast-phone).toast-over {"));
    expect(rule.slice(0, rule.indexOf("}"))).toContain("overflow: hidden");
    expect(css).not.toMatch(/clip-path\s*:/);
  });

  it("ends the dive where the waiting cards sit, so nothing jumps", () => {
    const frames = css.slice(css.indexOf("@keyframes notif-slot-under"));
    const last = frames.slice(frames.indexOf("100%"), frames.indexOf("}", frames.indexOf("100%")));
    expect(last).toContain("translateY(calc(100% + 20px)) scale(0.95)");
    expect(css).toContain("--y: translateY(calc(100% + 20px)) scale(0.95) !important;");
  });
});
