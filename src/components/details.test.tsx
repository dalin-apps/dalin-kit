/**
 * @vitest-environment jsdom
 *
 * Two of the family details from the drive pass (0.13), in the components:
 * a menu row picked with the pointer blinks off before the menu fades, and
 * the palette leads with the selection's verbs. Runs the real Base UI parts
 * in jsdom, and reads menu.css for the blink.
 */
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { outweighs, readCss, ruleFor, ruleNaming } from "../../test/css.js";
import { all, click, mount, one, settle, type, withDom } from "../../test/dom.js";
import { CommandPalette } from "./command-palette.js";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "./context-menu.js";
import { MENU_PICKED_ATTR, Menu, MenuContent, MenuItem, MenuTrigger } from "./menu.js";
import { Palette, PaletteField, PaletteList } from "./palette.js";
import type { PaletteItem, PaletteSelection, PaletteSource } from "./palette-types.js";

withDom();

const css = readCss("menu");
const tokens = readCss("tokens");

function StarMenu({ onStar }: { onStar: () => void }) {
  return (
    <Menu>
      <MenuTrigger>More</MenuTrigger>
      <MenuContent>
        <MenuItem>Open</MenuItem>
        <MenuItem onClick={onStar}>Star</MenuItem>
      </MenuContent>
    </Menu>
  );
}

/** A pick as the pointer makes one: up over the row, then a click with a count. */
async function pointerPick(row: Element) {
  await act(async () => {
    row.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0 }));
    row.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, detail: 1 }));
  });
}

describe("a menu row picked with the pointer", () => {
  it("runs the action on the click, and marks the row and its menu for the blink", async () => {
    const onStar = vi.fn();
    await mount(<StarMenu onStar={onStar} />);
    await click(one('[data-slot="menu-trigger"]'));
    const popup = one(".dl-menu")!;
    const [open, star] = all('.dl-menu [role="menuitem"]');
    await pointerPick(star!);
    expect(onStar).toHaveBeenCalledTimes(1);
    expect(star!.hasAttribute(MENU_PICKED_ATTR)).toBe(true);
    expect(popup.hasAttribute(MENU_PICKED_ATTR)).toBe(true);
    expect(open!.hasAttribute(MENU_PICKED_ATTR)).toBe(false);
    await settle(200);
    expect(one(".dl-menu")).toBeNull();
    // The marks go once the close is over, so a menu kept mounted carries
    // none into its next close.
    await settle(600);
    expect(star!.hasAttribute(MENU_PICKED_ATTR)).toBe(false);
    expect(popup.hasAttribute(MENU_PICKED_ATTR)).toBe(false);
  });

  it("marks nothing for a pick from the keyboard, whose click has no count", async () => {
    const onStar = vi.fn();
    await mount(<StarMenu onStar={onStar} />);
    await click(one('[data-slot="menu-trigger"]'));
    const popup = one(".dl-menu")!;
    const star = all('.dl-menu [role="menuitem"]')[1]!;
    await act(async () => {
      star.click();
    });
    expect(onStar).toHaveBeenCalledTimes(1);
    expect(star.hasAttribute(MENU_PICKED_ATTR)).toBe(false);
    expect(popup.hasAttribute(MENU_PICKED_ATTR)).toBe(false);
  });

  it("marks a row that stays open nothing, since no menu closes", async () => {
    await mount(
      <Menu defaultOpen>
        <MenuTrigger>More</MenuTrigger>
        <MenuContent>
          <MenuItem closeOnClick={false}>Keep</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const row = one('.dl-menu [role="menuitem"]')!;
    await pointerPick(row);
    expect(row.hasAttribute(MENU_PICKED_ATTR)).toBe(false);
    expect(one(".dl-menu")).not.toBeNull();
  });

  it("blinks in a context menu too, whose rows are the menu's own", async () => {
    await mount(
      <ContextMenu>
        <ContextMenuTrigger render={<div className="row" />}>File</ContextMenuTrigger>
        <ContextMenuContent>
          <MenuItem>Star</MenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    await act(async () => {
      one(".row")!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }));
    });
    await settle();
    const popup = one(".dl-menu.dl-context-menu")!;
    const row = one('.dl-menu [role="menuitem"]')!;
    await pointerPick(row);
    expect(row.hasAttribute(MENU_PICKED_ATTR)).toBe(true);
    expect(popup.hasAttribute(MENU_PICKED_ATTR)).toBe(true);
  });
});

const BLINK =
  ".dl-menu[data-picked]:where([data-ending-style], [data-dl-menu-copy] *):where(:not([data-instant])) .dl-menu-item[data-picked]";

describe("menu.css, the pick", () => {
  it("holds the fade back for the blink, on a menu and on a context menu alike", () => {
    const hold = ".dl-menu[data-picked][data-ending-style]:not([data-instant])";
    expect(ruleFor(css, hold)).toContain("transition-delay: var(--dl-t-pick, 60ms)");
    // The context menu's own fade names its transition whole, which would
    // reset the delay: the hold weighs the same and comes after it.
    const fade = ".dl-menu.dl-context-menu[data-ending-style]:not([data-instant])";
    expect(outweighs(fade, hold)).toBe(false);
    expect(css.indexOf(hold)).toBeGreaterThan(css.indexOf(`${fade} {`));
  });

  it("blinks the picked row off once, for --dl-t-pick, then shows it lit until the menu is gone", () => {
    const blink = ruleNaming(
      css,
      BLINK,
    );
    expect(blink).toContain("animation: dl-menu-pick var(--dl-t-pick, 60ms) step-end both !important");
    const frames = /@keyframes dl-menu-pick\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(frames).toMatch(/0%\s*\{\s*background: transparent;/);
    expect(frames).toMatch(/100%\s*\{\s*background: var\(--dl-overlay-hover, oklch\(1 0 0 \/ 0\.08\)\);/);
  });

  it("does not blink from the keyboard or under reduced motion, the app's switch or the system's", () => {
    const off = ruleNaming(css, 'html[data-input="keyboard"] .dl-menu[data-picked] .dl-menu-item[data-picked]');
    expect(ruleNaming(css, 'html[data-dl-motion="reduce"] .dl-menu[data-picked] .dl-menu-item[data-picked]')).toBe(off);
    expect(ruleFor(css, 'html[data-input="keyboard"] .dl-menu[data-picked][data-ending-style]')).toContain("transition-delay: 0s");
    expect(ruleFor(css, 'html[data-dl-motion="reduce"] .dl-menu[data-picked][data-ending-style]')).toContain("transition-delay: 0s");
    expect(css).toContain('html:not([data-dl-motion="full"]) .dl-menu[data-picked] .dl-menu-item[data-picked] {\n    animation: none !important;');
    expect(off).toBe("animation: none !important;");
    // Every rule that stills it outweighs the blink, which is important too.
    for (const still of [
      'html[data-input="keyboard"] .dl-menu[data-picked] .dl-menu-item[data-picked]',
      'html[data-dl-motion="reduce"] .dl-menu[data-picked] .dl-menu-item[data-picked]',
      'html:not([data-dl-motion="full"]) .dl-menu[data-picked] .dl-menu-item[data-picked]',
    ]) {
      expect(outweighs(still, BLINK)).toBe(true);
    }
  });

  it("runs in an app's painted copy of a closing menu, past the copy's own important rule", () => {
    // An important declaration in the kit's layer beats an unlayered one,
    // such as drive's `[data-ghost] * { animation: none !important }`.
    expect(BLINK).toContain("[data-dl-menu-copy] *");
    expect(outweighs(BLINK, "[data-dl-leaving] *")).toBe(true);
  });

  it("reads 60ms from the tokens", () => {
    expect(tokens).toContain("--dl-t-pick: 60ms;");
  });
});

const ran = vi.fn();
const verb = (id: string, title: string, keys?: string[]): PaletteItem => ({ id, title, keys, onSelect: () => ran(id) });
const VERBS: PaletteItem[] = [
  verb("star", "Star"),
  verb("tags", "Tags…", ["Ctrl", "Shift", "L"]),
  verb("move", "Move to…"),
  verb("rename", "Rename", ["F2"]),
  verb("download", "Download"),
  verb("share", "Share…"),
  verb("archive", "Archive", ["Del"]),
];
const selected: PaletteSelection = { heading: "Budget 2025-02.xlsx", items: VERBS };
const recent: PaletteSource[] = [
  { id: "recent", heading: "Recent", search: (q) => (q ? [] : [verb("f1", "Budget 2025-02.xlsx"), verb("f2", "Lease renewal.pdf")]) },
];
const actions = [verb("upload", "Upload"), verb("folder", "New folder")];

const heads = () => all(".dl-palette-head").map((h) => h.textContent);
const titles = () => all(".dl-palette-row .dl-palette-title").map((t) => t.textContent);
const field = () => one<HTMLInputElement>(".dl-palette-input");

describe("the palette's selection group", () => {
  it("leads the list under the selection's name, before every source and the actions", async () => {
    await mount(<CommandPalette open sources={recent} actions={actions} selection={selected} />);
    expect(heads()).toEqual(["Budget 2025-02.xlsx", "Recent", "Actions"]);
    expect(titles().slice(0, 7)).toEqual(VERBS.map((v) => v.title));
    // The list starts on the first verb.
    expect(one(".dl-palette-row[data-highlighted]")?.textContent).toContain("Star");
  });

  it("draws each verb's own keys as keycaps", async () => {
    await mount(<CommandPalette open sources={recent} selection={selected} />);
    const rename = all(".dl-palette-row").find((row) => row.textContent?.includes("Rename"))!;
    expect([...rename.querySelectorAll(".dl-palette-own .dl-kbd-key")].map((k) => k.textContent)).toEqual(["F2"]);
    const tags = all(".dl-palette-row").find((row) => row.textContent?.includes("Tags"))!;
    expect([...tags.querySelectorAll(".dl-palette-own .dl-kbd-key")].map((k) => k.textContent)).toEqual(["Ctrl", "Shift", "L"]);
  });

  it("ranks the verbs against the words, as the actions are, and drops the group when none is left", async () => {
    await mount(<CommandPalette open sources={recent} actions={actions} selection={selected} />);
    await type(field(), "ren");
    expect(heads()[0]).toBe("Budget 2025-02.xlsx");
    expect(titles()[0]).toBe("Rename");
    await type(field(), "upl");
    expect(heads()).toEqual(["Actions"]);
  });

  it("runs a verb and closes, as any row does", async () => {
    ran.mockClear();
    await mount(<CommandPalette selection={selected} />);
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true }));
    });
    await settle();
    await type(field(), "archive");
    await act(async () => {
      field()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    await settle(200);
    expect(ran).toHaveBeenCalledWith("archive");
  });

  it("draws no group while nothing is selected", async () => {
    await mount(<CommandPalette open sources={recent} actions={actions} selection={null} />);
    expect(heads()).toEqual(["Recent", "Actions"]);
  });

  it("stays on the first page: a page a row opens lists its own rows", async () => {
    const move: PaletteItem = {
      id: "move",
      title: "Move to…",
      page: { id: "move", crumb: "Move to", actions: [verb("docs", "Documents")] },
    };
    await mount(
      <Palette open selection={{ heading: "Budget 2025-02.xlsx", items: [move] }}>
        <PaletteField />
        <PaletteList />
      </Palette>,
    );
    expect(heads()).toEqual(["Budget 2025-02.xlsx"]);
    await act(async () => {
      field()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    await settle();
    expect(heads()).toEqual(["Actions"]);
    expect(titles()).toEqual(["Documents"]);
  });
});
