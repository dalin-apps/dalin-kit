/**
 * A phone toast is one line. The capsule is the pill's width and cannot grow,
 * so the title is held to a line and shortened, whether or not the toast
 * carries a button. An Undo toast's line (toastLine) shortens the name first.
 */
import { describe, expect, it } from "vitest";
import { outweighs, readCss, ruleFor } from "../../test/css.js";

const css = readCss("toast");
const PHONE = '[data-sonner-toaster][data-y-position="bottom"]:where(.toast-phone)';

describe("a phone toast's one line", () => {
  it("holds every title to a line and ends a long one in an ellipsis", () => {
    const title = ruleFor(css, `${PHONE} [data-sonner-toast] [data-title]`);
    expect(title).toContain("white-space: nowrap");
    expect(title).toContain("overflow: hidden");
    expect(title).toContain("text-overflow: ellipsis");
  });

  it("lets the line's flex item shrink, or the ellipsis never shows", () => {
    expect(ruleFor(css, `${PHONE} [data-sonner-toast] [data-content]`)).toContain("min-width: 0");
  });

  it("no longer asks for a button first", () => {
    expect(css).not.toMatch(/:has\(\[data-button\]\) \[data-title\]/);
    expect(css).not.toMatch(/:has\(\[data-button\]\) \[data-content\]\s*\{/);
  });

  it("outweighs Sonner's own title rule, which lets a title wrap", () => {
    expect(outweighs(`${PHONE} [data-sonner-toast] [data-title]`, "[data-sonner-toast][data-styled=true] [data-title]")).toBe(
      true,
    );
  });

  it("leaves the desktop card free to wrap", () => {
    const desktop = css.match(/\.toast-tuck[^{]*\[data-title\][^{]*\{/g) ?? [];
    expect(desktop).toEqual([]);
  });

  it("still shortens an Undo line by its name, with the verb whole", () => {
    expect(ruleFor(css, ".toast-line-name")).toContain("text-overflow: ellipsis");
    expect(ruleFor(css, ".toast-line-verb")).toContain("flex: none");
  });
});
