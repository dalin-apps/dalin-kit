/**
 * @vitest-environment jsdom
 *
 * The slots the app ports asked of <PhoneSearch>: an app's own row insides
 * and its own grouping inside a source's answer (drive, calendar), `dim`
 * and `className` on rows, the menu at the phone's target and a row that
 * shows it is held (mail), a completion and the input's ref (mail), and a
 * body whose results scroll themselves (mail). Each case failed before.
 */
import { act, createRef, useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { readCss, ruleFor } from "../../test/css.js";
import { all, click, key, mount, one, settle, type, withDom } from "../../test/dom.js";
import type { PaletteItem, PaletteSource } from "./palette-types.js";
import { PhoneSearch, type PhoneSearchProps } from "./phone-search.js";

withDom();

const css = readCss("phone");
const ran = vi.fn();
const row = (id: string, title: string, extra: Partial<PaletteItem> = {}): PaletteItem => ({ id, title, onSelect: () => ran(id), ...extra });
const field = () => one<HTMLInputElement>(".dl-phone-search-input");
const rows = () => all(".dl-phone-search-row");

function Sheet(props: Partial<PhoneSearchProps>) {
  const [open, setOpen] = useState(true);
  return <PhoneSearch open={open} onOpenChange={setOpen} systemBack={false} {...props} />;
}

const touch = (el: Element, name: "touchstart" | "touchend") =>
  act(async () => {
    el.dispatchEvent(
      new TouchEvent(name, {
        bubbles: true,
        cancelable: true,
        touches: name === "touchstart" ? [{ clientX: 20, clientY: 30 } as unknown as Touch] : [],
      }),
    );
  });

describe("D1: an app's own row insides from `sources`", () => {
  const files: PaletteSource = {
    id: "files",
    heading: "Files",
    search: () => [row("a", "Quarterly report final v3.pdf", { data: { cut: "Quarterly…v3.pdf" } }), row("b", "Notes.txt")],
  };

  it("draws what `rowContent` returns, and the kit's row where it returns undefined", async () => {
    const seen: string[] = [];
    await mount(
      <Sheet
        sources={[files]}
        rowContent={(item, state) => {
          seen.push(state.marks);
          const cut = (item.data as { cut?: string } | undefined)?.cut;
          return cut ? <span className="middle-cut">{cut}</span> : undefined;
        }}
      />,
    );
    expect(rows()[0]!.querySelector(".middle-cut")?.textContent).toBe("Quarterly…v3.pdf");
    expect(rows()[0]!.querySelector(".dl-phone-search-one")).toBeNull();
    expect(rows()[1]!.querySelector(".dl-phone-search-one")?.textContent).toBe("Notes.txt");
    await type(field(), "q");
    expect(seen[seen.length - 1]).toBe("q");
  });

  it("keeps the row's tap and its long press", async () => {
    ran.mockClear();
    const menuFiles: PaletteSource = { ...files, search: () => [row("a", "Report", { menu: () => [{ label: "Share", onSelect: () => {} }] })] };
    await mount(<Sheet sources={[menuFiles]} rowContent={() => <span className="own">Report</span>} />);
    await touch(rows()[0]!, "touchstart");
    await settle(500);
    await touch(rows()[0]!, "touchend");
    expect(all('[role="menuitem"]').map((m) => m.textContent)).toEqual(["Share"]);
  });
});

describe("C6: an app's own grouping inside a source's answer", () => {
  const events: PaletteSource = {
    id: "events",
    heading: "Events",
    search: () => [
      row("e1", "Standup", { data: { day: "Today" } }),
      row("e2", "Review", { data: { day: "Today" } }),
      row("e3", "Retro", { data: { day: "Past" } }),
    ],
  };

  it("lays the kit's rows out between the app's own lines, under the group's heading", async () => {
    ran.mockClear();
    await mount(
      <Sheet
        sources={[events]}
        groupContent={(group, draw) => {
          const out: ReactNode[] = [];
          let day = "";
          for (const item of group.items) {
            const at = (item.data as { day: string }).day;
            if (at !== day) {
              day = at;
              out.push(
                <h3 key={`day:${at}`} className={at === "Past" ? "past" : "day"}>
                  {at}
                </h3>,
              );
            }
            out.push(draw(item));
          }
          return out;
        }}
      />,
    );
    const section = one(".dl-phone-search-section")!;
    expect([...section.children].map((el) => el.className || el.tagName)).toEqual([
      "dl-phone-search-heading",
      "day",
      "dl-phone-search-row",
      "dl-phone-search-row",
      "past",
      "dl-phone-search-row",
    ]);
    await click(rows()[2]);
    expect(ran).toHaveBeenCalledWith("e3");
  });

  it("keeps the kit's run of rows where it returns undefined", async () => {
    await mount(<Sheet sources={[events]} groupContent={() => undefined} />);
    expect(rows()).toHaveLength(3);
  });
});

describe("M2: `dim` and `className` on phone rows", () => {
  it("steps a row back and adds the app's class, in `sections` and from `sources`", async () => {
    await mount(
      <Sheet
        sources={[{ id: "m", heading: "Mail", search: () => [row("s", "Stored", { dim: true, className: "stored" })] }]}
        sections={[{ heading: "Recent", rows: [{ id: "w", title: "Waiting", dim: "waiting", className: "typed", onSelect: () => {} }] }]}
      />,
    );
    const [stored, waiting] = rows();
    expect(stored!.getAttribute("data-dim")).toBe("");
    expect(stored!.classList.contains("stored")).toBe(true);
    expect(waiting!.getAttribute("data-dim")).toBe("waiting");
    expect(waiting!.classList.contains("typed")).toBe(true);
    expect(waiting!.classList.contains("dl-phone-search-row")).toBe(true);
  });

  it("dims at the palette's steps, 85% and 60% while waiting, at once since nothing on the sheet fades", () => {
    expect(ruleFor(css, ".dl-phone-search-row[data-dim]")).toContain("opacity: 0.85");
    expect(ruleFor(css, '.dl-phone-search-row[data-dim="waiting"]')).toBe("opacity: 0.6;");
  });
});

describe("M3: the phone row menu and a held row", () => {
  it("draws the menu's entries at 44px in 16px type", async () => {
    await mount(<Sheet sources={[{ id: "p", heading: "People", search: () => [row("d", "Dana", { menu: () => [{ label: "Write", onSelect: () => {} }] })] }]} />);
    await touch(rows()[0]!, "touchstart");
    await settle(500);
    await touch(rows()[0]!, "touchend");
    expect(one(".dl-menu")!.classList.contains("dl-phone-search-menu")).toBe(true);
    expect(ruleFor(css, ".dl-phone-search-menu .dl-menu-item")).toContain("min-height: 44px");
    expect(ruleFor(css, ".dl-menu.dl-phone-search-menu")).toContain("font-size: 16px");
  });

  it("shows a finger's hold while it runs, and lets it go when it fires or the finger lifts", async () => {
    const onLongPress = vi.fn();
    await mount(<Sheet sections={[{ heading: "People", rows: [{ id: "d", title: "Dana", onLongPress, onSelect: () => {} }] }]} />);
    const dana = rows()[0]!;
    await touch(dana, "touchstart");
    expect(dana.hasAttribute("data-pressing")).toBe(true);
    await settle(500);
    expect(onLongPress).toHaveBeenCalled();
    expect(dana.hasAttribute("data-pressing")).toBe(false);
    await touch(dana, "touchend");
    await touch(dana, "touchstart");
    await touch(dana, "touchend");
    expect(dana.hasAttribute("data-pressing")).toBe(false);
  });

  it("lights the pressed row as the row whose menu is up", () => {
    expect(ruleFor(css, ".dl-phone-search-row[data-pressing]")).toBe(ruleFor(css, ".dl-phone-search-row[data-held]"));
  });

  it("keeps a row of the app's own lit while its hold's menu is up", async () => {
    await mount(<Sheet sections={[{ heading: "People", rows: [{ id: "d", title: "Dana", held: true, onLongPress: () => {}, onSelect: () => {} }] }]} />);
    expect(rows()[0]!.hasAttribute("data-held")).toBe(true);
  });
});

describe("M4: a completion and the input's ref", () => {
  function WithCompletion({ inputRef }: { inputRef?: PhoneSearchProps["inputRef"] }) {
    const [query, setQuery] = useState("da");
    const offer = query === "da" ? { suffix: "na Ito", onAccept: () => setQuery("dana Ito") } : null;
    return <Sheet query={query} onQueryChange={setQuery} completion={offer} inputRef={inputRef} />;
  }

  it("hands the app the input", async () => {
    const ref = createRef<HTMLInputElement>();
    await mount(<WithCompletion inputRef={ref} />);
    expect(ref.current).toBe(field());
    let seen: HTMLInputElement | null = null;
    await mount(<Sheet inputRef={(node) => void (seen = node)} />);
    expect(seen).toBe(field());
  });

  it("lays the rest after the typed words, and a tap on it takes it with the caret kept", async () => {
    await mount(<WithCompletion />);
    const ghost = one(".dl-phone-search-ghost")!;
    expect(one(".dl-phone-search-ghost-typed")!.textContent).toBe("da");
    const rest = ghost.querySelector<HTMLButtonElement>(".dl-phone-search-ghost-rest")!;
    expect(rest.textContent).toBe("na Ito");
    expect(rest.getAttribute("aria-label")).toBe("Complete as dana Ito");
    const down = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    rest.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    await click(rest);
    expect(field()!.value).toBe("dana Ito");
    expect(document.activeElement).toBe(field());
    expect(one(".dl-phone-search-ghost")).toBeNull();
    // The wrapper stays while nothing is on offer.
    expect(one(".dl-phone-search-entry")).not.toBeNull();
  });

  it("is taken by Tab and by ArrowRight at the end", async () => {
    await mount(<WithCompletion />);
    await key("Tab", field());
    expect(field()!.value).toBe("dana Ito");
    await type(field(), "da");
    field()!.setSelectionRange(1, 1);
    await key("ArrowRight", field());
    expect(field()!.value).toBe("da");
    field()!.setSelectionRange(2, 2);
    await key("ArrowRight", field());
    expect(field()!.value).toBe("dana Ito");
  });

  it("claims the forward Tab from the toast loop only while one is offered", async () => {
    await mount(<WithCompletion />);
    expect(field()!.hasAttribute("data-dl-owns-tab")).toBe(true);
    await key("Tab", field());
    expect(field()!.hasAttribute("data-dl-owns-tab")).toBe(false);
  });

  it("draws no wrapper where search never offers one", async () => {
    await mount(<Sheet />);
    expect(one(".dl-phone-search-entry")).toBeNull();
    expect(field()!.parentElement!.classList.contains("dl-phone-search-field")).toBe(true);
  });
});

describe("M5: results that scroll themselves", () => {
  it("marks the body, which then holds still and leaves the bottom space to the app's scroller", async () => {
    await mount(<Sheet query="x" ownScroller>{<div className="own-list" />}</Sheet>);
    const body = one(".dl-phone-search-body")!;
    expect(body.hasAttribute("data-own-scroller")).toBe(true);
    const own = ruleFor(css, ".dl-phone-search-body[data-own-scroller]");
    expect(own).toContain("overflow: hidden");
    expect(own).toContain("padding-bottom: 0");
    expect(ruleFor(css, ".dl-phone-search-body[data-own-scroller] > :only-child")).toContain("min-height: 0");
  });

  it("writes the bottom space once, as a variable the body and an app's scroller both read", () => {
    const body = ruleFor(css, ".dl-phone-search-body");
    expect(body).toContain(
      "--dl-phone-search-end: calc(env(safe-area-inset-bottom, 0px) + 32px + var(--dl-phone-kb, var(--kb-inset, 0px)))",
    );
    expect(body).toContain(
      "padding: 0 var(--dl-phone-inset, 16px) calc(env(safe-area-inset-bottom, 0px) + 32px + var(--dl-phone-kb, var(--kb-inset, 0px)))",
    );
  });

  it("leaves the body scrolling by default", async () => {
    await mount(<Sheet query="x">{<div />}</Sheet>);
    expect(one(".dl-phone-search-body")!.hasAttribute("data-own-scroller")).toBe(false);
  });
});
