import { type RefObject } from "react";
/**
 * Where the phone's toasts dock.
 *
 * By default that is the nav pill: a toast announces above the bottom bar and
 * tucks in behind it. But the bottom of the usable area is not always the bar.
 * A parked chip can sit over it, and a sheet or a dialog can hide it. Each
 * surface that owns the bottom of the screen registers itself here as a dock,
 * and the one with the highest rank wins:
 *
 * - "pill": the bottom bar in any of its faces. The family case, and what the
 *   toaster does with nothing registered, so long as a bar is on the page
 *   (`useToastPill`). On a page with no bar the toast is a plain one.
 * - "line": some other surface's edge is the floor (a parked chip). A toast
 *   announces just above that line and then leaves, out of sight until the
 *   pill is the dock again. A stack already fanned out stays out.
 * - "cover": a sheet or dialog hides the bar. The same announce and exit, and
 *   a fanned stack is tucked first, since nothing there could tuck it.
 *
 * The `<Toaster>` reads the winner and draws it (`toast-over` in toast.css);
 * the `<ToastBand>` stands down while the dock is not the pill. The line is
 * measured from the dock's element: on resize, when a transition on it ends,
 * and again each time a toast arrives.
 *
 * `<Toaster cover>` names covers by selector in place of registering each.
 * Its toasts are drawn over the cover for their announce and dive alone, but
 * whether one is up is known the whole time (`useToastCovered`).
 */
export type ToastDockKind = "pill" | "line" | "cover";
/** What the toaster draws while the dock is not the pill. */
export type ToastDock = {
    kind: "line" | "cover";
    /**
     * The line, in px from the bottom of the viewport. 0 is the bottom edge:
     * the dock's own edge is there, or the strip above the dock is too short
     * for a toast, which then holds where the pill would be.
     */
    line: number;
};
export type ToastDockOptions = {
    /** What kind of surface this is. Defaults to "line". */
    kind?: ToastDockKind;
    /** Which dock wins when several are up: the highest. Ties go to the newest. Defaults to 0. */
    rank?: number;
    /** Which edge of the element is the line. Defaults to its top. */
    edge?: "top" | "bottom";
    /** A fixed line in px from the viewport's bottom, in place of measuring the element. */
    line?: number;
    /** Registers only while true. Defaults to true. */
    active?: boolean;
};
/**
 * The line a toast can announce above, given where the dock's edge is: the
 * edge itself when the strip over it has room for a toast, else 0. Pure, so
 * the rule is tested without a layout.
 */
export declare function dockLine(edgeFromBottom: number, viewportHeight: number, barH: number): number;
/** Measures the winning dock again. The `<Toaster>` calls it as each toast arrives. */
export declare function refreshToastDock(): void;
/**
 * The cover named by a selector, measured now: the highest top edge among the
 * matching surfaces that are on screen, or null with none up. This is what
 * `<Toaster cover>` reads as each toast arrives, for an app that would rather
 * name its sheets and dialogs once than register each as a dock. A copy still
 * fading out (`data-dl-leaving`, the kit's close fade) covers nothing.
 */
export declare function measureToastCover(selector: string): ToastDock | null;
/** The dock the toaster draws now, or null while it is the pill. */
export declare function readToastDock(): ToastDock | null;
/** Counts one pill on the page until the returned function is called. */
export declare function registerToastPill(): () => void;
/** Whether a bottom bar has said its pill is on the page. */
export declare function readToastPill(): boolean;
/** Whether a bottom bar has said its pill is on the page. */
export declare function useToastPill(): boolean;
/**
 * Counts a pill while the caller is mounted and `on`. A layout effect, so a
 * bar that mounts in the same commit as a toast is counted before that
 * commit is painted, and the toast never shows one frame in the plain
 * layout.
 */
export declare function useToastPillPresence(on?: boolean): void;
/** Called by the `<Toaster>` as the cover its selector names comes and goes. */
export declare function setNamedToastCover(up: boolean): void;
/**
 * Whether a cover hides the phone's bottom bar now: a dock registered as
 * "cover" is the winner, or a surface named by `<Toaster cover>` is up.
 */
export declare function readToastCovered(): boolean;
/** Whether a cover hides the phone's bottom bar now. */
export declare function useToastCovered(): boolean;
/** The dock the toaster draws now, or null while it is the pill. */
export declare function useToastDockState(): ToastDock | null;
/** The kind of surface phone toasts dock to now: "pill" with nothing else registered. */
export declare function useToastDockKind(): ToastDockKind;
/**
 * Registers a dock outside React. Returns the function that takes it away.
 * `el` may be null when `options.line` names a fixed line.
 */
export declare function registerToastDock(el: HTMLElement | null, options?: ToastDockOptions): () => void;
/**
 * Registers `ref`'s element as a toast dock while it is mounted and
 * `options.active` is not false. Call it from each surface that owns the
 * bottom of the phone screen: the bar ("pill"), a parked chip ("line"), a
 * sheet or dialog ("cover").
 */
export declare function useToastDock(ref: RefObject<HTMLElement | null> | null, options?: ToastDockOptions): void;
//# sourceMappingURL=toast-dock.d.ts.map