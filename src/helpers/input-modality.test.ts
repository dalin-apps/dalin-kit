/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { INPUT_ATTR, inputForKey, startedFromKeyboard, watchInputModality } from "./input-modality.js";

const html = document.documentElement;
let stop: () => void;

beforeEach(() => {
  html.removeAttribute(INPUT_ATTR);
  stop = watchInputModality();
});
afterEach(() => stop());

const key = (name: string) => window.dispatchEvent(new KeyboardEvent("keydown", { key: name }));
const pointer = (type: string) => window.dispatchEvent(new Event(type));

describe("inputForKey", () => {
  it("hands the turn to the keyboard for a real key", () => {
    for (const name of ["a", "Escape", "Enter", "Tab", " ", "ArrowDown", "N"]) {
      expect(inputForKey(name), name).toBe("keyboard");
    }
  });

  it("changes nothing for a bare modifier, since Ctrl+click is a click", () => {
    for (const name of ["Shift", "Control", "Alt", "Meta", "CapsLock", "Fn"]) {
      expect(inputForKey(name), name).toBeNull();
    }
  });
});

describe("watchInputModality", () => {
  it("writes data-input on <html>, the attribute every app's stylesheet reads", () => {
    expect(INPUT_ATTR).toBe("data-input");
    key("Escape");
    expect(html.getAttribute("data-input")).toBe("keyboard");
  });

  it("marks the keyboard on a key, and hands back to the pointer on a press or a move", () => {
    expect(startedFromKeyboard()).toBe(false);
    key("Escape");
    expect(startedFromKeyboard()).toBe(true);
    pointer("pointerdown");
    expect(html.getAttribute("data-input")).toBe("pointer");
    key("e");
    expect(startedFromKeyboard()).toBe(true);
    pointer("pointermove");
    expect(startedFromKeyboard()).toBe(false);
  });

  it("does not count a modifier alone, so Ctrl+click stays a click", () => {
    pointer("pointerdown");
    for (const name of ["Control", "Shift", "Alt", "Meta"]) key(name);
    expect(html.getAttribute("data-input")).toBe("pointer");
  });

  it("hears a key before a handler that stops it from bubbling", () => {
    const swallow = (event: Event) => event.stopPropagation();
    document.body.addEventListener("keydown", swallow);
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.body.removeEventListener("keydown", swallow);
    expect(startedFromKeyboard()).toBe(true);
  });

  it("stops watching when asked", () => {
    pointer("pointerdown");
    stop();
    key("Escape");
    expect(html.getAttribute("data-input")).toBe("pointer");
  });
});
