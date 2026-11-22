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
import { outweighs, readCss, ruleFor, rulesWith, splitList } from "../../test/css.js";
import { setToastsExpanded } from "./toast-stack.js";
import { PINNED_TOAST, Toaster } from "./toaster.js";
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

describe("a pinned toast released to its result", () => {
  /** The send settles: the same id, without the pin. */
  const settle = (id: string) => toast.success("Sent", { id, className: undefined, duration: 4000, action: undefined });
  const cards = () => [...document.querySelectorAll<HTMLElement>("[data-sonner-toast]")];

  it("holds where it stood: the announce is calm, with no second pop", async () => {
    await mount();
    await raise(() => pin("calm-1"));
    await raise(() => settle("calm-1"));
    expect(has("toast-announcing")).toBe(true);
    expect(has("toast-calm")).toBe(true);
  });

  it("stays calm through the dive, and lets go with the phases", async () => {
    await mount();
    await raise(() => pin("calm-2"));
    await raise(() => settle("calm-2"));
    await wait(1150);
    expect(has("toast-slotting")).toBe(true);
    expect(has("toast-calm")).toBe(true);
    await wait(720);
    expect(has("toast-slotting")).toBe(false);
    expect(has("toast-calm")).toBe(false);
  });

  it("is calm from behind newer toasts too, on its own card", async () => {
    await mount();
    await raise(() => pin("calm-3"));
    await raise(() => toast.info("Archived"));
    await wait(1150 + 720);
    await raise(() => settle("calm-3"));
    expect(has("toast-calm")).toBe(true);
    expect(has("toast-again")).toBe(true);
    expect(cards().filter((card) => card.hasAttribute("data-again")).map((card) => card.textContent)).toEqual(["Sent"]);
  });

  it("leaves every other announce its pop", async () => {
    await mount();
    await raise(() => toast.loading("Uploading", { id: "calm-4" }));
    await wait(1150 + 720);
    await raise(() => toast.success("Uploaded", { id: "calm-4" }));
    expect(has("toast-announcing")).toBe(true);
    expect(has("toast-calm")).toBe(false);
    await wait(1150 + 720);
    await raise(() => toast.info("Archived"));
    expect(has("toast-announcing")).toBe(true);
    expect(has("toast-calm")).toBe(false);
  });

  it("gives an arrival that lands with the release its pop", async () => {
    await mount();
    await raise(() => pin("calm-5"));
    await raise(() => {
      settle("calm-5");
      toast.info("Archived");
    });
    expect(has("toast-announcing")).toBe(true);
    expect(has("toast-calm")).toBe(false);
  });
});

describe("toast.css, the calm announce", () => {
  const css = readCss("toast");
  const PHONE = '[data-sonner-toaster][data-y-position="bottom"]:where(.toast-phone)';
  const CARD = ' [data-sonner-toast][data-front="true"]:not([data-removed="true"])';
  const FRONT = ":where(:not(.toast-again))";
  const AGAIN = ":where(.toast-again)";

  it("announces at the pill's own size, which is the size the pinned toast held", () => {
    expect(ruleFor(css, `${PHONE}.toast-calm`)).toContain("--notif-pop: 1;");
    // The dive starts from that size, so nothing jumps as the hold ends.
    const frames = css.slice(css.indexOf("@keyframes notif-slot-in"));
    expect(frames.slice(0, frames.indexOf("45%"))).toContain("scale(var(--notif-pop))");
  });

  it("drops the bubble-in, over the rule that plays it, for the front card and for a marked one", () => {
    const [list, body] = rulesWith(css, `${PHONE}.toast-announcing.toast-calm`)[0]!;
    expect(body).toContain("animation: none");
    expect(splitList(list)).toEqual([
      `${PHONE}.toast-announcing.toast-calm${FRONT}${CARD}`,
      `${PHONE}.toast-announcing.toast-calm${AGAIN} [data-sonner-toast][data-again]:not([data-removed="true"])`,
    ]);
    const pop = `${PHONE}.toast-announcing${FRONT}${CARD}`;
    expect(rulesWith(css, pop).some(([, rule]) => rule.includes("notif-bubble-in"))).toBe(true);
    expect(outweighs(splitList(list)[0]!, pop)).toBe(true);
  });

  it("holds the result where the pinned toast stood: the announce's place is the pin's floor", () => {
    const base = rulesWith(css, PHONE).find(([selector]) => selector === PHONE)![1];
    expect(base).toContain("--notif-base: var(--notif-floor)");
    const announce = rulesWith(css, `${PHONE}.toast-announcing${FRONT}${CARD}`).find(([, rule]) => rule.includes("--y:"))![1];
    expect(announce).toContain("--y: translateY(calc(var(--lift) * var(--notif-base))) !important");
    const pinned = rulesWith(css, `${PHONE} [data-sonner-toast].toast-pinned[data-mounted="true"][data-expanded="false"]`)[0]![1];
    expect(pinned).toContain("--y: translateY(calc(-1 * var(--notif-floor))) !important");
  });
});
