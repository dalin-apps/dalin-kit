/**
 * @vitest-environment jsdom
 *
 * A phone held on its side gets the phone layout (the owner's pick on
 * 2026-11-23): a coarse pointer on a screen 500px tall or less, whatever its
 * width. The width where the phone layout begins does not move. Runs
 * `usePhoneLayout` and the real <Toaster> against a stated screen, through
 * a matchMedia that reads the query's own parts.
 */
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ToastBand } from "./toast-band.js";
import { Toaster } from "./toaster.js";
import {
  PHONE_MAX_WIDTH_PX,
  PHONE_SIDEWAYS_QUERY,
  phoneLayoutQuery,
  setPhoneMaxWidth,
  usePhoneLayout,
} from "./use-phone-layout.js";
import * as root from "../index.js";

let screen = { width: 1280, height: 800, coarse: false };

/** One media query of a comma list: every `(feature: value)` in it must hold. */
function holds(part: string): boolean {
  const features = [...part.matchAll(/\(([\w-]+):\s*([\w.]+?)(px)?\)/g)];
  if (features.length === 0) return false;
  return features.every(([, name, value]) => {
    if (name === "max-width") return screen.width <= Number(value);
    if (name === "max-height") return screen.height <= Number(value);
    if (name === "pointer") return (value === "coarse") === screen.coarse;
    return false;
  });
}

let host: HTMLElement;
let reactRoot: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => ({
    matches: query.split(",").some((part) => holds(part)),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.appendChild(host);
  reactRoot = createRoot(host);
});

afterEach(async () => {
  await act(async () => {
    toast.dismiss();
    reactRoot.unmount();
  });
  host.remove();
  setPhoneMaxWidth(null);
  vi.useRealTimers();
});

let seen: boolean | null = null;
function Probe() {
  seen = usePhoneLayout();
  return null;
}

async function layoutOn(next: typeof screen): Promise<boolean | null> {
  screen = next;
  seen = null;
  await act(async () => {
    reactRoot.render(createElement(Probe));
  });
  return seen;
}

describe("a phone on its side", () => {
  it("names the query apps share, as the owner picked it", () => {
    expect(PHONE_SIDEWAYS_QUERY).toBe("(pointer: coarse) and (max-height: 500px)");
    expect(root.PHONE_SIDEWAYS_QUERY).toBe(PHONE_SIDEWAYS_QUERY);
    expect(root.phoneLayoutQuery).toBe(phoneLayoutQuery);
  });

  it("joins the width in force with a comma, and follows a width the app names", () => {
    expect(phoneLayoutQuery()).toBe(`(max-width: ${PHONE_MAX_WIDTH_PX}px), ${PHONE_SIDEWAYS_QUERY}`);
    setPhoneMaxWidth(899);
    expect(phoneLayoutQuery()).toBe(`(max-width: 899px), ${PHONE_SIDEWAYS_QUERY}`);
  });

  it("is the phone layout: an 844 by 390 touch screen", async () => {
    expect(await layoutOn({ width: 844, height: 390, coarse: true })).toBe(true);
  });

  it("is the phone layout at the edge, 500px tall, and not at 501", async () => {
    expect(await layoutOn({ width: 1024, height: 500, coarse: true })).toBe(true);
    expect(await layoutOn({ width: 1024, height: 501, coarse: true })).toBe(false);
  });

  it("leaves a short desktop window with a mouse on the desktop layout", async () => {
    expect(await layoutOn({ width: 1280, height: 480, coarse: false })).toBe(false);
  });

  it("does not move the width: a tall touch screen 768 wide is still the desktop", async () => {
    expect(await layoutOn({ width: 768, height: 1024, coarse: true })).toBe(false);
    expect(await layoutOn({ width: 767, height: 1024, coarse: true })).toBe(true);
  });

  it("gives the toaster and the band the phone's toast", async () => {
    screen = { width: 844, height: 390, coarse: true };
    await act(async () => {
      reactRoot.render(
        createElement("div", null, createElement(Toaster, { key: "t" }), createElement(ToastBand, { key: "b" })),
      );
    });
    await act(async () => {
      toast("hello");
    });
    await act(async () => {
      vi.advanceTimersByTime(20);
    });
    const list = document.querySelector("[data-sonner-toaster]");
    expect(list?.classList.contains("toast-phone")).toBe(true);
    expect(list?.classList.contains("toast-tuck")).toBe(false);
    expect(document.querySelector(".toast-band")).not.toBeNull();
  });
});
