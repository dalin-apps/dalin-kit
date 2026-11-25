"use client";

import { useEffect } from "react";

/** Where the family's toasts live: Sonner's list, which the kit's `<Toaster>` styles. */
export const TOASTER = "[data-sonner-toaster]";

/** What can take Tab: a toast's action is a button or a link, and Sonner gives each toast tabindex 0. */
const TAB_STOPS = "a[href], button, input, select, textarea, summary, [tabindex]";

/** The tab stops under the roots, in the order Tab meets them. */
function tabStops(roots: readonly Element[]): HTMLElement[] {
  const stops: HTMLElement[] = [];
  for (const root of roots) {
    for (const el of root.querySelectorAll<HTMLElement>(TAB_STOPS)) {
      // A stop the toaster holds back (a tucked stack) carries tabindex -1.
      if (el.tabIndex < 0 || el.hasAttribute("disabled") || el.closest("[inert], [hidden]")) continue;
      if (typeof el.checkVisibility === "function" && !el.checkVisibility()) continue;
      stops.push(el);
    }
  }
  return stops;
}

/**
 * The surfaces holding Tab, oldest first. Only the newest answers: with a
 * sheet over a sheet, or the palette over a sheet, Tab off the toast goes
 * back to the one on top, and not to one it covers.
 */
const surfaces: HTMLElement[] = [];

/**
 * Lets Tab leave a modal surface for the toaster, and come back.
 *
 * A modal dialog keeps Tab inside itself, which is right for the app behind
 * it and wrong for a toast: one raised while search is open stands over the
 * sheet with an Undo that a pointer can press and a keyboard could not
 * reach. So the toaster joins the surface's tab order, after its last stop:
 * Tab on the last stop goes to the first toast, Tab on the last toast comes
 * back to the surface's first stop, and Shift+Tab runs the same loop the
 * other way. Between a toast's own stops the browser moves as usual.
 *
 * With no toast that can take Tab, nothing changes. A screen reader needs
 * none of this: Base UI leaves a live region out of what it hides. With
 * several surfaces up, the one registered last answers.
 */
export function useToasterTab(surface: HTMLElement | null): void {
  useEffect(() => {
    if (!surface) return;
    const doc = surface.ownerDocument;
    surfaces.push(surface);
    const onKey = (event: KeyboardEvent) => {
      if (surfaces[surfaces.length - 1] !== surface) return;
      if (event.key !== "Tab" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const active = doc.activeElement;
      if (!(active instanceof HTMLElement)) return;
      const toasts = tabStops([...doc.querySelectorAll(TOASTER)]);
      if (toasts.length === 0) return;
      const own = tabStops([surface]);
      const back = event.shiftKey;
      let next: HTMLElement | undefined;
      if (surface.contains(active)) {
        // Off the surface's last stop going forward, or its first going back.
        if (own.length > 0 && active !== (back ? own[0] : own[own.length - 1])) return;
        next = back ? toasts[toasts.length - 1] : toasts[0];
      } else if (active.closest(TOASTER)) {
        if (active !== (back ? toasts[0] : toasts[toasts.length - 1])) return;
        next = (back ? own[own.length - 1] : own[0]) ?? surface;
      }
      if (!next) return;
      // The field's own Tab handling must not also run on this press.
      event.preventDefault();
      event.stopPropagation();
      next.focus();
    };
    doc.addEventListener("keydown", onKey, true);
    return () => {
      doc.removeEventListener("keydown", onKey, true);
      const at = surfaces.lastIndexOf(surface);
      if (at !== -1) surfaces.splice(at, 1);
    };
  }, [surface]);
}
