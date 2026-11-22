import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isMacPlatform, shortcutLabelFor, tipText } from "./shortcut-label.js";
import { TipKey } from "./tip-key.js";

describe("shortcutLabelFor", () => {
  it("joins a PC chord with a plus", () => {
    expect(shortcutLabelFor(false, ["Mod", "Z"])).toBe("Ctrl+Z");
    expect(shortcutLabelFor(false, ["Mod", "Shift", "Z"])).toBe("Ctrl+Shift+Z");
    expect(shortcutLabelFor(false, ["Mod", "\\"])).toBe("Ctrl+\\");
    expect(shortcutLabelFor(false, ["Alt", "N"])).toBe("Alt+N");
  });

  it("runs a Mac chord together with its own symbols", () => {
    expect(shortcutLabelFor(true, ["Mod", "Z"])).toBe("⌘Z");
    expect(shortcutLabelFor(true, ["Mod", "Shift", "Z"])).toBe("⌘⇧Z");
    expect(shortcutLabelFor(true, ["Alt", "N"])).toBe("⌥N");
  });

  it("writes a single key as given", () => {
    expect(shortcutLabelFor(false, ["N"])).toBe("N");
    expect(shortcutLabelFor(true, ["N"])).toBe("N");
  });
});

describe("isMacPlatform", () => {
  it("reads Apple hardware as a Mac and everything else as a PC", () => {
    expect(isMacPlatform("MacIntel")).toBe(true);
    expect(isMacPlatform("iPhone")).toBe(true);
    expect(isMacPlatform("Linux aarch64")).toBe(false);
    expect(isMacPlatform("Win32")).toBe(false);
    expect(isMacPlatform("")).toBe(false);
  });
});

describe("tipText", () => {
  it("writes the label, a middle dot, then the key", () => {
    expect(tipText("Archive", "E")).toBe("Archive · E");
    expect(tipText("Undo", shortcutLabelFor(false, ["Mod", "Z"]))).toBe("Undo · Ctrl+Z");
  });

  it("is the label alone without a key", () => {
    expect(tipText("Archive")).toBe("Archive");
    expect(tipText("Archive", null)).toBe("Archive");
    expect(tipText("Archive", "")).toBe("Archive");
  });
});

describe("<TipKey>", () => {
  const text = (markup: string) => markup.replace(/<[^>]+>/g, "");

  it("reads as the dot and the key after a label, with the space the text needs", () => {
    const markup = renderToStaticMarkup(TipKey({ keys: "E" }));
    expect(`Archive${text(markup)}`).toBe("Archive · E");
    expect(markup).toContain('data-slot="tooltip-key"');
  });

  it("is the family's muted grey unless the app colours it with a class of its own", () => {
    expect(renderToStaticMarkup(TipKey({ keys: "E" }))).toContain("color:var(--dl-fg-muted, #b8b8b8)");
    const own = renderToStaticMarkup(TipKey({ keys: "E", className: "text-muted-foreground" }));
    expect(own).toContain('class="text-muted-foreground"');
    expect(own).not.toContain("style=");
  });

  it("renders nothing without a key, so an optional one passes straight through", () => {
    expect(renderToStaticMarkup(TipKey({}))).toBe("");
    expect(renderToStaticMarkup(TipKey({ keys: null }))).toBe("");
    expect(renderToStaticMarkup(TipKey({ keys: "" }))).toBe("");
  });
});
