/**
 * @vitest-environment jsdom
 *
 * The frosted overlays: the menu, the context menu, the popover and the
 * keycap. Runs the real Base UI parts in jsdom for the structure and the
 * keys, and reads menu.css for the look.
 */
import { act, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { outweighs, readCss, ruleFor, ruleNaming, rulesWith, splitList } from "../../test/css.js";
import { all, click, key, mount, one, settle, withDom } from "../../test/dom.js";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "./context-menu.js";
import { Kbd } from "./kbd.js";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuLinkItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "./menu.js";
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "./popover.js";

withDom();

const css = readCss("menu");
const tokens = readCss("tokens");

function RowMenu({ onArchive, arrow }: { onArchive?: () => void; arrow?: boolean }) {
  return (
    <Menu>
      <MenuTrigger>More</MenuTrigger>
      <MenuContent arrow={arrow}>
        <MenuGroup>
          <MenuLabel>This message</MenuLabel>
          <MenuItem>Reply</MenuItem>
          <MenuItem>
            Star <MenuShortcut keys={["S"]} />
          </MenuItem>
          <MenuLinkItem href="https://mail.dalin.pro/help">Help</MenuLinkItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem variant="destructive" onClick={onArchive}>
          Archive <MenuShortcut>E</MenuShortcut>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

const trigger = () => one('[data-slot="menu-trigger"]')!;
const rows = () => all('.dl-menu [role="menuitem"]');

describe("<Menu>", () => {
  it("closes on a click on a link row, as on any row, unless told to stay open", async () => {
    const LinkMenu = ({ stay }: { stay?: boolean }) => (
      <Menu>
        <MenuTrigger>More</MenuTrigger>
        <MenuContent>
          <MenuLinkItem href="#help" closeOnClick={stay ? false : undefined}>
            Help
          </MenuLinkItem>
        </MenuContent>
      </Menu>
    );
    await mount(<LinkMenu />);
    await click(trigger());
    await click(one('[data-slot="menu-link-item"]'));
    await settle(300);
    expect(one(".dl-menu")).toBeNull();
    await mount(<LinkMenu key="stay" stay />);
    await click(trigger());
    await click(one('[data-slot="menu-link-item"]'));
    await settle(300);
    expect(one(".dl-menu")).not.toBeNull();
  });

  it("shows nothing until its trigger is pressed", async () => {
    await mount(<RowMenu />);
    expect(one(".dl-menu")).toBeNull();
    await click(trigger());
    expect(one(".dl-menu")?.getAttribute("role")).toBe("menu");
  });

  it("points at its control with an arrow, and has none when told so", async () => {
    await mount(<RowMenu />);
    await click(trigger());
    expect(one(".dl-menu > .dl-menu-arrow")).not.toBeNull();
    expect(one(".dl-menu-arrow")?.getAttribute("data-side")).toBe("bottom");
    await mount(<RowMenu arrow={false} />);
    expect(one(".dl-menu-arrow")).toBeNull();
  });

  it("keeps its rows in a list of their own, so the surface never clips its arrow", async () => {
    await mount(<RowMenu />);
    await click(trigger());
    expect(one(".dl-menu > .dl-menu-list")).not.toBeNull();
    expect(rows().every((row) => row.closest(".dl-menu-list") !== null)).toBe(true);
    expect(rows().map((row) => row.className)).toEqual(Array(4).fill("dl-menu-item"));
  });

  it("marks the destructive row, and no other", async () => {
    await mount(<RowMenu />);
    await click(trigger());
    expect(rows().map((row) => row.getAttribute("data-variant"))).toEqual(["default", "default", "default", "destructive"]);
  });

  it("ends a row with its shortcut as keycaps", async () => {
    await mount(<RowMenu />);
    await click(trigger());
    const star = rows()[1]!;
    const end = star.querySelector('[data-slot="menu-shortcut"]')!;
    expect(end.className).toBe("dl-menu-end");
    expect(star.lastElementChild).toBe(end);
    expect([...end.querySelectorAll("kbd")].map((cap) => cap.textContent)).toEqual(["S"]);
    expect(rows()[3]!.querySelector("kbd")?.textContent).toBe("E");
  });

  it("keeps the keycaps out of the row's name, and gives the shortcut as aria-keyshortcuts", async () => {
    await mount(
      <Menu>
        <MenuTrigger>More</MenuTrigger>
        <MenuContent>
          <MenuItem>
            Star <MenuShortcut keys={["S"]} />
          </MenuItem>
          <MenuItem>
            Search <MenuShortcut keys={["Ctrl", "K"]} />
          </MenuItem>
          <MenuItem>
            Delete <MenuShortcut keys={["⌘", "⌫"]} />
          </MenuItem>
          <MenuItem>
            Archive <MenuShortcut>E</MenuShortcut>
          </MenuItem>
          <MenuItem>
            Send <MenuShortcut keys={["⌘", "↵"]} aria-keyshortcuts="Meta+Enter Control+Enter" />
          </MenuItem>
          <MenuItem>Reply</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await click(trigger());
    const caps = all('[data-slot="menu-shortcut"]');
    expect(caps).toHaveLength(5);
    // Hidden from a screen reader, so a row reads "Star" and not "Star S".
    expect(caps.every((cap) => cap.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(caps.every((cap) => !cap.hasAttribute("aria-keyshortcuts"))).toBe(true);
    expect(rows().map((row) => row.getAttribute("aria-keyshortcuts"))).toEqual([
      "S",
      "Control+K",
      "Meta+Backspace",
      "E",
      "Meta+Enter Control+Enter",
      null,
    ]);
  });

  it("writes a group's label as the app wrote it, and names the group by it", async () => {
    await mount(<RowMenu />);
    await click(trigger());
    const label = one(".dl-menu-label")!;
    expect(label.textContent).toBe("This message");
    expect(one('[role="group"]')?.getAttribute("aria-labelledby")).toBe(label.id);
  });

  it("draws a link row as a link", async () => {
    await mount(<RowMenu />);
    await click(trigger());
    const link = rows()[2] as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.href).toBe("https://mail.dalin.pro/help");
  });

  it("opens from the keyboard, moves with the arrows, and closes on Escape", async () => {
    await mount(<RowMenu />);
    // Enter or Space on a focused button is a click with no pointer, which
    // is what `click()` sends: jsdom does not turn the key into one itself.
    trigger().focus();
    await click(trigger());
    expect(one(".dl-menu")).not.toBeNull();
    await key("ArrowDown");
    const first = document.activeElement;
    expect(first?.getAttribute("role")).toBe("menuitem");
    await key("ArrowDown");
    expect(document.activeElement).not.toBe(first);
    expect(document.activeElement?.getAttribute("role")).toBe("menuitem");
    await key("Escape");
    await settle(200);
    expect(one(".dl-menu")).toBeNull();
  });

  it("runs a row's action and closes", async () => {
    const onArchive = vi.fn();
    await mount(<RowMenu onArchive={onArchive} />);
    await click(trigger());
    await click(rows()[3]);
    await settle(200);
    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(one(".dl-menu")).toBeNull();
  });

  it("ends a checked row with a check, and a submenu's row with a chevron", async () => {
    await mount(
      <Menu defaultOpen>
        <MenuTrigger>View</MenuTrigger>
        <MenuContent>
          <MenuCheckboxItem checked>Show weekends</MenuCheckboxItem>
          <MenuCheckboxItem checked={false}>Show declined</MenuCheckboxItem>
          <MenuRadioGroup value="week">
            <MenuRadioItem value="day">Day</MenuRadioItem>
            <MenuRadioItem value="week">Week</MenuRadioItem>
          </MenuRadioGroup>
          <MenuSub>
            <MenuSubTrigger>Move to</MenuSubTrigger>
            <MenuSubContent>
              <MenuItem>Archive</MenuItem>
            </MenuSubContent>
          </MenuSub>
        </MenuContent>
      </Menu>,
    );
    await settle();
    const checks = all('[role="menuitemcheckbox"]');
    expect(checks.map((row) => row.getAttribute("aria-checked"))).toEqual(["true", "false"]);
    expect(checks[0]!.querySelector(".dl-menu-end svg")).not.toBeNull();
    expect(checks[1]!.querySelector(".dl-menu-end svg")).toBeNull();
    const radios = all('[role="menuitemradio"]');
    expect(radios.map((row) => row.querySelector(".dl-menu-end svg") !== null)).toEqual([false, true]);
    const sub = one('[data-slot="menu-sub-trigger"]')!;
    expect(sub.lastElementChild?.classList.contains("dl-menu-chevron")).toBe(true);
  });

  it("opens a submenu beside its row, with no arrow", async () => {
    await mount(
      <Menu defaultOpen>
        <MenuTrigger>More</MenuTrigger>
        <MenuContent>
          <MenuSub defaultOpen>
            <MenuSubTrigger>Move to</MenuSubTrigger>
            <MenuSubContent>
              <MenuItem>Archive</MenuItem>
            </MenuSubContent>
          </MenuSub>
        </MenuContent>
      </Menu>,
    );
    await settle();
    const menus = all(".dl-menu");
    expect(menus).toHaveLength(2);
    expect(menus[0]!.querySelector(":scope > .dl-menu-arrow")).not.toBeNull();
    expect(menus[1]!.querySelector(":scope > .dl-menu-arrow")).toBeNull();
    expect(menus[1]!.getAttribute("data-side")).toBe("right");
  });

  it("keeps the app's own class on the surface and on a row", async () => {
    await mount(
      <Menu defaultOpen>
        <MenuTrigger>More</MenuTrigger>
        <MenuContent className="mailbox-menu">
          <MenuItem className={() => "row-own"}>Reply</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await settle();
    expect(one(".dl-menu")?.className).toBe("dl-menu mailbox-menu");
    expect(rows()[0]!.className).toBe("dl-menu-item row-own");
  });
});

describe("a menu the app opens itself, with no control of its own to show", () => {
  /** Drive's shape: a kebab the app draws opens the menu, and Base UI's trigger is one nothing draws. */
  function Anchored({ finalFocus }: { finalFocus?: { current: HTMLElement | null } }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" className="kebab" aria-label="More" onClick={() => setOpen(true)} />
        <input className="elsewhere" aria-label="Rename" />
        <Menu open={open} onOpenChange={setOpen} modal={false}>
          <MenuTrigger render={<span hidden />} nativeButton={false} tabIndex={-1} aria-hidden />
          <MenuContent anchor={() => one(".kebab")} aria-label="More" finalFocus={finalFocus}>
            <MenuItem>Rename</MenuItem>
          </MenuContent>
        </Menu>
      </>
    );
  }
  const kebab = () => one<HTMLButtonElement>(".kebab")!;

  it("gives focus back to what had it before it opened, never to the hidden trigger", async () => {
    await mount(<Anchored />);
    kebab().focus();
    await click(kebab());
    expect(one(".dl-menu")).not.toBeNull();
    await key("Escape");
    await settle(300);
    expect(one(".dl-menu")).toBeNull();
    expect(document.activeElement).toBe(kebab());
  });

  it("leaves focus alone with nothing to give it back to", async () => {
    await mount(<Anchored />);
    await click(kebab());
    await key("Escape");
    await settle(300);
    expect(document.activeElement?.getAttribute("data-slot")).not.toBe("menu-trigger");
    expect((document.activeElement as HTMLElement).hidden).toBe(false);
  });

  it("takes a finalFocus of the app's own, which wins", async () => {
    const to = { current: null as HTMLElement | null };
    await mount(<Anchored finalFocus={to} />);
    to.current = one<HTMLElement>(".elsewhere");
    kebab().focus();
    await click(kebab());
    await key("Escape");
    await settle(300);
    expect(document.activeElement).toBe(one(".elsewhere"));
  });

  it("still gives focus back to a trigger that shows", async () => {
    await mount(
      <>
        <input className="elsewhere" aria-label="Rename" />
        <RowMenu />
      </>,
    );
    one<HTMLElement>(".elsewhere")!.focus();
    await click(trigger());
    await key("Escape");
    await settle(300);
    expect(document.activeElement).toBe(trigger());
  });
});

describe("<ContextMenu>", () => {
  function Row() {
    return (
      <ContextMenu>
        <ContextMenuTrigger className="row">Thanksgiving plans</ContextMenuTrigger>
        <ContextMenuContent>
          <MenuItem>Reply</MenuItem>
          <MenuItem variant="destructive">
            Archive <MenuShortcut keys={["E"]} />
          </MenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  it("opens at the pointer on a right click, with the menu's rows and no arrow", async () => {
    await mount(<Row />);
    expect(one(".dl-menu")).toBeNull();
    await act(async () => {
      one(".row")!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 60 }));
    });
    await settle();
    const menu = one(".dl-menu")!;
    expect(menu.className).toBe("dl-menu dl-context-menu");
    expect(menu.querySelector(".dl-menu-arrow")).toBeNull();
    expect(rows().map((row) => row.textContent)).toEqual(["Reply", "Archive E"]);
    expect(rows()[1]!.getAttribute("data-variant")).toBe("destructive");
  });

  it("does not let the browser's own menu open over it", async () => {
    await mount(<Row />);
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    await act(async () => {
      one(".row")!.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });

  const rightClick = async (el: Element, at = { clientX: 40, clientY: 60 }) => {
    await act(async () => {
      for (const name of ["pointerdown", "mousedown"]) el.dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true, button: 2, ...at }));
      el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, ...at }));
      for (const name of ["pointerup", "mouseup"]) el.dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true, button: 2, ...at }));
    });
    await settle(60);
  };
  /** What a modal menu does to the page: a layer over it that takes every press, and no scroll. */
  const pageLocked = () =>
    document.querySelector('[role="presentation"][data-base-ui-inert]') !== null || /hidden/.test(document.documentElement.getAttribute("style") ?? "");

  function List({ modal, onOpenChange }: { modal?: boolean; onOpenChange?: (open: boolean, reason: string) => void }) {
    return (
      <ul className="list">
        {["Thanksgiving plans", "Invoice for October"].map((subject) => (
          <ContextMenu key={subject} modal={modal} onOpenChange={(open, details) => onOpenChange?.(open, details.reason)}>
            <ContextMenuTrigger render={<li className="row" />}>{subject}</ContextMenuTrigger>
            <ContextMenuContent aria-label={subject}>
              <MenuItem>Reply to {subject}</MenuItem>
              <MenuSub>
                <MenuSubTrigger>Move to</MenuSubTrigger>
                <MenuSubContent>
                  <MenuItem>Archive</MenuItem>
                </MenuSubContent>
              </MenuSub>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </ul>
    );
  }

  it("is not modal: the page under it is not covered and still scrolls", async () => {
    await mount(<List />);
    await rightClick(all(".row")[0]!);
    expect(one(".dl-menu")).not.toBeNull();
    expect(pageLocked()).toBe(false);
  });

  it("is Base UI's own modal menu when asked", async () => {
    await mount(<List modal />);
    await rightClick(all(".row")[0]!);
    expect(one(".dl-menu.dl-context-menu")).not.toBeNull();
    expect(pageLocked()).toBe(true);
  });

  it("opens the other row's menu on a right click there, where a modal one only closed", async () => {
    await mount(<List />);
    const [first, second] = all(".row");
    await rightClick(first!);
    expect(one(".dl-menu")?.getAttribute("aria-label")).toBe("Thanksgiving plans");
    await rightClick(second!, { clientX: 40, clientY: 120 });
    await settle(300);
    expect(all(".dl-menu").map((menu) => menu.getAttribute("aria-label"))).toEqual(["Invoice for October"]);
    expect(rows()[0]?.textContent).toBe("Reply to Invoice for October");
  });

  it("puts nothing of its own in the app's markup", async () => {
    await mount(<List />);
    expect([...one(".list")!.children].map((child) => child.tagName)).toEqual(["LI", "LI"]);
    await rightClick(all(".row")[0]!);
    expect([...one(".list")!.children].map((child) => child.tagName)).toEqual(["LI", "LI"]);
    expect(all(".row")[0]!.getAttribute("data-slot")).toBe("context-menu-trigger");
    expect(all(".row")[0]!.hasAttribute("data-popup-open")).toBe(true);
    expect(all(".row")[1]!.hasAttribute("data-popup-open")).toBe(false);
  });

  it("tells the app as it opens and closes, with the reason", async () => {
    const onOpenChange = vi.fn();
    await mount(<List onOpenChange={onOpenChange} />);
    await rightClick(all(".row")[0]!);
    expect(onOpenChange).toHaveBeenLastCalledWith(true, "trigger-press");
    await key("Escape");
    await settle(200);
    expect(onOpenChange).toHaveBeenLastCalledWith(false, "escape-key");
    expect(one(".dl-menu")).toBeNull();
  });

  it("gives focus back to what had it, never to a hidden element", async () => {
    await mount(
      <>
        <button type="button" className="before">
          Inbox
        </button>
        <List />
      </>,
    );
    const before = one<HTMLButtonElement>(".before")!;
    before.focus();
    await rightClick(all(".row")[0]!);
    expect(one(".dl-menu")).not.toBeNull();
    await key("Escape");
    await settle(300);
    expect(one(".dl-menu")).toBeNull();
    expect(document.activeElement).toBe(before);
    // And with nothing focused before, focus does not land on the anchor.
    before.blur();
    await rightClick(all(".row")[0]!);
    await key("Escape");
    await settle(300);
    expect((document.activeElement as HTMLElement).hidden).toBe(false);
    expect(document.activeElement?.getAttribute("data-slot")).not.toBe("context-menu-anchor");
  });

  it("keeps the menu open while its submenu is", async () => {
    await mount(<List />);
    await rightClick(all(".row")[0]!);
    const sub = one('[data-slot="menu-sub-trigger"]')!;
    await click(sub);
    await settle(300);
    expect(all(".dl-menu")).toHaveLength(2);
    expect(all(".dl-menu")[0]!.getAttribute("aria-label")).toBe("Thanksgiving plans");
  });

  it("stays open when the pointer leaves it, until a click outside, Escape or a row", async () => {
    const onOpenChange = vi.fn();
    await mount(<List onOpenChange={onOpenChange} />);
    await rightClick(all(".row")[0]!);
    const menu = one(".dl-menu")!;
    const at = (x: number, y: number) => ({ bubbles: true, cancelable: true, clientX: x, clientY: y });
    // Into the menu, then away from it and its row, as drive's probe moved.
    await act(async () => {
      for (const name of ["pointerenter", "mouseenter", "pointermove", "mousemove"]) menu.dispatchEvent(new MouseEvent(name, at(60, 80)));
      for (const name of ["pointerleave", "mouseleave"]) menu.dispatchEvent(new MouseEvent(name, at(600, 500)));
      for (const name of ["pointermove", "mousemove"]) document.body.dispatchEvent(new MouseEvent(name, at(600, 500)));
    });
    await settle(300);
    expect(one(".dl-menu")).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalledWith(false, "trigger-hover");
    await key("Escape");
    await settle(200);
    expect(one(".dl-menu")).toBeNull();
  });

  it("opens on a long press, and not for a finger that scrolls", async () => {
    await mount(<List />);
    const row = all(".row")[0]!;
    const touch = (name: string, x: number, y: number) => {
      const event = new Event(name, { bubbles: true, cancelable: true });
      Object.assign(event, { touches: name === "touchend" ? [] : [{ clientX: x, clientY: y }] });
      row.dispatchEvent(event);
    };
    await act(async () => {
      touch("touchstart", 40, 60);
      touch("touchmove", 40, 90);
    });
    await settle(560);
    expect(one(".dl-menu")).toBeNull();
    await act(async () => {
      touch("touchend", 40, 90);
      touch("touchstart", 40, 60);
    });
    await settle(300);
    expect(one(".dl-menu")).toBeNull();
    await settle(260);
    expect(one(".dl-menu")).not.toBeNull();
  });
});

describe("<Popover>", () => {
  function Share({ arrow }: { arrow?: boolean }) {
    return (
      <Popover>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent arrow={arrow} style={{ width: 288 }}>
          <PopoverTitle>Share this page</PopoverTitle>
          <PopoverDescription>Anyone with the link can read it.</PopoverDescription>
        </PopoverContent>
      </Popover>
    );
  }

  it("opens from its trigger on the menu's surface, named by its title", async () => {
    await mount(<Share />);
    expect(one(".dl-popover")).toBeNull();
    await click(one('[data-slot="popover-trigger"]'));
    const popover = one(".dl-popover")!;
    expect(popover.getAttribute("role")).toBe("dialog");
    expect(popover.getAttribute("aria-labelledby")).toBe(one(".dl-popover-title")?.id);
    expect(popover.getAttribute("aria-describedby")).toBe(one(".dl-popover-description")?.id);
    expect(popover.style.width).toBe("288px");
  });

  it("points at its control with the menu's arrow, unless told not to", async () => {
    await mount(<Share />);
    await click(one('[data-slot="popover-trigger"]'));
    expect(one(".dl-popover > .dl-menu-arrow")).not.toBeNull();
    await mount(<Share arrow={false} />);
    expect(one(".dl-menu-arrow")).toBeNull();
  });
});

describe("<Kbd>", () => {
  it("draws one cap per key, with no plus between them", () => {
    expect(renderToStaticMarkup(<Kbd keys={["Ctrl", "K"]} />)).toBe(
      '<span data-slot="kbd" class="dl-kbd"><kbd data-slot="kbd-key" class="dl-kbd-key">Ctrl</kbd><kbd data-slot="kbd-key" class="dl-kbd-key">K</kbd></span>',
    );
  });

  it("draws one cap from its text, and nothing with no key", () => {
    expect(renderToStaticMarkup(<Kbd>E</Kbd>)).toContain('<kbd data-slot="kbd-key" class="dl-kbd-key">E</kbd>');
    expect(renderToStaticMarkup(<Kbd />)).toBe("");
    expect(renderToStaticMarkup(<Kbd keys={[]} />)).toBe("");
    expect(renderToStaticMarkup(<MenuShortcut />)).toBe("");
  });
});

describe("menu.css", () => {
  const surface = ruleFor(css, ".dl-menu, .dl-popover");

  it("is the overlay glass: the frosted fill, the strong edge, 10px corners, one shadow", () => {
    expect(surface).toContain("background: var(--dl-overlay, rgb(32 32 32 / 0.72))");
    expect(surface.replace(/\s+/g, " ")).toContain(
      "backdrop-filter: var(--dl-overlay-blur, blur(16px) saturate(1.5)) var(--dl-overlay-level, contrast(0.709) brightness(0.468))",
    );
    expect(surface).toContain("border: 1px solid var(--dl-overlay-edge, #3d3d3d)");
    expect(surface).toContain("border-radius: var(--dl-r-card, 10px)");
    expect(surface).toContain("box-shadow: var(--dl-overlay-shadow");
  });

  it("falls back to the tokens' own values where tokens.css is not loaded", () => {
    const root = ruleFor(tokens, ":where(:root)");
    expect(root).toContain("--dl-overlay: rgb(32 32 32 / 0.72);");
    expect(root).toContain("--dl-overlay-blur: blur(16px) saturate(1.5);");
    expect(root).toContain("--dl-border-strong: #3d3d3d;");
    expect(root).toContain("--dl-overlay-edge: var(--dl-border-strong);");
    expect(root).toContain("--dl-overlay-solid: #1f1f1f;");
    expect(root).toContain("--dl-kbd-face: #383838;");
    expect(root).toContain("--dl-kbd-edge: #5c5c5c;");
    expect(root).toContain("--dl-danger: oklch(0.68 0.19 25);");
  });

  it("never clips: the rows scroll in their own list", () => {
    expect(surface).not.toContain("overflow");
    expect(ruleFor(css, ".dl-menu-list")).toContain("overflow-y: auto");
    expect(ruleFor(css, ".dl-menu-list")).toContain("padding: 4px");
  });

  it("makes a row 32px with a 7px corner, 4px inside a 10px surface", () => {
    const row = ruleFor(css, ".dl-menu-item");
    expect(row).toContain("min-height: 32px");
    expect(row).toContain("border-radius: var(--dl-r-control, 7px)");
    expect(row).toContain("padding: 0 8px");
  });

  it("highlights a row with white at 8%, under the pointer or the keys", () => {
    expect(ruleFor(css, ".dl-menu-item:is([data-highlighted], [data-popup-open])")).toContain(
      "background: var(--dl-overlay-hover, oklch(1 0 0 / 0.08))",
    );
  });

  it("puts what ends a row at its right, clear of the words", () => {
    const end = ruleFor(css, ".dl-menu-end");
    expect(end).toContain("margin-left: auto");
    expect(end).toContain("padding-left: 24px");
  });

  it("draws the keycap: a 20px cap raised by a 3px bottom edge", () => {
    const cap = ruleFor(css, ".dl-kbd-key");
    expect(cap).toContain("height: 20px");
    expect(cap).toContain("border: 1px solid var(--dl-kbd-edge, #5c5c5c)");
    expect(cap).toContain("border-bottom-width: 3px");
    expect(cap).toContain("background: var(--dl-kbd-face, #383838)");
  });

  it("hides the keys on a touch screen, inside a menu", () => {
    expect(css).toMatch(/@media \(hover: none\)\s*\{\s*\.dl-menu \.dl-kbd\s*\{\s*display: none;/);
  });

  it("makes the destructive row red, icon and words, in the red's text step", () => {
    const body = ruleNaming(css, '.dl-menu-item[data-variant="destructive"] > svg');
    expect(body).toContain("color: var(--dl-danger-text, oklch(0.74 0.19 25))");
    expect(ruleNaming(css, '.dl-menu-item[data-variant="destructive"]')).toBe(body);
  });

  it("levels what is behind the glass with the toast's own filter", () => {
    const root = ruleFor(tokens, ":where(:root)");
    expect(root).toContain("--dl-overlay-level: contrast(0.709) brightness(0.468);");
    expect(readCss("toast")).toContain("--dl-toast-level: contrast(0.709) brightness(0.468);");
  });

  it("leaves a group's label in the case it was written in", () => {
    const label = ruleFor(css, ".dl-menu-label");
    expect(label).toContain("text-transform: none");
    expect(label).toContain("letter-spacing: 0");
    expect(label).toContain("font-size: 12px");
    expect(label).toContain("color: var(--dl-fg-muted, #b8b8b8)");
    expect(css).not.toContain("uppercase");
  });

  it("draws the arrow on each side, cut to the half outside the surface", () => {
    const arrow = ruleFor(css, ".dl-menu-arrow");
    expect(arrow).toContain("transform: rotate(45deg)");
    expect(arrow).toContain("background: var(--dl-overlay-solid, #1f1f1f)");
    for (const side of ['[data-side="bottom"]', '[data-side="top"]']) {
      const body = ruleFor(css, `.dl-menu-arrow${side}`);
      expect(body).toContain("clip-path: polygon(");
      expect(body).toMatch(/(top|bottom): -6px/);
    }
    expect(rulesWith(css, ".dl-menu-arrow:is(")).toHaveLength(2);
  });

  it("lands at once when the keyboard opened it", () => {
    const body = ruleNaming(css, 'html[data-input="keyboard"] :is(.dl-menu, .dl-popover)');
    expect(body).toContain("transition: none");
    expect(ruleNaming(css, ":is(.dl-menu, .dl-popover)[data-instant]")).toBe(body);
  });

  it("opens a context menu at once, from a rule that outweighs the surface's own", () => {
    expect(ruleFor(css, ".dl-menu.dl-context-menu")).toContain("transition: none");
    expect(outweighs(".dl-menu.dl-context-menu", ".dl-menu")).toBe(true);
    const start = ruleFor(css, ".dl-menu.dl-context-menu[data-starting-style]");
    expect(start).toContain("opacity: 1");
    expect(outweighs(".dl-menu.dl-context-menu[data-starting-style]", ":is(.dl-menu, .dl-popover):is([data-starting-style], [data-ending-style])")).toBe(true);
  });

  it("stops every transition while the app's own motion switch says Reduce", () => {
    const still = ruleNaming(css, 'html[data-dl-motion="reduce"] :is(.dl-menu, .dl-popover)');
    expect(still).toBe("transition: none;");
    // The context menu's close fade is the heaviest rule that animates, and
    // the app's Reduce outweighs it.
    const fade = ".dl-menu.dl-context-menu[data-ending-style]:not([data-instant])";
    expect(ruleNaming(css, `html[data-dl-motion="reduce"] ${fade}`)).toBe(still);
    expect(outweighs(`html[data-dl-motion="reduce"] ${fade}`, fade)).toBe(true);
    expect(outweighs('html[data-dl-motion="reduce"] :is(.dl-menu, .dl-popover)', ".dl-menu")).toBe(true);
  });

  it("follows the system's reduced motion, unless the app's switch says Full", () => {
    const media = /@media \(prefers-reduced-motion: reduce\)\s*\{([^@]*?)\}\s*\}/.exec(css)?.[1] ?? "";
    expect(media).toContain('html:not([data-dl-motion="full"]) :is(.dl-menu, .dl-popover)');
    expect(media).toContain('html:not([data-dl-motion="full"]) .dl-menu.dl-context-menu[data-ending-style]:not([data-instant])');
    expect(media).toContain("transition: none;");
    // No rule in the media query stills a menu whatever the app says.
    for (const [list] of rulesWith(`${media}}`, "dl-")) {
      for (const selector of splitList(list)) expect(selector.startsWith('html:not([data-dl-motion="full"]) ')).toBe(true);
    }
  });

  it("stands over the toaster while it is over a sheet", () => {
    expect(ruleFor(css, ".dl-menu-positioner")).toContain("z-index: var(--dl-overlay-z, var(--dl-z-overlay, 70))");
  });
});
