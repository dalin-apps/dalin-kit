import { type ReactNode } from "react";
import type { ToastT } from "sonner";
/**
 * Whether an update to a live toast is worth announcing again.
 *
 * Sonner updates a toast in place when one is raised under an id that is
 * already up. The family's toast announces once, as its id first appears, so
 * a toast that changed afterwards changed where it sat, tucked, with nobody
 * told. The apps worked around that by dismissing the toast and raising a
 * second one under another id.
 *
 * The rule: an update announces when it changes what the toast is or says.
 * - A change of kind always does (work that became its result, an info that
 *   became an error).
 * - Between two toasts of the same kind, a change of words does.
 * - A quiet toast does not: one that shows work still going (the progress
 *   kind) or that is pinned in view. Those tick, a percentage or a countdown,
 *   and each tick is not news. Leaving or entering that state is.
 * - Raising the same toast again with nothing changed is not an update.
 */
export type ToastFace = {
    /** Sonner's type: "success", "loading" and so on; "default" for a bare toast. */
    type: string;
    /** Work still going, or pinned in view: its updates are ticks. */
    quiet: boolean;
    /** The words it shows. */
    text: string;
};
/** The class a pinned toast carries. Named here and re-exported as PINNED_TOAST. */
export declare const PINNED_CLASS = "toast-pinned";
/** The class of the progress kind (toast.css). Re-exported as PROGRESS_TOAST. */
export declare const PROGRESS_CLASS = "toast-progress";
/** The plain words of a title: a string, or the text inside the element it is. */
export declare function textOf(node: ReactNode | (() => ReactNode)): string;
/**
 * What a toast is and says, as far as an announce cares. `bare` is what a
 * toast with no type counts as: the `<Toaster>`'s default kind when it has
 * one, so a bare toast and a typed one that look alike are one kind.
 */
export declare function faceOf(toast: ToastT, bare?: string): ToastFace;
/** Whether a toast that went from `was` to `now` under one id announces again. */
export declare function announcesUpdate(was: ToastFace, now: ToastFace): boolean;
//# sourceMappingURL=toast-update.d.ts.map