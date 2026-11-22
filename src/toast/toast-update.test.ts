/**
 * @vitest-environment jsdom
 *
 * A live toast updated in place: when that announces again, and which card
 * the announce is pointed at. The rule is pure (toast-update.ts); the rest
 * runs the real <Toaster> and reads the classes and the mark it writes.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast, type ToastT } from "sonner";
import { outweighs, readCss, rulesWith, specificity, splitList } from "../../test/css.js";
import { toastLine } from "./toast-line.js";
import { PINNED_TOAST, Toaster } from "./toaster.js";
import { announcesUpdate, faceOf, textOf } from "./toast-update.js";
import { withPill } from "../../test/pill.js";

// These are the docked stack's tests, and a stack docks only beside a pill.
withPill();

const face = (over: Partial<ToastT>) => faceOf({ id: 1, ...over } as ToastT);

describe("textOf", () => {
  it("reads a string, a number and the text inside an element", () => {
    expect(textOf("Saved")).toBe("Saved");
    expect(textOf(3)).toBe("3");
    expect(textOf(toastLine("Gate code", "archived"))).toBe("Gate code archived");
    expect(textOf(() => "Later")).toBe("Later");
    expect(textOf(null)).toBe("");
  });

  it("reads the same words from two elements built apart", () => {
    expect(textOf(toastLine("Gate code", "archived"))).toBe(textOf(toastLine("Gate code", "archived")));
  });
});

describe("announcesUpdate", () => {
  it("tells a change of kind", () => {
    expect(announcesUpdate(face({ type: "info", title: "Saving" }), face({ type: "error", title: "Saving" }))).toBe(true);
    expect(announcesUpdate(face({ title: "Draft" }), face({ type: "success", title: "Draft" }))).toBe(true);
  });

  it("tells a change of words within one kind", () => {
    expect(announcesUpdate(face({ type: "success", title: "Saved" }), face({ type: "success", title: "Saved again" }))).toBe(true);
    expect(
      announcesUpdate(
        face({ type: "info", title: "Moved", description: "to Archive" }),
        face({ type: "info", title: "Moved", description: "to Trash" }),
      ),
    ).toBe(true);
  });

  it("says nothing when the same toast is raised again unchanged", () => {
    expect(announcesUpdate(face({ type: "success", title: "Saved" }), face({ type: "success", title: "Saved" }))).toBe(false);
    expect(
      announcesUpdate(
        face({ type: "info", title: toastLine("Gate code", "archived") }),
        face({ type: "info", title: toastLine("Gate code", "archived") }),
      ),
    ).toBe(false);
  });

  it("says nothing for a tick: progress that is still progress", () => {
    expect(announcesUpdate(face({ type: "loading", title: "Zipping 10%" }), face({ type: "loading", title: "Zipping 40%" }))).toBe(false);
    expect(
      announcesUpdate(
        face({ title: "Uploading 2 of 9", className: "toast-progress" }),
        face({ title: "Uploading 3 of 9", className: "toast-progress x" }),
      ),
    ).toBe(false);
  });

  it("says nothing for a pinned toast that stays pinned, whatever it turns into", () => {
    expect(
      announcesUpdate(
        face({ title: "Sending in 5s", className: PINNED_TOAST }),
        face({ title: "Sending in 4s", className: PINNED_TOAST }),
      ),
    ).toBe(false);
    expect(
      announcesUpdate(
        face({ title: "Sending in 1s", className: PINNED_TOAST }),
        face({ type: "loading", title: "Sending", className: PINNED_TOAST }),
      ),
    ).toBe(false);
  });

  it("tells work that became its result, and a pin that let go", () => {
    expect(announcesUpdate(face({ type: "loading", title: "Sending" }), face({ type: "success", title: "Sent" }))).toBe(true);
    expect(
      announcesUpdate(
        face({ type: "loading", title: "Sending", className: PINNED_TOAST }),
        face({ type: "success", title: "Sent", className: undefined }),
      ),
    ).toBe(true);
    expect(
      announcesUpdate(face({ title: "Uploading", className: "toast-progress" }), face({ title: "Uploading", className: "" })),
    ).toBe(true);
  });

  it("tells a result that went back to work", () => {
    expect(announcesUpdate(face({ type: "success", title: "Uploaded" }), face({ type: "loading", title: "Uploading" }))).toBe(true);
  });
});

describe("the toaster and an update in place", () => {
  let host: HTMLElement;
  let root: Root;
  let phone = false;

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
    phone = false;
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
      vi.advanceTimersByTime(1000);
      root.unmount();
    });
    host.remove();
    vi.useRealTimers();
  });

  /** Raises or updates a toast and lets Sonner publish it. */
  async function raise(fire: () => void) {
    await act(async () => {
      fire();
    });
    await act(async () => {
      vi.advanceTimersByTime(20);
    });
  }
  /** Lets the desktop's longest hold and the tuck run out. */
  async function settle() {
    await act(async () => {
      vi.advanceTimersByTime(4000 + 720);
    });
  }

  const list = () => document.querySelector<HTMLElement>("[data-sonner-toaster]");
  const has = (name: string) => list()?.classList.contains(name) ?? false;
  const cards = () => [...document.querySelectorAll<HTMLElement>("[data-sonner-toast]")];
  const marked = () => cards().filter((card) => card.hasAttribute("data-again"));
  const titled = (text: string) => cards().find((card) => card.textContent?.includes(text));

  it("announces the front toast again with no mark, since the front card is already the target", async () => {
    await raise(() => toast.loading("Uploading", { id: "up" }));
    await settle();
    expect(has("toast-announcing")).toBe(false);
    await raise(() => toast.success("Uploaded", { id: "up" }));
    expect(cards()).toHaveLength(1);
    expect(has("toast-announcing")).toBe(true);
    expect(has("toast-again")).toBe(false);
    expect(marked()).toHaveLength(0);
  });

  it("marks the card of a toast that changed kind behind newer ones", async () => {
    await raise(() => toast.loading("Uploading", { id: "up" }));
    await raise(() => toast.info("Link copied"));
    await raise(() => toast.info("Moved to Archive"));
    await settle();
    await raise(() => toast.success("Uploaded", { id: "up" }));
    expect(cards()).toHaveLength(3);
    expect(has("toast-announcing")).toBe(true);
    expect(has("toast-again")).toBe(true);
    expect(marked()).toEqual([titled("Uploaded")]);
    expect(titled("Uploaded")?.getAttribute("data-front")).toBe("false");
  });

  it("takes the mark away when the phases end", async () => {
    await raise(() => toast.loading("Uploading", { id: "up" }));
    await raise(() => toast.info("Link copied"));
    await settle();
    await raise(() => toast.success("Uploaded", { id: "up" }));
    expect(marked()).toHaveLength(1);
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });
    expect(has("toast-slotting")).toBe(true);
    expect(has("toast-again")).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(720);
    });
    expect(has("toast-again")).toBe(false);
    expect(marked()).toHaveLength(0);
  });

  it("stays quiet through a progress tick and a repeat", async () => {
    await raise(() => toast.loading("Zipping 10%", { id: "zip" }));
    await raise(() => toast.success("Saved", { id: "save" }));
    await settle();
    await raise(() => toast.loading("Zipping 40%", { id: "zip" }));
    expect(has("toast-announcing")).toBe(false);
    await raise(() => toast.success("Saved", { id: "save" }));
    expect(has("toast-announcing")).toBe(false);
    expect(marked()).toHaveLength(0);
  });

  it("gives an arrival the announce even when an update lands with it", async () => {
    await raise(() => toast.loading("Uploading", { id: "up" }));
    await raise(() => toast.info("Link copied"));
    await settle();
    await raise(() => {
      toast.success("Uploaded", { id: "up" });
      toast.error("No connection");
    });
    expect(has("toast-announcing")).toBe(true);
    expect(has("toast-again")).toBe(false);
    expect(marked()).toHaveLength(0);
  });

  it("holds a result with a button as long as an arrival with one", async () => {
    await raise(() => toast.loading("Sending", { id: "send" }));
    await raise(() => toast.info("Link copied"));
    await settle();
    await raise(() => toast.success("Sent", { id: "send", action: { label: "View", onClick: () => {} } }));
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });
    // 1600ms is the plain hold; a button holds for 4000.
    expect(has("toast-announcing")).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(2400);
    });
    expect(has("toast-slotting")).toBe(true);
  });

  it("still finds the card after every toast was dismissed at once", async () => {
    // Sonner 2.0.7 keeps listing a toast as live after `toast.dismiss()` with
    // no id, so the cards are paired with the ids as each arrives instead.
    await raise(() => toast.info("One"));
    await raise(() => toast.info("Two"));
    await act(async () => {
      toast.dismiss();
    });
    // A frame for Sonner to mark the cards, then their 200ms on the way out.
    for (let step = 0; step < 3; step++) {
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
    }
    expect(cards()).toHaveLength(0);
    await raise(() => toast.loading("Uploading", { id: "after-dismiss-all" }));
    await raise(() => toast.info("Link copied"));
    await settle();
    await raise(() => toast.success("Uploaded", { id: "after-dismiss-all" }));
    expect(has("toast-again")).toBe(true);
    expect(marked()).toEqual([titled("Uploaded")]);
  });

  it("shows a toast announced again from beyond the column's five", async () => {
    await raise(() => toast.loading("Uploading", { id: "far" }));
    for (const name of ["one", "two", "three", "four", "five", "six"]) await raise(() => toast.info(name));
    await settle();
    // Sonner hides every card past `visibleToasts`: opacity 0, no pointer.
    expect(titled("Uploading")?.getAttribute("data-visible")).toBe("false");
    await raise(() => toast.error("Upload failed", { id: "far", action: { label: "Retry", onClick: () => {} } }));
    const card = titled("Upload failed")!;
    expect(has("toast-again")).toBe(true);
    expect(card.hasAttribute("data-again")).toBe(true);
    expect(card.getAttribute("data-visible")).toBe("false");
    const css = readCss("toast");
    const shown = rulesWith(css, '[data-again][data-visible="false"]');
    // One rule brings it back into view on either layout, and one hands the
    // desktop's card its pointer back, so the button on it can be pressed.
    const seen = shown.filter(([selector]) => card.matches(selector));
    expect(seen.map(([, body]) => body).join(" ")).toContain("opacity: 1 !important");
    expect(seen.map(([, body]) => body).join(" ")).toContain("pointer-events: auto");
    for (const [selector] of seen) expect(outweighs(selector, "[data-sonner-toast][data-visible=false]"), selector).toBe(true);
  });

  it("does the same on the phone", async () => {
    phone = true;
    await act(async () => {
      root.render(createElement(Toaster));
    });
    await raise(() => toast.loading("Uploading", { id: "up" }));
    await raise(() => toast.info("Link copied"));
    await act(async () => {
      vi.advanceTimersByTime(1150 + 720);
    });
    await raise(() => toast.error("Upload failed", { id: "up" }));
    expect(has("toast-phone")).toBe(true);
    expect(has("toast-announcing")).toBe(true);
    expect(has("toast-again")).toBe(true);
    expect(marked()).toEqual([titled("Upload failed")]);
  });
});

describe("toast.css, announcing again", () => {
  const css = readCss("toast");

  it("gives every rule that names the front card a twin that names the marked one", () => {
    const front = rulesWith(css, "toast-announcing")
      .concat(rulesWith(css, "toast-slotting"))
      .flatMap(([list]) => splitList(list))
      .filter((selector) => selector.includes("[data-front="));
    expect(front.length).toBeGreaterThan(0);
    for (const selector of front) {
      expect(selector, selector).toContain(":where(:not(.toast-again))");
      const twin = selector
        .replace(":where(:not(.toast-again))", ":where(.toast-again)")
        .replace('[data-front="true"]', "[data-again]")
        .replace('[data-front="false"]', ":not([data-again])");
      expect(css.replace(/\s+/g, " "), twin).toContain(twin);
      expect(specificity(twin), twin).toEqual(specificity(selector));
    }
  });

  it("ends the dive on the card's own slot, the front slot for an arrival", () => {
    const frames = css.slice(css.indexOf("@keyframes notif-slot-in"));
    const last = frames.slice(frames.indexOf("100%"), frames.indexOf("}", frames.indexOf("100%")));
    expect(last).toContain("translateY(calc(-1 * var(--notif-peek) * var(--slot, 1)))");
    expect(last).toContain("scale(calc(1 - 0.05 * var(--slot, 1)))");
  });
});
