/**
 * The pressed look (the owner's pick on 2026-11-23). On the desktop a press
 * is the hover look one step darker, through --dl-press-dim. On the phone a
 * pressed control shrinks (--dl-press-scale) and brightens
 * (--dl-press-bright), and under reduced motion it only brightens. A control
 * that is disabled or busy shows no press, and no box appears behind an icon.
 */
import { describe, expect, it } from "vitest";
import { outweighs, readCss, rulesWith, splitList } from "./css.js";

const DIM = "filter: brightness(var(--dl-press-dim, 0.92))";
const BRIGHT = "filter: brightness(var(--dl-press-bright, 1.12))";
const SCALE = "scale: var(--dl-press-scale, 0.97)";
const READY = ':not(:is(:disabled, [aria-disabled="true"], [aria-busy="true"])';

/** The one rule whose selector list contains `needle`, as [selector list, body]. */
function only(css: string, needle: string): [string, string] {
  const found = rulesWith(css, needle);
  if (found.length !== 1) throw new Error(`${found.length} rules contain ${needle}`);
  return found[0]!;
}

describe("the create button", () => {
  const css = readCss("create");
  const hover = only(css, ".dl-create:hover")[1];
  const [desk, deskBody] = only(css, ".dl-create:active:not(");
  const [phone, phoneBody] = only(css, ".dl-phone :is(.dl-create, .dl-create-glass):active:not(");

  it("is the hover's glass on the desktop, one step darker", () => {
    expect(deskBody).toContain(DIM);
    const fill = (body: string) => /background:([^;]+);/.exec(body)?.[1]?.replace(/\s+/g, " ").trim();
    expect(fill(deskBody)).toBe(fill(hover));
    expect(deskBody).toContain("border-color: oklch(from var(--dl-accent) calc(l + 0.08) c h / 0.72)");
  });

  it("covers the whole button, the glass alone, and a glass layer in a pressed button", () => {
    const list = splitList(desk);
    expect(list[0]!.startsWith(".dl-create:active")).toBe(true);
    expect(list.some((s) => s.startsWith(".dl-create-glass:active"))).toBe(true);
    expect(list.some((s) => s.endsWith("> .dl-create-glass"))).toBe(true);
  });

  it("leaves a disabled or busy button and the phone layout out of the desktop press", () => {
    for (const selector of splitList(desk)) {
      expect(selector).toContain(':is(:disabled, [aria-disabled="true"], [aria-busy="true"])');
      expect(selector).toContain(".dl-phone *");
    }
  });

  it("shrinks and brightens inside .dl-phone, as scale so the app's transform stays", () => {
    expect(phoneBody).toContain(SCALE);
    expect(phoneBody).toContain(BRIGHT);
    expect(phoneBody).not.toContain("transform");
    for (const selector of splitList(phone)) expect(selector).toContain(READY);
  });

  it("keeps the brightness and drops the scale under reduced motion, either switch", () => {
    const still = rulesWith(css, ".dl-create-glass):active").filter(([, body]) => body.includes("scale: none"));
    expect(still.map(([list]) => splitList(list)[0]!.split(" ")[0])).toEqual([
      'html[data-dl-motion="reduce"]',
      'html:not([data-dl-motion="full"])',
    ]);
    for (const [list] of still) {
      splitList(list).forEach((selector, i) => expect(outweighs(selector, splitList(phone)[i]!), selector).toBe(true));
    }
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html:not\(\[data-dl-motion="full"\]\) \.dl-phone/);
  });
});

describe("menu and palette rows", () => {
  it.each([
    ["menu", ".dl-menu-item:active:not([data-disabled], [aria-disabled=\"true\"])"],
    ["palette", ".dl-palette-row:active:not([data-disabled], [aria-disabled=\"true\"])"],
  ] as const)("a %s row pressed is the highlight, one step darker", (sheet, selector) => {
    const [, body] = only(readCss(sheet), selector);
    expect(body).toContain("background: var(--dl-overlay-hover, oklch(1 0 0 / 0.08))");
    expect(body).toContain(DIM);
  });
});

describe("the phone's header icons, search rows and Cancel", () => {
  const css = readCss("phone");
  const [list, body] = only(css, ":is(.dl-phone-icon, .dl-phone-search-cancel, .dl-phone-search-row):active:not(");

  it("shrink and brighten from the tokens, with nothing drawn behind", () => {
    expect(list).toContain(READY);
    expect(body).toContain(SCALE);
    expect(body).toContain(BRIGHT);
    expect(body).not.toMatch(/background|box-shadow|outline/);
  });

  it("only brighten under reduced motion, either switch", () => {
    const still = rulesWith(css, ".dl-phone-search-row):active").filter(([, b]) => b.includes("scale: none"));
    expect(still).toHaveLength(2);
    for (const [selector] of still) expect(outweighs(selector, list), selector).toBe(true);
  });

  it("keep the icon's press: white, no box, the lens filled", () => {
    const icon = only(css, `.dl-phone-icon:active${READY})`)[1];
    expect(icon).toContain("background: none");
    expect(icon).toContain("color: var(--dl-fg, #fff)");
  });
});

describe("the toast's action", () => {
  const css = readCss("toast");

  it("is the hover's fill on the desktop, one step darker", () => {
    const [, body] = only(css, "[data-sonner-toaster]:not(.toast-phone) [data-sonner-toast] [data-button]:active");
    expect(body).toContain("background: oklch(1 0 0 / 0.07) !important");
    expect(body).toContain(DIM);
  });

  it("shrinks and brightens on the phone's pill, and only brightens while the toast is still", () => {
    const [press, body] = only(css, "[data-sonner-toaster].toast-phone [data-sonner-toast] [data-button]:active:not(");
    expect(body).toContain(SCALE);
    expect(body).toContain(BRIGHT);
    const [still, stillBody] = only(css, "[data-sonner-toaster].toast-phone.toast-still [data-sonner-toast] [data-button]:active");
    expect(stillBody).toContain("scale: none");
    // As heavy, and later in the sheet, so it wins.
    expect(outweighs(press, still)).toBe(false);
    expect(css.indexOf(still)).toBeGreaterThan(css.indexOf(press));
  });
});
