/**
 * The close fade for hand-built menus and dialogs.
 *
 * An overlay an app builds by hand unmounts the moment it closes, so it
 * vanishes in one frame. Holding each one mounted for its exit would move its
 * focus restore, its key listeners and its outside-press handler 110ms later,
 * and each of those is written to run at the close. So the overlay still
 * unmounts at once, and what fades is a copy: one observer watches for an
 * overlay's node leaving the document, puts an inert clone where it stood,
 * and `@dalin/kit/motion.css` fades the clone out (`[data-dl-leaving]`, the
 * family's 110ms close, `--dl-t-close`) before it is removed.
 *
 * Nothing started from the keyboard animates, so a close by key leaves no
 * copy (input-modality.ts), and neither does one under reduced motion. An
 * overlay removed along with something around it (a page closing with a
 * popover open) leaves none either: only the overlay's own removal is read.
 * And an overlay that was replaced by one of its own kind, in the same
 * breath, leaves none.
 *
 * Don't list an overlay that already closes while still mounted (a base-ui
 * popup, a sheet with its own exit). One that stays mounted and hides by a
 * class asks for its copy itself, with `leaveInPlace`.
 *
 * This is calendar's and notes' `src/lib/leaving.ts`, which were the same
 * file twice with the list of overlays changed.
 */
import { startedFromKeyboard } from "./input-modality.js";
import { reducesMotion } from "./motion.js";
/** The mark on a fading copy. */
export const LEAVING_ATTR = "data-dl-leaving";
// Past the 110ms fade. A timer as well as `animationend`, because an app may
// fade a copy's parts instead of the copy (notes' page menu), and then no
// animation ends on the copy's own node.
const REMOVE_AFTER_MS = 170;
/** What a clone does not carry: a field's typed value. */
function copyFields(from, to) {
    const live = from.querySelectorAll("input, textarea, select");
    const copies = to.querySelectorAll("input, textarea, select");
    live.forEach((field, i) => {
        const copy = copies[i];
        if (field instanceof HTMLInputElement && copy instanceof HTMLInputElement) {
            copy.value = field.value;
            copy.checked = field.checked;
        }
        else if (field instanceof HTMLTextAreaElement && copy instanceof HTMLTextAreaElement) {
            copy.value = field.value;
        }
        else if (field instanceof HTMLSelectElement && copy instanceof HTMLSelectElement) {
            copy.selectedIndex = field.selectedIndex;
        }
    });
}
/**
 * Whether a removed node is an overlay that was on screen. Pure over the
 * node, so the rule is tested without an observer.
 */
export function shouldLeave(node, selector) {
    // A node React moved is removed and put back in one batch: still connected.
    if (node.isConnected)
        return false;
    if (node.hasAttribute(LEAVING_ATTR) || !node.matches(selector))
        return false;
    // An overlay still waiting for its measured place is drawn hidden, and one
    // waiting for a phone's keyboard sits at opacity 0.
    return node.style.visibility !== "hidden" && node.style.opacity !== "0";
}
/** Scrolls the copy's lists to where the overlay's stood. It runs once the
 *  copy is in the document, since a scroll offset needs a layout. */
function copyScroll(from, to, scrolled) {
    const live = [from, ...from.querySelectorAll("*")];
    const copies = [to, ...to.querySelectorAll("*")];
    live.forEach((el, i) => {
        const top = scrolled?.get(el) ?? el.scrollTop;
        const copy = copies[i];
        if (top && copy)
            copy.scrollTop = top;
    });
}
function leave(node, parent, before, scrolled, keepIds) {
    const ghost = node.cloneNode(true);
    copyFields(node, ghost);
    ghost.setAttribute(LEAVING_ATTR, "");
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;
    ghost.setAttribute("inert", "");
    // An overlay that left the document takes its ids with it, so the copy
    // keeps them: nothing is duplicated, and a filled icon's mask is found by
    // its id. A copy made beside a live overlay drops them, and anything that
    // points at one still finds the original.
    if (!keepIds) {
        ghost.removeAttribute("id");
        for (const el of ghost.querySelectorAll("[id]"))
            el.removeAttribute("id");
    }
    parent.insertBefore(ghost, before && before.parentNode === parent ? before : null);
    copyScroll(node, ghost, scrolled);
    const done = () => ghost.remove();
    ghost.addEventListener("animationend", (event) => {
        if (event.target === ghost)
            done();
    });
    window.setTimeout(done, REMOVE_AFTER_MS);
}
/**
 * The same fade for an overlay that stays mounted and hides by a class. Call
 * it BEFORE the state change that hides the overlay, while the node still
 * shows what the reader sees: the copy goes in beside it.
 */
export function leaveInPlace(node, options = {}) {
    if (!(node instanceof HTMLElement) || !node.parentNode)
        return;
    if (startedFromKeyboard() || (options.reducedMotion ?? reducesMotion)())
        return;
    // A close asked for twice in one tick leaves one copy.
    if (node.nextElementSibling?.hasAttribute(LEAVING_ATTR))
        return;
    leave(node, node.parentNode, node.nextSibling, null, false);
}
/** Removes the copies still fading for one kind of overlay. An overlay that
 *  asked for its copy with `leaveInPlace` calls this as it opens again. */
export function endFades(selector) {
    for (const ghost of document.querySelectorAll(`:is(${selector})[${LEAVING_ATTR}]`))
        ghost.remove();
}
/**
 * Starts watching for the named overlays leaving the document; returns the
 * function that stops it. Call it once, from an effect at the app's root.
 */
export function watchLeaving({ selectors, reducedMotion = reducesMotion }) {
    const all = selectors.join(", ");
    if (!all)
        return () => { };
    const kindOf = (node) => selectors.find((selector) => node.matches(selector));
    // How far each list inside an open overlay is scrolled. A node out of the
    // document reports 0, so the offsets are noted as they change.
    const scrolled = new WeakMap();
    const noteScroll = (event) => {
        const el = event.target;
        if (el instanceof Element && el.closest(all))
            scrolled.set(el, el.scrollTop);
    };
    // Whether the overlay was replaced rather than closed: one of its own kind
    // is on screen now. A menu React remounts while it stays open leaves the
    // document and comes straight back as a new node, and so does one menu
    // handing over to the next. A copy there would fade under its twin, which
    // reads as a flicker.
    const replaced = (node) => {
        const kind = kindOf(node);
        return kind !== undefined && document.querySelector(`:is(${kind}):not([${LEAVING_ATTR}])`) !== null;
    };
    // The other half of the same rule: an overlay arriving while a copy of its
    // kind is still fading ends the fade. Reopening a menu inside the 110ms
    // would otherwise draw the new one over the ghost of the last.
    const readAdded = (record) => {
        for (const node of record.addedNodes) {
            // One test for the common case: nearly every node added to a page (a
            // typed line, a row) is no overlay at all.
            if (!(node instanceof HTMLElement) || !node.matches(all) || node.hasAttribute(LEAVING_ATTR))
                continue;
            const kind = kindOf(node);
            if (kind)
                endFades(kind);
        }
    };
    const readRemoved = (record) => {
        for (const node of record.removedNodes) {
            if (!(node instanceof HTMLElement) || !shouldLeave(node, all) || replaced(node))
                continue;
            leave(node, record.target, record.nextSibling, scrolled, true);
        }
    };
    const observer = new MutationObserver((records) => {
        const still = startedFromKeyboard() || reducedMotion();
        for (const record of records) {
            if (!record.target.isConnected)
                continue;
            readAdded(record);
            if (!still)
                readRemoved(record);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("scroll", noteScroll, { capture: true, passive: true });
    return () => {
        observer.disconnect();
        document.removeEventListener("scroll", noteScroll, true);
    };
}
//# sourceMappingURL=leaving.js.map