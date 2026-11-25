import { type ReactNode, type RefObject } from "react";
import type { PaletteMenuEntry } from "./palette-types.js";
/** Something a menu can be placed against. */
export type RowMenuAnchor = {
    getBoundingClientRect: () => DOMRect;
};
/** A row's menu as it stands open: whose it is, what it holds, and where. */
export type RowMenuState = {
    /** The row the menu belongs to, which stays highlighted while it is open. */
    key: string;
    entries: readonly PaletteMenuEntry[];
    anchor: RowMenuAnchor;
    /** When it opened, so the lift of the finger that long-pressed does not close it. */
    at: number;
};
/** A zero-size box at a point, for a menu opened at the pointer. */
export declare function pointAnchor(x: number, y: number): RowMenuAnchor;
/** A point just under a row's start, for a menu opened from the keyboard. */
export declare function underAnchor(element: Element): RowMenuAnchor;
/**
 * The open row menu, if any: the family's frosted menu at a point, with no
 * arrow. One per list. `onRun` is told which entry ran, after the menu has
 * closed.
 */
export declare function RowMenu({ state, onClose, onRun, className, returnTo, }: {
    state: RowMenuState | null;
    onClose: () => void;
    onRun: (entry: Exclude<PaletteMenuEntry, "separator">) => void;
    className?: string;
    /** Where focus goes back to as the menu closes: the palette's field. */
    returnTo?: RefObject<HTMLElement | null>;
}): ReactNode;
//# sourceMappingURL=palette-menu.d.ts.map