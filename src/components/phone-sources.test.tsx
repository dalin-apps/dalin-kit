/**
 * @vitest-environment jsdom
 *
 * <PhoneSearch> given the palette's own `sources` and `actions`: one search
 * definition for the phone and the desktop. What it shows before a word and
 * after one, the rule that the list changes only once every source has
 * answered, the slow source that joins at the end, the marked words, and
 * the long press that opens a row's menu.
 */
import { act, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { all, click, mount, one, settle, type, withDom } from "../../test/dom.js";
import { SOURCE_WAIT_MS } from "./palette-results.js";
import type { PaletteItem, PaletteSource } from "./palette-types.js";
import { PhoneSearch, type PhoneSearchProps } from "./phone-search.js";

withDom();

const ran = vi.fn();
const row = (id: string, title: string, extra: Partial<PaletteItem> = {}): PaletteItem => ({ id, title, onSelect: () => ran(id), ...extra });

const field = () => one<HTMLInputElement>(".dl-phone-search-input");
const headings = () => all(".dl-phone-search-heading").map((h) => h.textContent);
const rowTitles = () =>
  all(".dl-phone-search-row:not(.dl-phone-search-action)").map(
    (r) => (r.querySelector(".dl-phone-search-two > b") ?? r.querySelector(".dl-phone-search-one"))?.textContent,
  );

const PAGES: PaletteItem[] = [row("cues", "Sound cues", { subtitle: "Spring production" }), row("grocery", "Groceries")];
const SOURCES: PaletteSource[] = [
  {
    id: "pages",
    heading: "Pages",
    search: (q) => (q ? PAGES.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())) : [row("recent", "Recently edited")]),
  },
];
const ACTIONS: PaletteItem[] = [row("new", "New page", { keywords: "create" }), row("archive", "Show the archive")];

function Sheet(props: Partial<PhoneSearchProps>) {
  const [open, setOpen] = useState(true);
  return (
    <PhoneSearch
      open={open}
      onOpenChange={setOpen}
      systemBack={false}
      action={{ label: "New page", onSelect: () => ran("action") }}
      sources={SOURCES}
      actions={ACTIONS}
      {...props}
    />
  );
}

describe("<PhoneSearch sources actions>", () => {
  it("draws each source's answer to no words as a section, under the action row and before the app's sections", async () => {
    await mount(<Sheet sections={[{ heading: "Pinned", rows: [{ id: "pin", title: "Pinned page", onSelect: () => {} }] }]} />);
    const body = one(".dl-phone-search-body")!;
    expect(body.firstElementChild?.classList.contains("dl-phone-search-action")).toBe(true);
    expect(headings()).toEqual(["Pages", "Pinned"]);
    expect(rowTitles()).toEqual(["Recently edited", "Pinned page"]);
  });

  it("draws the sources' groups and the ranked actions for a query, with the words marked", async () => {
    await mount(<Sheet />);
    await type(field(), "sound");
    expect(headings()).toEqual(["Pages"]);
    expect(rowTitles()).toEqual(["Sound cues"]);
    expect(all(".dl-phone-search-mark").map((m) => m.textContent)).toEqual(["Sound"]);
    await type(field(), "new");
    expect(headings()).toEqual(["Actions"]);
    expect(rowTitles()).toEqual(["New page"]);
    await type(field(), "create");
    expect(rowTitles()).toEqual(["New page"]);
  });

  it("runs a row and closes, as a row of the app's own does", async () => {
    ran.mockClear();
    await mount(<Sheet />);
    await type(field(), "groc");
    await click(all(".dl-phone-search-row")[0]);
    expect(ran).toHaveBeenCalledWith("grocery");
    await settle(60);
    expect(one(".dl-phone-search")).toBeNull();
  });

  it("says so when nothing is found, in the app's words if it gives them", async () => {
    await mount(<Sheet emptyText={(q) => `Nothing called ${q}`} />);
    await type(field(), "zebra");
    expect(one(".dl-phone-search-note")?.textContent).toBe("Nothing called zebra");
  });

  it("keeps the list until every source has answered, and runs nothing from it meanwhile", async () => {
    ran.mockClear();
    const calls: Array<{ q: string; answer: (rows: PaletteItem[]) => void }> = [];
    const slow: PaletteSource = { id: "mail", heading: "Messages", search: (q) => new Promise((answer) => calls.push({ q, answer })) };
    await mount(<Sheet sources={[slow]} actions={[]} />);
    await act(async () => {
      calls[0]!.answer([row("old", "Invoice for October")]);
      await Promise.resolve();
    });
    await settle();
    await type(field(), "plans");
    expect(rowTitles()).toEqual(["Invoice for October"]);
    const list = one(".dl-phone-search-results")!;
    expect(list.hasAttribute("data-stale")).toBe(true);
    await click(all(".dl-phone-search-row")[0]);
    expect(ran).not.toHaveBeenCalled();
    expect(one(".dl-phone-search")).not.toBeNull();
    await act(async () => {
      calls[1]!.answer([row("plans", "Thanksgiving plans")]);
      await Promise.resolve();
    });
    await settle();
    expect(rowTitles()).toEqual(["Thanksgiving plans"]);
    expect(one(".dl-phone-search-results")!.hasAttribute("data-stale")).toBe(false);
  });

  it("lets a slow source join at the end once the wait is over", async () => {
    let answer: (rows: PaletteItem[]) => void = () => {};
    const slow: PaletteSource = { id: "older", heading: "Older mail", search: (q) => (q ? new Promise((resolve) => (answer = resolve)) : []) };
    await mount(<Sheet sources={[slow, SOURCES[0]!]} />);
    await type(field(), "sound");
    await settle(SOURCE_WAIT_MS + 60);
    expect(headings()).toEqual(["Pages"]);
    await act(async () => {
      answer([row("o", "Sound check, 2019")]);
      await Promise.resolve();
    });
    await settle();
    expect(headings()).toEqual(["Pages", "Older mail"]);
  });
});

describe("a long press on a phone row", () => {
  const hold = async (el: Element, ms = 500) => {
    await act(async () => {
      el.dispatchEvent(
        new TouchEvent("touchstart", { bubbles: true, cancelable: true, touches: [{ clientX: 20, clientY: 30 } as unknown as Touch] }),
      );
    });
    await settle(ms);
    await act(async () => {
      el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true }));
    });
  };

  it("opens a source row's menu at the finger, and the lift does not run the row", async () => {
    ran.mockClear();
    const write = vi.fn();
    const people: PaletteSource = {
      id: "people",
      heading: "People",
      search: () => [row("dana", "Dana Ito", { menu: () => [{ label: "Write", onSelect: write }, { label: "Copy address", keepOpen: true, onSelect: () => {} }] })],
    };
    await mount(<Sheet sources={[people]} />);
    const person = all(".dl-phone-search-row")[1]!;
    await hold(person);
    await click(person);
    expect(ran).not.toHaveBeenCalled();
    expect(all('[role="menuitem"]').map((m) => m.textContent)).toEqual(["Write", "Copy address"]);
    expect(person.hasAttribute("data-held")).toBe(true);
    await click(all('[role="menuitem"]')[0]);
    expect(write).toHaveBeenCalledTimes(1);
    await settle(60);
    expect(one(".dl-phone-search")).toBeNull();
  });

  it("leaves a short tap to the row", async () => {
    ran.mockClear();
    const people: PaletteSource = { id: "people", heading: "People", search: () => [row("dana", "Dana Ito", { menu: () => [{ label: "Write", onSelect: () => {} }] })] };
    await mount(<Sheet sources={[people]} />);
    const person = all(".dl-phone-search-row")[1]!;
    await hold(person, 100);
    await click(person);
    expect(ran).toHaveBeenCalledWith("dana");
    expect(all('[role="menuitem"]')).toHaveLength(0);
  });

  it("gives a row of the app's own its hold, in the sections API", async () => {
    const onLongPress = vi.fn();
    await mount(
      <PhoneSearch
        open
        onOpenChange={() => {}}
        systemBack={false}
        sections={[{ heading: "People", rows: [{ id: "d", title: "Dana Ito", onLongPress, onSelect: () => {} }] }]}
      />,
    );
    await hold(one(".dl-phone-search-row")!);
    expect(onLongPress).toHaveBeenCalledWith({ x: 20, y: 30 });
  });
});
