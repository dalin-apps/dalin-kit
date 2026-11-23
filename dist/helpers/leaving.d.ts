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
/** The mark on a fading copy. */
export declare const LEAVING_ATTR = "data-dl-leaving";
export type LeavingOptions = {
    /**
     * The menus and dialogs that fade as they close, one selector each. A scrim
     * that wraps its card is named alone, since its copy carries the card.
     */
    selectors: readonly string[];
    /**
     * Whether motion is reduced right now. Left out, it is the kit's one
     * answer (motion.ts): the app's reader if it named one with
     * `setMotionReader`, else the switch the `<Toaster>` was handed as
     * selectors, else the system's setting.
     */
    reducedMotion?: () => boolean;
};
/**
 * Whether a removed node is an overlay that was on screen. Pure over the
 * node, so the rule is tested without an observer.
 */
export declare function shouldLeave(node: {
    matches(selector: string): boolean;
    hasAttribute(name: string): boolean;
    isConnected: boolean;
    style: {
        visibility: string;
        opacity: string;
    };
}, selector: string): boolean;
/**
 * The same fade for an overlay that stays mounted and hides by a class. Call
 * it BEFORE the state change that hides the overlay, while the node still
 * shows what the reader sees: the copy goes in beside it.
 */
export declare function leaveInPlace(node: Element | null, options?: Pick<LeavingOptions, "reducedMotion">): void;
/** Removes the copies still fading for one kind of overlay. An overlay that
 *  asked for its copy with `leaveInPlace` calls this as it opens again. */
export declare function endFades(selector: string): void;
/**
 * Starts watching for the named overlays leaving the document; returns the
 * function that stops it. Call it once, from an effect at the app's root.
 */
export declare function watchLeaving({ selectors, reducedMotion }: LeavingOptions): () => void;
//# sourceMappingURL=leaving.d.ts.map