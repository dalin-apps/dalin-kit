/**
 * @vitest-environment jsdom
 *
 * The announce starts in the commit that brings the toast, so the toast's
 * first painted frame is already the announce and never its tucked slot.
 *
 * jsdom paints nothing, so the test reads what stands for a paint: the end
 * of the task that committed the toast. A layout effect's state update is
 * rendered inside that task; a passive effect waits for a later one, and
 * the browser paints between the two. A probe that commits with the
 * <Toaster> leaves a microtask behind, which runs as that task ends.
 *
 * Sonner hands `useSonner` its toasts inside flushSync, which runs passive
 * effects at once and hides the difference, so here the kit's <Toaster> is
 * fed its toasts through an ordinary update, outside act().
 */
import { createElement, act, useEffect, useLayoutEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { toast, type ToastT } from "sonner";
import { Toaster } from "./toaster.js";

const feed = vi.hoisted(() => ({ listeners: new Set<(toasts: unknown[]) => void>() }));

vi.mock("sonner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("sonner")>();
  const react = await import("react");
  return {
    ...actual,
    useSonner: () => {
      const [toasts, setToasts] = react.useState<unknown[]>([]);
      react.useEffect(() => {
        feed.listeners.add(setToasts);
        return () => void feed.listeners.delete(setToasts);
      }, []);
      return { toasts };
    },
  };
});

let host: HTMLElement;
let root: Root;
let seen: boolean[] = [];

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
  seen = [];
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  await act(async () => {
    toast.dismiss();
    await tasks();
    root.unmount();
  });
  host.remove();
});

/** Lets a few real tasks run: Sonner's timer, React's scheduler. */
const tasks = () => new Promise((done) => setTimeout(done, 40));

/** Renders with the toaster in one commit, and reports what that commit left on screen. */
function Probe() {
  const [, setToasts] = useState<unknown[]>([]);
  useEffect(() => {
    feed.listeners.add(setToasts);
    return () => void feed.listeners.delete(setToasts);
  }, []);
  useLayoutEffect(() => {
    queueMicrotask(() => {
      const list = document.querySelector("[data-sonner-toaster]");
      if (list) seen.push(list.classList.contains("toast-announcing"));
    });
  });
  return null;
}

it("is announcing by the first frame that shows the toast", async () => {
  await act(async () => {
    root.render(createElement("div", null, createElement(Probe, { key: "p" }), createElement(Toaster, { key: "t" })));
  });
  // Sonner draws the card; the kit's <Toaster> has not been told yet.
  await act(async () => {
    toast("hello");
    await tasks();
  });
  expect(document.querySelector("[data-sonner-toast]")).not.toBeNull();
  seen = [];
  const arrived = [{ id: 1, title: "hello" } as ToastT];
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  for (const tell of feed.listeners) tell(arrived);
  await tasks();
  // What the task that committed the toast left on screen.
  expect(seen[0]).toBe(true);
  expect(document.querySelector("[data-sonner-toaster]")?.classList.contains("toast-announcing")).toBe(true);
});
