/**
 * @vitest-environment jsdom
 *
 * <FamilySwitcher>: the wordmark as the way to the other three apps.
 */
import { act } from "react";
import { describe, expect, it } from "vitest";
import { readCss, ruleFor } from "../../test/css.js";
import { all, click, key, mount, one, settle, withDom } from "../../test/dom.js";
import { FamilySwitcher } from "./family-switcher.js";

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

  it("opens the frosted menu, with its arrow, when pressed", async () => {
    await mount(<FamilySwitcher app="mail" />);
    await click(trigger());
    expect(menu()).not.toBeNull();
    expect(menu()?.querySelector(":scope > .dl-menu-arrow")).not.toBeNull();
    expect(menu()?.getAttribute("data-side")).toBe("bottom");
    expect(menu()?.getAttribute("data-align")).toBe("start");
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
