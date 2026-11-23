/**
 * @vitest-environment jsdom
 *
 * The phone's header and its search sheet: what each renders, where the
 * search icon sits, the caret on opening, and the values in phone.css.
 */
import { StrictMode, act, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ACCENTS, RENDER, contrast, hex } from "../../test/color.js";
import { readCss, ruleFor, ruleNaming } from "../../test/css.js";
import { all, click, key, mount, one, press, settle, type, withDom, withToast } from "../../test/dom.js";
import { readToastCovered } from "../toast/toast-dock.js";
import { PhoneHeader, PhoneHeaderIcon, type PhoneHeaderProps } from "./phone-header.js";
import { PhoneSearch, PhoneSearchAvatar, type PhoneSearchProps, type PhoneSearchSection } from "./phone-search.js";

withDom();

const css = readCss("phone");

function header(props: PhoneHeaderProps): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<PhoneHeader {...props} />);
  return host.firstElementChild as HTMLElement;
}
const Glyph = () => (
  <svg viewBox="0 0 24 24">
    <path d="M3 12h18" />
  </svg>
);
const refresh = (
  <PhoneHeaderIcon label="Refresh">
    <Glyph />
  </PhoneHeaderIcon>
);
const icons = (el: HTMLElement) => [...el.querySelectorAll(".dl-phone-head-icons > *")].map((icon) => icon.getAttribute("aria-label"));

describe("<PhoneHeader>", () => {
  it("is a title row with a large title, and one muted line under it", () => {
    const el = header({ title: "Inbox", line: "All mailboxes · 44 unread" });
    expect(el.tagName).toBe("HEADER");
    expect(el.querySelector("h1.dl-phone-title")?.textContent).toBe("Inbox");
    expect(el.querySelector(".dl-phone-line")?.textContent).toBe("All mailboxes · 44 unread");
    expect([...el.children].map((child) => child.className)).toEqual(["dl-phone-head-row", "dl-phone-line"]);
  });

  it("draws no icons, and no box for them, with nothing to do at the right", () => {
    expect(header({ title: "Inbox" }).querySelector(".dl-phone-head-icons")).toBeNull();
  });

  it("puts search at the far right when it is the only icon", () => {
    const el = header({ title: "Inbox", onSearch: () => {} });
    expect(icons(el)).toEqual(["Search"]);
    expect(el.querySelector(".dl-phone-head-icons")?.lastElementChild?.classList.contains("dl-phone-search-icon")).toBe(true);
  });

  it("puts search to the LEFT of an icon the row already has, which keeps the far right", () => {
    const el = header({ title: "Wednesday", onSearch: () => {}, action: refresh });
    expect(icons(el)).toEqual(["Search", "Refresh"]);
  });

  it("keeps the app's own icon alone when the screen has no search", () => {
    expect(icons(header({ title: "Settings", action: refresh }))).toEqual(["Refresh"]);
  });

  it("draws search as a magnifying glass in a button, never a field", () => {
    const el = header({ title: "Inbox", onSearch: () => {}, searchLabel: "Search mail" });
    const button = el.querySelector(".dl-phone-search-icon")!;
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("aria-label")).toBe("Search mail");
    expect(button.querySelector("svg circle")?.getAttribute("r")).toBe("8");
    expect(el.querySelector("input")).toBeNull();
  });

  it("opens the app's search when the glass is tapped", async () => {
    const onSearch = vi.fn();
    await mount(<PhoneHeader title="Inbox" onSearch={onSearch} />);
    await click(one(".dl-phone-search-icon"));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("takes the app's wordmark as the home screen's title, at 32px", () => {
    const el = header({ wordmark: "drive", onSearch: () => {} });
    const mark = el.querySelector<HTMLElement>("h1.dl-phone-mark .dl-wordmark")!;
    expect(mark.getAttribute("aria-label")).toBe("dalin. drive");
    expect(mark.style.fontSize).toBe("32px");
    expect(el.querySelector(".dl-phone-title")).toBeNull();
  });

  it("draws no line under a wordmark, where it would read as a tagline", () => {
    expect(header({ wordmark: "notes", line: "49 pages, 11 pinned" }).querySelector(".dl-phone-line")).toBeNull();
  });

  it("makes the wordmark the family switcher when asked", async () => {
    await mount(<PhoneHeader wordmark="notes" switcher />);
    expect(one('.dl-phone-mark [data-slot="family-switcher"]')).not.toBeNull();
    await click(one('[data-slot="family-switcher"]'));
    expect(all('.dl-switcher [role="menuitem"]')).toHaveLength(4);
    await mount(<PhoneHeader wordmark="notes" />);
    expect(one('[data-slot="family-switcher"]')).toBeNull();
  });

  it("takes a title that does something as the app's own node", () => {
    const el = header({ title: <button type="button">Inbox</button> });
    expect(el.querySelector("h1.dl-phone-title > button")?.textContent).toBe("Inbox");
  });

  it("names an icon for a screen reader, since a glyph has no words", () => {
    const html = renderToStaticMarkup(refresh);
    expect(html).toContain('aria-label="Refresh"');
    expect(html).toContain('type="button"');
    expect(html).toContain('class="dl-phone-icon"');
  });
});

const RECENT: PhoneSearchSection = {
  heading: "Recent",
  rows: [
    { id: "marcus", title: "Marcus Chen", subtitle: "RE: Harbor & Pine brand refresh", leading: <Glyph />, onSelect: vi.fn() },
    { id: "figma", title: "Figma", subtitle: "Your Figma verification code", leading: <Glyph />, onSelect: vi.fn() },
  ],
};
const PEOPLE: PhoneSearchSection = {
  heading: "People",
  rows: [{ id: "priya", title: "Priya Natarajan", subtitle: "priya@northwind-studio.com", leading: <PhoneSearchAvatar initials="PN" />, onSelect: vi.fn() }],
};
const compose = vi.fn();

function Search(props: Partial<PhoneSearchProps>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PhoneHeader title="Inbox" onSearch={() => setOpen(true)} />
      <PhoneSearch
        open={open}
        onOpenChange={setOpen}
        placeholder="Search mail and people"
        action={{ label: "Compose", icon: <Glyph />, onSelect: compose }}
        sections={[RECENT, PEOPLE]}
        {...props}
      />
    </>
  );
}

const sheet = () => one(".dl-phone-search");
const field = () => one<HTMLInputElement>(".dl-phone-search-input");
const rows = () => all(".dl-phone-search-row");
const headings = () => all(".dl-phone-search-heading").map((heading) => heading.textContent);
const tapSearch = () => click(one(".dl-phone-search-icon"));

describe("<PhoneSearch>", () => {
  it("is not on the page until the glass is tapped", async () => {
    await mount(<Search />);
    expect(sheet()).toBeNull();
    await tapSearch();
    expect(sheet()?.getAttribute("role")).toBe("dialog");
    expect(sheet()?.getAttribute("aria-label")).toBe("Search mail and people");
  });

  it("opens with the caret already in the field, before any timer or frame has run", async () => {
    await mount(<Search />);
    // Outside React's test batching, as a real tap is: React renders the
    // sheet as the tap's handler returns, and the field focuses as it
    // mounts. A phone raises its keyboard only for a focus that soon.
    const env = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    env.IS_REACT_ACT_ENVIRONMENT = false;
    let focusedAtOnce: Element | null = null;
    try {
      one<HTMLElement>(".dl-phone-search-icon")!.click();
      await Promise.resolve();
      focusedAtOnce = document.activeElement;
    } finally {
      env.IS_REACT_ACT_ENVIRONMENT = true;
    }
    expect(focusedAtOnce).toBe(field());
    await settle();
    expect(document.activeElement).toBe(field());
    expect(field()?.value).toBe("");
    expect(field()?.type).toBe("search");
    expect(field()?.getAttribute("enterkeyhint")).toBe("search");
  });

  it("puts the field first and Cancel at its right", async () => {
    await mount(<Search />);
    await tapSearch();
    const head = one(".dl-phone-search-head")!;
    expect([...head.children].map((child) => child.className)).toEqual(["dl-phone-search-field", "dl-phone-search-cancel"]);
    expect(one(".dl-phone-search-cancel")?.textContent).toBe("Cancel");
  });

  it("closes on Cancel and on Escape", async () => {
    await mount(<Search />);
    await tapSearch();
    await click(one(".dl-phone-search-cancel"));
    await settle(100);
    expect(sheet()).toBeNull();
    await tapSearch();
    await key("Escape", field());
    await settle(100);
    expect(sheet()).toBeNull();
  });

  it("shows, before any query, the action row in the accent and then the app's sections", async () => {
    await mount(<Search />);
    await tapSearch();
    const body = one(".dl-phone-search-body")!;
    const first = body.firstElementChild!;
    expect(first.classList.contains("dl-phone-search-action")).toBe(true);
    expect(first.textContent).toBe("Compose");
    expect(rows().filter((row) => row.classList.contains("dl-phone-search-action"))).toHaveLength(1);
    expect(headings()).toEqual(["Recent", "People"]);
    expect(rows().map((row) => row.querySelector("b, .dl-phone-search-one")?.textContent)).toEqual([
      "Compose",
      "Marcus Chen",
      "Figma",
      "Priya Natarajan",
    ]);
  });

  it("draws a row's second line fainter, and a person's circle as the lead", async () => {
    await mount(<Search />);
    await tapSearch();
    expect(rows()[1]!.querySelector(".dl-phone-search-two > small")?.textContent).toBe("RE: Harbor & Pine brand refresh");
    const avatar = rows()[3]!.querySelector(".dl-phone-search-avatar")!;
    expect(avatar.textContent).toBe("PN");
    expect(avatar.getAttribute("aria-hidden")).toBe("true");
    expect(rows()[3]!.firstElementChild).toBe(avatar);
  });

  it("runs the action, after search has closed", async () => {
    compose.mockClear();
    await mount(<Search />);
    await tapSearch();
    await click(rows()[0]);
    await settle(100);
    expect(compose).toHaveBeenCalledTimes(1);
    expect(sheet()).toBeNull();
  });

  it("runs a row and closes, unless the row asks to stay", async () => {
    const stay = vi.fn();
    await mount(<Search sections={[{ heading: "People", rows: [{ id: "p", title: "Priya", keepOpen: true, onSelect: stay }] }]} />);
    await tapSearch();
    await click(rows()[1]);
    expect(stay).toHaveBeenCalledTimes(1);
    expect(sheet()).not.toBeNull();
  });

  it("drops a section with nothing in it, and takes the app's own rows for one", async () => {
    await mount(
      <Search
        sections={[
          { heading: "Recent", rows: [] },
          { heading: "Coming up", children: <div className="agenda-line">11:30 Prod deploy check</div> },
        ]}
      />,
    );
    await tapSearch();
    expect(headings()).toEqual(["Coming up"]);
    expect(one(".dl-phone-search-section .agenda-line")?.textContent).toBe("11:30 Prod deploy check");
  });

  it("swaps the suggestions for the app's results once there is a query", async () => {
    const onQueryChange = vi.fn();
    const results: PhoneSearchSection[] = [{ heading: "Messages", rows: [{ id: "m", title: "Thanksgiving plans", onSelect: vi.fn() }] }];
    await mount(<Search results={results} onQueryChange={onQueryChange} />);
    await tapSearch();
    await type(field(), "plans");
    expect(onQueryChange).toHaveBeenLastCalledWith("plans");
    expect(one(".dl-phone-search-action")).toBeNull();
    expect(headings()).toEqual(["Messages"]);
    await type(field(), "  ");
    expect(headings()).toEqual(["Recent", "People"]);
  });

  it("says so when the results are empty, and shows the app's own body in their place", async () => {
    await mount(<Search results={[]} />);
    await tapSearch();
    await type(field(), "zebra");
    expect(one(".dl-phone-search-note")?.textContent).toBe("No results for “zebra”.");
    await mount(
      <Search results={[]}>
        <ul className="own-results" />
      </Search>,
    );
    expect(one(".own-results")).not.toBeNull();
    expect(one(".dl-phone-search-note")).toBeNull();
  });

  it("starts each opening from an empty field", async () => {
    await mount(<Search results={[]} />);
    await tapSearch();
    await type(field(), "plans");
    await click(one(".dl-phone-search-cancel"));
    await settle(100);
    await tapSearch();
    expect(field()?.value).toBe("");
    expect(headings()).toEqual(["Recent", "People"]);
  });

  it("follows an app that owns the words, and tells it when Search is pressed", async () => {
    const onSubmit = vi.fn();
    await mount(<Search query="from:priya" onSubmit={onSubmit} results={[]} />);
    await tapSearch();
    expect(field()?.value).toBe("from:priya");
    await act(async () => {
      one("form.dl-phone-search-head")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(onSubmit).toHaveBeenCalledWith("from:priya");
  });

  it("takes the app's own pieces inside the field, before and after the words", async () => {
    await mount(<Search fieldStart={<span className="picker">All calendars</span>} fieldEnd={<span className="filter" />} />);
    await tapSearch();
    expect([...one(".dl-phone-search-field")!.children].map((child) => child.tagName === "svg" ? "glass" : child.className)).toEqual([
      "glass",
      "picker",
      "dl-phone-search-input",
      "filter",
    ]);
  });

  it("is a plain field and not a label, so a tap on it never lands on a control inside it", async () => {
    const picked = vi.fn();
    await mount(
      <Search
        fieldStart={
          <select className="picker" aria-label="Search in" onClick={picked}>
            <option>All calendars</option>
          </select>
        }
        fieldEnd={<button type="button" className="filter" aria-label="When" />}
      />,
    );
    await tapSearch();
    const box = one(".dl-phone-search-field")!;
    expect(box.tagName).toBe("DIV");
    // A tap on the field's own padding, and one on the glass: the caret goes
    // in the input, and the picker hears nothing.
    field()!.blur();
    await click(box);
    expect(document.activeElement).toBe(field());
    field()!.blur();
    await act(async () => {
      box.querySelector(":scope > svg")!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(field());
    expect(picked).not.toHaveBeenCalled();
  });

  it("leaves a tap on a control in the field to that control", async () => {
    const picked = vi.fn();
    const filtered = vi.fn();
    await mount(
      <Search
        fieldStart={
          <span className="scope">
            All calendars
            <select className="picker" aria-label="Search in" onClick={picked}>
              <option>All calendars</option>
            </select>
          </span>
        }
        fieldEnd={<button type="button" className="filter" aria-label="When" onClick={filtered} />}
      />,
    );
    await tapSearch();
    const picker = one<HTMLSelectElement>(".picker")!;
    picker.focus();
    await click(picker);
    expect(picked).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(picker);
    const filter = one<HTMLButtonElement>(".filter")!;
    filter.focus();
    await click(filter);
    expect(filtered).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(filter);
    // Words of the app's own that are no control give the caret to the input.
    await act(async () => {
      one(".scope")!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(field());
  });

  it("keeps the caret, and the phone's keyboard, through a press on the field's padding", async () => {
    await mount(<Search fieldEnd={<button type="button" className="filter" aria-label="When" />} />);
    await tapSearch();
    const down = (el: Element) => {
      const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      el.dispatchEvent(event);
      return event.defaultPrevented;
    };
    // A press on a part that takes no focus would blur the input first.
    expect(down(one(".dl-phone-search-field")!)).toBe(true);
    expect(down(one(".filter")!)).toBe(false);
    expect(down(field()!)).toBe(false);
  });

  it("tells the toaster it covers the bottom bar, for as long as it is open", async () => {
    await mount(<Search />);
    expect(readToastCovered()).toBe(false);
    await tapSearch();
    expect(readToastCovered()).toBe(true);
    await click(one(".dl-phone-search-cancel"));
    await settle(100);
    expect(readToastCovered()).toBe(false);
  });
});

/** The kit's layer tokens on the history entry the page is on. */
const layers = (): unknown[] => ((window.history.state as { dalinKit?: unknown[] } | null)?.dalinKit ?? []);
/** Lets a traversal land: jsdom fires popstate on a later task. */
const landed = () => settle(60);

describe("<PhoneSearch>, the system's back", () => {
  it("pushes one history entry as it opens, over the state that was there", async () => {
    window.history.replaceState({ __NA: true, tree: "inbox" }, "");
    const push = vi.spyOn(window.history, "pushState");
    await mount(<Search />);
    expect(layers()).toHaveLength(0);
    await tapSearch();
    await landed();
    expect(push).toHaveBeenCalledTimes(1);
    push.mockRestore();
    expect(layers()).toHaveLength(1);
    // A router's own markers ride along: Next reloads on an entry without them.
    expect(window.history.state).toMatchObject({ __NA: true, tree: "inbox" });
    await click(one(".dl-phone-search-cancel"));
    await landed();
  });

  it("closes on the system's back, and tells the app", async () => {
    const onOpenChange = vi.fn();
    function Owned() {
      const [open, setOpen] = useState(true);
      return (
        <PhoneSearch
          open={open}
          onOpenChange={(next, details) => {
            onOpenChange(next, details);
            setOpen(next);
          }}
        />
      );
    }
    await mount(<Owned />);
    await landed();
    expect(layers()).toHaveLength(1);
    await act(async () => {
      window.history.back();
    });
    await landed();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false, undefined);
    await settle(100);
    expect(sheet()).toBeNull();
    expect(layers()).toHaveLength(0);
  });

  it.each([
    ["Cancel", () => click(one(".dl-phone-search-cancel"))],
    ["Escape", () => key("Escape", field())],
  ])("takes its entry off when %s closes it", async (_how, close) => {
    await mount(<Search />);
    await tapSearch();
    await landed();
    const here = window.history.state as { dalinKit: unknown[] };
    expect(here.dalinKit).toHaveLength(1);
    await close();
    await landed();
    await settle(100);
    expect(sheet()).toBeNull();
    expect(layers()).toHaveLength(0);
    // One step forward is the entry that was taken off, so it was a step back.
    await act(async () => {
      window.history.forward();
    });
    await landed();
    expect(layers()).toEqual(here.dalinKit);
    await act(async () => {
      window.history.back();
    });
    await landed();
  });

  it("runs a row once its entry has gone, so a page the row opens keeps its own", async () => {
    const seen: number[] = [];
    const open = vi.fn(() => {
      seen.push(layers().length);
      window.history.pushState({ page: "thread" }, "");
    });
    await mount(<Search sections={[{ heading: "Recent", rows: [{ id: "t", title: "Thanksgiving plans", onSelect: open }] }]} />);
    await tapSearch();
    await landed();
    await click(rows()[1]);
    await landed();
    expect(open).toHaveBeenCalledTimes(1);
    // The sheet's entry had gone by the time the row ran, and the row's own
    // entry is the one the page is on.
    expect(seen).toEqual([0]);
    expect(window.history.state).toEqual({ page: "thread" });
    await settle(100);
    expect(sheet()).toBeNull();
    await act(async () => {
      window.history.back();
    });
    await landed();
  });

  it("keeps its entry through a row that leaves search open", async () => {
    const pick = vi.fn();
    await mount(<Search sections={[{ heading: "Recent", rows: [{ id: "p", title: "Priya", keepOpen: true, onSelect: pick }] }]} />);
    await tapSearch();
    await landed();
    await click(rows()[1]);
    await landed();
    expect(pick).toHaveBeenCalledTimes(1);
    expect(sheet()).not.toBeNull();
    expect(layers()).toHaveLength(1);
    await click(one(".dl-phone-search-cancel"));
    await landed();
  });

  it("takes its entry off when the app unmounts the sheet to close it", async () => {
    function Unmounting() {
      const [open, setOpen] = useState(true);
      return open ? <PhoneSearch open onOpenChange={() => setOpen(false)} /> : null;
    }
    await mount(<Unmounting />);
    await landed();
    expect(layers()).toHaveLength(1);
    await click(one(".dl-phone-search-cancel"));
    await landed();
    expect(sheet()).toBeNull();
    expect(layers()).toHaveLength(0);
  });

  it("pushes once under strict mode, which runs every effect twice", async () => {
    const push = vi.spyOn(window.history, "pushState");
    const back = vi.spyOn(window.history, "back");
    await mount(
      <StrictMode>
        <Search />
      </StrictMode>,
    );
    await tapSearch();
    await landed();
    expect(sheet()).not.toBeNull();
    expect(layers()).toHaveLength(1);
    expect(push).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
    push.mockRestore();
    back.mockRestore();
    await click(one(".dl-phone-search-cancel"));
    await landed();
    expect(layers()).toHaveLength(0);
  });

  it("leaves history alone in an app that owns the back layer itself", async () => {
    const push = vi.spyOn(window.history, "pushState");
    await mount(<Search systemBack={false} />);
    await tapSearch();
    await landed();
    expect(layers()).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
    push.mockRestore();
    const compose2 = vi.fn();
    await mount(<Search systemBack={false} action={{ label: "Compose", onSelect: compose2 }} />);
    // With no entry to wait for, a row runs inside the tap itself.
    await act(async () => {
      rows()[0]!.click();
      expect(compose2).toHaveBeenCalledTimes(1);
    });
    await settle(100);
  });
});

describe("<PhoneSearch>, under a toast", () => {
  it("stays open when a toast over it is pressed", async () => {
    const { action } = withToast();
    const undo = vi.fn();
    action.addEventListener("click", undo);
    await mount(<Search />);
    await tapSearch();
    await press(action);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(sheet()).not.toBeNull();
    await click(one(".dl-phone-search-cancel"));
    await landed();
  });

  it("lets Tab leave its last stop for the toast, and brings it back after the toast's last", async () => {
    const { toast, action } = withToast();
    await mount(<Search />);
    await tapSearch();
    const stops = all<HTMLElement>(".dl-phone-search :is(input, button)");
    const last = stops[stops.length - 1]!;
    last.focus();
    await key("Tab");
    expect(document.activeElement).toBe(toast);
    // Between a toast's own stops the browser moves, and the kit stays out.
    const inside = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    toast.dispatchEvent(inside);
    expect(inside.defaultPrevented).toBe(false);
    action.focus();
    await key("Tab");
    expect(document.activeElement).toBe(field());
    await key("Tab", field(), { shiftKey: true });
    expect(document.activeElement).toBe(action);
    toast.focus();
    await key("Tab", toast, { shiftKey: true });
    expect(document.activeElement).toBe(last);
    await click(one(".dl-phone-search-cancel"));
    await landed();
  });

  it("keeps Tab to itself with no toast to reach, or one the toaster holds back", async () => {
    await mount(<Search />);
    await tapSearch();
    const stops = all<HTMLElement>(".dl-phone-search :is(input, button)");
    const last = stops[stops.length - 1]!;
    const tab = () => {
      last.focus();
      const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
      last.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(tab()).toBe(false);
    // A tucked stack: the toaster has taken its stops out of the tab order.
    const { toast, action } = withToast();
    toast.tabIndex = -1;
    action.tabIndex = -1;
    expect(tab()).toBe(false);
    expect(document.activeElement).toBe(last);
    await click(one(".dl-phone-search-cancel"));
    await landed();
  });
});

describe("phone.css, the header", () => {
  it("is a 48px row 6px under the safe area, 16px in", () => {
    expect(ruleFor(css, ".dl-phone-head")).toContain(
      "padding: calc(env(safe-area-inset-top, 0px) + 6px) var(--dl-phone-inset, 16px) 0",
    );
    expect(ruleFor(css, ".dl-phone-head-row")).toContain("height: 48px");
  });

  it("sets the large title at 28px in weight 700, and cuts a long one with an ellipsis", () => {
    const title = ruleFor(css, ".dl-phone-title");
    expect(title).toContain("font-size: 28px");
    expect(title).toContain("font-weight: 700");
    expect(title).toContain("letter-spacing: -0.7px");
    expect(title).toContain("text-overflow: ellipsis");
  });

  it("sets the wordmark at 32px on the same row", () => {
    const mark = ruleFor(css, ".dl-phone-mark");
    expect(mark).toContain("font-size: 32px");
    expect(mark).toContain("height: 48px");
  });

  it("sets the one line at 13px on 18px, muted, with 10px under it", () => {
    const line = ruleFor(css, ".dl-phone-line");
    expect(line).toContain("font-size: 13px");
    expect(line).toContain("line-height: 18px");
    expect(line).toContain("padding: 0 0 10px");
    expect(line).toContain("color: var(--dl-fg-muted, #b8b8b8)");
  });

  it("gives an icon a 44px target and a 20px glyph, with no box", () => {
    const icon = ruleFor(css, ".dl-phone-icon");
    expect(icon).toContain("width: 44px");
    expect(icon).toContain("height: 44px");
    expect(icon).toContain("background: none");
    expect(icon).toContain("border: 0");
    expect(ruleFor(css, ".dl-phone-icon > svg")).toContain("width: 20px");
  });

  it("ends the far-right glyph on the inset: the target overhangs it by (44 - 20) / 2", () => {
    expect(ruleFor(css, ".dl-phone-head-icons")).toContain("margin-right: -12px");
    expect((44 - 20) / 2).toBe(12);
  });

  it("draws no box behind a pressed icon: it turns white, and the glass fills its lens", () => {
    const pressed = ruleFor(css, ".dl-phone-icon:active");
    expect(pressed).toContain("background: none");
    expect(pressed).toContain("color: var(--dl-fg, #fff)");
    expect(ruleFor(css, ".dl-phone-search-icon:active circle")).toContain("fill: currentColor");
  });
});

describe("phone.css, search", () => {
  const body = ruleFor(css, ".dl-phone-search");

  it("covers the whole screen, bar included, on the list's fill", () => {
    expect(body).toContain("position: fixed");
    expect(body).toContain("inset: 0");
    expect(body).toContain("background: var(--dl-phone-fill, #151515)");
  });

  it("stands over the bottom bar and under the toaster while it is over a sheet", () => {
    expect(body).toContain("z-index: var(--dl-phone-search-z, 50)");
    const toast = readCss("toast");
    expect(toast).toContain("--dl-bar-z: 30;");
    expect(toast).toContain("--dl-toast-over-z: 60;");
  });

  it("opens and closes at once: no transition, no animation", () => {
    expect(css).not.toMatch(/transition|animation/);
  });

  it("puts the field in the title row's place: 40px tall, 7px corners, on the raised step", () => {
    const head = ruleFor(css, ".dl-phone-search-head");
    expect(head).toContain("height: calc(env(safe-area-inset-top, 0px) + 6px + 48px + 10px)");
    const fieldRule = ruleFor(css, ".dl-phone-search-field");
    expect(fieldRule).toContain("height: 40px");
    expect(fieldRule).toContain("border-radius: var(--dl-r-control, 7px)");
    expect(fieldRule).toContain("background: var(--dl-raised, #242424)");
  });

  it("sets the field's words at 16px, so iOS does not zoom, with the caret in the action's ink", () => {
    const input = ruleFor(css, ".dl-phone-search-input");
    expect(input).toContain("font-size: 16px");
    expect(input).toContain("caret-color: var(--dl-phone-search-ink)");
  });

  it("makes a row 48px with a 20px muted glyph, 12px before its words", () => {
    const row = ruleFor(css, ".dl-phone-search-row");
    expect(row).toContain("min-height: 48px");
    expect(row).toContain("gap: 12px");
    expect(row).toContain("font-size: 16px");
    expect(ruleFor(css, ".dl-phone-search-row > svg")).toContain("width: 20px");
  });

  it("draws the action row in the accent's ink, heavier", () => {
    const action = ruleFor(css, ".dl-phone-search-action");
    expect(action).toContain("color: var(--dl-phone-search-ink)");
    expect(action).toContain("font-weight: 600");
    expect(body).toContain("--dl-phone-search-ink: oklch(from var(--dl-accent, #fff) max(l, 0.7) c h)");
  });

  it.each(Object.entries(ACCENTS))("holds %s's action row at 4.5:1 on the fill", (_app, [L, C, H]) => {
    for (const draw of Object.values(RENDER)) {
      expect(contrast(draw(Math.max(L, 0.7), C, H), hex("#151515"))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("leaves a heading in the case it was written in, 13px and muted", () => {
    const heading = ruleFor(css, ".dl-phone-search-heading");
    expect(heading).toContain("text-transform: none");
    expect(heading).toContain("font-size: 13px");
    expect(heading).toContain("margin: 14px 0 4px");
    expect(css).not.toContain("uppercase");
  });

  it("draws a person's circle at 28px with white initials", () => {
    const avatar = ruleFor(css, ".dl-phone-search-avatar");
    expect(avatar).toContain("width: 28px");
    expect(avatar).toContain("border-radius: 50%");
    expect(avatar).toContain("font-size: 11px");
  });

  it("ends Cancel's word on the inset, in a 44px target", () => {
    const cancel = ruleFor(css, ".dl-phone-search-cancel");
    expect(cancel).toContain("height: 44px");
    expect(cancel).toContain("margin: 0 -4px 0 0");
    expect(cancel).toContain("padding: 0 4px");
    expect(ruleNaming(css, ".dl-phone-search-cancel:focus-visible")).toContain("outline: 2px solid");
  });
});
