/**
 * @vitest-environment jsdom
 *
 * A pinned toast: the class the app puts on it, and the rules that keep it in
 * view. jsdom has no cascade to trust here, so the rules are weighed against
 * the ones they have to beat.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { outweighs, readCss, rulesWith, ruleWith, splitList } from "../../test/css.js";
import { PINNED_TOAST, Toaster } from "./toaster.js";

const css = readCss("toast");
const PHONE = '[data-sonner-toaster][data-y-position="bottom"]:where(.toast-phone)';
const TUCK = '[data-sonner-toaster][data-y-position="bottom"].toast-tuck';

/** The selector of the one rule that contains every needle. */
function selectorWith(...needles: string[]): string {
  const found = rulesWith(css, needles[0]!)
    .flatMap(([list]) => splitList(list))
    .filter((selector) => needles.every((needle) => selector.includes(needle)));
  if (found.length !== 1) throw new Error(`${found.length} selectors contain ${needles.join(" and ")}`);
  return found[0]!;
}

describe("PINNED_TOAST", () => {
  let host: HTMLElement;
  let root: Root;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  });

  beforeEach(async () => {
    vi.useFakeTimers();
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
      root.unmount();
    });
    host.remove();
    vi.useRealTimers();
  });

  it("is the class the stylesheet keys on", () => {
    expect(PINNED_TOAST).toBe("toast-pinned");
    expect(css).toContain(`[data-sonner-toast].${PINNED_TOAST}`);
  });

  it("rides on the toast itself, beside its kind", async () => {
    await act(async () => {
      toast.info("Sending in 5s", { className: PINNED_TOAST, duration: Infinity });
    });
    await act(async () => {
      vi.advanceTimersByTime(20);
    });
    const card = document.querySelector("[data-sonner-toast]");
    expect(card?.classList.contains("toast-pinned")).toBe(true);
    expect(card?.classList.contains("toast-info")).toBe(true);
  });
});

describe("a pinned toast on the desktop", () => {
  const pinned = selectorWith(`${TUCK} [data-sonner-toast].toast-pinned`);

  it("stays out from the edge: the column's place with no tuck", () => {
    const body = ruleWith(css, `${TUCK} [data-sonner-toast].toast-pinned`);
    expect(body).toContain("--y: translateY(calc(var(--lift) * var(--offset))) !important");
    expect(body).not.toContain("--tuck-in");
  });

  it("outweighs the rule that tucks every mounted toast", () => {
    const tuck = selectorWith(`${TUCK} [data-sonner-toast][data-mounted="true"]:not([data-removed="true"])`);
    expect(outweighs(pinned, tuck)).toBe(true);
  });

  it("lets go of a toast that is being removed", () => {
    expect(pinned).toContain(':not([data-removed="true"])');
  });
});

describe("a pinned toast on the phone", () => {
  const PINNED = `${PHONE} [data-sonner-toast].toast-pinned[data-mounted="true"][data-expanded="false"]:not([data-removed="true"])`;
  const [pinned, body] = rulesWith(css, PINNED).find(([selector]) => !selector.endsWith("> *"))!;

  it("holds the floor above the dock, content showing, with no animation", () => {
    expect(body).toContain("--y: translateY(calc(-1 * var(--notif-floor))) !important");
    expect(body).toContain("opacity: 1 !important");
    expect(body).toContain("animation: none !important");
  });

  it("stands 14px over the pill by default, and 12px over any other line", () => {
    const base = rulesWith(css, PHONE).find(([selector]) => selector === PHONE)![1];
    expect(base).toContain("--notif-floor: calc(var(--dl-bar-h) + 14px)");
    expect(base).toContain("--notif-base: var(--notif-floor)");
    const over = rulesWith(css, `${PHONE}.toast-over`).find(([selector]) => selector === `${PHONE}.toast-over`)![1];
    expect(over).toContain("--notif-floor: 12px");
  });

  it.each([
    ["the collapsed slot", `${PHONE} [data-sonner-toast][data-expanded="false"]:not([data-removed="true"])`],
    ["the announce", `${PHONE}.toast-announcing [data-sonner-toast][data-front="true"]:not([data-removed="true"])`],
    ["the cards hidden behind an announce", `${PHONE}.toast-announcing [data-sonner-toast][data-front="false"]`],
    ["the dive", `${PHONE}.toast-slotting [data-sonner-toast][data-front="true"]:not([data-removed="true"])`],
    ["the cards hidden over a line", `${PHONE}.toast-over.toast-slotting [data-sonner-toast][data-front="false"]`],
  ])("outweighs %s", (_name, other) => {
    // Each of these is a rule in the sheet, so the test fails if one is renamed.
    expect(rulesWith(css, other).length).toBeGreaterThan(0);
    expect(outweighs(pinned, other)).toBe(true);
  });

  it("is left out of the rule that parks waiting cards under a line", () => {
    const [list, parked] = rulesWith(css, `${PHONE}.toast-over:not(.toast-announcing)`)[0]!;
    expect(parked).toContain("--y: translateY(calc(100% + 20px)) scale(0.95) !important");
    expect(splitList(list)).toHaveLength(2);
    for (const selector of splitList(list)) expect(selector).toContain(".toast-pinned)");
  });

  it("keeps its button pressable while the collapsed stack ignores the pointer", () => {
    expect(ruleWith(css, `${PHONE} [data-sonner-toast].toast-pinned [data-button]`)).toContain(
      "pointer-events: auto !important",
    );
  });

  it("raises the announce a card while it holds the floor, unless the stack is fanned", () => {
    const [selector, raise] = rulesWith(css, ":has( [data-sonner-toast].toast-pinned")[0]!;
    expect(selector).toContain(":not(.toast-stack-open)");
    expect(raise).toContain("--notif-base: calc(var(--notif-floor) + var(--dl-bar-h) + 10px)");
  });
});
