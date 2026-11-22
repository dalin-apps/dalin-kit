/**
 * @vitest-environment jsdom
 *
 * A phone page with no bottom bar has no pill for a toast to dock behind
 * (drive's /connect, a sign-in page). Version 0.1 docked there anyway: the
 * toast took a pill's footprint at the bottom of an empty screen and tucked
 * behind nothing. With no pill on the page the toast is a plain one on the
 * bottom edge, as drive's and calendar's own toasters drew it there.
 *
 * A pill is on the page while a bar says so: its swipe is mounted
 * (`useStackSwipe` with zone "pill"), a <ToastBand> is mounted beside it, or
 * it is registered as a dock of kind "pill".
 */
import { createElement, act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { readCss, ruleFor, rulesWith } from "../../test/css.js";
import { ToastBand } from "./toast-band.js";
import { readToastPill, registerToastDock } from "./toast-dock.js";
import { readToastsExpanded, setToastsExpanded } from "./toast-stack.js";
import { Toaster, type ToasterProps } from "./toaster.js";
import { useStackSwipe } from "./use-stack-swipe.js";

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

async function render(...children: ReactElement[]) {
  await act(async () => {
    root.render(createElement("div", null, ...children));
  });
}
const toaster = (props: ToasterProps = {}) => createElement(Toaster, { key: "t", ...props });
async function raise(fire: () => void = () => toast("hello")) {
  await act(async () => {
    fire();
  });
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}

/** A bottom bar: a pill that spreads the stack's swipe. */
function Bar() {
  const swipe = useStackSwipe({ zone: "pill" });
  return createElement("nav", { "data-dl-pill": "", ...swipe });
}

const list = () => document.querySelector<HTMLElement>("[data-sonner-toaster]");
const has = (name: string) => list()?.classList.contains(name) ?? false;

describe("a phone page with no pill", () => {
  it("shows a plain toast on the bottom edge: no dock, no announce", async () => {
    await render(toaster());
    await raise();
    expect(readToastPill()).toBe(false);
    expect(has("toast-plain")).toBe(true);
    expect(has("toast-phone")).toBe(false);
    expect(has("toast-tuck")).toBe(false);
    expect(has("toast-announcing")).toBe(false);
  });

  it("leaves the toast its tab stops and Sonner's own four seconds", async () => {
    await render(toaster());
    await raise(() => toast.info("Connected", { action: { label: "Open", onClick: () => {} } }));
    const card = document.querySelector<HTMLElement>("[data-sonner-toast]");
    expect(card?.tabIndex).toBe(0);
    expect(card?.querySelector<HTMLElement>("[data-button]")?.tabIndex).toBe(0);
    await act(async () => {
      vi.advanceTimersByTime(4100);
    });
    // The phone's docked stack would hold it for thirty.
    expect(document.querySelector("[data-sonner-toast]")?.getAttribute("data-removed")).toBe("true");
  });

  it("never fans: the store's flag is put back down", async () => {
    await render(toaster());
    await raise();
    await act(async () => {
      setToastsExpanded(true);
    });
    expect(readToastsExpanded()).toBe(false);
    expect(has("toast-stack-open")).toBe(false);
  });

  it("wears the family's glass, levelled like the desktop's", () => {
    const css = readCss("toast");
    const PLAIN = '[data-sonner-toaster][data-y-position="bottom"].toast-plain [data-sonner-toast]';
    expect(ruleFor(css, PLAIN)).toContain("backdrop-filter: var(--dl-toast-blur) var(--dl-toast-level)");
    const bare = rulesWith(css, `${PLAIN}:not(`)[0]![1];
    expect(bare).toContain("background: var(--dl-toast-glass)");
    expect(bare).toContain("border: 1px solid var(--dl-toast-rim)");
  });
});

describe("a phone page with a pill", () => {
  it("docks once a bar's swipe is mounted", async () => {
    await render(toaster(), createElement(Bar, { key: "bar" }));
    expect(readToastPill()).toBe(true);
    await raise();
    expect(has("toast-phone")).toBe(true);
    expect(has("toast-plain")).toBe(false);
    expect(has("toast-announcing")).toBe(true);
  });

  it("docks beside a mounted band", async () => {
    await render(toaster(), createElement(ToastBand, { key: "band" }));
    await raise();
    expect(has("toast-phone")).toBe(true);
  });

  it("docks to a pill registered as a dock", async () => {
    await act(async () => {
      undo.push(registerToastDock(null, { kind: "pill", rank: 10 }));
    });
    await render(toaster());
    await raise();
    expect(has("toast-phone")).toBe(true);
  });

  it("goes plain when the bar leaves, and tucks a fan it left open", async () => {
    await render(toaster(), createElement(Bar, { key: "bar" }));
    await raise();
    await act(async () => {
      vi.advanceTimersByTime(1150 + 720);
      setToastsExpanded(true);
    });
    expect(has("toast-stack-open")).toBe(true);
    await render(toaster());
    expect(readToastPill()).toBe(false);
    expect(has("toast-plain")).toBe(true);
    expect(has("toast-phone")).toBe(false);
    expect(readToastsExpanded()).toBe(false);
  });

  it("docks again when the bar comes back", async () => {
    await render(toaster());
    await raise();
    expect(has("toast-plain")).toBe(true);
    await render(toaster(), createElement(Bar, { key: "bar" }));
    expect(has("toast-phone")).toBe(true);
    expect(has("toast-plain")).toBe(false);
  });
});

describe("what is not a missing pill", () => {
  it("is a dock another surface registered: the toast stands on that line", async () => {
    await act(async () => {
      undo.push(registerToastDock(null, { kind: "line", line: 0 }));
    });
    await render(toaster());
    await raise();
    expect(has("toast-phone")).toBe(true);
    expect(has("toast-over")).toBe(true);
    expect(has("toast-plain")).toBe(false);
  });

  it("is a closed gate: the app has said its bar is off screen, and the stack waits hidden", async () => {
    await render(toaster({ gateOpen: false }));
    await raise();
    expect(has("toast-phone")).toBe(true);
    expect(has("toast-gate-closed")).toBe(true);
    expect(has("toast-plain")).toBe(false);
  });

  it("is the desktop, which has no pill and tucks to the edge", async () => {
    phone = false;
    await render(toaster());
    await raise();
    expect(has("toast-tuck")).toBe(true);
    expect(has("toast-plain")).toBe(false);
  });
});
