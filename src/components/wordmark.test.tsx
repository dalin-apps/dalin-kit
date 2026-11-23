/**
 * @vitest-environment jsdom
 *
 * <Wordmark>: what it renders for each app, how it is named, and the rules
 * in wordmark.css that make it the mark the apps drew by hand.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readCss, ruleFor } from "../../test/css.js";
import { DALIN_APPS, dalinApp } from "./apps.js";
import { Wordmark } from "./wordmark.js";

const css = readCss("wordmark");

function render(node: React.ReactElement): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(node);
  return host.firstElementChild as HTMLElement;
}

describe("the four apps", () => {
  it("are mail, calendar, notes and drive, each with its accent and its address", () => {
    expect(DALIN_APPS.map((app) => [app.id, app.accent, app.href])).toEqual([
      ["mail", "oklch(0.64 0.28 285)", "https://mail.dalin.pro"],
      ["calendar", "oklch(0.64 0.16 50)", "https://calendar.dalin.pro"],
      ["notes", "oklch(0.85 0.175 95)", "https://notes.dalin.pro"],
      ["drive", "oklch(0.64 0.16 240)", "https://drive.dalin.pro"],
    ]);
    expect(dalinApp("notes").name).toBe("notes");
  });
});

describe("<Wordmark>", () => {
  it.each(DALIN_APPS.map((app) => app.id))("reads dalin. %s, as one image", (app) => {
    const el = render(<Wordmark app={app} />);
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-label")).toBe(`dalin. ${app}`);
    expect(el.textContent).toBe(`dalin.${app}`);
    // The letters are decoration to a screen reader: the label is the name.
    for (const part of el.children) expect(part.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws the period and the app's name as their own parts", () => {
    const el = render(<Wordmark app="drive" />);
    expect(el.querySelector(".dl-wordmark-dot")?.textContent).toBe(".");
    expect(el.querySelector(".dl-wordmark-product")?.textContent).toBe("drive");
    expect(el.querySelector(".dl-wordmark-rest")?.textContent).toBe("alin");
  });

  it("is set at the size the app gives it, and at the size around it with none", () => {
    expect(render(<Wordmark app="mail" size={32} />).style.fontSize).toBe("32px");
    expect(render(<Wordmark app="mail" size="2rem" />).style.fontSize).toBe("2rem");
    expect(render(<Wordmark app="mail" />).style.fontSize).toBe("");
  });

  it("leaves the period to the app's own accent unless told otherwise", () => {
    expect(render(<Wordmark app="mail" />).style.getPropertyValue("--dl-wordmark-dot")).toBe("");
    expect(render(<Wordmark app="calendar" accent="own" />).style.getPropertyValue("--dl-wordmark-dot")).toBe(
      "oklch(0.64 0.16 50)",
    );
    expect(render(<Wordmark app="mail" accent="#fff" />).style.getPropertyValue("--dl-wordmark-dot")).toBe("#fff");
  });

  it("marks a folded wordmark, which does not roll", () => {
    expect(render(<Wordmark app="mail" folded />).hasAttribute("data-folded")).toBe(true);
    expect(render(<Wordmark app="mail" folded rollOut />).hasAttribute("data-roll")).toBe(false);
    expect(render(<Wordmark app="mail" rollOut />).hasAttribute("data-roll")).toBe(true);
    expect(render(<Wordmark app="mail" />).hasAttribute("data-roll")).toBe(false);
  });

  it("keeps the app's own classes and styles beside its own", () => {
    const el = render(<Wordmark app="notes" className="brand" style={{ marginLeft: 6 }} />);
    expect(el.className).toBe("dl-wordmark brand");
    expect(el.style.marginLeft).toBe("6px");
  });
});

describe("wordmark.css", () => {
  it("sets it in Georgia with the sidebar's tracking and a line height of one", () => {
    const body = ruleFor(css, ".dl-wordmark");
    expect(body).toContain('font-family: var(--dl-font-wordmark, Georgia, "Times New Roman", serif)');
    expect(body).toContain("letter-spacing: -0.025em");
    expect(body).toContain("line-height: 1");
    expect(body).toContain("white-space: nowrap");
  });

  it("sets no size, height, padding or margin: the app places it", () => {
    const body = ruleFor(css, ".dl-wordmark");
    for (const property of ["font-size", "height", "padding", "margin"]) expect(body).not.toMatch(new RegExp(`(^|\\s)${property}`));
  });

  it("draws the period in the app's accent and the name in muted italic", () => {
    expect(ruleFor(css, ".dl-wordmark-dot")).toContain("color: var(--dl-wordmark-dot, var(--dl-accent, currentColor))");
    const product = ruleFor(css, ".dl-wordmark-product");
    expect(product).toContain("font-style: italic");
    expect(product).toContain("color: var(--dl-fg-muted, #b8b8b8)");
  });

  it("rolls a folded wordmark up to d. and rolls it out on mail's timings", () => {
    expect(ruleFor(css, ".dl-wordmark[data-folded] :is(.dl-wordmark-rest, .dl-wordmark-product-wrap)")).toContain("max-width: 0");
    expect(ruleFor(css, ".dl-wordmark[data-roll] .dl-wordmark-rest")).toContain("dl-wordmark-rest 1.1s");
    expect(ruleFor(css, ".dl-wordmark[data-roll] .dl-wordmark-product-wrap")).toMatch(/dl-wordmark-product 0\.95s .* 0\.5s both/);
  });

  it("does not roll while the app's motion switch says Reduce", () => {
    expect(css).toMatch(/html\[data-dl-motion="reduce"\] \.dl-wordmark\[data-roll\] :is\([^)]*\)\s*\{\s*animation: none;/);
  });

  it("does not roll while the system asks for reduced motion, unless the app's switch says Full", () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*html:not\(\[data-dl-motion="full"\]\) \.dl-wordmark\[data-roll\][^{]*\{\s*animation: none;/,
    );
  });
});
