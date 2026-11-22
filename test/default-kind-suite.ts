/**
 * The default kind, against one Sonner. The four apps lock 2.0.7, which puts
 * `classNames.default` on every toast, typed ones too; 2.0.8 keeps it for a
 * toast with no type. The kit has to come out the same on both, so this suite
 * runs twice: `default-kind.test.ts` on the Sonner the kit is pinned to, and
 * `default-kind-next.test.ts` on 2.0.8.
 *
 * Runs the real <Toaster> and asks each card which of the sheet's rules
 * apply to it, by matching the rule's own selector.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { Toaster, type ToasterProps } from "../src/toast/toaster.js";
import { readCss, rulesWith, splitList } from "./css.js";

const css = readCss("toast");
const KINDS = ["info", "success", "warning", "error"] as const;
const GUARD = ':where(:not([data-type]), [data-type="default"])';
const BARE_ICON = `[data-sonner-toast].toast-bare${GUARD}:not(:has(> [data-icon])) > [data-content]`;

/** The kinds whose tint rule (the one that sets the glass and the rim) takes this card. */
function tintsOf(card: Element): string[] {
  return KINDS.filter((kind) => {
    const [list] = rulesWith(css, `.toast-${kind}`).find(([selectors]) => splitList(selectors).includes(`.toast-${kind}`))!;
    return splitList(list).some((selector) => card.matches(selector));
  });
}

export function defaultKindSuite(version: "2.0.7" | "2.0.8"): void {
  describe(`the default kind on Sonner ${version}`, () => {
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

    beforeEach(() => {
      vi.useFakeTimers();
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
      vi.useRealTimers();
    });

    async function mount(props: ToasterProps = { defaultKind: "info" }) {
      await act(async () => {
        root.render(createElement(Toaster, props));
      });
    }

    async function raise(fire: () => void): Promise<HTMLElement> {
      await act(async () => {
        fire();
      });
      await act(async () => {
        vi.advanceTimersByTime(20);
      });
      return document.querySelector<HTMLElement>("[data-sonner-toast]")!;
    }

    it("is the Sonner it says: 2.0.7 puts the default class on a typed toast, 2.0.8 does not", async () => {
      await mount();
      const card = await raise(() => toast.error("No connection"));
      expect(card.classList.contains("toast-bare")).toBe(version === "2.0.7");
    });

    it("tints a bare toast in the named kind, and marks it for the drawn icon", async () => {
      await mount();
      const card = await raise(() => toast("Copied"));
      expect(tintsOf(card)).toEqual(["info"]);
      expect(card.querySelector("[data-content]")?.matches(BARE_ICON)).toBe(true);
    });

    it.each(KINDS)("leaves a typed %s toast its own tint and nothing of the default kind's", async (kind) => {
      await mount({ defaultKind: kind === "info" ? "error" : "info" });
      const card = await raise(() => toast[kind]("Done"));
      expect(tintsOf(card)).toEqual([kind]);
      expect(card.classList.contains(`toast-${kind}`)).toBe(true);
      expect(card.querySelector("[data-content]")?.matches(BARE_ICON)).toBe(false);
    });

    it("leaves the progress kind its accent", async () => {
      await mount();
      const card = await raise(() => toast.loading("Uploading"));
      expect(tintsOf(card)).toEqual([]);
      expect(card.classList.contains("toast-progress")).toBe(true);
    });

    it("draws no bare icon on a typed toast that turned its own icon off", async () => {
      await mount();
      const card = await raise(() => toast.success("Saved", { icon: null }));
      expect(card.querySelector("[data-icon]")).toBeNull();
      expect(card.querySelector("[data-content]")?.matches(BARE_ICON)).toBe(false);
    });

    it("lets a bare toast go when an update gives it a type", async () => {
      await mount();
      await raise(() => toast("Copied", { id: "copy" }));
      const typed = await raise(() => toast.error("Copied", { id: "copy" }));
      expect(tintsOf(typed)).toEqual(["error"]);
    });

    it("counts a promise that settles on a plain toast as bare", async () => {
      await mount();
      const card = await raise(() => toast("Copied"));
      card.setAttribute("data-type", "default");
      expect(tintsOf(card)).toEqual(["info"]);
    });
  });
}

describe("toast.css, the default kind", () => {
  it("never trusts the bare class alone: every rule that names it also asks for a card with no type", () => {
    const named = rulesWith(css, ".toast-bare").flatMap(([list]) => splitList(list).filter((selector) => selector.includes(".toast-bare")));
    expect(named.length).toBeGreaterThan(20);
    for (const selector of named) {
      const classes = selector.match(/\.toast-bare(-\w+)?/g) ?? [];
      // The guard follows the last bare class of the compound.
      const last = selector.lastIndexOf(classes[classes.length - 1]!) + classes[classes.length - 1]!.length;
      expect(selector.slice(last).startsWith(GUARD), selector).toBe(true);
    }
  });

  it("gives each kind's tint rule a twin for the bare class, on the desktop and on the phone", () => {
    const PHONE = '[data-sonner-toaster][data-y-position="bottom"]:where(.toast-phone) [data-sonner-toast]';
    for (const kind of KINDS) {
      for (const prefix of ["", PHONE]) {
        const [list] = rulesWith(css, `${prefix}.toast-${kind}`).find(([selectors]) => splitList(selectors).includes(`${prefix}.toast-${kind}`))!;
        expect(splitList(list), `${prefix}.toast-${kind}`).toEqual([`${prefix}.toast-${kind}`, `${prefix}.toast-bare-${kind}${GUARD}`]);
      }
    }
  });
});
