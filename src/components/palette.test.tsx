/**
 * @vitest-environment jsdom
 *
 * The palette's parts (<Palette>, <PaletteField>, <PaletteList>,
 * <PaletteNote>, <PaletteBody>): the cases mail's and calendar's palettes
 * need from them, Ctrl N and Ctrl P, the ranking of the actions, and pages
 * opened in the same field. <CommandPalette> is built from these parts and
 * keeps its own tests in command-palette.test.tsx.
 */
import { act, useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { readCss, ruleFor } from "../../test/css.js";
import { all, click, key, mount, one, settle, type, withDom, withToast } from "../../test/dom.js";
import {
  Palette,
  PaletteBody,
  PaletteField,
  PaletteList,
  PaletteNote,
  usePalette,
  type PaletteProps,
} from "./palette.js";
import { SOURCE_WAIT_MS } from "./palette-results.js";
import type { PaletteItem, PalettePage, PaletteSource } from "./palette-types.js";

withDom();

const field = () => one<HTMLInputElement>(".dl-palette-input");
const rows = () => all(".dl-palette-row");
const titles = () => rows().map((row) => row.querySelector(".dl-palette-title")?.textContent ?? row.textContent);
const headings = () => all(".dl-palette-head").map((head) => head.textContent);
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

function caretTo(at: number) {
  field()!.setSelectionRange(at, at);
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

describe("chips in the field row", () => {
  function WithChips() {
    const [chips, setChips] = useState(["from:dana", "has:attachment"]);
    return (
      <Palette open sources={[{ id: "mail", heading: "Messages", search: () => [row("a", "Invoice")] }]}>
        <PaletteField
          start={chips.map((chip) => (
            <span key={chip} className="chip">
              {chip}
            </span>
          ))}
          onKeyDown={(event) => {
            const input = event.currentTarget;
            if (event.key !== "Backspace" || input.selectionStart !== 0 || input.selectionEnd !== 0 || chips.length === 0) return;
            event.preventDefault();
            setChips(chips.slice(0, -1));
          }}
        />
        <PaletteList />
      </Palette>
    );
  }

  it("sits in the row before the words, after the glyph", async () => {
    await mount(<WithChips />);
    const query = one(".dl-palette-query")!;
    expect([...query.children].map((child) => child.getAttribute("class") ?? child.tagName.toLowerCase())).toEqual([
      "svg",
      "chip",
      "chip",
      "dl-palette-input",
      "dl-palette-close",
    ]);
  });

  it("lets Backspace at the start take the last chip, and leaves the words alone", async () => {
    await mount(<WithChips />);
    await type(field(), "inv");
    caretTo(0);
    const event = await press({ key: "Backspace" });
    expect(event.defaultPrevented).toBe(true);
    expect(all(".chip").map((chip) => chip.textContent)).toEqual(["from:dana"]);
    expect(field()!.value).toBe("inv");
    caretTo(3);
    const typing = await press({ key: "Backspace" });
    // At the end of the words, Backspace is the field's own.
    expect(typing.defaultPrevented).toBe(false);
    expect(all(".chip")).toHaveLength(1);
  });
});

describe("a ghost completion", () => {
  function WithCompletion({ onAccept }: { onAccept?: () => void }) {
    const [query, setQuery] = useState("");
    const offer = query === "da" ? { suffix: "na Ito", onAccept: () => (onAccept?.(), setQuery("dana Ito")) } : null;
    return (
      <Palette open query={query} onQueryChange={setQuery} sources={[{ id: "p", heading: "People", search: () => [row("d", "Dana Ito")] }]}>
        <PaletteField completion={offer} />
        <PaletteList />
      </Palette>
    );
  }

  it("lays the rest of the name over the field, after the typed words", async () => {
    await mount(<WithCompletion />);
    expect(one(".dl-palette-field > .dl-palette-input")).not.toBeNull();
    expect(one(".dl-palette-ghost")).toBeNull();
    await type(field(), "da");
    const ghost = one(".dl-palette-ghost")!;
    expect(ghost.getAttribute("aria-hidden")).toBe("true");
    expect(ghost.querySelector(".dl-palette-ghost-typed")?.textContent).toBe("da");
    expect(ghost.textContent).toBe("dana Ito");
  });

  it("is taken by Tab", async () => {
    await mount(<WithCompletion />);
    await type(field(), "da");
    const event = await press({ key: "Tab" });
    expect(event.defaultPrevented).toBe(true);
    expect(field()!.value).toBe("dana Ito");
    expect(one(".dl-palette-ghost")).toBeNull();
  });

  it("is taken by ArrowRight with the caret at the end, and not before it", async () => {
    const onAccept = vi.fn();
    await mount(<WithCompletion onAccept={onAccept} />);
    await type(field(), "da");
    caretTo(1);
    await press({ key: "ArrowRight" });
    expect(onAccept).not.toHaveBeenCalled();
    caretTo(2);
    await press({ key: "ArrowRight" });
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(field()!.value).toBe("dana Ito");
  });

  it("keeps Tab from the toast loop while it is offered", async () => {
    const { toast } = withToast();
    await mount(<WithCompletion />);
    await type(field(), "da");
    await press({ key: "Tab" });
    expect(document.activeElement).not.toBe(toast);
    expect(field()!.value).toBe("dana Ito");
    // Nothing on offer: Tab reaches the toast again.
    await press({ key: "Tab" });
    expect(document.activeElement).toBe(toast);
  });
});

describe("a row's menu", () => {
  const reply = vi.fn();
  const message = row("m1", "Lunch on Friday", {
    menu: () => [{ label: "Reply", onSelect: reply }, "separator", { label: "Archive", destructive: true, onSelect: () => ran("archive") }],
  });
  const sources: PaletteSource[] = [{ id: "mail", heading: "Messages", search: () => [message, row("m2", "No menu here")] }];
  const menuRows = () => all('[role="menuitem"]').map((item) => item.textContent);

  it("opens on a right click on the row, and keeps the row highlighted", async () => {
    await plain({ sources });
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 80 });
    await act(async () => {
      rows()[0]!.dispatchEvent(event);
    });
    await settle();
    expect(event.defaultPrevented).toBe(true);
    expect(menuRows()).toEqual(["Reply", "Archive"]);
    expect(rows()[0]!.hasAttribute("data-menu-open")).toBe(true);
    expect(one('[data-variant="destructive"]')?.textContent).toBe("Archive");
  });

  it("opens on ArrowRight at the end of the field for the highlighted row", async () => {
    await plain({ sources });
    const event = await press({ key: "ArrowRight" });
    expect(event.defaultPrevented).toBe(true);
    expect(menuRows()).toEqual(["Reply", "Archive"]);
  });

  it("does nothing for a row with no menu", async () => {
    await plain({ sources });
    await key("ArrowDown", field());
    const event = await press({ key: "ArrowRight" });
    expect(event.defaultPrevented).toBe(false);
    expect(menuRows()).toEqual([]);
  });

  it("closes on Escape and leaves the palette open, with the caret back in the field", async () => {
    await plain({ sources, onOpenChange: vi.fn() });
    await press({ key: "ArrowRight" });
    expect(menuRows()).toEqual(["Reply", "Archive"]);
    await key("Escape", document.activeElement);
    await settle(200);
    expect(menuRows()).toEqual([]);
    expect(panel()).not.toBeNull();
    expect(document.activeElement).toBe(field());
  });

  it("runs an entry, and closes the palette as a row does", async () => {
    reply.mockClear();
    const onOpenChange = vi.fn();
    await plain({ sources, onOpenChange });
    await press({ key: "ArrowRight" });
    await click(all('[role="menuitem"]')[0]);
    expect(reply).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("a source that failed", () => {
  function Retry() {
    const { results } = usePalette();
    return results.failed.length > 0 ? (
      <PaletteNote tone="error" action={{ label: "Retry", onClick: results.retry }}>
        Search could not finish.
      </PaletteNote>
    ) : null;
  }

  it("is named in the results, and Retry asks it again", async () => {
    let fail = true;
    const search = vi.fn(() => (fail ? Promise.reject(new Error("offline")) : Promise.resolve([row("a", "Invoice")])));
    await plain({
      sources: [{ id: "mail", heading: "Messages", search }],
      children: (
        <>
          <PaletteField />
          <PaletteList>
            <Retry />
          </PaletteList>
        </>
      ),
    });
    await settle();
    const note = one('.dl-palette-note[data-tone="error"]')!;
    expect(note.getAttribute("role")).toBe("alert");
    expect(note.textContent).toBe("Search could not finish. Retry");
    fail = false;
    await click(note.querySelector("button"));
    await settle();
    expect(search).toHaveBeenCalledTimes(2);
    expect(titles()).toEqual(["Invoice"]);
    expect(one('.dl-palette-note[data-tone="error"]')).toBeNull();
  });
});

describe("a body in the list's place", () => {
  function Sentence() {
    const [open, setOpen] = useState(true);
    const [asking, setAsking] = useState(false);
    const [picked, setPicked] = useState<string | null>(null);
    return (
      <Palette
        open={open}
        onOpenChange={setOpen}
        sources={[{ id: "events", heading: "Events", search: () => [row("e", "Standup")] }]}
        onEscape={() => {
          if (!asking) return false;
          setAsking(false);
          return true;
        }}
      >
        <PaletteField
          readOnly={asking}
          onKeyDown={(event) => {
            if (!asking && event.key === "Enter" && event.shiftKey) {
              event.preventDefault();
              setAsking(true);
            } else if (asking && event.key === "Enter") {
              event.preventDefault();
              setPicked("Tomorrow");
            }
          }}
        />
        {asking ? (
          <PaletteBody status="Which day?">
            <p className="question">Which day?</p>
            {picked ? <p className="picked">{picked}</p> : null}
          </PaletteBody>
        ) : (
          <PaletteList />
        )}
      </Palette>
    );
  }

  it("takes the list's place, says its own status, and leaves Enter to the app", async () => {
    ran.mockClear();
    await mount(<Sentence />);
    expect(titles()).toEqual(["Standup"]);
    await press({ key: "Enter", shiftKey: true });
    expect(rows()).toHaveLength(0);
    expect(one(".dl-palette-body .question")?.textContent).toBe("Which day?");
    expect(one('.dl-palette-status[role="status"]')?.textContent).toBe("Which day?");
    expect(field()!.readOnly).toBe(true);
    await press({ key: "Enter" });
    expect(one(".picked")?.textContent).toBe("Tomorrow");
    expect(ran).not.toHaveBeenCalled();
    expect(panel()).not.toBeNull();
  });

  it("gives Escape to the app first, and the list comes back", async () => {
    await mount(<Sentence />);
    await press({ key: "Enter", shiftKey: true });
    await key("Escape", field());
    await settle(200);
    expect(panel()).not.toBeNull();
    expect(one(".dl-palette-body")).toBeNull();
    expect(titles()).toEqual(["Standup"]);
    await key("Escape", field());
    await settle(200);
    expect(panel()).toBeNull();
  });
});

describe("a slow source and a Show all row", () => {
  const slow = () => {
    const calls: Array<(rows: PaletteItem[]) => void> = [];
    const source: PaletteSource = { id: "older", heading: "Older mail", search: () => new Promise<PaletteItem[]>((resolve) => calls.push(resolve)) };
    return { calls, source };
  };
  const tail = (query: string) => (query ? [row("all", `Show all results for “${query}”`, { verb: "Show all" })] : []);

  it("joins at the end, under the actions, with Show all still last and under no heading", async () => {
    const { calls, source } = slow();
    await plain({
      sources: [source, { id: "mail", heading: "Messages", search: () => [row("a", "Invoice for October")] }],
      actions: [row("new", "New message", { keywords: "invoice write" })],
      tail,
    });
    await type(field(), "invoice");
    await settle(SOURCE_WAIT_MS + 60);
    expect(headings()).toEqual(["Messages", "Actions"]);
    expect(titles()).toEqual(["Invoice for October", "New message", "Show all results for “invoice”"]);
    await key("ArrowDown", field());
    const on = focused()[0]!;
    await act(async () => {
      calls[calls.length - 1]!([row("old", "Invoice from 2019")]);
      await Promise.resolve();
    });
    await settle();
    expect(headings()).toEqual(["Messages", "Actions", "Older mail"]);
    expect(titles()).toEqual(["Invoice for October", "New message", "Invoice from 2019", "Show all results for “invoice”"]);
    expect(focused()).toEqual([on]);
    // The last group has no heading of its own.
    const groups = all(".dl-palette-group");
    expect(groups[groups.length - 1]!.querySelector(".dl-palette-head")).toBeNull();
    expect(groups[groups.length - 1]!.querySelector(".dl-palette-verb")?.textContent).toBe("Show all");
  });
});

describe("a list the app builds itself", () => {
  function Own({ answered, words }: { answered: string; words: string }) {
    return (
      <Palette open query={words} results={{ query: answered, groups: [{ id: "mail", heading: "Messages", items: [row("a", `About ${answered}`)] }] }}>
        <PaletteField />
        <PaletteList />
      </Palette>
    );
  }

  it("is stale while it answers other words, and a held Enter runs its first row when it catches up", async () => {
    ran.mockClear();
    await mount(<Own answered="lunch" words="lunch fri" />);
    expect(one(".dl-palette-list")!.hasAttribute("data-stale")).toBe(true);
    await key("Enter", field());
    expect(ran).not.toHaveBeenCalled();
    await mount(<Own answered="lunch fri" words="lunch fri" />);
    expect(ran).toHaveBeenCalledWith("a");
  });
});

describe("the palette's place in the stack", () => {
  it("stands where the app puts it, the dim and the panel together", async () => {
    await plain({ zIndex: 40 });
    expect(panel()!.style.getPropertyValue("--dl-palette-z")).toBe("40");
    expect(one<HTMLElement>(".dl-palette-dim")!.style.getPropertyValue("--dl-palette-z")).toBe("40");
  });

  it("writes nothing without one, so the token stands", async () => {
    await plain();
    expect(panel()!.style.getPropertyValue("--dl-palette-z")).toBe("");
  });
});

describe("Ctrl N and Ctrl P", () => {
  const sources: PaletteSource[] = [{ id: "p", heading: "Pages", search: () => [row("a", "One"), row("b", "Two"), row("c", "Three")] }];

  it("move the highlight down and up, as the arrows do", async () => {
    await plain({ sources });
    const down = await press({ key: "n", ctrlKey: true });
    expect(down.defaultPrevented).toBe(true);
    expect(focused()).toEqual([rows()[1]]);
    await press({ key: "n", ctrlKey: true });
    expect(focused()).toEqual([rows()[2]]);
    await press({ key: "p", ctrlKey: true });
    expect(focused()).toEqual([rows()[1]]);
    expect(document.activeElement).toBe(field());
  });

  it("do nothing while an IME is composing", async () => {
    await plain({ sources });
    const event = await press({ key: "n", ctrlKey: true, isComposing: true });
    expect(event.defaultPrevented).toBe(false);
    expect(focused()).toEqual([rows()[0]]);
  });

  it("move nothing while the list answers an earlier query", async () => {
    let answer: (rows: PaletteItem[]) => void = () => {};
    const later: PaletteSource = {
      id: "l",
      heading: "Later",
      search: (q) => (q ? new Promise<PaletteItem[]>((resolve) => (answer = resolve)) : [row("a", "One"), row("b", "Two")]),
    };
    await plain({ sources: [later] });
    await type(field(), "t");
    await press({ key: "n", ctrlKey: true });
    expect(focused()).toEqual([rows()[0]]);
    answer([]);
  });

  it("leave Ctrl K to open and close the palette", async () => {
    await mount(
      <Palette sources={sources}>
        <PaletteField />
        <PaletteList />
      </Palette>,
    );
    await press({ key: "k", ctrlKey: true }, document.body);
    expect(panel()).not.toBeNull();
    await press({ key: "k", ctrlKey: true });
    await settle(200);
    expect(panel()).toBeNull();
  });
});

describe("the actions' order", () => {
  const actions = [
    row("todo", "New to-do list"),
    row("page", "New page"),
    row("show-archive", "Show the archive"),
    row("archive", "Archive"),
    row("month", "Switch to Month view"),
    row("shared", "Shared"),
  ];

  it("puts every-word matches first and the score's finds after them, marking the letters the score took", async () => {
    await plain({ actions });
    await type(field(), "arch");
    expect(titles()).toEqual(["Archive", "Show the archive"]);
    await type(field(), "todo");
    expect(titles()).toEqual(["New to-do list"]);
    const marked = all(".dl-palette-mark").map((mark) => mark.textContent);
    expect(marked).toEqual(["to", "do"]);
    await type(field(), "shar");
    expect(titles()[0]).toBe("Shared");
  });
});

describe("pages", () => {
  const folders: PalettePage = {
    id: "move",
    crumb: "Move to",
    placeholder: "Find a folder",
    sources: [{ id: "folders", heading: "Folders", search: (q) => [row("work", "Work"), row("home", "Home")].filter((r) => r.title.toLowerCase().includes(q)) }],
  };
  const actions = [row("move", "Move to…", { page: folders }), row("new", "New page")];

  it("opens in the same field, with its own placeholder, sources and crumb", async () => {
    await plain({ actions, placeholder: "Search" });
    await type(field(), "mov");
    await key("Enter", field());
    expect(panel()).not.toBeNull();
    expect(field()!.value).toBe("");
    expect(field()!.placeholder).toBe("Find a folder");
    expect(one(".dl-palette-crumb")?.textContent).toBe("Move to");
    expect(headings()).toEqual(["Folders"]);
    expect(titles()).toEqual(["Work", "Home"]);
    expect(document.activeElement).toBe(field());
  });

  it("goes back one page on Backspace in an empty field, with the words it left", async () => {
    await plain({ actions });
    await type(field(), "mov");
    await key("Enter", field());
    await type(field(), "w");
    caretTo(0);
    const kept = await press({ key: "Backspace" });
    // Words in the field: Backspace is the field's own.
    expect(kept.defaultPrevented).toBe(false);
    expect(one(".dl-palette-crumb")).not.toBeNull();
    await type(field(), "");
    await press({ key: "Backspace" });
    expect(one(".dl-palette-crumb")).toBeNull();
    expect(field()!.value).toBe("mov");
    expect(field()!.placeholder).toBe("Search");
  });

  it("goes back one page on Escape, and Escape on the first page closes", async () => {
    await plain({ actions, onOpenChange: vi.fn() });
    await type(field(), "mov");
    await key("Enter", field());
    await key("Escape", field());
    await settle(200);
    expect(panel()).not.toBeNull();
    expect(one(".dl-palette-crumb")).toBeNull();
  });

  it("closes from the first page on Escape", async () => {
    await mount(
      <Palette actions={actions}>
        <PaletteField />
        <PaletteList />
      </Palette>,
    );
    await press({ key: "k", ctrlKey: true }, document.body);
    await key("Escape", field());
    await settle(200);
    expect(panel()).toBeNull();
  });

  it("holds a stale list and a held Enter on a page as on the first", async () => {
    ran.mockClear();
    const calls: Array<{ q: string; answer: (rows: PaletteItem[]) => void }> = [];
    const slowPage: PalettePage = {
      id: "slow",
      crumb: "Older mail",
      sources: [{ id: "older", heading: "Older", search: (q) => new Promise<PaletteItem[]>((answer) => calls.push({ q, answer })) }],
    };
    await plain({ actions: [row("older", "Search older mail", { page: slowPage })] });
    await key("Enter", field());
    // The row's own onSelect runs as its page opens.
    expect(ran).toHaveBeenCalledWith("older");
    ran.mockClear();
    await act(async () => {
      calls[0]!.answer([row("first", "From 2019")]);
      await Promise.resolve();
    });
    await settle();
    expect(titles()).toEqual(["From 2019"]);
    await type(field(), "tax");
    expect(one(".dl-palette-list")!.hasAttribute("data-stale")).toBe(true);
    await key("Enter", field());
    expect(ran).not.toHaveBeenCalled();
    await act(async () => {
      calls[1]!.answer([row("tax", "Tax return 2019")]);
      await Promise.resolve();
    });
    await settle();
    expect(ran).toHaveBeenCalledWith("tax");
  });

  it("goes back to a crumb that is pressed", async () => {
    await plain({ actions });
    await key("Enter", field());
    expect(one(".dl-palette-crumb")).not.toBeNull();
    await click(one(".dl-palette-crumb"));
    expect(one(".dl-palette-crumb")).toBeNull();
    expect(titles()).toEqual(["Move to…", "New page"]);
  });
});

describe("rows the app steps back", () => {
  function Mail({ live }: { live: boolean }) {
    const people = [row("dana", "Dana Ito")];
    const messages = live ? [row("new", "Lunch on Friday")] : [row("old", "Lunch last week", { dim: "waiting" })];
    return (
      <Palette open query="lunch" results={{ query: "lunch", groups: [{ id: "messages", heading: "Messages", items: messages }, { id: "people", heading: "People", items: people }] }}>
        <PaletteField />
        <PaletteList />
      </Palette>
    );
  }

  it("holds Enter on a waiting row, and runs the highlighted row once it stops waiting", async () => {
    ran.mockClear();
    await mount(<Mail live={false} />);
    expect(rows()[0]!.getAttribute("data-dim")).toBe("waiting");
    // The rest of the list is current, and runs.
    expect(one(".dl-palette-list")!.hasAttribute("data-stale")).toBe(false);
    await key("Enter", field());
    expect(ran).not.toHaveBeenCalled();
    await mount(<Mail live />);
    expect(ran).toHaveBeenCalledWith("new");
  });

  it("lets a press run a waiting row, as mail's does", async () => {
    ran.mockClear();
    await mount(<Mail live={false} />);
    await click(rows()[0]);
    expect(ran).toHaveBeenCalledWith("old");
  });
});

describe("palette.css, the parts", () => {
  const css = readCss("palette");

  it("steps a row back to 85%, and a waiting one to 60% after 120ms", () => {
    expect(ruleFor(css, ".dl-palette-row[data-dim]")).toContain("opacity: 0.85");
    const waiting = ruleFor(css, '.dl-palette-row[data-dim="waiting"]');
    expect(waiting).toContain("opacity: 0.6");
    expect(waiting).toContain("transition: opacity 0s linear 120ms");
  });

  it("lays the ghost over the field with the typed words unseen, so the rest starts where they end", () => {
    expect(ruleFor(css, ".dl-palette-field")).toContain("position: relative");
    const ghost = ruleFor(css, ".dl-palette-ghost");
    expect(ghost).toContain("position: absolute");
    expect(ghost).toContain("pointer-events: none");
    expect(ghost).toContain("white-space: pre");
    expect(ruleFor(css, ".dl-palette-ghost-typed")).toContain("visibility: hidden");
  });

  it("stands a row's menu over the palette, as the filter's", () => {
    expect(ruleFor(css, ".dl-menu-positioner:has(> .dl-palette-menu)")).toContain(
      "calc(var(--dl-palette-z, var(--dl-z-palette, 90)) + 2)",
    );
  });

  it("keeps the highlight on the row whose menu is open", () => {
    expect(ruleFor(css, ".dl-palette-row[data-menu-open]")).toContain("background: var(--dl-overlay-hover, oklch(1 0 0 / 0.08))");
  });
});
