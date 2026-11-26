"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore, type RefObject } from "react";
import { PROGRESS_CLASS } from "./toast-update.js";

/**
 * A press on a progress toast, on a computer (0.13, the owner's pick on
 * 2026-11-25): a click, or Enter or Space while the toast has focus, calls
 * the app's handler. Drive's upload toast swaps "42%, 12 min left" and
 * "42%, 16 MB/s" this way.
 *
 * Sonner takes no handler for a toast's body, so the app names the toast by
 * its id:
 *
 *   toast.loading(line, { id });
 *   const stop = pressToast(id, swap, { description: "Click to show speed" });
 *
 * The press works only while the toast is the progress kind, so the result
 * raised under the same id ("Uploaded 12 files") is a toast like any other.
 * On a phone a tap fans the stack, as it always has, and calls nothing. Call
 * the returned function, or `pressToast(id, null)`, once the work is done.
 */
export type ToastPress = {
  onPress: () => void;
  /** Said after the toast's words to a screen reader: what a press does. */
  description?: string;
};

/** The attribute a pressable card carries, which toast.css draws the press on. */
export const TOAST_PRESS_ATTR = "data-dl-press";

/** How far a pointer may travel between down and up and still press, rather than swipe. */
const PRESS_SLOP_PX = 6;

const presses = new Map<string, ToastPress>();
const listeners = new Set<() => void>();
let version = 0;

function changed(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/**
 * Gives the toast with `id` a press. Returns the function that takes it off
 * again. A second call for the same id replaces the first; `null` takes it
 * off.
 */
export function pressToast(id: string | number, onPress: (() => void) | null, options: { description?: string } = {}): () => void {
  const key = String(id);
  if (!onPress) {
    if (presses.delete(key)) changed();
    return () => {};
  }
  const entry: ToastPress = { onPress, description: options.description };
  presses.set(key, entry);
  changed();
  return () => {
    if (presses.get(key) === entry) {
      presses.delete(key);
      changed();
    }
  };
}

/** The press a toast has now, for an app's tests. */
export function readToastPress(id: string | number): ToastPress | null {
  return presses.get(String(id)) ?? null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const CARD = "[data-sonner-toast]";

function isProgress(card: HTMLElement): boolean {
  return card.classList.contains(PROGRESS_CLASS) || card.getAttribute("data-type") === "loading";
}

/** What a card wore before it was made pressable, to give back. */
type Worn = { role: string | null; description: string | null };

/**
 * The toaster's half: marks each registered progress card as a button while
 * the column is the computer's, and hears its presses. `find` is the
 * toaster's id-to-card map (toast-tags.ts).
 */
export function useToastPress(
  root: RefObject<HTMLElement | null>,
  find: (id: string) => HTMLElement | null,
  enabled: boolean,
): void {
  const at = useSyncExternalStore(subscribe, () => version, () => 0);

  // Which card is pressable, read again whenever a card or its class changes.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const worn = new Map<HTMLElement, Worn>();
    const release = (card: HTMLElement) => {
      const was = worn.get(card);
      if (!was) return;
      worn.delete(card);
      card.removeAttribute(TOAST_PRESS_ATTR);
      if (was.role === null) card.removeAttribute("role");
      else card.setAttribute("role", was.role);
      if (was.description === null) card.removeAttribute("aria-description");
      else card.setAttribute("aria-description", was.description);
    };
    const sync = () => {
      const want = new Map<HTMLElement, ToastPress>();
      if (enabled) {
        for (const [id, press] of presses) {
          const card = find(id);
          if (card && el.contains(card) && isProgress(card)) want.set(card, press);
        }
      }
      for (const card of [...worn.keys()]) if (!want.has(card)) release(card);
      for (const [card, press] of want) {
        if (!worn.has(card)) {
          worn.set(card, { role: card.getAttribute("role"), description: card.getAttribute("aria-description") });
        }
        if (!card.hasAttribute(TOAST_PRESS_ATTR)) card.setAttribute(TOAST_PRESS_ATTR, "");
        if (card.getAttribute("role") !== "button") card.setAttribute("role", "button");
        if (press.description) {
          if (card.getAttribute("aria-description") !== press.description) card.setAttribute("aria-description", press.description);
        } else if (card.hasAttribute("aria-description")) card.removeAttribute("aria-description");
      }
    };
    sync();
    if (typeof MutationObserver === "undefined") {
      return () => {
        for (const card of [...worn.keys()]) release(card);
      };
    }
    // The tags pair a card with its id from a microtask, so a card can
    // become known after this effect ran.
    const watch = new MutationObserver(sync);
    watch.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-type"] });
    return () => {
      watch.disconnect();
      for (const card of [...worn.keys()]) release(card);
    };
  }, [root, find, enabled, at]);

  // The press itself.
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled) return;
    let down: { x: number; y: number } | null = null;
    const pressOf = (card: HTMLElement): ToastPress | null => {
      if (!card.hasAttribute(TOAST_PRESS_ATTR) || !isProgress(card)) return null;
      for (const [id, press] of presses) if (find(id) === card) return press;
      return null;
    };
    const cardOf = (target: EventTarget | null): HTMLElement | null =>
      target instanceof Element ? target.closest<HTMLElement>(CARD) : null;
    // A press on the toast's own button or link is that control's.
    const onControl = (target: EventTarget | null, card: HTMLElement): boolean => {
      const control = target instanceof Element ? target.closest("button, a[href], input, select, textarea") : null;
      return control !== null && control !== card && card.contains(control);
    };
    const onDown = (event: PointerEvent) => {
      down = { x: event.clientX, y: event.clientY };
    };
    const onClick = (event: MouseEvent) => {
      const card = cardOf(event.target);
      const from = down;
      down = null;
      if (!card || onControl(event.target, card)) return;
      // A drag that came back short of a swipe is not a press.
      if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > PRESS_SLOP_PX) return;
      const press = pressOf(card);
      if (!press) return;
      press.onPress();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const card = cardOf(event.target);
      if (!card || event.target !== card) return;
      const press = pressOf(card);
      if (!press) return;
      event.preventDefault();
      press.onPress();
    };
    el.addEventListener("pointerdown", onDown, true);
    el.addEventListener("click", onClick);
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onDown, true);
      el.removeEventListener("click", onClick);
      el.removeEventListener("keydown", onKey);
    };
  }, [root, find, enabled]);
}
