/**
 * Whether the last thing the reader did was press a key or use a pointer,
 * written to `data-input` on <html> ("keyboard" or "pointer").
 *
 * The family rule it serves: nothing started from the keyboard animates. A
 * dialog opened with a key, a menu closed with Escape and a tooltip shown by
 * Tab all land at once, and the same surfaces keep their motion under a
 * pointer. No token can know what started an action, so the app's stylesheet
 * reads the attribute and drops the durations:
 *
 *   html[data-input="keyboard"] :is(.menu, .dialog) {
 *     animation-duration: 0s !important;
 *     transition-duration: 0s !important;
 *   }
 *
 * and code that runs its own exit asks `startedFromKeyboard()`, as the kit's
 * close fade does (leaving.ts).
 *
 * A modifier alone is not a keystroke (Ctrl+click is a click), and moving the
 * pointer after typing hands the turn back to the pointer, so a tooltip
 * hovered after a sentence was typed still eases in.
 *
 * It is an attribute and not a class because React owns `<html>`'s class and
 * never touches an attribute it did not set.
 */
export const INPUT_ATTR = "data-input";
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "Fn"]);
/** What a keydown means for the attribute: a real key hands the turn to the
 *  keyboard, a bare modifier changes nothing. */
export function inputForKey(key) {
    return MODIFIER_KEYS.has(key) ? null : "keyboard";
}
/** Whether a key press came after the last use of a pointer. False on the server. */
export function startedFromKeyboard() {
    return typeof document !== "undefined" && document.documentElement.getAttribute(INPUT_ATTR) === "keyboard";
}
/**
 * Starts watching, at the window and in the capture phase, so it hears a key
 * before the handler that acts on it. Returns the function that stops it.
 * Call it once, from an effect at the app's root.
 */
export function watchInputModality() {
    const root = document.documentElement;
    const set = (value) => {
        // Written only on a change, so a pointer crossing the page costs one
        // attribute read per move and no style recalculation.
        if (root.getAttribute(INPUT_ATTR) !== value)
            root.setAttribute(INPUT_ATTR, value);
    };
    const onKey = (event) => {
        const next = inputForKey(event.key);
        if (next)
            set(next);
    };
    const onPointer = () => set("pointer");
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("pointermove", onPointer, { capture: true, passive: true });
    return () => {
        window.removeEventListener("keydown", onKey, true);
        window.removeEventListener("pointerdown", onPointer, true);
        window.removeEventListener("pointermove", onPointer, true);
    };
}
//# sourceMappingURL=input-modality.js.map