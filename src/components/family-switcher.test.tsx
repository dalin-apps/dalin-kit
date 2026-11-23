/**
 * @vitest-environment jsdom
 *
 * <FamilySwitcher>: the wordmark as the way to the other three apps.
 */
import { act } from "react";
import { describe, expect, it } from "vitest";
import { readCss, ruleFor } from "../../test/css.js";
import { all, click, key, mount, one, settle, withDom } from "../../test/dom.js";
import { FamilySwitcher, offsetPastBoundary } from "./family-switcher.js";

withDom();

const css = readCss("wordmark");
const trigger = () => one<HTMLButtonElement>('[data-slot="family-switcher"]')!;
const menu = () => one(".dl-menu.dl-switcher");
const rows = () => all<HTMLAnchorElement>('.dl-switcher [role="menuitem"]');

describe("<FamilySwitcher>", () => {
  it("shows the app's own wordmark and nothing else at rest", async () => {
    const host = await mount(<FamilySwitcher app="mail" size={32} />);
    expect(menu()).toBeNull();
    expect(host.querySelectorAll("svg")).toHaveLength(0);
    const mark = trigger().querySelector(".dl-wordmark") as HTMLElement;
    expect(mark.getAttribute("aria-label")).toBe("dalin. mail");
    expect(mark.style.fontSize).toBe("32px");
    expect(trigger().children).toHaveLength(1);
  });

  it("is a button named for where you are and what it does", async () => {
    await mount(<FamilySwitcher app="drive" />);
    expect(trigger().tagName).toBe("BUTTON");
    expect(trigger().getAttribute("aria-label")).toBe("dalin. drive. Switch app");
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    await mount(<FamilySwitcher app="drive" label="Cambiar de app" />);
    expect(trigger().getAttribute("aria-label")).toBe("dalin. drive. Cambiar de app");
  });

  it("opens the frosted menu to the RIGHT of the wordmark, from its top, with its arrow", async () => {
    await mount(<FamilySwitcher app="mail" />);
    await click(trigger());
    expect(menu()).not.toBeNull();
    expect(menu()?.querySelector(":scope > .dl-menu-arrow")).not.toBeNull();
    // Beside the wordmark, over the next column: never under it, where it
    // covered the create button and the sidebar's search.
    expect(menu()?.getAttribute("data-side")).toBe("right");
    expect(menu()?.getAttribute("data-align")).toBe("start");
    expect(menu()?.querySelector(".dl-menu-arrow")?.getAttribute("data-side")).toBe("right");
  });

  it("takes another side where the app asks, as the phone's header does", async () => {
    await mount(<FamilySwitcher app="mail" side="bottom" />);
    await click(trigger());
    expect(menu()?.getAttribute("data-side")).toBe("bottom");
  });

  it("opens when the pointer rests on the wordmark, and not the moment it passes", async () => {
    await mount(<FamilySwitcher app="mail" />);
    await act(async () => {
      for (const type of ["pointerenter", "mouseenter", "mouseover", "mousemove"]) {
        trigger().dispatchEvent(new MouseEvent(type, { bubbles: type !== "mouseenter" && type !== "pointerenter", clientX: 5, clientY: 5 }));
      }
    });
    expect(menu()).toBeNull();
    await settle(400);
    expect(menu()).not.toBeNull();
    expect(menu()?.getAttribute("data-side")).toBe("right");
  });

  const hover = async () => {
    await act(async () => {
      for (const type of ["pointerenter", "mouseenter", "mouseover", "mousemove"]) {
        trigger().dispatchEvent(new MouseEvent(type, { bubbles: type !== "mouseenter" && type !== "pointerenter", clientX: 5, clientY: 5 }));
      }
    });
    await settle(400);
  };

  it("leaves focus, and so the app's single-key shortcuts, alone while a resting pointer holds it open", async () => {
    const heard: Array<{ key: string; inMenu: boolean; prevented: boolean }> = [];
    const onKey = (event: KeyboardEvent) =>
      heard.push({ key: event.key, inMenu: (event.target as Element).closest(".dl-menu") !== null, prevented: event.defaultPrevented });
    document.addEventListener("keydown", onKey);
    try {
      await mount(
        <>
          <FamilySwitcher app="mail" />
          <ul className="list" tabIndex={0} />
        </>,
      );
      const list = one<HTMLElement>(".list")!;
      list.focus();
      await hover();
      expect(menu()).not.toBeNull();
      // The list keeps the focus it had: a key pressed now is the app's.
      expect(document.activeElement).toBe(list);
      await key("e");
      expect(heard).toEqual([{ key: "e", inMenu: false, prevented: false }]);
      expect(menu()).not.toBeNull();
    } finally {
      document.removeEventListener("keydown", onKey);
    }
  });

  it("takes no focus on hover with nothing focused either", async () => {
    await mount(<FamilySwitcher app="mail" />);
    await hover();
    expect(menu()).not.toBeNull();
    expect(menu()?.contains(document.activeElement)).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it("leaves focus where it was when Escape closes a menu the pointer opened", async () => {
    await mount(
      <>
        <FamilySwitcher app="mail" />
        <ul className="list" tabIndex={0} />
      </>,
    );
    const list = one<HTMLElement>(".list")!;
    list.focus();
    await hover();
    await key("Escape");
    await settle(300);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(list);
  });

  it("takes focus as before when a press or a key opens it", async () => {
    await mount(
      <>
        <FamilySwitcher app="mail" />
        <ul className="list" tabIndex={0} />
      </>,
    );
    one<HTMLElement>(".list")!.focus();
    await click(trigger());
    await settle(100);
    expect(menu()?.contains(document.activeElement)).toBe(true);
  });

  it("lists the four apps as their own wordmarks, each period in that app's accent", async () => {
    await mount(<FamilySwitcher app="mail" />);
    await click(trigger());
    const marks = rows().map((row) => row.querySelector<HTMLElement>(".dl-wordmark")!);
    expect(marks.map((mark) => mark.getAttribute("aria-label"))).toEqual([
      "dalin. mail",
      "dalin. calendar",
      "dalin. notes",
      "dalin. drive",
    ]);
    expect(marks.map((mark) => mark.style.getPropertyValue("--dl-wordmark-dot"))).toEqual([
      "oklch(0.64 0.28 285)",
      "oklch(0.64 0.16 50)",
      "oklch(0.85 0.175 95)",
      "oklch(0.64 0.16 240)",
    ]);
  });

  it("makes every row a link to its app", async () => {
    await mount(<FamilySwitcher app="notes" />);
    await click(trigger());
    expect(rows().every((row) => row.tagName === "A")).toBe(true);
    expect(rows().map((row) => row.href)).toEqual([
      "https://mail.dalin.pro/",
      "https://calendar.dalin.pro/",
      "https://notes.dalin.pro/",
      "https://drive.dalin.pro/",
    ]);
  });

  it.each(["mail", "calendar", "notes", "drive"] as const)("checks %s, and only it, when it is the app you are in", async (app) => {
    await mount(<FamilySwitcher app={app} />);
    await click(trigger());
    const current = rows().filter((row) => row.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]!.querySelector(".dl-wordmark")?.getAttribute("aria-label")).toBe(`dalin. ${app}`);
    expect(rows().filter((row) => row.querySelector("svg.dl-menu-end") !== null)).toEqual(current);
  });

  it("takes another address for an app, for a build that is not on dalin.pro", async () => {
    await mount(<FamilySwitcher app="mail" hrefs={{ calendar: "http://localhost:3217/" }} />);
    await click(trigger());
    expect(rows().map((row) => row.href)).toEqual([
      "https://mail.dalin.pro/",
      "http://localhost:3217/",
      "https://notes.dalin.pro/",
      "https://drive.dalin.pro/",
    ]);
  });

  it("is reachable from the keyboard: a press opens, the arrows move, Escape closes and gives focus back", async () => {
    await mount(<FamilySwitcher app="mail" />);
    trigger().focus();
    // Enter or Space on a focused button is a click with no pointer.
    await click(trigger());
    expect(menu()).not.toBeNull();
    await key("ArrowDown");
    const first = document.activeElement as HTMLElement;
    expect(rows()).toContain(first);
    await key("ArrowDown");
    const second = document.activeElement as HTMLElement;
    expect(rows()).toContain(second);
    expect(second).not.toBe(first);
    await key("Escape");
    await settle(300);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("does not lock the page under a menu that a resting pointer opened", async () => {
    await mount(<FamilySwitcher app="mail" />);
    await click(trigger());
    // A modal menu lays a layer over the page that takes every pointer, and
    // stops the page scrolling. This one does neither.
    expect(document.querySelector('[role="presentation"][data-base-ui-inert]')).toBeNull();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("passes the fold and the roll to its wordmark", async () => {
    await mount(<FamilySwitcher app="mail" folded />);
    expect(trigger().querySelector(".dl-wordmark")?.hasAttribute("data-folded")).toBe(true);
    await mount(<FamilySwitcher app="mail" rollOut />);
    expect(trigger().querySelector(".dl-wordmark")?.hasAttribute("data-roll")).toBe(true);
  });
});

/** A page laid out as the apps are: a 240px sidebar, the wordmark at its top left, as wide as the app's name. */
const rect = (x: number, y: number, w: number, h: number) =>
  ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON() {} }) as DOMRect;
async function placedAt(node: Parameters<typeof mount>[0], wordmarkWidth: number, sidebar = 240) {
  const real = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (this.matches("aside, [data-sidebar]")) return rect(0, 0, sidebar, 900);
    if (this.matches(".other-column")) return rect(0, 0, 300, 900);
    if (this.matches('[data-slot="family-switcher"]')) return rect(16, 14, wordmarkWidth, 36);
    if (this.matches(".dl-menu-positioner")) return rect(0, 0, 176, 180);
    return real.call(this);
  };
  // jsdom's viewport is 0 by 0, and a menu with no room flips.
  const page = document.documentElement;
  Object.defineProperty(page, "clientWidth", { value: 1440, configurable: true });
  Object.defineProperty(page, "clientHeight", { value: 900, configurable: true });
  try {
    await mount(node);
    await click(trigger());
    await settle(50);
    const style = one(".dl-menu-positioner")!.style.transform;
    const [, x, y] = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(style)!;
    return { x: Number(x), y: Number(y) };
  } finally {
    Element.prototype.getBoundingClientRect = real;
    delete (page as { clientWidth?: number }).clientWidth;
    delete (page as { clientHeight?: number }).clientHeight;
  }
}

describe("<FamilySwitcher>, where the menu lands", () => {
  // Each app's wordmark ends somewhere else: the old menu opened 10px past
  // it, at x 162 in mail and 216 in calendar, over the sidebar's search.
  it.each([
    ["mail", 136],
    ["calendar", 190],
    ["notes", 146],
    ["drive", 145.5],
  ] as const)("opens %s's menu just past the sidebar's right edge, at the same x in every app", async (app, width) => {
    const at = await placedAt(
      <aside>
        <FamilySwitcher app={app} />
      </aside>,
      width,
    );
    expect(at.x).toBe(250);
  });

  it("keeps the menu's top where it was, on the wordmark's top", async () => {
    const past = await placedAt(<aside><FamilySwitcher app="mail" /></aside>, 136);
    // A fresh tree, so the press opens a new menu and does not close the first.
    const beside = await placedAt(<aside key="beside"><FamilySwitcher app="mail" boundary={false} /></aside>, 136);
    expect(past.y).toBe(beside.y);
    expect(beside.x).toBe(16 + 136 + 10);
    expect(menu()?.getAttribute("data-side")).toBe("right");
  });

  it("finds a sidebar marked [data-sidebar] as well as an <aside>", async () => {
    const at = await placedAt(<div data-sidebar=""><FamilySwitcher app="notes" /></div>, 146);
    expect(at.x).toBe(250);
  });

  it("follows a sidebar of another width", async () => {
    const at = await placedAt(<aside><FamilySwitcher app="notes" /></aside>, 146, 252);
    expect(at.x).toBe(262);
  });

  it("takes the boundary and the offset an app passes", async () => {
    const column = document.createElement("div");
    column.className = "other-column";
    document.body.appendChild(column);
    const at = await placedAt(<aside><FamilySwitcher app="drive" boundary={column} boundaryOffset={16} /></aside>, 145.5);
    expect(at.x).toBe(316);
  });

  it("opens past the wordmark as before where no sidebar holds it", async () => {
    const at = await placedAt(<FamilySwitcher app="mail" />, 136);
    expect(at.x).toBe(162);
  });

  it("leaves a menu below the wordmark, the phone's, where it was", async () => {
    const at = await placedAt(<aside><FamilySwitcher app="mail" side="bottom" /></aside>, 136);
    expect(menu()?.getAttribute("data-side")).toBe("bottom");
    expect(at.y).toBe(14 + 36 + 10);
  });

  it("works the offset out from the two edges, never nearer the wordmark than the gap", () => {
    expect(offsetPastBoundary(rect(16, 14, 136, 36), rect(0, 0, 240, 900), 10)).toBe(98);
    expect(offsetPastBoundary(rect(16, 14, 136, 36), rect(0, 0, 100, 900), 10)).toBe(10);
    expect(offsetPastBoundary(rect(16, 14, 136, 36), null, 10)).toBe(10);
  });
});

describe("wordmark.css, the switcher", () => {
  it("draws nothing on the trigger at rest", () => {
    const body = ruleFor(css, ".dl-switcher-trigger");
    expect(body).toContain("background: none");
    expect(body).toContain("border: 0");
    expect(body).toContain("padding: 0");
    expect(body).toContain("cursor: default");
  });

  it("rings the trigger for the keyboard in the app's focus colour", () => {
    expect(ruleFor(css, ".dl-switcher-trigger:focus-visible")).toContain(
      "outline: 2px solid var(--dl-focus-ring, var(--dl-fg, #fff))",
    );
  });

  it("sets the menu's wordmarks at 15px in rows 10px in, at least 176px wide", () => {
    expect(ruleFor(css, ".dl-menu.dl-switcher")).toContain("min-width: 176px");
    expect(ruleFor(css, ".dl-switcher .dl-menu-item")).toContain("padding: 0 8px 0 10px");
    expect(ruleFor(css, ".dl-switcher .dl-wordmark")).toContain("font-size: 15px");
  });
});
