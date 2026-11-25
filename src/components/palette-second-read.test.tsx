/**
 * @vitest-environment jsdom
 *
 * What a second read of the palette found: a control that only says it is
 * expanded held every Escape, the app's attributes beat the dialog's own,
 * and a stale list held an Enter the app had already spent. Each case
 * failed before its fix.
 */
import { act, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { key, mount, one, settle, type, withDom } from "../../test/dom.js";
import { Palette, PaletteField, PaletteList, type PaletteProps } from "./palette.js";
import type { PaletteItem, PaletteSource } from "./palette-types.js";

withDom();

const field = () => one<HTMLInputElement>(".dl-palette-input");
const panel = () => one(".dl-palette");
const ran = vi.fn();
const row = (id: string, title: string): PaletteItem => ({ id, title, onSelect: () => ran(id) });
const three: PaletteSource[] = [{ id: "p", heading: "Pages", search: () => [row("a", "One"), row("b", "Two")] }];

function Shell({ start, ...props }: PaletteProps & { start?: ReactNode }) {
  return (
    <Palette open sources={three} onOpenChange={(next) => ran(next ? "open" : "close")} {...props}>
      <PaletteField start={start} />
      <PaletteList />
    </Palette>
  );
}

async function escape() {
  await key("Escape", field());
  await settle(100);
}

describe("Escape and a control that says it is expanded", () => {
  it("closes past a control whose aria-haspopup is false", async () => {
    await mount(<Shell start={<button type="button" aria-haspopup="false" aria-expanded="true">More</button>} />);
    ran.mockClear();
    await escape();
    expect(ran).toHaveBeenCalledWith("close");
  });

  it("closes past an always-expanded listbox drawn inline", async () => {
    await mount(
      <Shell
        start={
          <>
            <input aria-label="Who" role="combobox" aria-haspopup="listbox" aria-expanded="true" aria-controls="who-list" readOnly />
            <ul id="who-list" role="listbox" />
          </>
        }
      />,
    );
    ran.mockClear();
    await escape();
    expect(ran).toHaveBeenCalledWith("close");
  });

  it("holds the first Escape for a mounted popup, and lets the next one close when the control kept it open", async () => {
    const popup = document.createElement("div");
    popup.id = "own-popup";
    document.body.appendChild(popup);
    await mount(<Shell start={<button type="button" aria-haspopup="menu" aria-expanded="true" aria-controls="own-popup">Sort</button>} />);
    ran.mockClear();
    await escape();
    expect(ran).not.toHaveBeenCalledWith("close");
    expect(panel()).not.toBeNull();
    await escape();
    expect(ran).toHaveBeenCalledWith("close");
  });

  it("holds Escape again for a control opened afresh after another key", async () => {
    const popup = document.createElement("div");
    popup.id = "own-popup";
    document.body.appendChild(popup);
    await mount(<Shell start={<button type="button" aria-haspopup="menu" aria-expanded="true" aria-controls="own-popup">Sort</button>} />);
    ran.mockClear();
    await escape();
    await key("ArrowDown", field());
    await escape();
    expect(ran).not.toHaveBeenCalledWith("close");
  });
});

describe("the dialog's own attributes win over the app's", () => {
  it("keeps the role, the name, the tabIndex and hidden", async () => {
    await mount(
      <Shell
        {...({ role: "region", "aria-labelledby": "elsewhere", tabIndex: 0, hidden: true, "aria-label": "Mine", "data-shortcuts": "off" } as unknown as PaletteProps)}
      />,
    );
    const el = panel()!;
    expect(el.getAttribute("role")).toBe("dialog");
    expect(el.getAttribute("aria-labelledby")).not.toBe("elsewhere");
    expect(el.getAttribute("aria-label")).toBe("Command palette");
    expect(el.getAttribute("tabindex")).toBe("-1");
    expect(el.hasAttribute("hidden")).toBe(false);
    // The rest still go through.
    expect(el.getAttribute("data-shortcuts")).toBe("off");
  });
});

describe("a stale list and an Enter the app has spent", () => {
  it("holds no Enter the app's capture handler prevented", async () => {
    ran.mockClear();
    const later: PaletteSource = {
      id: "l",
      heading: "Later",
      search: (q) => (q === "t" ? new Promise<PaletteItem[]>((resolve) => setTimeout(() => resolve([row("t", "Ten")]), 50)) : [row("a", "One")]),
    };
    await mount(
      <Palette
        open
        sources={[later]}
        onKeyDownCapture={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      >
        <PaletteField />
        <PaletteList />
      </Palette>,
    );
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(field(), "t");
      field()!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(one(".dl-palette-list")!.hasAttribute("data-stale")).toBe(true);
    await act(async () => {
      field()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    await settle(150);
    expect(one(".dl-palette-list")!.hasAttribute("data-stale")).toBe(false);
    expect(ran).not.toHaveBeenCalledWith("t");
  });
});
