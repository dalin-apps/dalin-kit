/**
 * @vitest-environment jsdom
 *
 * Where the phone layout starts. The stylesheet has no width query, so the
 * class the <Toaster> writes is the whole switch, and the width behind it
 * comes from the prop, then `--dl-phone-max`, then 767. Runs the real
 * <Toaster> and <ToastBand> against a viewport of a stated width.
 */
import { readFileSync } from "node:fs";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ToastBand } from "./toast-band.js";
import { Toaster } from "./toaster.js";
import { PHONE_MAX_WIDTH_PX, readPhoneMaxWidth, setPhoneMaxWidth } from "./use-phone-layout.js";

let host: HTMLElement;
let root: Root;
let viewport = 1280;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    return {
      matches: max ? viewport <= Number(max[1]) : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    };
  }) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  vi.useFakeTimers();
  viewport = 1280;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => {
    toast.dismiss();
    root.unmount();
  });
  host.remove();
  document.documentElement.style.removeProperty("--dl-phone-max");
  setPhoneMaxWidth(null);
  vi.useRealTimers();
});

async function show(props: { phoneMaxWidth?: number } = {}) {
  await act(async () => {
    root.render(
      createElement("div", null, createElement(Toaster, { key: "t", ...props }), createElement(ToastBand, { key: "b" })),
    );
  });
  await act(async () => {
    toast("hello");
  });
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}

const list = () => document.querySelector("[data-sonner-toaster]");
const band = () => document.querySelector(".toast-band");

describe("where the phone layout starts", () => {
  it("is 767px by default: 767 is the phone and 768 the desktop", async () => {
    expect(PHONE_MAX_WIDTH_PX).toBe(767);
    viewport = 767;
    await show();
    expect(list()?.classList.contains("toast-phone")).toBe(true);
    expect(list()?.classList.contains("toast-tuck")).toBe(false);
    expect(band()).not.toBeNull();
  });

  it("leaves an 800px window on the desktop column by default", async () => {
    viewport = 800;
    await show();
    expect(list()?.classList.contains("toast-tuck")).toBe(true);
    expect(list()?.classList.contains("toast-phone")).toBe(false);
    expect(band()).toBeNull();
  });

  it("moves with the prop, for the toaster and the band alike", async () => {
    viewport = 800;
    await show({ phoneMaxWidth: 899 });
    expect(readPhoneMaxWidth()).toBe(899);
    expect(list()?.classList.contains("toast-phone")).toBe(true);
    expect(list()?.classList.contains("toast-tuck")).toBe(false);
    expect(band()).not.toBeNull();
  });

  it("reads --dl-phone-max from the root when no prop names a width", async () => {
    document.documentElement.style.setProperty("--dl-phone-max", "899px");
    setPhoneMaxWidth(null);
    viewport = 899;
    await show();
    expect(readPhoneMaxWidth()).toBe(899);
    expect(list()?.classList.contains("toast-phone")).toBe(true);
  });

  it("lets the prop win over the variable, and hands back when it goes", async () => {
    document.documentElement.style.setProperty("--dl-phone-max", "899px");
    setPhoneMaxWidth(640);
    expect(readPhoneMaxWidth()).toBe(640);
    setPhoneMaxWidth(null);
    expect(readPhoneMaxWidth()).toBe(899);
  });
});

describe("toast.css", () => {
  // Vitest runs from the package root.
  const css = readFileSync("css/toast.css", "utf8");

  it("has no width media query left to disagree with the component", () => {
    expect(css).not.toMatch(/@media[^{]*(max|min)-width/);
  });

  it("keys the phone rules on the class, at no added specificity", () => {
    expect(css).toContain('[data-sonner-toaster][data-y-position="bottom"]:where(.toast-phone)');
    expect(css).not.toMatch(/\[data-y-position="bottom"\]\.toast-phone/);
  });
});
