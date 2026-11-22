import { describe, expect, it } from "vitest";
import { outweighs, specificity, splitList } from "./css.js";

describe("specificity", () => {
  it.each([
    [".a", [0, 1, 0]],
    ["li.a[b]", [0, 2, 1]],
    ["[a][b]:where(.c) .d", [0, 3, 0]],
    ["[a]:not(.b, .c[d]) e::before", [0, 3, 2]],
    ["[a]:is(:hover, :has(:focus-visible)) [b]", [0, 3, 0]],
    ["#x .y > z", [1, 1, 1]],
    ['[data-a="b c"].d:hover', [0, 3, 0]],
  ])("weighs %s", (selector, weight) => {
    expect(specificity(selector as string)).toEqual(weight);
  });

  it("splits a selector list on its own commas only", () => {
    expect(splitList(".a:not(.b, .c), .d")).toEqual([".a:not(.b, .c)", ".d"]);
  });

  it("compares two selectors", () => {
    expect(outweighs(".a.b", ".a")).toBe(true);
    expect(outweighs(".a", ".a")).toBe(false);
    expect(outweighs(":where(.a) .b", ".a .b")).toBe(false);
  });
});
