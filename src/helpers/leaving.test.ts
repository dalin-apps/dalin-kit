/**
 * @vitest-environment jsdom
 *
 * The close fade's copy: when an overlay leaving the document leaves one, and
 * what the copy is. Runs the real observer on jsdom's document.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readCss, ruleFor } from "../../test/css.js";
import { INPUT_ATTR } from "./input-modality.js";
import { LEAVING_ATTR, endFades, leaveInPlace, shouldLeave, watchLeaving } from "./leaving.js";

const SELECTORS = [".menu", ".scrim", ".popover"];
const ALL = SELECTORS.join(", ");

/** A removed node, as the observer sees one. */
function gone(over: Partial<{ classes: string[]; attrs: string[]; isConnected: boolean; visibility: string; opacity: string }> = {}) {
  const classes = over.classes ?? ["menu"];
  const attrs = over.attrs ?? [];
  return {
    matches: (selector: string) => selector.split(", ").some((s) => classes.includes(s.slice(1))),
    hasAttribute: (name: string) => attrs.includes(name),
    isConnected: over.isConnected ?? false,
    style: { visibility: over.visibility ?? "visible", opacity: over.opacity ?? "" },
  };
}

describe("shouldLeave", () => {
  it("fades a named menu or dialog that left the document", () => {
    expect(shouldLeave(gone(), ALL)).toBe(true);
    expect(shouldLeave(gone({ classes: ["scrim"] }), ALL)).toBe(true);
  });

  it("ignores everything that is not one of the named overlays", () => {
    expect(shouldLeave(gone({ classes: ["row"] }), ALL)).toBe(false);
    // A card inside a scrim is carried by the scrim's own copy.
    expect(shouldLeave(gone({ classes: ["card"] }), ALL)).toBe(false);
  });

  it("ignores a node React only moved, which is back in the document", () => {
    expect(shouldLeave(gone({ isConnected: true }), ALL)).toBe(false);
  });

  it("never copies a copy", () => {
    expect(shouldLeave(gone({ attrs: [LEAVING_ATTR] }), ALL)).toBe(false);
  });

  it("leaves nothing behind an overlay that was never shown", () => {
    expect(shouldLeave(gone({ visibility: "hidden" }), ALL)).toBe(false);
    expect(shouldLeave(gone({ opacity: "0" }), ALL)).toBe(false);
  });
});

describe("watchLeaving", () => {
  let stop: () => void;
  let reduced = false;

  beforeEach(() => {
    vi.useFakeTimers();
    reduced = false;
    document.documentElement.removeAttribute(INPUT_ATTR);
    stop = watchLeaving({ selectors: SELECTORS, reducedMotion: () => reduced });
  });

  afterEach(() => {
    stop();
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  function open(className: string, html = ""): HTMLElement {
    const el = document.createElement("div");
    el.className = className;
    el.innerHTML = html;
    document.body.append(el);
    return el;
  }
  /** Lets the observer's microtask run. */
  const settle = () => Promise.resolve();
  const copies = () => [...document.querySelectorAll<HTMLElement>(`[${LEAVING_ATTR}]`)];

  it("leaves an inert, hidden copy where a closed overlay stood, then removes it", async () => {
    const before = open("row");
    const menu = open("menu", "<button>Rename</button>");
    const after = open("row");
    await settle();
    menu.remove();
    await settle();
    const [copy] = copies();
    expect(copy).toBeDefined();
    expect(copy?.className).toBe("menu");
    expect(copy?.textContent).toBe("Rename");
    expect(copy?.getAttribute("aria-hidden")).toBe("true");
    expect(copy?.hasAttribute("inert")).toBe(true);
    expect(copy?.previousElementSibling).toBe(before);
    expect(copy?.nextElementSibling).toBe(after);
    vi.advanceTimersByTime(170);
    expect(copies()).toHaveLength(0);
  });

  it("goes when its fade ends, without waiting for the timer", async () => {
    const menu = open("menu");
    await settle();
    menu.remove();
    await settle();
    copies()[0]?.dispatchEvent(new Event("animationend"));
    expect(copies()).toHaveLength(0);
  });

  it("carries what a clone does not: a typed value, a ticked box, a chosen option", async () => {
    const dialog = open(
      "scrim",
      '<input class="t"><input type="checkbox" class="c"><textarea></textarea><select><option>a</option><option>b</option></select>',
    );
    dialog.querySelector<HTMLInputElement>(".t")!.value = "Lisbon";
    dialog.querySelector<HTMLInputElement>(".c")!.checked = true;
    dialog.querySelector("textarea")!.value = "notes";
    dialog.querySelector("select")!.selectedIndex = 1;
    await settle();
    dialog.remove();
    await settle();
    const copy = copies()[0]!;
    expect(copy.querySelector<HTMLInputElement>(".t")!.value).toBe("Lisbon");
    expect(copy.querySelector<HTMLInputElement>(".c")!.checked).toBe(true);
    expect(copy.querySelector("textarea")!.value).toBe("notes");
    expect(copy.querySelector("select")!.selectedIndex).toBe(1);
  });

  it("keeps the ids of an overlay that has left, so a mask is still found by its id", async () => {
    const menu = open("menu", '<svg><mask id="m"></mask></svg>');
    menu.id = "page-menu";
    await settle();
    menu.remove();
    await settle();
    expect(copies()[0]?.id).toBe("page-menu");
    expect(copies()[0]?.querySelector("#m")).not.toBeNull();
  });

  it("leaves no copy for a close that started from the keyboard", async () => {
    const menu = open("menu");
    await settle();
    document.documentElement.setAttribute(INPUT_ATTR, "keyboard");
    menu.remove();
    await settle();
    expect(copies()).toHaveLength(0);
  });

  it("leaves no copy under the app's reduced motion", async () => {
    const menu = open("menu");
    await settle();
    reduced = true;
    menu.remove();
    await settle();
    expect(copies()).toHaveLength(0);
  });

  it("leaves no copy for an overlay removed along with what holds it", async () => {
    const page = open("page", '<div class="popover">Colour</div>');
    await settle();
    page.remove();
    await settle();
    expect(copies()).toHaveLength(0);
  });

  it("leaves no copy for an overlay replaced by one of its own kind", async () => {
    const first = open("menu", "one");
    await settle();
    first.remove();
    open("menu", "two");
    await settle();
    expect(copies()).toHaveLength(0);
  });

  it("ends a fade still running when its kind opens again", async () => {
    const menu = open("menu");
    await settle();
    menu.remove();
    await settle();
    expect(copies()).toHaveLength(1);
    open("menu", "again");
    await settle();
    expect(copies()).toHaveLength(0);
    // A different kind opening leaves another kind's fade alone.
    const pop = open("popover");
    await settle();
    pop.remove();
    await settle();
    open("scrim");
    await settle();
    expect(copies().map((c) => c.className)).toEqual(["popover"]);
  });

  it("ignores everything else that leaves the page", async () => {
    const row = open("row");
    await settle();
    row.remove();
    await settle();
    expect(copies()).toHaveLength(0);
  });

  it("stops when asked", async () => {
    const menu = open("menu");
    await settle();
    stop();
    menu.remove();
    await settle();
    expect(copies()).toHaveLength(0);
  });
});

describe("leaveInPlace and endFades", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.documentElement.removeAttribute(INPUT_ATTR);
  });
  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  function menu(): HTMLElement {
    const el = document.createElement("div");
    el.className = "account-menu";
    el.id = "account";
    el.innerHTML = '<span id="name">Samuel</span>';
    document.body.append(el);
    return el;
  }
  const copies = () => [...document.querySelectorAll<HTMLElement>(`[${LEAVING_ATTR}]`)];

  it("puts a copy beside an overlay that stays mounted, once per close", () => {
    const el = menu();
    leaveInPlace(el, { reducedMotion: () => false });
    leaveInPlace(el, { reducedMotion: () => false });
    expect(copies()).toHaveLength(1);
    expect(el.nextElementSibling).toBe(copies()[0]);
    vi.advanceTimersByTime(170);
    expect(copies()).toHaveLength(0);
  });

  it("drops the copy's ids, since the original is still in the document", () => {
    const el = menu();
    leaveInPlace(el, { reducedMotion: () => false });
    expect(document.querySelectorAll("#account")).toHaveLength(1);
    expect(document.querySelectorAll("#name")).toHaveLength(1);
    expect(copies()[0]?.textContent).toBe("Samuel");
  });

  it("makes no copy from the keyboard, under reduced motion, or for nothing", () => {
    const el = menu();
    document.documentElement.setAttribute(INPUT_ATTR, "keyboard");
    leaveInPlace(el, { reducedMotion: () => false });
    document.documentElement.removeAttribute(INPUT_ATTR);
    leaveInPlace(el, { reducedMotion: () => true });
    leaveInPlace(null);
    expect(copies()).toHaveLength(0);
  });

  it("ends the fades of one kind when asked, for an overlay opening again", () => {
    const el = menu();
    leaveInPlace(el, { reducedMotion: () => false });
    endFades(".other, .more");
    expect(copies()).toHaveLength(1);
    endFades(".account-menu");
    expect(copies()).toHaveLength(0);
  });
});

describe("motion.css", () => {
  const css = readCss("motion");

  it("fades the copy over the family's close, on the family's curve", () => {
    const body = ruleFor(css, `[${LEAVING_ATTR}]`);
    expect(body).toContain("animation: dl-leave var(--dl-t-close, 110ms) var(--dl-ease,");
    expect(body).toContain("forwards !important");
    expect(body).toContain("pointer-events: none !important");
    expect(css.replace(/\s+/g, " ")).toContain("@keyframes dl-leave { to { opacity: 0; } }");
  });

  it("holds everything inside the copy still, so no child's entrance replays", () => {
    const inside = css.replace(/\s+/g, " ");
    expect(inside).toContain("[data-dl-leaving] *, [data-dl-leaving] *::before, [data-dl-leaving] *::after {");
    expect(inside).toContain("animation: none !important; transition: none !important;");
  });

  it("matches the 110ms the tokens name for a close", () => {
    expect(readCss("tokens")).toContain("--dl-t-close: 110ms;");
  });
});
