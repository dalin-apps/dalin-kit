import { type RefObject } from "react";
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
export declare const TOAST_PRESS_ATTR = "data-dl-press";
/**
 * Gives the toast with `id` a press. Returns the function that takes it off
 * again. A second call for the same id replaces the first; `null` takes it
 * off.
 */
export declare function pressToast(id: string | number, onPress: (() => void) | null, options?: {
    description?: string;
}): () => void;
/** The press a toast has now, for an app's tests. */
export declare function readToastPress(id: string | number): ToastPress | null;
/**
 * The toaster's half: marks each registered progress card as a button while
 * the column is the computer's, and hears its presses. `find` is the
 * toaster's id-to-card map (toast-tags.ts).
 */
export declare function useToastPress(root: RefObject<HTMLElement | null>, find: (id: string) => HTMLElement | null, enabled: boolean): void;
//# sourceMappingURL=toast-press.d.ts.map