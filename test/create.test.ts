/**
 * @vitest-environment jsdom
 *
 * The create button's stylesheet: the whole button, the glass alone for a
 * shape the app owns, and a keyboard ring no shadow can cover.
 */
import { describe, expect, it } from "vitest";
import { outweighs, readCss, ruleFor, rulesWith, specificity, splitList } from "./css.js";

const css = readCss("create");

/** The declarations of every rule that applies to `cls` itself (no pseudo, no hover). */
function own(cls: string): string {
  return rulesWith(css, cls)
    .filter(([list]) => splitList(list).some((selector) => selector === cls || selector === `:where(${cls})`))
    .map(([, body]) => body)
    .join("\n");
}

describe(".dl-create, the whole button", () => {
  it("keeps the family's height and corners", () => {
    expect(own(".dl-create")).toContain("height: var(--dl-create-h, 44px)");
    expect(own(".dl-create")).toContain("border-radius: var(--dl-r-create, 8px)");
  });

  it("keeps every declaration of the glass it had in version 0", () => {
    for (const declaration of [
      "position: relative",
      "isolation: isolate",
      "color: var(--dl-fg, #fff)",
      "backdrop-filter: blur(10px)",
      "border: 1px solid oklch(from var(--dl-accent) calc(l + 0.02) c h / 0.58)",
      "box-shadow: 0 1px 2px oklch(0 0 0 / 0.2)",
      "oklch(from var(--dl-accent) calc(l + 0.02) calc(c + 0.02) h / 0.4) 0%",
      "oklch(from var(--dl-accent) calc(l - 0.09) c h / 0.32) 100%",
    ]) {
      expect(own(".dl-create"), declaration).toContain(declaration);
    }
    expect(own(".dl-create")).toMatch(/transition:\s*background [^;]+,\s*border-color/);
  });
});

describe(".dl-create-glass, the glass alone", () => {
  it("shares the recipe with the whole button, rule for rule", () => {
    const glass = rulesWith(css, ".dl-create-glass").filter(([list]) => !list.includes(":where") && !list.includes("focus") && !list.includes(":active") && !list.includes("disabled"));
    expect(glass.length).toBe(4);
    for (const [list] of glass) {
      const selectors = splitList(list);
      expect(selectors.map((s) => s.replace(".dl-create-glass", ".dl-create")), list).toEqual(
        expect.arrayContaining([selectors[0]]),
      );
      expect(selectors[0]!.startsWith(".dl-create")).toBe(true);
    }
    for (const suffix of ["", "::before", "::after", ":hover"]) {
      const pair = rulesWith(css, `.dl-create-glass${suffix}`).find(([list]) =>
        splitList(list).includes(`.dl-create${suffix}`) && splitList(list).includes(`.dl-create-glass${suffix}`),
      );
      expect(pair, suffix || "base").toBeDefined();
    }
  });

  it("sets no height and no corners: the shape is the app's", () => {
    expect(own(".dl-create-glass")).not.toContain("height:");
    expect(own(".dl-create-glass")).not.toContain("border-radius:");
  });

  it("lets its two layers follow whatever corners the app gives it", () => {
    for (const layer of ["::before", "::after"]) {
      const [, body] = rulesWith(css, `.dl-create-glass${layer}`)[0]!;
      expect(body, layer).toContain("border-radius: inherit");
    }
  });

  it("offers position and transition as defaults any single class of the app's outweighs", () => {
    const defaults = ruleFor(css, ":where(.dl-create-glass)");
    expect(defaults).toContain("position: relative");
    expect(defaults).toContain("transition:");
    expect(specificity(":where(.dl-create-glass)")).toEqual([0, 0, 0]);
    // Mail's circle, drive's layer and calendar's circle, as each names its own.
    for (const app of [".fab", ".mb-create-glass", ".ph-fab"]) expect(outweighs(app, ":where(.dl-create-glass)")).toBe(true);
    // The four properties mail and drive had to restate are all the app's now.
    for (const property of ["height:", "border-radius:", "position:", "transition:"]) {
      const forced = rulesWith(css, ".dl-create-glass")
        .filter(([list]) => !list.includes(":where") && splitList(list).includes(".dl-create-glass"))
        .some(([, body]) => body.includes(property));
      expect(forced, property).toBe(false);
    }
  });
});

describe("the keyboard ring", () => {
  const [list, ring] = rulesWith(css, ":focus-visible")[0]!;

  it("is an outline, which the glass's box-shadow cannot cover", () => {
    expect(ring).toContain("outline: var(--dl-focus-w, 2px) solid var(--dl-focus-ring, var(--dl-fg, #fff))");
    expect(ring).toContain("outline-offset: var(--dl-focus-offset, 2px)");
    expect(ring).not.toContain("box-shadow");
  });

  it("is on the whole button, the glass alone, and a glass layer inside a focused button", () => {
    expect(splitList(list)).toEqual([
      ".dl-create:focus-visible",
      ".dl-create-glass:focus-visible",
      ":focus-visible > .dl-create-glass:where(:not(.dl-create-no-ring))",
    ]);
  });

  it("lets a glass layer stand down where its host button draws its own ring", () => {
    // `dl-create-no-ring` on the <span>: the host's ring is then the only one.
    const layer = splitList(list)[2]!;
    expect(layer).toContain(":where(:not(.dl-create-no-ring))");
    // The opt-out weighs nothing, so the rule wins and loses as it did.
    expect(specificity(layer)).toEqual(specificity(":focus-visible > .dl-create-glass"));
    // A glass that is itself the focused element always keeps its ring.
    expect(splitList(list)[1]).toBe(".dl-create-glass:focus-visible");
    const host = document.createElement("button");
    host.innerHTML = '<span class="dl-create-glass"></span><span class="dl-create-glass dl-create-no-ring"></span>';
    const [ringed, quiet] = [...host.querySelectorAll("span")];
    const inside = layer.replace(":focus-visible", "button");
    expect(ringed!.matches(inside)).toBe(true);
    expect(quiet!.matches(inside)).toBe(false);
  });

  it("never removes an outline anywhere in the sheet", () => {
    expect(css).not.toMatch(/outline:\s*(none|0)\b/);
  });
});

describe(".dl-create-shape", () => {
  it("is still the height and corners alone", () => {
    expect(own(".dl-create-shape")).toContain("height: var(--dl-create-h, 44px)");
    expect(own(".dl-create-shape")).not.toContain("background");
  });
});
