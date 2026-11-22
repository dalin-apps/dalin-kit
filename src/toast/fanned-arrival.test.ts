/**
 * @vitest-environment jsdom
 *
 * A toast that arrives while the phone's stack is fanned out joins the fan.
 * The announce is how a toast gets in behind the pill, so its clock runs only
 * while the stack is tucked: an arrival used to fold the open stack for the
 * length of the phases and drop focus from a button in it.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { readToastsExpanded, setToastsExpanded } from "./toast-stack.js";
import { Toaster } from "./toaster.js";
import { withPill } from "../../test/pill.js";

// These are the docked stack's tests, and a stack docks only beside a pill.
withPill();

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

beforeEach(async () => {
  vi.useFakeTimers();
  phone = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement(Toaster));
  });
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
async function fan(open: boolean) {
  await act(async () => {
    setToastsExpanded(open);
  });
}

const undo = { label: "Undo", onClick: () => {} };
const has = (name: string) => document.querySelector("[data-sonner-toaster]")?.classList.contains(name) ?? false;
const button = (text: string) =>
  [...document.querySelectorAll<HTMLElement>("[data-sonner-toast]")]
    .find((el) => el.textContent?.includes(text))
    ?.querySelector<HTMLElement>("[data-button]");

describe("a toast arriving in a fanned phone stack", () => {
  it("joins the fan: the stack stays open and nothing announces", async () => {
    await raise(() => toast.info("Archived", { action: undo }));
    await wait(4000 + 720);
    await fan(true);
    expect(has("toast-stack-open")).toBe(true);
    await raise(() => toast.success("Saved"));
    expect(has("toast-stack-open")).toBe(true);
    expect(has("toast-announcing")).toBe(false);
    // Through what would have been the hold and the dive.
    await wait(1150);
    expect(has("toast-slotting")).toBe(false);
    expect(has("toast-stack-open")).toBe(true);
    await wait(720);
    expect(has("toast-stack-open")).toBe(true);
    expect(readToastsExpanded()).toBe(true);
  });

  it("leaves focus on the button it was on, and that button in the tab order", async () => {
    await raise(() => toast.info("Archived", { action: undo }));
    await wait(4000 + 720);
    await fan(true);
    button("Archived")?.focus();
    expect(document.activeElement).toBe(button("Archived"));
    await raise(() => toast.success("Saved"));
    await wait(1150);
    await wait(720);
    expect(document.activeElement).toBe(button("Archived"));
    expect(button("Archived")?.tabIndex).toBe(0);
  });

  it("is not announced later, when the stack tucks, as if it were new", async () => {
    await raise(() => toast.info("Archived"));
    await wait(1150 + 720);
    await fan(true);
    await raise(() => toast.success("Saved"));
    await fan(false);
    expect(has("toast-stack-open")).toBe(false);
    expect(has("toast-announcing")).toBe(false);
  });

  it("is announced as usual once the stack is tucked again", async () => {
    await raise(() => toast.info("Archived"));
    await wait(1150 + 720);
    await fan(true);
    await fan(false);
    await raise(() => toast.success("Saved"));
    expect(has("toast-announcing")).toBe(true);
  });
});

describe("fanning the stack out while a toast announces", () => {
  it("ends the flight: the fan shows at once and the dive never runs", async () => {
    await raise(() => toast.info("Archived"));
    expect(has("toast-announcing")).toBe(true);
    await fan(true);
    expect(has("toast-announcing")).toBe(false);
    expect(has("toast-stack-open")).toBe(true);
    await wait(1150);
    expect(has("toast-slotting")).toBe(false);
    expect(has("toast-stack-open")).toBe(true);
  });

  it("leaves nothing in flight when the stack tucks again", async () => {
    await raise(() => toast.info("Archived"));
    await fan(true);
    await fan(false);
    expect(has("toast-announcing")).toBe(false);
    await wait(1150);
    expect(has("toast-slotting")).toBe(false);
  });
});

describe("the desktop column", () => {
  it("announces whatever the phone's fan store says", async () => {
    phone = false;
    await act(async () => {
      root.render(createElement(Toaster, { className: "desktop" }));
    });
    await fan(true);
    await raise(() => toast.info("Archived"));
    expect(has("toast-tuck")).toBe(true);
    expect(has("toast-announcing")).toBe(true);
  });
});
