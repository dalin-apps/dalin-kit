/**
 * The phone's glass: the bottom bar's recipe as a token, and the docked
 * phone toast pointed at it by default (the owner's pick on 2026-11-22,
 * "same frost as the bar").
 */
import { describe, expect, it } from "vitest";
import { outweighs, readCss, ruleFor, rulesWith } from "./css.js";

const tokens = readCss("tokens");
const toast = readCss("toast");

const flat = (value: string) => value.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim();
/** A custom property's value in a rule body, with its line breaks taken out. */
function declared(body: string, name: string): string {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(body);
  return match ? flat(match[1]!) : "";
}

const PHONE_LIST = '[data-sonner-toaster][data-y-position="bottom"]:where(.toast-phone)';
const BAR_GLASS = "color-mix(in oklch, color-mix(in oklch, #242424 60%, #151515) 45%, transparent)";

describe("--dl-bar-glass", () => {
  const root = ruleFor(tokens, ":where(:root)");

  it("is calendar's recipe: a grey at 45% over a 14px blur, with a 9% white rim", () => {
    expect(declared(root, "--dl-bar-glass")).toBe(BAR_GLASS);
    expect(declared(root, "--dl-bar-blur")).toBe("blur(14px)");
    expect(declared(root, "--dl-bar-rim")).toBe("oklch(1 0 0 / 0.09)");
  });
});

describe("the phone toast's glass", () => {
  const defaults = ruleFor(toast, ":where(:root)");
  const list = ruleFor(toast, PHONE_LIST);

  it("defaults to the bar's glass, with the same values for a page without tokens.css", () => {
    expect(declared(defaults, "--dl-toast-phone-glass")).toBe(`var(--dl-bar-glass, ${BAR_GLASS})`);
    expect(declared(defaults, "--dl-toast-phone-blur")).toBe("var(--dl-bar-blur, blur(14px))");
    expect(declared(defaults, "--dl-toast-phone-rim")).toBe("var(--dl-bar-rim, oklch(1 0 0 / 0.09))");
  });

  it("is what the docked list hands every toast rule", () => {
    expect(declared(list, "--dl-toast-glass")).toBe("var(--dl-toast-phone-glass)");
    expect(declared(list, "--dl-toast-blur")).toBe("var(--dl-toast-phone-blur)");
    expect(declared(list, "--dl-toast-rim")).toBe("var(--dl-toast-phone-rim)");
  });

  it("leaves the desktop's and the plain toast's glass as notes' was", () => {
    expect(declared(defaults, "--dl-toast-blur")).toBe("blur(20px)");
    expect(declared(defaults, "--dl-toast-rim")).toBe("oklch(1 0 0 / 0.13)");
    for (const [selector, body] of rulesWith(toast, ".toast-tuck").concat(rulesWith(toast, ".toast-plain"))) {
      expect(body, selector).not.toContain("--dl-toast-phone");
    }
  });

  it("still goes solid with transparency off: that rule comes later and weighs no less", () => {
    const solid = "[data-sonner-toaster].toast-solid";
    expect(declared(ruleFor(toast, solid), "--dl-toast-glass")).toBe("var(--dl-toast-solid)");
    expect(outweighs(PHONE_LIST, solid)).toBe(false);
    expect(toast.indexOf(`${solid} {`)).toBeGreaterThan(toast.indexOf(`${PHONE_LIST} {`));
  });
});
