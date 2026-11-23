import { describe, expect, it } from "vitest";
import { ariaKeyShortcuts } from "./key-names.js";

describe("ariaKeyShortcuts", () => {
  it.each([
    [["S"], "S"],
    [["e"], "E"],
    [["Ctrl", "K"], "Control+K"],
    [["⌘", "⇧", "P"], "Meta+Shift+P"],
    [["Alt", "↑"], "Alt+ArrowUp"],
    [["Esc"], "Escape"],
    [["↵"], "Enter"],
    [["Del"], "Delete"],
    [["/"], "/"],
    [["F2"], "F2"],
    [["Ctrl", "+"], "Control+Plus"],
    [[], ""],
  ])("names %j as %s", (caps, value) => {
    expect(ariaKeyShortcuts(caps)).toBe(value);
  });
});
