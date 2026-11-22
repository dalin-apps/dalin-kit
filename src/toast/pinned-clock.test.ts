/**
 * @vitest-environment jsdom
 *
 * A pinned toast and the announce clock. A pinned toast holds in view by
 * itself (toast.css, PINNED), so its arrival is not an announce: nothing
 * pops, and the cards already waiting are not hidden for the hold. When it
 * is released to its result under the same id, the result holds where the
 * pinned toast stood and then tucks, with no second pop.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { setToastsExpanded } from "./toast-stack.js";
import { PINNED_TOAST, Toaster } from "./toaster.js";

let host: HTMLElement;
let root: Root;
let phone = true;

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
    vi.advanceTimersByTime(1000);
    root.unmount();
  });
  host.remove();
  vi.useRealTimers();
});

async function mount() {
  await act(async () => {
    root.render(createElement(Toaster));
  });
}
async function raise(fire: () => void) {
  await act(async () => {
    fire();
  });
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}
async function wait(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

const undo = { label: "Undo", onClick: () => {} };
const pin = (id: string) => toast("Sending in 5s", { id, className: PINNED_TOAST, duration: Infinity, action: undo });
const has = (name: string) => document.querySelector("[data-sonner-toaster]")?.classList.contains(name) ?? false;

describe.each([
  ["the phone", true],
  ["the desktop", false],
])("a pinned toast arriving on %s", (_where, isPhone) => {
  beforeEach(() => {
    phone = isPhone;
  });

  it("does not run the announce clock", async () => {
    await mount();
    await raise(() => pin("send-1"));
    expect(has("toast-announcing")).toBe(false);
    await wait(4000);
    expect(has("toast-slotting")).toBe(false);
  });

  it("does not hide the cards already waiting", async () => {
    await mount();
    await raise(() => toast.info("Archived"));
    await wait(4000 + 720);
    await raise(() => pin("send-2"));
    // `toast-announcing` is what hides every card but the front one.
    expect(has("toast-announcing")).toBe(false);
  });

  it("leaves a toast that arrives with it its announce", async () => {
    await mount();
    await raise(() => {
      pin("send-3");
      toast.info("Archived");
    });
    expect(has("toast-announcing")).toBe(true);
  });

  it("does not cut short the hold of a toast already announcing", async () => {
    await mount();
    await raise(() => toast.info("Archived"));
    await wait(600);
    await raise(() => pin("send-4"));
    // 1150ms on the phone and 1600 on the desktop, from the first toast.
    await wait(isPhone ? 540 : 990);
    expect(has("toast-slotting")).toBe(true);
  });
});
