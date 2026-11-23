/**
 * @vitest-environment jsdom
 *
 * <CommandPalette>: the keys that open it, the groups it shows, the marked
 * match, the Enter hint on the focused row, and what choosing a row does.
 * Runs the real Base UI Dialog and Autocomplete in jsdom, and reads
 * palette.css for the look.
 */
import { act, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readCss, ruleFor, ruleNaming } from "../../test/css.js";
import { all, click, key, mount, one, press as pressOn, settle, type, withDom, withToast } from "../../test/dom.js";
import { INPUT_ATTR } from "../helpers/input-modality.js";
import { CommandPalette, SOURCE_WAIT_MS, type CommandPaletteProps, type PaletteItem, type PaletteSource } from "./command-palette.js";

withDom();

afterEach(() => {
  document.documentElement.removeAttribute(INPUT_ATTR);
});

const css = readCss("palette");

const chosen = vi.fn();
const page = (id: string, title: string, subtitle?: string, extra: Partial<PaletteItem> = {}): PaletteItem => ({
  id,
  title,
  subtitle,
  onSelect: () => chosen(id),
  ...extra,
});
const PAGES = [
  page("cues", "Sound cues: act 3", "Spring production", { meta: "Nov 7" }),
  page("lisbon", "Lisbon offsite: venue research", "Work · Needs our own sound desk"),
  page("groceries", "Groceries for Sunday"),
];
const TODOS = [page("band", "Sound check with the band", "Done · Load-in checklist", { done: true })];

const find = (rows: PaletteItem[]) => (query: string) =>
  rows.filter((row) => `${row.title} ${row.subtitle ?? ""}`.toLowerCase().includes(query.toLowerCase()));
const SOURCES: PaletteSource[] = [
  { id: "pages", heading: "Pages", search: find(PAGES) },
  { id: "todos", heading: "To-dos", search: find(TODOS) },
];
const ACTIONS: PaletteItem[] = [
  { id: "new", title: "New page", keys: ["N"], keywords: "create add", onSelect: () => chosen("new") },
  { id: "week", title: "Switch to Week view", onSelect: () => chosen("week") },
];

const palette = () => one(".dl-palette");
const field = () => one<HTMLInputElement>(".dl-palette-input");
const rows = () => all(".dl-palette-row");
const titles = () => rows().map((row) => row.querySelector(".dl-palette-title")?.textContent);
const headings = () => all(".dl-palette-head").map((head) => head.textContent);
const focused = () => rows().filter((row) => row.hasAttribute("data-highlighted"));

async function press(init: KeyboardEventInit, on: EventTarget = document.body) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  await act(async () => {
    on.dispatchEvent(event);
  });
  await settle();
  return event;
}

const mountPalette = (props: CommandPaletteProps = {}) =>
  mount(<CommandPalette sources={SOURCES} actions={ACTIONS} {...props} />);

describe("opening it", () => {
  it("renders nothing until it is opened", async () => {
    await mountPalette();
    expect(palette()).toBeNull();
    expect(one(".dl-palette-dim")).toBeNull();
  });

  it("opens on Ctrl K and on Cmd K, and the same key closes it", async () => {
    await mountPalette();
    const event = await press({ key: "k", ctrlKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(palette()).not.toBeNull();
    await press({ key: "k", ctrlKey: true });
    await settle(200);
    expect(palette()).toBeNull();
    await press({ key: "K", metaKey: true });
    expect(palette()).not.toBeNull();
  });

  it("leaves Ctrl K alone when the app turns the hotkey off", async () => {
    await mountPalette({ hotkey: false });
    const event = await press({ key: "k", ctrlKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(palette()).toBeNull();
  });

  it("opens on the app's own key, but not while the reader is typing in a field", async () => {
    await mountPalette({ appKey: "/" });
    const other = document.createElement("input");
    document.body.appendChild(other);
    await press({ key: "/" }, other);
    expect(palette()).toBeNull();
    const event = await press({ key: "/" });
    expect(event.defaultPrevented).toBe(true);
    expect(palette()).not.toBeNull();
  });

  it("types the app's own key into the query once it is open, and does not close", async () => {
    await mountPalette({ appKey: ["/", "s"] });
    await press({ key: "s" });
    expect(palette()).not.toBeNull();
    const event = await press({ key: "/" }, field()!);
    expect(event.defaultPrevented).toBe(false);
    expect(palette()).not.toBeNull();
  });

  it("puts the caret in the field as it opens", async () => {
    await mountPalette();
    await press({ key: "k", ctrlKey: true });
    expect(document.activeElement).toBe(field());
    expect(field()?.getAttribute("aria-label")).toBe("Search");
  });

  it("lands with no animation when a key opened it", async () => {
    await mountPalette();
    await press({ key: "k", ctrlKey: true });
    expect(palette()?.hasAttribute("data-instant")).toBe(true);
    expect(one(".dl-palette-dim")?.hasAttribute("data-instant")).toBe(true);
  });

  it("fades in when a press opened it, and lands at once when the keyboard pressed the button", async () => {
    function WithButton() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" className="open" onClick={() => setOpen(true)}>
            Search
          </button>
          <CommandPalette open={open} onOpenChange={setOpen} sources={SOURCES} />
        </>
      );
    }
    await mount(<WithButton />);
    await click(one(".open"));
    expect(palette()?.hasAttribute("data-instant")).toBe(false);
    await key("Escape", field());
    await settle(200);
    document.documentElement.setAttribute(INPUT_ATTR, "keyboard");
    await click(one(".open"));
    expect(palette()?.hasAttribute("data-instant")).toBe(true);
  });

  it("tells an app that owns the open state, and follows it", async () => {
    const onOpenChange = vi.fn();
    await mountPalette({ open: false, onOpenChange });
    await press({ key: "k", ctrlKey: true });
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // The app has not said yes yet.
    expect(palette()).toBeNull();
    await mountPalette({ open: true, onOpenChange });
    expect(palette()).not.toBeNull();
  });

  it("is a dialog with the app dimmed behind it", async () => {
    await mountPalette({ open: true, label: "Search notes" });
    expect(palette()?.getAttribute("role")).toBe("dialog");
    expect(palette()?.getAttribute("aria-label")).toBe("Search notes");
    expect(one(".dl-palette-dim")).not.toBeNull();
  });
});

describe("what it shows", () => {
  it("groups the results under each source's heading, with the actions last", async () => {
    await mountPalette({ open: true });
    expect(headings()).toEqual(["Pages", "To-dos", "Actions"]);
    expect(titles()).toEqual([
      "Sound cues: act 3",
      "Lisbon offsite: venue research",
      "Groceries for Sunday",
      "Sound check with the band",
      "New page",
      "Switch to Week view",
    ]);
  });

  it("writes a heading as the app wrote it, and names its group by it", async () => {
    await mountPalette({ open: true, actionsHeading: "Things to do" });
    expect(headings()).toContain("Things to do");
    const group = one('.dl-palette-group[role="group"]')!;
    expect(group.getAttribute("aria-labelledby")).toBe(group.querySelector(".dl-palette-head")?.id);
  });

  it("asks every source again as the query changes, and drops a group with nothing in it", async () => {
    await mountPalette({ open: true });
    await type(field(), "sound");
    expect(headings()).toEqual(["Pages", "To-dos"]);
    expect(titles()).toEqual(["Sound cues: act 3", "Lisbon offsite: venue research", "Sound check with the band"]);
  });

  it("filters the actions itself: every word, in the title or the keywords", async () => {
    await mountPalette({ open: true });
    await type(field(), "week switch");
    expect(titles()).toEqual(["Switch to Week view"]);
    await type(field(), "create");
    expect(titles()).toEqual(["New page"]);
  });

  it("marks the words of the query in the title and in the second line", async () => {
    await mountPalette({ open: true });
    await type(field(), "sound");
    const marks = (row: Element) => [...row.querySelectorAll("mark.dl-palette-mark")].map((mark) => mark.textContent);
    expect(marks(rows()[0]!.querySelector(".dl-palette-title")!)).toEqual(["Sound"]);
    expect(marks(rows()[1]!.querySelector(".dl-palette-title")!)).toEqual([]);
    expect(marks(rows()[1]!.querySelector(".dl-palette-sub")!)).toEqual(["sound"]);
    expect(rows()[0]!.querySelector(".dl-palette-title")?.textContent).toBe("Sound cues: act 3");
  });

  it("marks nothing before a word is typed", async () => {
    await mountPalette({ open: true });
    expect(all("mark")).toHaveLength(0);
  });

  it("draws a row's date, a done to-do, and an action's own shortcut", async () => {
    await mountPalette({ open: true });
    expect(rows()[0]!.querySelector(".dl-palette-meta")?.textContent).toBe("Nov 7");
    expect(rows()[1]!.querySelector(".dl-palette-meta")).toBeNull();
    expect(rows()[3]!.hasAttribute("data-done")).toBe(true);
    expect(rows()[0]!.hasAttribute("data-done")).toBe(false);
    const own = rows()[4]!.querySelector(".dl-palette-own")!;
    expect([...own.querySelectorAll("kbd")].map((cap) => cap.textContent)).toEqual(["N"]);
    expect(rows()[5]!.querySelector(".dl-palette-own")).toBeNull();
  });

  it("says so when a query finds nothing, in the app's words if it gives them", async () => {
    await mountPalette({ open: true });
    await type(field(), "zebra");
    expect(rows()).toHaveLength(0);
    expect(one(".dl-palette-note")?.textContent).toBe("No results for “zebra”.");
    expect(one('.dl-palette-status[role="status"]')?.textContent).toBe("No results.");
    await mountPalette({ open: true, emptyText: (query) => `Nothing called ${query}` });
    expect(one(".dl-palette-note")?.textContent).toBe("Nothing called zebra");
  });

  it("tells a screen reader how many results a query found", async () => {
    await mountPalette({ open: true });
    const status = () => one('.dl-palette-status[role="status"]')?.textContent;
    expect(status()).toBe("");
    await type(field(), "sound");
    expect(status()).toBe("3 results.");
    await type(field(), "groceries");
    expect(status()).toBe("1 result.");
  });

  it("shows only the query row with nothing to list and nothing typed", async () => {
    await mount(<CommandPalette open />);
    expect(rows()).toHaveLength(0);
    expect(one(".dl-palette-note")).toBeNull();
    expect(one(".dl-palette-scroll")?.hasAttribute("data-empty")).toBe(true);
  });
});

describe("the focused row", () => {
  it("is the first row as the palette opens, and after every change to the query", async () => {
    await mountPalette({ open: true });
    expect(focused()).toEqual([rows()[0]]);
    await type(field(), "groceries");
    expect(focused().map((row) => row.querySelector(".dl-palette-title")?.textContent)).toEqual(["Groceries for Sunday"]);
  });

  it("carries the Enter hint in every row's shortcut slot, for the stylesheet to show on the focused one", async () => {
    await mountPalette({ open: true });
    for (const row of rows()) {
      const slot = row.querySelector(".dl-palette-keys")!;
      expect(slot.getAttribute("aria-hidden")).toBe("true");
      expect(slot.querySelector(".dl-palette-enter kbd")?.textContent).toBe("\u21b5");
      expect(row.lastElementChild).toBe(slot);
    }
  });

  it("says the hint in words to a screen reader, on the field", async () => {
    await mountPalette({ open: true });
    const hint = document.getElementById(field()!.getAttribute("aria-describedby")!);
    expect(hint?.textContent).toBe("Press Enter to open the highlighted result.");
  });

  it("shows the row's own verb beside the Enter hint, for a row that does something other than open", async () => {
    const files: PaletteSource = {
      id: "files",
      heading: "Files",
      search: () => [
        page("budget", "Budget.xlsx", "Finance", { verb: "Open" }),
        page("deck", "Deck.key", "Shared with me", { verb: "Reveal" }),
        page("plain", "Notes.txt"),
      ],
    };
    await mount(<CommandPalette open sources={[files]} />);
    const hints = rows().map((row) => row.querySelector(".dl-palette-enter")!);
    expect(hints.map((hint) => hint.querySelector(".dl-palette-verb")?.textContent ?? null)).toEqual(["Open", "Reveal", null]);
    // The word, then the cap, in the cell the stylesheet shows on the focused row.
    expect([...hints[1]!.children].map((child) => child.className)).toEqual(["dl-palette-verb", "dl-kbd"]);
    expect(hints[1]!.closest(".dl-palette-keys")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("says the focused row's verb in the hint a screen reader hears, and open for a row that names none", async () => {
    const files: PaletteSource = {
      id: "files",
      heading: "Files",
      search: () => [page("plain", "Notes.txt"), page("deck", "Deck.key", "Shared with me", { verb: "Reveal" })],
    };
    await mount(<CommandPalette open sources={[files]} />);
    const hint = () => document.getElementById(field()!.getAttribute("aria-describedby")!)?.textContent;
    expect(hint()).toBe("Press Enter to open the highlighted result.");
    await key("ArrowDown", field());
    expect(focused()[0]?.textContent).toContain("Deck.key");
    expect(hint()).toBe("Press Enter to reveal the highlighted result.");
    await key("ArrowUp", field());
    expect(hint()).toBe("Press Enter to open the highlighted result.");
  });

  it("moves with the arrows, with the caret staying in the field", async () => {
    await mountPalette({ open: true });
    await key("ArrowDown", field());
    expect(focused()).toEqual([rows()[1]]);
    await key("ArrowDown", field());
    expect(focused()).toEqual([rows()[2]]);
    await key("ArrowUp", field());
    expect(focused()).toEqual([rows()[1]]);
    expect(document.activeElement).toBe(field());
    expect(field()?.getAttribute("aria-activedescendant")).toBe(rows()[1]!.id);
  });

  it("runs on Enter, after the palette has closed", async () => {
    chosen.mockClear();
    const onOpenChange = vi.fn();
    let openWhenChosen: boolean | undefined;
    const sources: PaletteSource[] = [
      {
        id: "pages",
        heading: "Pages",
        search: () => [{ id: "cues", title: "Sound cues", onSelect: () => (openWhenChosen = onOpenChange.mock.calls.length === 0) }],
      },
    ];
    await mount(<CommandPalette sources={sources} onOpenChange={onOpenChange} />);
    await press({ key: "k", ctrlKey: true });
    onOpenChange.mockClear();
    await key("Enter", field());
    await settle(200);
    expect(openWhenChosen).toBe(false);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(palette()).toBeNull();
  });

  it("runs the row the arrows moved to", async () => {
    chosen.mockClear();
    await mountPalette();
    await press({ key: "k", ctrlKey: true });
    await key("ArrowDown", field());
    await key("Enter", field());
    expect(chosen).toHaveBeenCalledTimes(1);
    expect(chosen).toHaveBeenCalledWith("lisbon");
  });

  it("runs a row that is pressed", async () => {
    chosen.mockClear();
    await mountPalette();
    await press({ key: "k", ctrlKey: true });
    await click(rows()[4]);
    await settle(200);
    expect(chosen).toHaveBeenCalledWith("new");
    expect(palette()).toBeNull();
  });

  it("stays open after a row that asks it to, with the query as it was", async () => {
    const onSelect = vi.fn();
    await mount(
      <CommandPalette
        actions={[{ id: "weekends", title: "Show weekends", keepOpen: true, onSelect }]}
      />,
    );
    await press({ key: "k", ctrlKey: true });
    await type(field(), "week");
    await key("Enter", field());
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(palette()).not.toBeNull();
    expect(field()?.value).toBe("week");
  });
});

describe("closing it", () => {
  it("closes on Escape and opens again on an empty field", async () => {
    await mountPalette();
    await press({ key: "k", ctrlKey: true });
    await type(field(), "sound");
    await key("Escape", field());
    await settle(200);
    expect(palette()).toBeNull();
    await press({ key: "k", ctrlKey: true });
    expect(field()?.value).toBe("");
    expect(titles()).toHaveLength(6);
  });

  it("closes at once after a key, and fades after a press", async () => {
    await mountPalette();
    await press({ key: "k", ctrlKey: true });
    await act(async () => {
      palette()!.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });
    expect(palette()?.hasAttribute("data-instant")).toBe(false);
    await act(async () => {
      field()!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(palette()?.hasAttribute("data-instant")).toBe(true);
  });

  it("has a Close control for a pointer and a screen reader, kept out of the tab order", async () => {
    await mountPalette({ open: true });
    const close = one<HTMLButtonElement>(".dl-palette-close")!;
    expect(close.getAttribute("aria-label")).toBe("Close");
    expect(close.tabIndex).toBe(-1);
    expect(close.querySelector("kbd")?.textContent).toBe("Esc");
  });
});

describe("under a toast", () => {
  it("stays open when a toast over it is pressed", async () => {
    const { action } = withToast();
    const undo = vi.fn();
    action.addEventListener("click", undo);
    await mountPalette();
    await press({ key: "k", ctrlKey: true });
    await pressOn(action);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(palette()).not.toBeNull();
  });

  it("lets Tab leave the field for the toast's action, and brings it back", async () => {
    const { toast, action } = withToast();
    await mountPalette();
    await press({ key: "k", ctrlKey: true });
    expect(document.activeElement).toBe(field());
    const out = await press({ key: "Tab" }, field()!);
    expect(out.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(toast);
    expect(palette()).not.toBeNull();
    action.focus();
    await press({ key: "Tab" }, action);
    expect(document.activeElement).toBe(field());
    await press({ key: "Tab", shiftKey: true }, field()!);
    expect(document.activeElement).toBe(action);
    // Tab moved the focus and did nothing else: no row ran, nothing closed.
    expect(palette()).not.toBeNull();
    expect(field()?.value).toBe("");
  });

  it("keeps Tab in the field with no toast to reach", async () => {
    await mountPalette();
    await press({ key: "k", ctrlKey: true });
    const event = await press({ key: "Tab" }, field()!);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(field());
  });
});

describe("a source that answers later", () => {
  function later() {
    const calls: Array<{ query: string; signal: AbortSignal; answer: (rows: PaletteItem[]) => void }> = [];
    const source: PaletteSource = {
      id: "mail",
      heading: "Messages",
      search: (query, signal) => new Promise<PaletteItem[]>((resolve) => calls.push({ query, signal, answer: resolve })),
    };
    return { calls, sources: [source] };
  }
  const answer = async (call: { answer: (rows: PaletteItem[]) => void }, rows: PaletteItem[]) => {
    await act(async () => {
      call.answer(rows);
      await Promise.resolve();
    });
    await settle();
  };

  it("shows its rows when they arrive, and is busy until then", async () => {
    const { calls, sources } = later();
    await mount(<CommandPalette open sources={sources} />);
    expect(calls.map((call) => call.query)).toEqual([""]);
    expect(field()?.getAttribute("aria-busy")).toBe("true");
    expect(rows()).toHaveLength(0);
    await answer(calls[0]!, [page("a", "Thanksgiving plans")]);
    expect(titles()).toEqual(["Thanksgiving plans"]);
    expect(field()?.hasAttribute("aria-busy")).toBe(false);
  });

  it("aborts the search a new query replaces, and ignores its answer", async () => {
    const { calls, sources } = later();
    await mount(<CommandPalette open sources={sources} />);
    await type(field(), "plans");
    expect(calls.map((call) => call.query)).toEqual(["", "plans"]);
    expect(calls[0]!.signal.aborted).toBe(true);
    expect(calls[1]!.signal.aborted).toBe(false);
    await answer(calls[0]!, [page("stale", "An answer to the old question")]);
    expect(rows()).toHaveLength(0);
    await answer(calls[1]!, [page("a", "Thanksgiving plans")]);
    expect(titles()).toEqual(["Thanksgiving plans"]);
  });

  it("keeps the last rows on screen while the next answer is on its way", async () => {
    const { calls, sources } = later();
    await mount(<CommandPalette open sources={sources} />);
    await answer(calls[0]!, [page("a", "Thanksgiving plans")]);
    await type(field(), "plans");
    expect(titles()).toEqual(["Thanksgiving plans"]);
    expect(one(".dl-palette-note")).toBeNull();
  });

  it("does not say nothing was found while a search is still out", async () => {
    const { sources } = later();
    await mount(<CommandPalette open sources={sources} />);
    await type(field(), "zebra");
    expect(one(".dl-palette-note")).toBeNull();
  });

  it("aborts what is out when the palette closes, and treats a failed search as an empty one", async () => {
    const calls: AbortSignal[] = [];
    const failing: PaletteSource = {
      id: "files",
      heading: "Files",
      search: (_query, signal) => {
        calls.push(signal);
        return Promise.reject(new Error("offline"));
      },
    };
    await mount(<CommandPalette sources={[failing]} actions={ACTIONS} />);
    await press({ key: "k", ctrlKey: true });
    await settle();
    expect(headings()).toEqual(["Actions"]);
    await key("Escape", field());
    await settle(200);
    expect(calls[0]!.aborted).toBe(true);
  });
});

describe("a list that answers an earlier query", () => {
  type Call = { query: string; answer: (rows: PaletteItem[]) => void };
  function slow(id = "mail", heading = "Messages") {
    const calls: Call[] = [];
    const source: PaletteSource = {
      id,
      heading,
      search: (query) => new Promise<PaletteItem[]>((resolve) => calls.push({ query, answer: resolve })),
    };
    return { calls, source };
  }
  const answer = async (call: Call, found: PaletteItem[]) => {
    await act(async () => {
      call.answer(found);
      await Promise.resolve();
    });
    await settle();
  };
  const ran = vi.fn();
  const message = (id: string, title: string): PaletteItem => ({ id, title, onSelect: () => ran(id) });
  const list = () => one(".dl-palette-list")!;

  it("holds Enter while the answer is out, and runs the answer's first row when it arrives", async () => {
    ran.mockClear();
    const { calls, source } = slow();
    await mount(<CommandPalette open sources={[source]} />);
    await answer(calls[0]!, [message("old", "Invoice for October")]);
    await type(field(), "plans");
    // The row on screen answers the empty query, not "plans".
    expect(titles()).toEqual(["Invoice for October"]);
    expect(list().hasAttribute("data-stale")).toBe(true);
    expect(field()?.getAttribute("aria-busy")).toBe("true");
    await key("Enter", field());
    expect(ran).not.toHaveBeenCalled();
    expect(palette()).not.toBeNull();
    await answer(calls[1]!, [message("plans", "Thanksgiving plans"), message("other", "Plans for spring")]);
    expect(ran).toHaveBeenCalledTimes(1);
    expect(ran).toHaveBeenCalledWith("plans");
  });

  it("lets a held Enter go when the reader types on", async () => {
    ran.mockClear();
    const { calls, source } = slow();
    await mount(<CommandPalette open sources={[source]} />);
    await answer(calls[0]!, [message("old", "Invoice for October")]);
    await type(field(), "plan");
    await key("Enter", field());
    await type(field(), "plans");
    await answer(calls[2]!, [message("plans", "Thanksgiving plans")]);
    expect(ran).not.toHaveBeenCalled();
    expect(titles()).toEqual(["Thanksgiving plans"]);
    expect(list().hasAttribute("data-stale")).toBe(false);
  });

  it("runs nothing for a press on a stale row, and moves nothing with the arrows", async () => {
    ran.mockClear();
    const { calls, source } = slow();
    await mount(<CommandPalette open sources={[source]} />);
    await answer(calls[0]!, [message("a", "Invoice for October"), message("b", "Invoice for November")]);
    await type(field(), "plans");
    await click(rows()[1]);
    expect(ran).not.toHaveBeenCalled();
    await key("ArrowDown", field());
    expect(focused().map((row) => row.textContent)).toEqual([rows()[0]!.textContent]);
    await answer(calls[1]!, [message("plans", "Thanksgiving plans"), message("other", "Plans for spring")]);
    // The answer is in: the rows run again, and the first one is focused.
    expect(focused()).toEqual([rows()[0]]);
    await key("ArrowDown", field());
    expect(focused()).toEqual([rows()[1]]);
    await click(rows()[1]);
    expect(ran).toHaveBeenCalledWith("other");
  });

  it("marks a stale list's words by the query it answers", async () => {
    const { calls, source } = slow();
    await mount(<CommandPalette open sources={[source]} />);
    await type(field(), "invoice");
    await answer(calls[1]!, [message("a", "Invoice for October")]);
    expect(all(".dl-palette-mark").map((mark) => mark.textContent)).toEqual(["Invoice"]);
    await type(field(), "october");
    expect(all(".dl-palette-mark").map((mark) => mark.textContent)).toEqual(["Invoice"]);
  });

  it("changes the whole list at once, the actions with it", async () => {
    const { calls, source } = slow();
    await mount(<CommandPalette open sources={[source]} actions={ACTIONS} />);
    await answer(calls[0]!, [message("a", "Invoice for October")]);
    expect(headings()).toEqual(["Messages", "Actions"]);
    await type(field(), "week");
    // "New page" does not match "week", and stays until the answer arrives.
    expect(titles()).toEqual(["Invoice for October", "New page", "Switch to Week view"]);
    await answer(calls[1]!, []);
    expect(titles()).toEqual(["Switch to Week view"]);
  });

  it("puts a group that arrives after the wait at the end, so the highlight stays on its row", async () => {
    const { calls, source } = slow();
    await mount(<CommandPalette open sources={[source, SOURCES[0]!]} actions={ACTIONS} />);
    // The slow source is listed first. Nothing is shown without it at once.
    expect(rows()).toHaveLength(0);
    await settle(SOURCE_WAIT_MS + 60);
    expect(headings()).toEqual(["Pages", "Actions"]);
    expect(list().hasAttribute("data-stale")).toBe(false);
    expect(field()?.getAttribute("aria-busy")).toBe("true");
    await key("ArrowDown", field());
    const on = focused()[0]!;
    expect(on.textContent).toContain("Lisbon offsite");
    await answer(calls[0]!, [message("late", "Invoice for October")]);
    expect(headings()).toEqual(["Pages", "Actions", "Messages"]);
    expect(focused()).toEqual([on]);
    expect(rows().indexOf(on)).toBe(1);
    expect(field()?.hasAttribute("aria-busy")).toBe(false);
  });

  it("keeps the sources' order when every one answers inside the wait", async () => {
    const { calls, source } = slow();
    await mount(<CommandPalette open sources={[source, SOURCES[0]!]} actions={ACTIONS} />);
    await answer(calls[0]!, [message("a", "Invoice for October")]);
    expect(headings()).toEqual(["Messages", "Pages", "Actions"]);
    expect(focused()).toEqual([rows()[0]]);
  });
});

describe("palette.css", () => {
  const panel = ruleFor(css, ".dl-palette");

  it("is a 600px frosted panel 12vh down, on the overlay glass with the sheet's corners", () => {
    expect(panel).toContain("width: min(600px, calc(100vw - 32px))");
    expect(panel).toContain("top: 12vh");
    expect(panel).toContain("background: var(--dl-overlay, rgb(32 32 32 / 0.72))");
    expect(panel).toContain("backdrop-filter: var(--dl-overlay-blur, blur(16px) saturate(1.5))");
    expect(panel).toContain("border-radius: var(--dl-r-sheet, 14px)");
  });

  it("levels what is behind its glass, as the menus do, so the words hold over a white page", () => {
    const filter = (rule: string) => /backdrop-filter:\s*([^;]+);/.exec(rule)?.[1]?.replace(/\s+/g, " ");
    expect(filter(panel)).toBe("var(--dl-overlay-blur, blur(16px) saturate(1.5)) var(--dl-overlay-level, contrast(0.709) brightness(0.468))");
    expect(filter(panel)).toBe(filter(ruleFor(readCss("menu"), ".dl-menu, .dl-popover")));
  });

  it("dims the app behind it", () => {
    const dim = ruleFor(css, ".dl-palette-dim");
    expect(dim).toContain("inset: 0");
    expect(dim).toContain("background: var(--dl-palette-dim, var(--dl-scrim, rgb(0 0 0 / 0.62)))");
  });

  it("stands over the menus and the toaster, the panel one over its dim", () => {
    expect(ruleFor(css, ".dl-palette-dim")).toContain("z-index: var(--dl-palette-z, var(--dl-z-palette, 90))");
    expect(panel).toContain("z-index: calc(var(--dl-palette-z, var(--dl-z-palette, 90)) + 1)");
  });

  it("does not animate when the keyboard opened or closed it", () => {
    const instant = ruleNaming(css, ":is(.dl-palette, .dl-palette-dim)[data-instant]");
    expect(instant).toContain("transition: none");
    expect(ruleNaming(css, 'html[data-input="keyboard"] :is(.dl-palette, .dl-palette-dim)')).toBe(instant);
  });

  it("does not animate while the app's motion switch says Reduce, and follows the system unless it says Full", () => {
    expect(ruleFor(css, 'html[data-dl-motion="reduce"] :is(.dl-palette, .dl-palette-dim)')).toBe("transition: none;");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*html:not\(\[data-dl-motion="full"\]\) :is\(\.dl-palette, \.dl-palette-dim\)\s*\{\s*transition: none;/,
    );
  });

  it("stills a stale list: no pointer, no Enter hint, and a dim that waits 120ms for the answer", () => {
    expect(ruleFor(css, ".dl-palette-list[data-stale]")).toContain("pointer-events: none");
    const dim = ruleFor(css, ".dl-palette-list[data-stale] :is(.dl-palette-group, .dl-palette-enter)");
    expect(dim).toContain("opacity: 0.5");
    expect(dim).toContain("transition: opacity 0s linear 120ms");
    expect(ruleFor(css, ".dl-palette-list[data-stale] .dl-palette-enter")).toContain("opacity: 0");
  });

  it("fades and nothing more: no slide, no scale, no spring", () => {
    expect(panel).toMatch(/transition: opacity var\(--dl-t-open, 150ms\)/);
    expect(ruleFor(css, ":is(.dl-palette, .dl-palette-dim):is([data-starting-style], [data-ending-style])")).toBe("opacity: 0;");
  });

  it("leaves a heading in the case it was written in, small and muted", () => {
    const head = ruleFor(css, ".dl-palette-head");
    expect(head).toContain("text-transform: none");
    expect(head).toContain("font-size: 12px");
    expect(head).toContain("color: var(--dl-fg-muted, #b8b8b8)");
    expect(css).not.toContain("uppercase");
  });

  it("highlights the focused row with the overlay's white at 8%", () => {
    expect(ruleFor(css, ".dl-palette-row[data-highlighted]")).toContain(
      "background: var(--dl-overlay-hover, oklch(1 0 0 / 0.08))",
    );
  });

  it("marks the match with a lighter ground and a heavier weight, in the text's own colour", () => {
    const mark = ruleFor(css, ".dl-palette-mark");
    expect(mark).toContain("background: oklch(1 0 0 / 0.12)");
    expect(mark).toContain("font-weight: 500");
    expect(mark).toContain("color: inherit");
  });

  it("shows the Enter hint on the focused row alone, in place of the row's own keys", () => {
    expect(ruleNaming(css, ".dl-palette-enter")).toContain("visibility: hidden");
    expect(ruleNaming(css, ".dl-palette-row[data-highlighted] .dl-palette-own")).toContain("visibility: hidden");
    expect(ruleFor(css, ".dl-palette-row[data-highlighted] .dl-palette-enter")).toContain("visibility: visible");
  });

  it("sets the verb small and muted, 6px before the Enter cap", () => {
    const verb = ruleFor(css, ".dl-palette-verb");
    expect(verb).toContain("font-size: 12px");
    expect(verb).toContain("color: var(--dl-fg-muted, #b8b8b8)");
    const hint = ruleFor(css, ".dl-palette-keys > .dl-palette-enter");
    expect(hint).toContain("display: inline-flex");
    expect(hint).toContain("gap: 6px");
  });

  it("keeps both in one cell, so the focus moving shifts nothing in a row", () => {
    expect(ruleFor(css, ".dl-palette-keys")).toContain("display: grid");
    expect(ruleFor(css, ".dl-palette-keys > *")).toContain("grid-area: 1 / 1");
    // Hidden, never removed: a hint that left the layout would let the date slide right.
    expect(css).not.toMatch(/\.dl-palette-(enter|own)[^{]*\{[^}]*display: none/);
  });

  it("strikes a done to-do through and mutes it", () => {
    const done = ruleFor(css, ".dl-palette-row[data-done] .dl-palette-title");
    expect(done).toContain("text-decoration: line-through");
    expect(done).toContain("color: var(--dl-fg-muted, #b8b8b8)");
  });

  it("cuts a long title with an ellipsis and never wraps it", () => {
    const text = ruleFor(css, ".dl-palette-title, .dl-palette-sub");
    expect(text).toContain("text-overflow: ellipsis");
    expect(text).toContain("white-space: nowrap");
  });

  it("sets the field at 16px on a touch screen, so iOS does not zoom", () => {
    expect(css).toMatch(/@media \(hover: none\) and \(pointer: coarse\)\s*\{\s*\.dl-palette-input\s*\{\s*font-size: 16px;/);
  });
});
