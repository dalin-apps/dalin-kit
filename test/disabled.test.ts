/**
 * Disabled and busy (the owner's pick on 2026-11-23). A disabled control
 * ([disabled] or aria-disabled="true") is --dl-disabled-opacity opaque,
 * keeps the normal cursor and shows no hover or press look. A busy create
 * button (aria-busy="true") looks the same and is not made unfocusable.
 */
import { describe, expect, it } from "vitest";
import { readCss, rulesWith, splitList } from "./css.js";

const OPACITY = "opacity: var(--dl-disabled-opacity, 0.45)";
const OFF = ':is(:disabled, [aria-disabled="true"], [aria-busy="true"])';

function only(css: string, needle: string): [string, string] {
  const found = rulesWith(css, needle);
  if (found.length !== 1) throw new Error(`${found.length} rules contain ${needle}`);
  return found[0]!;
}

describe("the create button", () => {
  const css = readCss("create");

  it("is 45% opaque with the normal cursor, disabled or busy, whole or as a glass layer", () => {
    const [list, body] = only(css, `.dl-create${OFF}`);
    expect(splitList(list)).toEqual([`.dl-create${OFF}`, `.dl-create-glass${OFF}`, `${OFF} > .dl-create-glass`]);
    expect(body).toContain(OPACITY);
    expect(body).toContain("cursor: default");
  });

  it("keeps a busy button in reach of the keys: no pointer-events or tabindex trick", () => {
    expect(only(css, `.dl-create${OFF}`)[1]).not.toMatch(/pointer-events|visibility|display/);
  });

  it("shows no hover look when disabled or busy", () => {
    const [list] = only(css, ".dl-create:hover");
    for (const selector of splitList(list)) expect(selector).toContain(`:not(${OFF}`);
    expect(list).toContain(`${OFF} > *`);
  });

  it("shows no press look when disabled or busy", () => {
    for (const [list] of rulesWith(css, ":active:not(")) {
      for (const selector of splitList(list)) expect(selector).toContain(OFF);
    }
  });
});

describe("menu and palette rows", () => {
  it("a disabled menu row reads the token, not 0.5, and stays out of the pointer's reach", () => {
    const [, body] = only(readCss("menu"), '.dl-menu-item:is([data-disabled], [aria-disabled="true"])');
    expect(body).toContain(OPACITY);
    expect(body).toContain("pointer-events: none");
    expect(readCss("menu")).not.toMatch(/opacity:\s*0\.5\b/);
  });

  it("a disabled palette row has the same look", () => {
    const [, body] = only(readCss("palette"), '.dl-palette-row:is([data-disabled], [aria-disabled="true"])');
    expect(body).toContain(OPACITY);
    expect(body).toContain("cursor: default");
    expect(body).toContain("pointer-events: none");
  });
});

describe("the phone's parts and the toast's action", () => {
  it("the header icons, Cancel and the search rows take the look when disabled or busy", () => {
    const [, body] = only(readCss("phone"), `:is(.dl-phone-icon, .dl-phone-search-cancel, .dl-phone-search-row)${OFF}`);
    expect(body).toContain(OPACITY);
    expect(body).toContain("cursor: default");
  });

  it("the toast's action takes it, and loses its hover", () => {
    const css = readCss("toast");
    const [, body] = only(css, '[data-sonner-toast] [data-button]:is(:disabled, [aria-disabled="true"])');
    expect(body).toContain(`${OPACITY} !important`);
    expect(only(css, "[data-sonner-toast] [data-button]:hover")[0]).toContain(':not(:disabled, [aria-disabled="true"])');
  });

  it("no sheet uses a not-allowed or pointer cursor for a disabled control", () => {
    for (const sheet of ["create", "menu", "palette", "phone", "toast", "seg"] as const) {
      expect(readCss(sheet), sheet).not.toMatch(/cursor:\s*not-allowed/);
    }
  });
});
