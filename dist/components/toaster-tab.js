"use client";
import { useEffect } from "react";
/** Where the family's toasts live: Sonner's list, which the kit's `<Toaster>` styles. */
export const TOASTER = "[data-sonner-toaster]";
/** What can take Tab: a toast's action is a button or a link, and Sonner gives each toast tabindex 0. */
const TAB_STOPS = "a[href], button, input, select, textarea, summary, [tabindex]";
/** The tab stops under the roots, in the order Tab meets them. */
function tabStops(roots) {
    const stops = [];
    for (const root of roots) {
        for (const el of root.querySelectorAll(TAB_STOPS)) {
            // A stop the toaster holds back (a tucked stack) carries tabindex -1.
            if (el.tabIndex < 0 || el.hasAttribute("disabled") || el.closest("[inert], [hidden]"))
                continue;
            if (typeof el.checkVisibility === "function" && !el.checkVisibility())
                continue;
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
const surfaces = [];
/** Whether `el` comes after `from` in the page's order: a stop inside `from` does. */
function follows(el, from) {
    return (from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}
/** Whether `el` comes before `from` in the page's order. `from`'s own box, which holds it, does not. */
function precedes(el, from) {
    return (from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) !== 0 && !el.contains(from);
}
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
 * With no toast that can take Tab, nothing changes, unless the surface
 * asked to be held (`hold`): then Tab off its last stop comes round to its
 * first, Shift+Tab the other way, and with no stop at all the key stays
 * where it is. Focus on the surface itself counts as before its first stop.
 * A screen reader needs none of this: Base UI leaves a live region out of
 * what it hides. With several surfaces up, the one registered last answers.
 */
export function useToasterTab(surface, options = {}) {
    const hold = options.hold ?? false;
    useEffect(() => {
        if (!surface)
            return;
        const doc = surface.ownerDocument;
        surfaces.push(surface);
        const onKey = (event) => {
            if (surfaces[surfaces.length - 1] !== surface)
                return;
            if (event.key !== "Tab" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
                return;
            const active = doc.activeElement;
            if (!(active instanceof HTMLElement))
                return;
            // A field whose forward Tab means something of its own (the
            // palette's ghost completion) keeps it. Shift+Tab stays the loop's.
            if (!event.shiftKey && active.closest("[data-dl-owns-tab]"))
                return;
            const toasts = tabStops([...doc.querySelectorAll(TOASTER)]);
            if (toasts.length === 0 && !hold)
                return;
            const own = tabStops([surface]);
            const back = event.shiftKey;
            let next;
            if (surface.contains(active)) {
                // Off the surface's last stop going forward, or its first going back.
                // Held, the edge is read from the page's order, so focus on the
                // surface itself or on something Tab skips counts by where it sits.
                const edge = hold
                    ? !own.some((el) => el !== active && (back ? precedes(el, active) : follows(el, active)))
                    : own.length === 0 || active === (back ? own[0] : own[own.length - 1]);
                if (!edge)
                    return;
                if (toasts.length > 0)
                    next = back ? toasts[toasts.length - 1] : toasts[0];
                else
                    next = back ? own[own.length - 1] : own[0];
                if (!next) {
                    // Held, with nothing to go to: the key stays on the surface.
                    event.preventDefault();
                    return;
                }
            }
            else if (toasts.length > 0 && active.closest(TOASTER)) {
                if (active !== (back ? toasts[0] : toasts[toasts.length - 1]))
                    return;
                next = (back ? own[own.length - 1] : own[0]) ?? surface;
            }
            if (!next)
                return;
            // The field's own Tab handling must not also run on this press.
            event.preventDefault();
            event.stopPropagation();
            next.focus();
        };
        doc.addEventListener("keydown", onKey, true);
        return () => {
            doc.removeEventListener("keydown", onKey, true);
            const at = surfaces.lastIndexOf(surface);
            if (at !== -1)
                surfaces.splice(at, 1);
        };
    }, [surface, hold]);
}
//# sourceMappingURL=toaster-tab.js.map