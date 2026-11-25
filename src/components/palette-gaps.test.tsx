/**
 * @vitest-environment jsdom
 *
 * What the four app ports found in the palette's parts: an IME's keys,
 * two quick Tabs, the highlight on a new list, the dialog's and the
 * field's ARIA, Escape right after the filter opens, and attributes on the
 * panel. Each case failed before its fix.
 */
import { act, useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { all, click, key, mount, one, settle, type, withDom, withToast } from "../../test/dom.js";
import { CommandPalette } from "./command-palette.js";
import { FilterMenu } from "./filter-menu.js";
import { Palette, PaletteField, PaletteList, type PaletteProps } from "./palette.js";
import type { PaletteItem, PaletteSource } from "./palette-types.js";

withDom();

const field = () => one<HTMLInputElement>(".dl-palette-input");
const rows = () => all(".dl-palette-row");
const titles = () => rows().map((row) => row.querySelector(".dl-palette-title")?.textContent ?? row.textContent);
const focused = () => rows().filter((row) => row.hasAttribute("data-highlighted"));
const panel = () => one(".dl-palette");

const ran = vi.fn();
const row = (id: string, title: string, extra: Partial<PaletteItem> = {}): PaletteItem => ({ id, title, onSelect: () => ran(id), ...extra });

async function press(init: KeyboardEventInit, on: EventTarget = field()!) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  await act(async () => {
    on.dispatchEvent(event);
  });
  await settle();
  return event;
}

const plain = (props: PaletteProps & { children?: ReactNode } = {}) =>
  mount(
    <Palette open {...props}>
      {props.children ?? (
        <>
          <PaletteField />
          <PaletteList />
        </>
      )}
    </Palette>,
  );

const three: PaletteSource[] = [{ id: "p", heading: "Pages", search: () => [row("a", "One"), row("b", "Two"), row("c", "Three")] }];

describe("M1: an IME composing in the field", () => {
  it("keeps its Enter from running the highlighted row", async () => {
    ran.mockClear();
    await plain({ sources: three });
    const event = await press({ key: "Enter", isComposing: true, keyCode: 229 });
    expect(ran).not.toHaveBeenCalled();
    expect(panel()).not.toBeNull();
    // The key is the IME's: nothing in the kit cancelled it.
    expect(event.defaultPrevented).toBe(false);
  });

  it("keeps its Enter from the row when the browser reports isComposing alone", async () => {
    ran.mockClear();
    await plain({ sources: three });
    await press({ key: "Enter", isComposing: true });
    expect(ran).not.toHaveBeenCalled();
  });

  it("keeps its arrows from moving the highlight", async () => {
    await plain({ sources: three });
    const event = await press({ key: "ArrowDown", isComposing: true });
    expect(focused()).toEqual([rows()[0]]);
    expect(event.defaultPrevented).toBe(false);
    await press({ key: "ArrowDown" });
    expect(focused()).toEqual([rows()[1]]);
  });

  it("leaves a stale list's arrows to the IME as well", async () => {
    const later: PaletteSource = {
      id: "l",
      heading: "Later",
      search: (q) => (q ? new Promise<PaletteItem[]>(() => {}) : [row("a", "One"), row("b", "Two")]),
    };
    await plain({ sources: [later] });
    await type(field(), "t");
    const event = await press({ key: "ArrowDown", isComposing: true });
    expect(event.defaultPrevented).toBe(false);
  });
});

/**
 * A Tab as the browser takes one: the keydown, and where nothing took it,
 * focus on to the next stop in the page's order. Base UI's guards are stops
 * too, as they are in a browser, and they turn focus back only a frame on.
 */
function browserTab(shift = false): void {
  const from = document.activeElement ?? document.body;
  const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey: shift, bubbles: true, cancelable: true });
  from.dispatchEvent(event);
  if (event.defaultPrevented) return;
  const stops = all<HTMLElement>("a[href], button, input, select, textarea, [tabindex]").filter(
    (el) => el.tabIndex >= 0 && !el.hasAttribute("disabled") && !el.closest("[inert]"),
  );
  const way = shift ? Node.DOCUMENT_POSITION_PRECEDING : Node.DOCUMENT_POSITION_FOLLOWING;
  const ahead = stops.filter((el) => from.compareDocumentPosition(el) & way && !(shift && el.contains(from)));
  const to = (shift ? ahead[ahead.length - 1] : ahead[0]) ?? (shift ? stops[stops.length - 1] : stops[0]);
  to?.focus();
}

async function tabs(times: number, shift = false): Promise<void> {
  await act(async () => {
    for (let i = 0; i < times; i++) browserTab(shift);
  });
}

describe("C1: two quick Tabs", () => {
  function Page({ completion }: { completion?: boolean }) {
    return (
      <>
        <button type="button" id="before">
          Before
        </button>
        <Palette open query={completion ? "da" : undefined} sources={three}>
          <PaletteField
            completion={completion ? { suffix: "na Ito", onAccept: () => ran("accept") } : undefined}
            filter={<FilterMenu groups={[[{ key: "x", label: "Only pages", onSelect: () => {} }]]} />}
          />
          <PaletteList />
        </Palette>
        <button type="button" id="after">
          After
        </button>
      </>
    );
  }
  const where = () => {
    const el = document.activeElement;
    if (el === field()) return "field";
    if (el?.matches('[data-slot="filter-trigger"]')) return "filter";
    return el?.id || "elsewhere";
  };

  it("stay inside the palette from the filter, inside one frame", async () => {
    await mount(<Page />);
    await settle(60);
    one<HTMLElement>('[data-slot="filter-trigger"]')!.focus();
    await tabs(2);
    expect(panel()!.contains(document.activeElement)).toBe(true);
    await settle(60);
    expect(panel()!.contains(document.activeElement)).toBe(true);
    expect(where()).not.toBe("after");
  });

  it("stay inside the palette going back from the field", async () => {
    await mount(<Page />);
    await settle(60);
    field()!.focus();
    await tabs(2, true);
    expect(panel()!.contains(document.activeElement)).toBe(true);
    await settle(60);
    expect(where()).not.toBe("before");
  });

  it("still go to a toast and back", async () => {
    const { toast, action } = withToast();
    await mount(<Page />);
    await settle(60);
    one<HTMLElement>('[data-slot="filter-trigger"]')!.focus();
    await tabs(1);
    expect(document.activeElement).toBe(toast);
    action.focus();
    await tabs(1);
    expect(where()).toBe("field");
  });

  it("leave a forward Tab to the completion on offer", async () => {
    ran.mockClear();
    await mount(<Page completion />);
    await settle(60);
    field()!.focus();
    await tabs(1);
    expect(ran).toHaveBeenCalledWith("accept");
    expect(where()).toBe("field");
  });
});

describe("C2: the highlight on a new list", () => {
  function Filtered() {
    const [only, setOnly] = useState(false);
    const sources: PaletteSource[] = only
      ? [{ id: "w", heading: "Work", search: () => [row("x", "Budget"), row("y", "Roadmap"), row("z", "Hiring")] }]
      : three;
    return (
      <>
        <button type="button" id="pick" onClick={() => setOnly((v) => !v)}>
          Pick
        </button>
        <Palette open sources={sources}>
          <PaletteField />
          <PaletteList />
        </Palette>
      </>
    );
  }

  it("goes to the first row when a filter pick brings other rows", async () => {
    await mount(<Filtered />);
    await key("ArrowDown", field());
    await key("ArrowDown", field());
    expect(focused()[0]?.textContent).toContain("Three");
    await act(async () => {
      one<HTMLButtonElement>("#pick")!.click();
    });
    await settle();
    expect(titles()).toEqual(["Budget", "Roadmap", "Hiring"]);
    expect(focused().map((r) => r.textContent)).toEqual([rows()[0]!.textContent]);
  });

  it("goes to the first row on a new list an app builds, whose rows are new objects on every render", async () => {
    function Own({ pick }: { pick: boolean }) {
      const items = pick ? [row("x", "Budget"), row("y", "Roadmap"), row("z", "Hiring")] : [row("a", "One"), row("b", "Two"), row("c", "Three")];
      return (
        <Palette open query="" results={{ query: "", groups: [{ id: "g", heading: "Mail", items }] }}>
          <PaletteField />
          <PaletteList />
        </Palette>
      );
    }
    await mount(<Own pick={false} />);
    await key("ArrowDown", field());
    // A render with the same rows, as new objects.
    await mount(<Own pick={false} />);
    expect(focused()[0]?.textContent).toContain("Two");
    await mount(<Own pick />);
    expect(focused()[0]?.textContent).toContain("Budget");
  });

  it("stays on its row when the same rows come back", async () => {
    function Again() {
      const [n, setN] = useState(0);
      // A new array of the same rows each time.
      const sources: PaletteSource[] = [{ id: "p", heading: "Pages", search: () => [row("a", "One"), row("b", "Two"), row("c", "Three")] }];
      void n;
      return (
        <>
          <button type="button" id="again" onClick={() => setN((v) => v + 1)}>
            Again
          </button>
          <Palette open sources={sources}>
            <PaletteField />
            <PaletteList />
          </Palette>
        </>
      );
    }
    await mount(<Again />);
    await key("ArrowDown", field());
    expect(focused()[0]?.textContent).toContain("Two");
    await act(async () => {
      one<HTMLButtonElement>("#again")!.click();
    });
    await settle();
    expect(focused()[0]?.textContent).toContain("Two");
  });

  it("drops a held Enter whose row the new list no longer has", async () => {
    ran.mockClear();
    function Held({ live }: { live: boolean }) {
      const items = live ? [row("n1", "Fresh"), row("n2", "Fresher")] : [row("o1", "Old"), row("o2", "Older", { dim: "waiting" })];
      return (
        <Palette open query="x" results={{ query: "x", groups: [{ id: "m", heading: "Mail", items }] }}>
          <PaletteField />
          <PaletteList />
        </Palette>
      );
    }
    await mount(<Held live={false} />);
    await key("ArrowDown", field());
    await key("Enter", field());
    expect(ran).not.toHaveBeenCalled();
    await mount(<Held live />);
    expect(focused()[0]?.textContent).toContain("Fresh");
    expect(ran).not.toHaveBeenCalled();
  });
});

describe("C3: the dialog", () => {
  it("says it is modal", async () => {
    await plain({ sources: three });
    expect(panel()!.getAttribute("role")).toBe("dialog");
    expect(panel()!.getAttribute("aria-modal")).toBe("true");
  });
});

describe("C4: aria-expanded on the field", () => {
  it("is on over rows and off over an empty list", async () => {
    await plain({ sources: [{ id: "p", heading: "Pages", search: (q) => (q === "zz" ? [] : [row("a", "One")]) }] });
    expect(field()!.getAttribute("aria-expanded")).toBe("true");
    await type(field(), "zz");
    expect(rows()).toHaveLength(0);
    expect(field()!.getAttribute("aria-expanded")).toBe("false");
    await type(field(), "o");
    expect(field()!.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("C5: Escape right after the filter menu opens", () => {
  it("closes the menu and leaves the palette open", async () => {
    await mount(
      <CommandPalette
        open
        onOpenChange={(next) => ran(next ? "open" : "close")}
        sources={three}
        filter={<FilterMenu groups={[[{ key: "x", label: "Only pages", onSelect: () => {} }]]} />}
      />,
    );
    ran.mockClear();
    const trigger = one<HTMLElement>('[data-slot="filter-trigger"]')!;
    // The menu opens, and Escape lands before focus has moved into it: a
    // loaded run moves it a frame or more late.
    await act(async () => {
      trigger.click();
    });
    expect(all('[role="menuitem"]')).toHaveLength(1);
    field()!.focus();
    await act(async () => {
      field()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    await settle(200);
    expect(ran).not.toHaveBeenCalledWith("close");
    expect(panel()).not.toBeNull();
    expect(all('[role="menuitem"]')).toHaveLength(0);
  });

  it("closes the palette once the menu is shut", async () => {
    await mount(
      <CommandPalette
        open
        onOpenChange={(next) => ran(next ? "open" : "close")}
        sources={three}
        filter={<FilterMenu groups={[[{ key: "x", label: "Only pages", onSelect: () => {} }]]} />}
      />,
    );
    ran.mockClear();
    await click(one('[data-slot="filter-trigger"]'));
    await key("Escape", document.activeElement);
    await settle(200);
    expect(ran).not.toHaveBeenCalledWith("close");
    await key("Escape", field());
    await settle(200);
    expect(ran).toHaveBeenCalledWith("close");
  });
});

describe("M6: attributes on the panel", () => {
  it("passes data-* and other attributes through to the popup", async () => {
    await plain({ sources: three, "data-compose-fold": "", "data-shortcuts": "off", id: "mail-search" } as PaletteProps);
    expect(panel()!.hasAttribute("data-compose-fold")).toBe(true);
    expect(panel()!.getAttribute("data-shortcuts")).toBe("off");
    expect(panel()!.id).toBe("mail-search");
    // The kit's own still stand.
    expect(panel()!.getAttribute("data-slot")).toBe("command-palette");
  });
});
