/**
 * @vitest-environment jsdom
 *
 * What a second read of the phone's search found: Safari's IME confirm
 * took the completion, the own-scroller body held still before a query,
 * and an input ref swapped after mount was never handed the field. Each
 * case failed before its fix.
 */
import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { readCss, ruleFor } from "../../test/css.js";
import { key, mount, one, withDom } from "../../test/dom.js";
import { PhoneSearch, type PhoneSearchProps } from "./phone-search.js";

withDom();

const css = readCss("phone");
const field = () => one<HTMLInputElement>(".dl-phone-search-input");

function Sheet(props: Partial<PhoneSearchProps>) {
  const [open, setOpen] = useState(true);
  return <PhoneSearch open={open} onOpenChange={setOpen} systemBack={false} {...props} />;
}

function WithCompletion() {
  const [query, setQuery] = useState("da");
  const offer = query === "da" ? { suffix: "na Ito", onAccept: () => setQuery("dana Ito") } : null;
  return <Sheet query={query} onQueryChange={setQuery} completion={offer} />;
}

describe("an IME's confirming key and the completion", () => {
  it("leaves the completion alone for a Tab or ArrowRight with keyCode 229 (Safari)", async () => {
    await mount(<WithCompletion />);
    field()!.setSelectionRange(2, 2);
    await key("Tab", field(), { keyCode: 229 });
    await key("ArrowRight", field(), { keyCode: 229 });
    expect(field()!.value).toBe("da");
  });
});

describe("ownScroller only while the app's results show", () => {
  it("leaves the body scrolling before a query, when the kit draws the rows", async () => {
    await mount(
      <Sheet ownScroller sections={[{ heading: "Recent", rows: [{ id: "a", title: "A", onSelect: () => {} }] }]} beforeQuery={<p>Tips</p>}>
        {<div className="own-list" />}
      </Sheet>,
    );
    expect(one(".dl-phone-search-body")!.hasAttribute("data-own-scroller")).toBe(false);
    await mount(
      <Sheet ownScroller query="x">
        {<div className="own-list" />}
      </Sheet>,
    );
    expect(one(".dl-phone-search-body")!.hasAttribute("data-own-scroller")).toBe(true);
  });

  it("gives the height to the last child, so a status line can stand before the scroller", () => {
    const last = ruleFor(css, ".dl-phone-search-body[data-own-scroller] > :last-child");
    expect(last).toContain("flex: 1");
    expect(last).toContain("min-height: 0");
  });
});

describe("an input ref swapped after mount", () => {
  it("hands the field to the new ref and clears the old", async () => {
    const first = createRef<HTMLInputElement>();
    const second = createRef<HTMLInputElement>();
    await mount(<Sheet inputRef={first} />);
    expect(first.current).toBe(field());
    expect(document.activeElement).toBe(field());
    await mount(<Sheet inputRef={second} />);
    expect(second.current).toBe(field());
    expect(first.current).toBeNull();
  });
});
