/**
 * @vitest-environment jsdom
 *
 * The two kinds version 0.1 adds: progress, for work still going, and a
 * default kind for a bare toast(). Runs the real <Toaster> for the classes
 * and the icon, and reads toast.css for the rules.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { readCss, ruleFor, ruleNaming, rulesWith, ruleWith } from "../../test/css.js";
import { PROGRESS_DONE_TOAST, ToastSpinner } from "./toast-spinner.js";
import { PROGRESS_TOAST, Toaster, type ToasterProps } from "./toaster.js";

const css = readCss("toast");
const PHONE = '[data-sonner-toaster][data-y-position="bottom"]:where(.toast-phone)';

let host: HTMLElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => {
    toast.dismiss();
    vi.advanceTimersByTime(1000);
    root.unmount();
  });
  host.remove();
  vi.useRealTimers();
});

async function mount(props: ToasterProps = {}) {
  await act(async () => {
    root.render(createElement(Toaster, props));
  });
}

async function raise(fire: () => void) {
  await act(async () => {
    fire();
  });
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}

const card = () => document.querySelector<HTMLElement>("[data-sonner-toast]");
const list = () => document.querySelector<HTMLElement>("[data-sonner-toaster]");

describe("the progress kind", () => {
  it("is what toast.loading() raises: the class and the family's spinner", async () => {
    await mount();
    await raise(() => toast.loading("Uploading"));
    expect(PROGRESS_TOAST).toBe("toast-progress");
    expect(card()?.classList.contains("toast-progress")).toBe(true);
    const spinner = card()?.querySelector("[data-icon] .toast-spinner");
    expect(spinner).not.toBeNull();
    expect(spinner?.getAttribute("aria-hidden")).toBe("true");
    // Sonner's own twelve bars are not drawn beside it.
    expect(card()?.querySelector(".sonner-loading-bar")).toBeNull();
  });

  it("leaves the other kinds their own class and Sonner's own icon", async () => {
    await mount();
    await raise(() => toast.success("Saved"));
    expect(card()?.classList.contains("toast-success")).toBe(true);
    expect(card()?.classList.contains("toast-progress")).toBe(false);
    expect(card()?.querySelector("[data-icon] svg")).not.toBeNull();
  });

  it("gives a plain toast the same spinner to carry itself", () => {
    expect(renderToStaticMarkup(createElement(ToastSpinner))).toBe('<span class="toast-spinner" aria-hidden="true"></span>');
  });

  it("wears the app's accent in the kinds' recipe: 22% over the glass, a 36% rim, white words", () => {
    const body = ruleFor(css, ".toast-progress").replace(/\s+/g, " ");
    expect(body).toContain("color-mix(in oklch, var(--dl-accent, oklch(0.62 0.16 255)) 22%, transparent)");
    expect(body).toContain("var(--dl-toast-glass) !important");
    expect(body).toContain("border: 1px solid color-mix(in oklch, var(--dl-accent, oklch(0.62 0.16 255)) 36%, transparent) !important");
    expect(body).toContain("color: var(--dl-fg, #fff) !important");
  });

  it("spins a ring with one arc in the accent", () => {
    const body = ruleFor(css, ".toast-spinner");
    expect(body).toContain("border-top-color: var(--dl-accent");
    expect(body).toContain("animation: toast-spin 0.9s linear infinite");
    expect(css).toContain("@keyframes toast-spin");
  });

  it("draws the phone's progress card: a bar on the top edge that sweeps, and stays green when done", () => {
    expect(PROGRESS_DONE_TOAST).toBe("toast-progress-done");
    const [selector, bar] = rulesWith(css, ":is(.toast-progress, .toast-progress-done)")[0]!;
    expect(selector.startsWith(PHONE)).toBe(true);
    expect(selector).toContain(':not([data-swiping="true"], [data-removed="true"])::before');
    expect(bar).toContain("top: 6px");
    expect(bar).toContain("height: 3px");
    const sweep = rulesWith(css, `${PHONE} [data-sonner-toast].toast-progress:not(`)[0]![1];
    expect(sweep).toContain("animation: toast-bar-sweep 1.5s");
    expect(sweep).toContain("var(--dl-accent");
    const done = rulesWith(css, ".toast-progress-done:not(")[0]![1];
    expect(done).toContain("background: oklch(0.62 0.14 155)");
    expect(css).toContain("@keyframes toast-bar-sweep");
  });

  it("takes the pill's 1.5px rim on the phone, like the other kinds", () => {
    expect(ruleFor(css, `${PHONE} [data-sonner-toast].toast-progress`)).toContain(
      "border-width: 1.5px !important",
    );
  });
});

describe("the default kind", () => {
  it("is off by default: a bare toast keeps the plain glass and no kind class", async () => {
    await mount();
    await raise(() => toast("Copied"));
    const classes = [...(card()?.classList ?? [])];
    expect(classes.filter((name) => name.startsWith("toast-"))).toEqual([]);
    expect(card()?.querySelector("[data-icon]")).toBeNull();
  });

  // What the classes come to on a typed toast differs by Sonner, and is
  // tested on both in default-kind.test.ts and default-kind-next.test.ts.
  it("gives a bare toast the bare kind's own classes, never the typed kind's", async () => {
    await mount({ defaultKind: "info" });
    await raise(() => toast("Copied"));
    expect(card()?.classList.contains("toast-bare")).toBe(true);
    expect(card()?.classList.contains("toast-bare-info")).toBe(true);
    expect(card()?.classList.contains("toast-info")).toBe(false);
  });

  it("leaves a typed toast its own class, and never the default kind's", async () => {
    await mount({ defaultKind: "info" });
    await raise(() => toast.error("No connection"));
    expect(card()?.classList.contains("toast-error")).toBe(true);
    expect(card()?.classList.contains("toast-info")).toBe(false);
  });

  it("counts a bare toast and its named kind as one kind when updated in place", async () => {
    await mount({ defaultKind: "info" });
    await raise(() => toast("Copied", { id: "copy" }));
    await act(async () => {
      vi.advanceTimersByTime(1600 + 720);
    });
    expect(list()?.classList.contains("toast-announcing")).toBe(false);
    await raise(() => toast.info("Copied", { id: "copy" }));
    expect(list()?.classList.contains("toast-announcing")).toBe(false);
    await raise(() => toast.error("Copied", { id: "copy" }));
    expect(list()?.classList.contains("toast-announcing")).toBe(true);
  });

  const NO_TYPE = ':where(:not([data-type]), [data-type="default"])';
  const BARE = `[data-sonner-toast].toast-bare${NO_TYPE}:not(:has(> [data-icon])) > [data-content]`;

  it("makes the room a kind's icon takes: the 16px box, Sonner's two margins and the gap", () => {
    const body = rulesWith(css, BARE).find(([selector]) => selector === BARE)![1];
    expect(body).toContain(
      "margin-left: calc(var(--toast-icon-margin-start) + 16px + var(--toast-icon-margin-end) + 6px)",
    );
  });

  it("draws the glyph in Sonner's 20px box at Sonner's place, in the kind's colour", () => {
    const body = rulesWith(css, `${BARE}::before`).find(([selector]) => selector === `${BARE}::before`)![1];
    expect(body).toContain("left: calc(16px + var(--toast-icon-margin-start) + var(--toast-svg-margin-start))");
    expect(body).toContain("width: 20px");
    expect(body).toContain("top: 50%");
    expect(body).toContain("mask: var(--toast-bare-icon) center / contain no-repeat");
    expect(body).toContain("background: currentColor");
  });

  it.each([
    ["info", "oklch(0.80 0.13 255)"],
    ["success", "oklch(0.80 0.14 155)"],
    ["warning", "oklch(0.85 0.12 80)"],
    ["error", "oklch(0.75 0.18 25)"],
  ])("has a glyph for %s in the colour that kind's icon already wears", (kind, colour) => {
    // The same literal the typed kind's [data-icon] carries.
    expect(ruleWith(css, `.toast-${kind} [data-icon]`)).toContain(`color: ${colour}`);
    expect(ruleWith(css, `.toast-bare.toast-bare-${kind}${NO_TYPE} > [data-content]::before`)).toContain(`color: ${colour}`);
    const mask = ruleFor(css, `.toast-bare.toast-bare-${kind}${NO_TYPE}`);
    const uri = /url\("data:image\/svg\+xml,([^"]+)"\)/.exec(mask)?.[1] ?? "";
    const svg = decodeURIComponent(uri);
    expect(svg.startsWith("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
    expect(parsed.querySelector("path")?.getAttribute("d")?.length).toBeGreaterThan(50);
  });

  it("uses the capsule's 20px padding on the phone, and draws nothing beside a button", () => {
    const phone = rulesWith(css, `${PHONE} ${BARE}::before`)[0]![1];
    expect(phone).toContain("left: calc(20px + var(--toast-icon-margin-start) + var(--toast-svg-margin-start))");
    expect(ruleWith(css, `${PHONE} [data-sonner-toast].toast-bare${NO_TYPE}:has([data-button]) > [data-content]::before`)).toContain(
      "display: none",
    );
    expect(
      rulesWith(css, `${PHONE} [data-sonner-toast].toast-bare${NO_TYPE}:has([data-button]) > [data-content]`).find(
        ([selector]) => !selector.endsWith("::before"),
      )![1],
    ).toContain("margin-left: 0");
  });
});
