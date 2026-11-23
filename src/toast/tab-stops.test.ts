/**
 * @vitest-environment jsdom
 *
 * A tucked phone stack is out of sight, so nothing in it takes Tab (drive's
 * audit C066), while its live region keeps announcing (C301). The helper is
 * tested alone, then through the real <Toaster>.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { readCss, ruleFor } from "../../test/css.js";
import { holdTabStops } from "./tab-stops.js";
import { setToastsExpanded } from "./toast-stack.js";
import { PINNED_TOAST, Toaster } from "./toaster.js";
import { withPill } from "../../test/pill.js";

// These are the docked stack's tests, and a stack docks only beside a pill.
withPill();

/** A docked toast stack as Sonner draws it: a live section that is not a
 *  tab stop, a list item that is, and an action button inside it. */
function stack(): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = `
    <section tabindex="-1" aria-live="polite">
      <ol>
        <li tabindex="0"><span>Uploaded 3 files</span><button>Undo</button><a href="/f/1">Open</a></li>
      </ol>
    </section>`;
  document.body.appendChild(root);
  return root;
}

const stops = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>("section, li, button, a")].map((el) => el.getAttribute("tabindex"));

describe("holdTabStops", () => {
  afterEach(() => document.body.replaceChildren());

  it("takes the toasts and their actions out of the tab order, and puts each back", () => {
    const root = stack();
    const release = holdTabStops(root);
    expect(stops(root)).toEqual(["-1", "-1", "-1", "-1"]);
    // The live region stays in the tree: nothing is inert or hidden.
    expect(root.querySelector("[inert], [aria-hidden]")).toBeNull();
    release();
    expect(stops(root)).toEqual(["-1", "0", null, null]);
  });

  it("holds a toast that arrives while the stack is held", async () => {
    const root = stack();
    const release = holdTabStops(root);
    const li = document.createElement("li");
    li.tabIndex = 0;
    li.append(Object.assign(document.createElement("button"), { textContent: "Retry" }));
    root.querySelector("ol")!.append(li);
    await Promise.resolve();
    expect(li.tabIndex).toBe(-1);
    expect(li.querySelector("button")!.tabIndex).toBe(-1);
    release();
    expect(li.getAttribute("tabindex")).toBe("0");
    expect(li.querySelector("button")!.hasAttribute("tabindex")).toBe(false);
  });

  it("holds a toast whose tabindex is set again while held", async () => {
    const root = stack();
    const release = holdTabStops(root);
    const li = root.querySelector("li")!;
    li.setAttribute("tabindex", "0");
    await Promise.resolve();
    expect(li.tabIndex).toBe(-1);
    release();
    expect(li.getAttribute("tabindex")).toBe("0");
  });

  it("leaves what the exception names, and everything inside it", () => {
    const root = stack();
    root.querySelector("li")!.className = "toast-pinned";
    const other = document.createElement("li");
    other.tabIndex = 0;
    other.append(document.createElement("button"));
    root.querySelector("ol")!.append(other);
    const release = holdTabStops(root, "li.toast-pinned");
    expect(stops(root)).toEqual(["-1", "0", null, null, "-1", "-1"]);
    release();
  });

  it("follows an exception named by which card is in front", async () => {
    const root = stack();
    const li = root.querySelector("li")!;
    const release = holdTabStops(root, 'li[data-front="true"], li[data-again]');
    expect(li.tabIndex).toBe(-1);
    li.setAttribute("data-front", "true");
    await Promise.resolve();
    expect(stops(root)).toEqual(["-1", "0", null, null]);
    li.setAttribute("data-front", "false");
    await Promise.resolve();
    expect(li.tabIndex).toBe(-1);
    li.setAttribute("data-again", "");
    await Promise.resolve();
    expect(stops(root)).toEqual(["-1", "0", null, null]);
    release();
  });

  it("gives back a toast that becomes an exception, and takes one that stops being one", async () => {
    const root = stack();
    const li = root.querySelector("li")!;
    const release = holdTabStops(root, "li.toast-pinned");
    expect(li.tabIndex).toBe(-1);
    li.className = "toast-pinned";
    await Promise.resolve();
    expect(stops(root)).toEqual(["-1", "0", null, null]);
    li.className = "";
    await Promise.resolve();
    expect(stops(root)).toEqual(["-1", "-1", "-1", "-1"]);
    release();
    expect(stops(root)).toEqual(["-1", "0", null, null]);
  });
});

describe("the toaster's tucked tab stops", () => {
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
  /** Lets the phone's hold for a toast with a button (4000ms) and the dive run out. */
  async function tuck() {
    await act(async () => {
      vi.advanceTimersByTime(4000 + 720);
    });
  }
  const undo = { label: "Undo", onClick: () => {} };
  const card = (text: string) =>
    [...document.querySelectorAll<HTMLElement>("[data-sonner-toast]")].find((el) => el.textContent?.includes(text));
  const button = (text: string) => card(text)?.querySelector<HTMLElement>("[data-button]");

  it("keeps an announcing toast and its button reachable", async () => {
    await mount();
    await raise(() => toast.info("Archived", { action: undo }));
    expect(card("Archived")?.tabIndex).toBe(0);
    expect(button("Archived")?.tabIndex).toBe(0);
  });

  it("keeps the older toasts, hidden behind an announce, out of the tab order", async () => {
    await mount();
    await raise(() => toast.info("Archived", { action: undo }));
    await tuck();
    await raise(() => toast.success("Moved", { action: undo }));
    // The arrival is on screen; the card it hides is not.
    expect(card("Moved")?.tabIndex).toBe(0);
    expect(button("Moved")?.tabIndex).toBe(0);
    expect(card("Archived")?.tabIndex).toBe(-1);
    expect(button("Archived")?.tabIndex).toBe(-1);
  });

  it("follows the front card when a second toast arrives during the announce", async () => {
    await mount();
    await raise(() => toast.info("Archived", { action: undo }));
    await raise(() => toast.success("Moved", { action: undo }));
    expect(button("Moved")?.tabIndex).toBe(0);
    expect(button("Archived")?.tabIndex).toBe(-1);
  });

  it("gives Tab to a toast announced again from behind, and to no other", async () => {
    await mount();
    await raise(() => toast.loading("Uploading", { id: "tab-up", action: undo }));
    await raise(() => toast.info("Archived", { action: undo }));
    await tuck();
    await raise(() => toast.success("Uploaded", { id: "tab-up", action: undo }));
    expect(card("Uploaded")?.hasAttribute("data-again")).toBe(true);
    expect(button("Uploaded")?.tabIndex).toBe(0);
    expect(button("Archived")?.tabIndex).toBe(-1);
    await tuck();
    expect(button("Uploaded")?.tabIndex).toBe(-1);
  });

  it("takes them out of the tab order once the toast has tucked behind the pill", async () => {
    await mount();
    await raise(() => toast.info("Archived", { action: undo }));
    await tuck();
    expect(card("Archived")?.tabIndex).toBe(-1);
    expect(button("Archived")?.tabIndex).toBe(-1);
  });

  it("keeps Sonner's live region in the accessibility tree while it holds them", async () => {
    await mount();
    await raise(() => toast.info("Archived", { action: undo }));
    await tuck();
    const live = document.querySelector("section[aria-live]");
    expect(live).not.toBeNull();
    expect(live?.closest("[inert], [aria-hidden='true']")).toBeNull();
  });

  it("moves focus off a button that has just gone out of sight", async () => {
    await mount();
    await raise(() => toast.info("Archived", { action: undo }));
    button("Archived")?.focus();
    expect(document.activeElement).toBe(button("Archived"));
    await tuck();
    expect(document.activeElement).not.toBe(button("Archived"));
  });

  it("gives them back while the stack is fanned out, and takes them again when it tucks", async () => {
    await mount();
    await raise(() => toast.info("Archived", { action: undo }));
    await tuck();
    await act(async () => {
      setToastsExpanded(true);
    });
    expect(card("Archived")?.tabIndex).toBe(0);
    expect(button("Archived")?.tabIndex).toBe(0);
    await act(async () => {
      setToastsExpanded(false);
    });
    expect(button("Archived")?.tabIndex).toBe(-1);
  });

  it("leaves a pinned toast reachable, since it is in view", async () => {
    await mount();
    await raise(() => toast("Sending in 5s", { className: PINNED_TOAST, duration: Infinity, action: undo }));
    await raise(() => toast.info("Archived", { action: undo }));
    await tuck();
    expect(button("Sending in 5s")?.tabIndex).toBe(0);
    expect(card("Sending in 5s")?.tabIndex).toBe(0);
    expect(button("Archived")?.tabIndex).toBe(-1);
  });

  it("never holds the desktop's tabs: tabbing into them is how the column pulls out", async () => {
    phone = false;
    await mount();
    await raise(() => toast.info("Archived", { action: undo }));
    await tuck();
    expect(card("Archived")?.tabIndex).toBe(0);
    expect(button("Archived")?.tabIndex).toBe(0);
  });
});

describe("the band's keyboard ring", () => {
  const css = readCss("toast");

  it("is drawn around the pill's footprint, not across the screen", () => {
    expect(ruleFor(css, ".toast-band:focus-visible")).toContain("outline: none");
    const ring = ruleFor(css, ".toast-band:focus-visible::after");
    expect(ring).toContain("width: calc(var(--dl-bar-w) + 6px)");
    expect(ring).toContain("height: calc(var(--dl-bar-h) + 6px)");
    expect(ring).toContain("border: var(--dl-focus-w, 2px) solid var(--dl-focus-ring, var(--dl-fg, #fff))");
  });
});
