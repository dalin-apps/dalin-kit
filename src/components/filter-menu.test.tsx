/**
 * @vitest-environment jsdom
 *
 * The filter control: the glyph, the menu it opens on a computer and on a
 * phone, and filter.css for the look.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { readCss, rulesWith } from "../../test/css.js";
import { all, click, key, mount, one, settle, withDom } from "../../test/dom.js";
import { FilterMenu, filterCount, type FilterMenuProps } from "./filter-menu.js";
import { FILTER_FILLED_STROKE, FilterGlyph } from "./icons.js";

withDom();

const css = readCss("filter");

function rowNamed(name: string): HTMLElement | undefined {
  return all('[role^="menuitem"]').find((el) => el.textContent?.includes(name));
}

/**
 * A menu that takes its time to leave. jsdom runs no animations, so Base UI
 * unmounts a closing popup at once; with one still running on the popup it
 * waits for it, as it does in a browser. `hold()` starts one on whatever
 * asks from then on, `finish()` ends it, and `restore()` puts jsdom back.
 */
function slowLeaving(): { hold: () => void; finish: () => Promise<void>; restore: () => void } {
  let running: object[] = [];
  let end = () => {};
  const proto = Element.prototype as { getAnimations?: () => object[] };
  proto.getAnimations = () => running;
  return {
    hold: () => {
      const finished = new Promise<void>((resolve) => (end = resolve));
      running = [{ finished, pending: false, playState: "running", effect: { getTiming: () => ({ duration: 450, iterations: 1 }) } }];
    },
    finish: async () => {
      running = [];
      await act(async () => end());
      await settle(60);
    },
    restore: () => {
      delete proto.getAnimations;
    },
  };
}

/** Focus as the reader's own Tab gives it. */
async function tabTo(el: HTMLElement): Promise<void> {
  await act(async () => el.focus());
}

function base(overrides: Partial<FilterMenuProps> = {}): FilterMenuProps {
  return {
    facets: [
      {
        key: "from",
        label: "From",
        options: [{ key: "a", label: "Ada", count: filterCount(12), onSelect: vi.fn() }],
      },
      { key: "date", label: "Date", empty: "Counting" },
    ],
    groups: [
      [{ key: "unread", label: "Unread", count: "4", onSelect: vi.fn() }],
      [{ key: "people", label: "Only people", checked: true, onSelect: vi.fn() }],
    ],
    ...overrides,
  };
}

describe("FilterGlyph", () => {
  it("draws three lines that shorten as they go down", () => {
    const html = renderToStaticMarkup(<FilterGlyph />);
    expect(html).toContain('d="M4 6.5h16M7 12h10M10 17.5h4"');
    expect(html).toContain('stroke-width="2"');
    expect(html).not.toContain("data-filled");
  });

  it("draws its filled form heavier, at the stroke filter.css uses", () => {
    const html = renderToStaticMarkup(<FilterGlyph filled />);
    expect(html).toContain(`stroke-width="${FILTER_FILLED_STROKE}"`);
    expect(html).toContain('data-filled=""');
    for (const [, body] of rulesWith(css, "> svg").filter(([, b]) => b.includes("stroke-width"))) {
      expect(body).toContain(`stroke-width: ${FILTER_FILLED_STROKE}`);
    }
  });
});

describe("filterCount", () => {
  it("formats a count, with a plus past a cap, and nothing for none", () => {
    expect(filterCount(1200)).toBe((1200).toLocaleString());
    expect(filterCount(1000, true)).toBe(`${(1000).toLocaleString()}+`);
    expect(filterCount(undefined)).toBe("");
  });
});

describe("FilterMenu", () => {
  it("is a named control with the glyph and no dot while nothing is on", async () => {
    await mount(<FilterMenu {...base()} />);
    const trigger = one('[data-slot="filter-trigger"]')!;
    expect(trigger.getAttribute("aria-label")).toBe("Filters");
    expect(trigger.classList.contains("dl-filter")).toBe(true);
    expect(trigger.hasAttribute("data-on")).toBe(false);
    expect(one('[data-slot="filter-dot"]')).toBeNull();
  });

  it("wears a dot in the colour it is given while a filter is on", async () => {
    await mount(<FilterMenu {...base({ dot: "rgb(255, 0, 0)", label: "Filters: only Work" })} />);
    const trigger = one('[data-slot="filter-trigger"]')!;
    expect(trigger.hasAttribute("data-on")).toBe(true);
    expect(trigger.getAttribute("aria-label")).toBe("Filters: only Work");
    expect(one<HTMLElement>('[data-slot="filter-dot"]')!.style.background).toBe("rgb(255, 0, 0)");
  });

  it("keeps focus where it was on a press, so a field keeps its caret", async () => {
    await mount(<FilterMenu {...base()} />);
    const down = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    one('[data-slot="filter-trigger"]')!.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });

  it("opens on the choice, the facets as submenus, then the groups with a rule between them", async () => {
    const onChange = vi.fn();
    await mount(
      <FilterMenu
        {...base({
          choice: { label: "Search in", value: "", options: [{ value: "w", label: "Work" }, { value: "", label: "All mail" }], onChange },
        })}
      />,
    );
    await click(one('[data-slot="filter-trigger"]'));
    expect(one(".dl-filter-menu")).not.toBeNull();
    expect(one(".dl-menu-label")!.textContent).toBe("Search in");
    expect(all('[role="menuitemradio"]').map((r) => r.textContent)).toEqual(["Work", "All mail"]);
    expect(all('[data-slot="menu-sub-trigger"]').map((r) => r.textContent)).toEqual(["From", "Date"]);
    expect(rowNamed("Unread")!.querySelector(".dl-filter-count")!.textContent).toBe("4");
    // A ticked row shows its check, not a count.
    expect(rowNamed("Only people")!.querySelector(".dl-menu-end")).not.toBeNull();
    expect(all(".dl-menu-separator")).toHaveLength(2);
    await click(all('[role="menuitemradio"]')[0]);
    expect(onChange).toHaveBeenCalledWith("w");
  });

  it("stays open on a pick of the choice, or closes when the choice says so", async () => {
    const choice = { label: "Show", value: "a", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }], onChange: vi.fn() };
    await mount(<FilterMenu {...base({ choice })} />);
    await click(one('[data-slot="filter-trigger"]'));
    await click(all('[role="menuitemradio"]')[1]);
    await settle(50);
    expect(one(".dl-filter-menu")).not.toBeNull();
    await key("Escape");
    await settle(300);

    await mount(<FilterMenu {...base({ choice: { ...choice, closes: true } })} />);
    await click(one('[data-slot="filter-trigger"]'));
    await click(all('[role="menuitemradio"]')[1]);
    await settle(300);
    expect(choice.onChange).toHaveBeenLastCalledWith("b");
    expect(one(".dl-filter-menu")).toBeNull();
  });

  it("takes a finalFocus of the app's own, which wins over the trigger", async () => {
    const to = { current: null as HTMLElement | null };
    await mount(
      <>
        <input className="elsewhere" aria-label="Search" />
        <FilterMenu {...base()} finalFocus={to} />
      </>,
    );
    to.current = one<HTMLElement>(".elsewhere");
    await click(one('[data-slot="filter-trigger"]'));
    await key("Escape");
    await settle(300);
    expect(document.activeElement).toBe(one(".elsewhere"));
  });

  it("gives focus back to the field it ends after a pick, so the next word lands there", async () => {
    await mount(
      <div>
        <input className="field" />
        <FilterMenu {...base()} />
      </div>,
    );
    const input = one<HTMLInputElement>(".field")!;
    input.focus();
    await click(one('[data-slot="filter-trigger"]'));
    await click(rowNamed("Unread"));
    await settle(200);
    expect(document.activeElement).toBe(input);
  });

  it("gives focus back to the field however long the menu takes to leave", async () => {
    const leaving = slowLeaving();
    try {
      await mount(
        <div>
          <input className="field" />
          <FilterMenu {...base()} />
        </div>,
      );
      const input = one<HTMLInputElement>(".field")!;
      input.focus();
      await click(one('[data-slot="filter-trigger"]'));
      leaving.hold();
      await click(rowNamed("Unread"));
      // Longer than the 400ms the hand-off waited until 0.14.1: a loaded
      // machine took 424ms, and the next word typed went nowhere.
      await settle(450);
      expect(one(".dl-filter-menu")).not.toBeNull();
      expect(document.activeElement).not.toBe(input);
      await leaving.finish();
      expect(one(".dl-filter-menu")).toBeNull();
      expect(document.activeElement).toBe(input);
    } finally {
      leaving.restore();
    }
  });

  it("gives it back after a pick in a facet's submenu too, once both have left", async () => {
    const leaving = slowLeaving();
    try {
      await mount(
        <div>
          <input className="field" />
          <FilterMenu {...base()} />
        </div>,
      );
      const input = one<HTMLInputElement>(".field")!;
      input.focus();
      await click(one('[data-slot="filter-trigger"]'));
      await click(all('[data-slot="menu-sub-trigger"]')[0]);
      leaving.hold();
      await click(rowNamed("Ada"));
      await settle(450);
      await leaving.finish();
      expect(one(".dl-filter-menu")).toBeNull();
      expect(document.activeElement).toBe(input);
    } finally {
      leaving.restore();
    }
  });

  it("leaves the glyph the focus the reader's own Tab gives it, once the hand-off is done", async () => {
    await mount(
      <div>
        <input className="field" />
        <FilterMenu {...base()} />
      </div>,
    );
    const input = one<HTMLInputElement>(".field")!;
    const trigger = one('[data-slot="filter-trigger"]')!;
    input.focus();
    await click(trigger);
    await click(rowNamed("Unread"));
    await settle(60);
    expect(document.activeElement).toBe(input);
    await tabTo(trigger);
    expect(document.activeElement).toBe(trigger);
  });

  it("owes the field nothing after a close that sent the glyph no focus, so Tab still reaches the glyph", async () => {
    await mount(
      <div>
        <input className="field" />
        <FilterMenu {...base()} />
        <button type="button" className="after">After</button>
      </div>,
    );
    const input = one<HTMLInputElement>(".field")!;
    const trigger = one('[data-slot="filter-trigger"]')!;
    input.focus();
    await click(trigger);
    // Tab out of the open menu: Base UI's guard at the menu's end closes it
    // and sends focus on to what follows the glyph, never to the glyph.
    await tabTo(all("[data-base-ui-focus-guard]").at(-1)!);
    await settle(60);
    expect(one(".dl-filter-menu")).toBeNull();
    expect(document.activeElement).toBe(one(".after"));
    // Shift+Tab back to the glyph: its focus is the reader's, and stays.
    await tabTo(trigger);
    expect(document.activeElement).toBe(trigger);
  });

  it("starts each opening owing nothing from the close before", async () => {
    const leaving = slowLeaving();
    try {
      await mount(
        <div>
          <input className="field" />
          <FilterMenu {...base()} />
        </div>,
      );
      const trigger = one('[data-slot="filter-trigger"]')!;
      one<HTMLInputElement>(".field")!.focus();
      await click(trigger);
      leaving.hold();
      await click(rowNamed("Unread"));
      // Opened again while it was still leaving: the menu never left, so no return is coming.
      await click(trigger);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      await tabTo(trigger);
      expect(document.activeElement).toBe(trigger);
      await leaving.finish();
    } finally {
      leaving.restore();
    }
  });

  it("keeps focus on the glyph when the keyboard opened the menu from it", async () => {
    await mount(
      <div>
        <input className="field" />
        <FilterMenu {...base()} />
      </div>,
    );
    const trigger = one('[data-slot="filter-trigger"]')!;
    await tabTo(trigger);
    await click(trigger);
    await click(rowNamed("Unread"));
    await settle(60);
    expect(document.activeElement).toBe(trigger);
  });

  it("lets a dialog a pick opens take focus as it mounts, after the menu has closed", async () => {
    await mount(
      <div>
        <input className="field" />
        <button type="button" className="elsewhere">Dialog</button>
        <FilterMenu
          {...base({
            // A dialog takes focus as it mounts, a task after the pick.
            groups: [[{ key: "open", label: "Open a dialog", onSelect: () => void setTimeout(() => one<HTMLButtonElement>(".elsewhere")!.focus(), 0) }]],
          })}
        />
      </div>,
    );
    one<HTMLInputElement>(".field")!.focus();
    await click(one('[data-slot="filter-trigger"]'));
    await click(rowNamed("Open a dialog"));
    await settle(200);
    expect(document.activeElement).toBe(one(".elsewhere"));
  });

  it("runs a row's own action", async () => {
    const props = base();
    await mount(<FilterMenu {...props} />);
    await click(one('[data-slot="filter-trigger"]'));
    await click(rowNamed("Unread"));
    expect(props.groups![0]![0]!.onSelect).toHaveBeenCalledOnce();
  });

  it("on a phone swaps a facet's page into the menu, says to fetch it, and comes back", async () => {
    const onFacetOpen = vi.fn();
    await mount(<FilterMenu {...base({ variant: "phone", onFacetOpen })} />);
    const trigger = one('[data-slot="filter-trigger"]')!;
    expect(trigger.getAttribute("data-variant")).toBe("phone");
    await click(trigger);
    expect(one('[data-slot="menu-sub-trigger"]')).toBeNull();
    await click(rowNamed("From"));
    expect(onFacetOpen).toHaveBeenCalledWith("from");
    expect(one(".dl-filter-back")!.textContent).toBe("From");
    expect(rowNamed("Ada")!.textContent).toContain("12");
    expect(rowNamed("Unread")).toBeUndefined();
    await click(one(".dl-filter-back"));
    expect(onFacetOpen).toHaveBeenLastCalledWith(null);
    expect(rowNamed("Unread")).toBeDefined();
  });

  it("says what an empty facet says", async () => {
    await mount(<FilterMenu {...base({ variant: "phone" })} />);
    await click(one('[data-slot="filter-trigger"]'));
    await click(rowNamed("Date"));
    const empty = rowNamed("Counting")!;
    expect(empty.getAttribute("aria-disabled") ?? empty.getAttribute("data-disabled")).not.toBeNull();
  });

  it("tells the app when it closes, so counting can stop", async () => {
    const onFacetOpen = vi.fn();
    const onOpenChange = vi.fn();
    await mount(<FilterMenu {...base({ onFacetOpen, onOpenChange })} />);
    await click(one('[data-slot="filter-trigger"]'));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await click(rowNamed("Unread"));
    await settle(200);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onFacetOpen).toHaveBeenLastCalledWith(null);
  });

  it("puts the app's class on the menu beside its own", async () => {
    await mount(<FilterMenu {...base({ menuClassName: "menu-touch" })} />);
    await click(one('[data-slot="filter-trigger"]'));
    expect(one(".dl-filter-menu")!.classList.contains("menu-touch")).toBe(true);
  });

  it("puts the trigger in the app's tooltip", async () => {
    await mount(<FilterMenu {...base()} tooltip={(trigger, label) => <span data-tip={label}>{trigger}</span>} />);
    expect(one('[data-tip="Filters"] [data-slot="filter-trigger"]')).not.toBeNull();
  });
});

describe("filter.css", () => {
  it("draws no box behind the glyph", () => {
    const rule = rulesWith(css, ".dl-filter").find(([sel]) => sel === ".dl-filter")![1];
    expect(rule).toContain("background: none");
    expect(rule).toContain("border: 0");
    for (const [sel, body] of rulesWith(css, ".dl-filter:")) {
      expect(body, sel).not.toMatch(/background(-color)?:\s*(?!none)/);
    }
  });

  it("stands its menu over the command palette, and keeps an app's higher menu step", () => {
    const [, body] = rulesWith(css, ".dl-menu-positioner:has(")[0]!;
    expect(body).toMatch(/max\(\s*var\(--dl-overlay-z/);
    expect(body).toMatch(/calc\(var\(--dl-palette-z, var\(--dl-z-palette, 90\)\) \+ 2\)/);
    // The panel is the palette's z-index plus one, so the menu must clear both.
    expect(readCss("palette")).toContain("z-index: calc(var(--dl-palette-z, var(--dl-z-palette, 90)) + 1)");
  });

  it("turns the glyph white when open or on, and under a hovering pointer only", () => {
    expect(rulesWith(css, ".dl-filter:is([data-popup-open], [data-on])").map(([, b]) => b).join()).toContain("--dl-fg");
    expect(css).toMatch(/@media \(hover: hover\)\s*\{\s*\.dl-filter:hover/);
  });
});
