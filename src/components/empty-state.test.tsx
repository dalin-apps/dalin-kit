/**
 * @vitest-environment jsdom
 *
 * <EmptyState>: a large icon and a title, and no subtitle.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readCss, ruleFor } from "../../test/css.js";
import { EmptyState, type EmptyStateProps } from "./empty-state.js";

const css = readCss("empty");

function render(props: EmptyStateProps): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<EmptyState {...props} />);
  return host.firstElementChild as HTMLElement;
}

const Drive = () => (
  <svg viewBox="0 0 24 24">
    <path d="M2 12h20" />
  </svg>
);

describe("<EmptyState>", () => {
  it("is an icon, then a title", () => {
    const el = render({ icon: <Drive />, title: "Nothing here yet" });
    expect(el.className).toBe("dl-empty");
    expect([...el.children].map((child) => child.className)).toEqual(["dl-empty-icon", "dl-empty-title"]);
    expect(el.querySelector(".dl-empty-title")?.textContent).toBe("Nothing here yet");
  });

  it("hides the icon from a screen reader, which reads the title alone", () => {
    const el = render({ icon: <Drive />, title: "Nothing here yet" });
    expect(el.querySelector(".dl-empty-icon")?.getAttribute("aria-hidden")).toBe("true");
    expect(el.textContent).toBe("Nothing here yet");
  });

  it("has no subtitle to give: the props are an icon, a title, an action and a class", () => {
    const props: Required<EmptyStateProps> = { icon: null, title: "", action: null, className: "" };
    expect(Object.keys(props).sort()).toEqual(["action", "className", "icon", "title"]);
  });

  it("draws without an icon, and puts an action under the title", () => {
    expect(render({ title: "No results" }).querySelector(".dl-empty-icon")).toBeNull();
    const el = render({ title: "Nothing here yet", action: <button type="button">Upload</button> });
    expect(el.lastElementChild?.className).toBe("dl-empty-action");
    expect(el.querySelector("button")?.textContent).toBe("Upload");
  });

  it("keeps the app's own class beside its own", () => {
    expect(render({ title: "x", className: "folder-empty" }).className).toBe("dl-empty folder-empty");
  });
});

describe("empty.css", () => {
  it("centres in its pane, whichever way the pane is laid out", () => {
    const body = ruleFor(css, ".dl-empty");
    expect(body).toContain("flex: 1");
    expect(body).toContain("height: 100%");
    expect(body).toContain("align-items: center");
    expect(body).toContain("justify-content: center");
    expect(body).toContain("text-align: center");
  });

  it("draws the icon at 40px in the faint grey", () => {
    const icon = ruleFor(css, ".dl-empty-icon > svg");
    expect(icon).toContain("width: 40px");
    expect(icon).toContain("height: 40px");
    expect(ruleFor(css, ".dl-empty-icon")).toContain("color: var(--dl-fg-faint, #8f97a0)");
  });

  it("sets the title at 16px in weight 600, in the text colour", () => {
    const title = ruleFor(css, ".dl-empty-title");
    expect(title).toContain("font-size: 16px");
    expect(title).toContain("font-weight: 600");
    expect(title).toContain("color: var(--dl-fg, #fff)");
  });

  it("has no rule for a subtitle", () => {
    expect(css).not.toMatch(/sub|description/);
  });
});
