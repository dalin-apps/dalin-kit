/**
 * The phone's press, from the pointer (0.14, the owner's pick on
 * 2026-11-26).
 *
 * The family's phone press is a control 0.97 of its size and brighter
 * (tokens.css). It was drawn from `:active`, and a touch browser applies
 * `:active` only once it knows the touch is a tap and not a scroll: on
 * calendar's phone the plus, held for 250ms, stayed at full size and shrank
 * about 70ms after the finger had lifted, and a tab showed its press, its
 * 0.9 settle and a one-frame pop after the tap was over. The look answered
 * the lift. "the animation needs to be synced up with the user's press. not
 * after."
 *
 * So the press is an attribute this watcher writes as the pointer lands:
 *
 * - `data-pressed` on the control from `pointerdown`, until the pointer
 *   lifts, is cancelled (a scroll took the touch) or slides off it. The
 *   stylesheet draws the press from it, in one frame.
 * - `data-released` from a lift on the control, for the one settle back
 *   from the pressed size (`--dl-t-tab-settle`, 140ms, on the family's
 *   curve), and gone when the settle ends, so nothing runs at rest. A press
 *   that was cancelled or slid off lets go with no settle.
 * - `data-dl-press` on `<html>` for as long as the watcher runs, which is
 *   how the kit's stylesheets know to stop drawing the same press from
 *   `:active`.
 *
 * It marks the kit's create button (`.dl-create`, `.dl-create-glass`, and
 * the button around a glass layer) and anything the app marks `dl-press`,
 * which is how a phone tab takes it: the bar is each app's own markup. A
 * control that is disabled or busy is left alone. A key press sends no
 * pointer event, so nothing started from the keyboard moves.
 *
 * They are attributes and not classes because React owns an element's
 * class, and writes it afresh when a prop changes, in the middle of a press.
 */
export declare const PRESSED_ATTR = "data-pressed";
/** The mark of a control settling back from its press. */
export declare const RELEASED_ATTR = "data-released";
/** On `<html>` while `watchPress` runs: the stylesheets then leave `:active` alone. */
export declare const PRESS_WATCH_ATTR = "data-dl-press";
/** The class an app puts on a control of its own that takes the press: a phone tab. */
export declare const PRESS_CLASS = "dl-press";
/**
 * The control a press on `target` belongs to: the nearest element that
 * carries one of the classes, or that holds a create glass as a layer, the
 * way a button with a glass `<span>` does. Null for none, and for one that
 * is disabled or busy.
 */
export declare function pressTarget(target: EventTarget | null): HTMLElement | null;
export type PressOptions = {
    /** True while motion is reduced, for this watcher alone. Left out, it is the kit's one reader (`reducesMotion`). */
    reducedMotion?: () => boolean;
};
/**
 * Starts watching, at the window and in the capture phase, so the press is
 * drawn before any handler of the control's own runs. Returns the function
 * that stops it. Call it once, from an effect at the app's root, beside
 * `watchInputModality`.
 */
export declare function watchPress(options?: PressOptions): () => void;
//# sourceMappingURL=press.d.ts.map