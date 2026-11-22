import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { toastLine } from "./toast-line.js";

const text = (markup: string) => markup.replace(/<[^>]+>/g, "");

describe("an Undo toast's line", () => {
  it("leads with the item's name, then says what happened", () => {
    const markup = renderToStaticMarkup(toastLine("Gate code", "archived"));
    expect(text(markup)).toBe("Gate code archived");
    expect(markup).toContain('<span class="toast-line-name">Gate code</span>');
  });

  it("keeps the whole name, since the toast shortens it on screen", () => {
    const name = "Lisbon offsite: venue research and the budget";
    expect(text(renderToStaticMarkup(toastLine(name, "restored")))).toBe(`${name} restored`);
  });

  it("puts the verb in its own span, behind the space that separates it", () => {
    const markup = renderToStaticMarkup(toastLine("Gate code", "archived"));
    expect(markup).toContain('<span class="toast-line-verb"> archived</span>');
  });
});
