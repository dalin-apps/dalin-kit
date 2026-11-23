/**
 * What the component tests share: mounting a tree in jsdom and letting
 * Base UI's effects and timers run.
 */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll } from "vitest";

let host: HTMLElement | null = null;
let root: Root | null = null;

/** Call once at the top of a test file: sets React's act flag and unmounts after each test. */
export function withDom(): void {
  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    if (typeof window.matchMedia !== "function") {
      window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    }
  });
  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    host?.remove();
    host = null;
    document.body.replaceChildren();
  });
}

/** Mounts a tree, or re-renders the one mounted. */
export async function mount(node: ReactNode): Promise<HTMLElement> {
  if (!host) {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  }
  await act(async () => {
    root!.render(node);
  });
  return host;
}

/** Lets effects, microtasks and short timers run. */
export async function settle(ms = 30): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

export async function click(el: Element | null | undefined): Promise<void> {
  if (!el) throw new Error("nothing to click");
  await act(async () => {
    (el as HTMLElement).click();
  });
  await settle();
}

/** A key pressed on an element, or on whatever has focus. */
export async function key(name: string, on?: Element | null, init: KeyboardEventInit = {}): Promise<void> {
  const target = on ?? document.activeElement ?? document.body;
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true, ...init }));
    target.dispatchEvent(new KeyboardEvent("keyup", { key: name, bubbles: true, cancelable: true, ...init }));
  });
  await settle();
}

export const one = <T extends Element = HTMLElement>(selector: string): T | null => document.querySelector<T>(selector);
export const all = <T extends Element = HTMLElement>(selector: string): T[] => [...document.querySelectorAll<T>(selector)];

/** Types into a field the way React hears it: the native setter, then an input event. */
export async function type(input: HTMLInputElement | null | undefined, value: string): Promise<void> {
  if (!input) throw new Error("no field to type in");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle();
}

/**
 * A toaster on the page as Sonner draws one: a live region holding the list,
 * one toast (tabindex 0, as Sonner gives it) and its action. Removed with
 * the rest of the body after each test.
 */
export function withToast(): { toast: HTMLElement; action: HTMLButtonElement } {
  const region = document.createElement("section");
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-label", "Notifications alt+T");
  region.tabIndex = -1;
  region.innerHTML =
    '<ol data-sonner-toaster tabindex="-1"><li data-sonner-toast tabindex="0"><div data-title>Archived</div><button data-button data-action>Undo</button></li></ol>';
  document.body.appendChild(region);
  return { toast: region.querySelector("li")!, action: region.querySelector("button")! };
}

/** A whole press on an element, as a pointer makes one: down, up, click. */
export async function press(el: Element | null | undefined): Promise<void> {
  if (!el) throw new Error("nothing to press");
  await act(async () => {
    for (const name of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      el.dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true, button: 0 }));
    }
  });
  await settle(60);
}
