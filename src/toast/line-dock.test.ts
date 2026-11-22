/**
 * @vitest-environment jsdom
 *
 * Under a "line" dock (another surface's edge is the floor: mail's parked
 * draft chip) the tucked stack peeks above the line, as it peeks above the
 * pill, and the band moves onto those slivers so the stack can still be
 * fanned out. Version 0.1 sank the cards under the line and unmounted the
 * band, which left the stack unreachable for as long as the chip showed.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { outweighs, readCss, ruleFor, rulesWith, splitList } from "../../test/css.js";
import { ToastBand } from "./toast-band.js";
import { registerToastDock } from "./toast-dock.js";
import { readToastsExpanded, setToastsExpanded } from "./toast-stack.js";
import { PINNED_TOAST, Toaster } from "./toaster.js";

let host: HTMLElement;
let root: Root;
const undo: Array<() => void> = [];

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
});

beforeEach(async () => {
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement("div", null, createElement(Toaster, { key: "t" }), createElement(ToastBand, { key: "b" })));
  });
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

/** Registers a dock whose line is `line` px up an 800px viewport. */
async function dock(kind: "line" | "cover", line: number) {
  await act(async () => {
    undo.push(registerToastDock(null, { kind, line, rank: 35 }));
  });
}
async function raise(fire: () => void = () => toast("hello")) {
  await act(async () => {
    fire();
  });
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}
async function tucked() {
  await act(async () => {
    vi.advanceTimersByTime(4000 + 720);
  });
}

const list = () => document.querySelector<HTMLElement>("[data-sonner-toaster]");
const has = (name: string) => list()?.classList.contains(name) ?? false;
const band = () => document.querySelector<HTMLButtonElement>(".toast-band");

describe("the toaster over a line", () => {
  it("says so on the list, beside toast-over", async () => {
    await dock("line", 100);
    await raise();
    expect(has("toast-over")).toBe(true);
    expect(has("toast-over-line")).toBe(true);
    expect(list()?.style.getPropertyValue("--dl-dock-line")).toBe("100px");
  });

  it("does not for a cover, or for a line on the bottom edge, where nothing peeks", async () => {
    await dock("cover", 100);
    await raise();
    expect(has("toast-over")).toBe(true);
    expect(has("toast-over-line")).toBe(false);
    await act(async () => undo.pop()?.());
    await dock("line", 0);
    expect(has("toast-over-edge")).toBe(true);
    expect(has("toast-over-line")).toBe(false);
  });
});

describe("the band over a line", () => {
  it("stays, on the slivers above the line, and fans the stack", async () => {
    await dock("line", 100);
    await raise();
    await tucked();
    expect(band()).not.toBeNull();
    expect(band()?.classList.contains("toast-band-line")).toBe(true);
    expect(band()?.style.getPropertyValue("--dl-dock-line")).toBe("100px");
    expect(band()?.style.getPropertyValue("--toast-band-cards")).toBe("1");
    expect(band()?.hasAttribute("inert")).toBe(false);
    await act(async () => band()?.click());
    expect(readToastsExpanded()).toBe(true);
    expect(has("toast-stack-open")).toBe(true);
    await act(async () => band()?.click());
    expect(readToastsExpanded()).toBe(false);
  });

  it("is as tall as the slivers showing, three at most", async () => {
    await dock("line", 100);
    for (const name of ["one", "two", "three", "four"]) await raise(() => toast(name));
    await tucked();
    expect(band()?.style.getPropertyValue("--toast-band-cards")).toBe("3");
  });

  it("is the plain band again once the pill is the dock", async () => {
    await dock("line", 100);
    await raise();
    await act(async () => undo.pop()?.());
    expect(band()?.classList.contains("toast-band-line")).toBe(false);
    expect(band()?.style.getPropertyValue("--dl-dock-line")).toBe("");
  });

  it("stands down while a pinned toast holds over the slivers: its button is the tap there", async () => {
    await dock("line", 100);
    await raise(() => toast("Sending in 5s", { className: PINNED_TOAST, duration: Infinity }));
    expect(band()).toBeNull();
  });

  it("stands down on the bottom edge, where no sliver shows", async () => {
    await dock("line", 0);
    await raise();
    expect(band()).toBeNull();
  });
});

describe("toast.css over a line that is not a cover", () => {
  const css = readCss("toast");
  const PHONE = '[data-sonner-toaster][data-y-position="bottom"]:where(.toast-phone)';
  const CARD = '[data-sonner-toast][data-expanded="false"]';
  const LEFT = ':not([data-removed="true"], .toast-pinned)';

  it("leaves the waiting cards peeking above the line, a sliver each, as behind the pill", () => {
    const [list, body] = rulesWith(css, `${PHONE}.toast-over.toast-over-line:not(.toast-announcing)`)[0]!;
    expect(body.replace(/\s+/g, " ")).toContain(
      "--y: translateY(calc(100% - var(--notif-peek) * var(--slot) - var(--pull-lift, 0px))) scale(calc(1 - 0.05 * var(--slot))) !important",
    );
    // The same three cases as the rule that sinks them under a cover, one class heavier each.
    const sunk = rulesWith(css, `${PHONE}.toast-over:not(.toast-announcing)`)[0]!;
    expect(sunk[1]).toContain("--y: translateY(calc(100% + 20px)) scale(0.95) !important");
    const mine = splitList(list);
    const theirs = splitList(sunk[0]);
    expect(mine).toEqual(theirs.map((selector) => selector.replace(`${PHONE}.toast-over`, `${PHONE}.toast-over.toast-over-line`)));
    for (let i = 0; i < mine.length; i++) expect(outweighs(mine[i]!, theirs[i]!), mine[i]).toBe(true);
    expect(mine[0]).toBe(`${PHONE}.toast-over.toast-over-line:not(.toast-announcing) ${CARD}${LEFT}`);
  });

  it("dives to the front sliver, in the pill's own beats, and not past the line", () => {
    const FRONT = `:where(:not(.toast-again)) [data-sonner-toast][data-front="true"]:not([data-removed="true"])`;
    const line = `${PHONE}.toast-over.toast-over-line.toast-slotting${FRONT}`;
    const [list, body] = rulesWith(css, line)[0]!;
    expect(body).toContain("animation: notif-slot-line 480ms cubic-bezier(0.45, 0, 0.2, 1) both");
    expect(outweighs(splitList(list)[0]!, `${PHONE}.toast-over.toast-slotting${FRONT}`)).toBe(true);
    const frames = css.slice(css.indexOf("@keyframes notif-slot-line"));
    const last = frames.slice(frames.indexOf("100% {"), frames.indexOf("}", frames.indexOf("100% {")));
    expect(last).toContain("translateY(calc(100% - var(--notif-peek) * var(--slot, 1)))");
    expect(last).toContain("scale(calc(1 - 0.05 * var(--slot, 1)))");
  });

  it("lets the older cards riffle back in: the rule that keeps them hidden is the cover's alone", () => {
    const hidden = rulesWith(css, ".toast-slotting").filter(([, body]) => body.includes("opacity: 0 !important") && body.includes("animation: none !important"));
    expect(hidden).toHaveLength(1);
    for (const selector of splitList(hidden[0]![0])) {
      expect(selector, selector).toContain(`${PHONE}.toast-over:where(:not(.toast-over-line)).toast-slotting`);
    }
  });

  it("puts the band on the slivers: the pill's width, standing on the line, over the toaster", () => {
    const body = ruleFor(css, ".toast-band.toast-band-line");
    expect(body).toContain("bottom: var(--dl-dock-line, 0px)");
    expect(body).toContain("width: var(--dl-bar-w)");
    expect(body).toContain("left: calc(50% - var(--dl-bar-w) / 2)");
    expect(body).toContain("height: calc(var(--toast-band-cards, 1) * 16px + 10px)");
    expect(body).toContain("z-index: calc(var(--dl-toast-over-z) + 1)");
  });

  it("gets the band out of the fanned cards' way: only the strip under the first one", () => {
    expect(ruleFor(css, '.toast-band.toast-band-line[aria-expanded="true"]')).toContain("height: 12px");
  });

  it("draws the band's keyboard ring around its own box there", () => {
    const ring = ruleFor(css, ".toast-band.toast-band-line:focus-visible::after");
    expect(ring).toContain("inset: -3px");
    expect(ring).toContain("width: auto");
    expect(ring).toContain("height: auto");
  });
});
