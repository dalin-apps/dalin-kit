/**
 * What a released drag does to a sheet, and when a drag may start.
 *
 * The numbers are the family's own, the practice room's drawer rule that
 * mail, calendar and every Settings sheet each carried a copy of: a sheet
 * closes past 96px or 40% of its height, whichever is less, or on a flick
 * faster than half a pixel a millisecond once it has travelled 16px. Base
 * UI's Drawer has another rule (half the height, or the same flick with no
 * least travel), so the kit judges every release itself and its answer wins
 * (sheet.tsx). Pure, so the rule is tested without a pointer.
 */
/** Travel that closes a sheet outright. */
export declare const SHEET_DISMISS_PX = 96;
/** Or this share of the sheet's own height, whichever is smaller. */
export declare const SHEET_DISMISS_FRACTION = 0.4;
/** A release faster than this, in px per ms, is a flick. */
export declare const SHEET_FLING_VELOCITY = 0.5;
/** Travel a flick needs, so a twitch is not one. */
export declare const SHEET_FLING_MIN_PX = 16;
/** A finger still for this long before it lifts has no speed left. */
export declare const SHEET_FLING_STALE_MS = 80;
/** No drag starts this soon after the sheet opens: the tap that opened it is still ending. */
export declare const SHEET_OPEN_GUARD_MS = 500;
/** No drag starts this soon after the sheet's body scrolled: a scroll that just reached the top is still a scroll. */
export declare const SHEET_SCROLL_GUARD_MS = 100;
/** How far down a sheet of this height must travel to close. */
export declare function sheetDismissDistance(height: number): number;
/**
 * Whether a release closes the sheet. `offset` is how far down it sits, in
 * px, `height` is its own height, and `velocity` is px per ms at the
 * release, positive downward.
 */
export declare function sheetShouldDismiss(args: {
    offset: number;
    height: number;
    velocity: number;
}): boolean;
/**
 * The speed of a drag, in px per ms, after one more move. Weighted toward
 * the newest sample, so one event landing a millisecond after the last
 * can't read as a flick: mail's smoothing.
 */
export declare function nextSheetVelocity(previous: number, delta: number, dt: number): number;
/** Why a press may not start a drag, or null when it may. */
export type SheetDragBlock = "opening" | "scrolled" | "select" | "selection" | null;
/**
 * The start rules Base UI's Drawer lacks, which are vaul's. A press starts
 * no drag in the sheet's first half second, for a tenth of a second after
 * its body scrolled, on a `<select>`, or while text in it is selected.
 * Base UI already holds a drag back while a scrolling body is off its top,
 * and leaves alone a region that opts out (`SHEET_NO_DRAG_ATTR`).
 */
export declare function sheetDragBlock(args: {
    /** Ms since the sheet opened. */
    sinceOpen: number;
    /** Ms since anything inside the sheet scrolled. */
    sinceScroll: number;
    /** Whether the press landed on a `<select>`. */
    onSelect: boolean;
    /** Whether text inside the sheet is selected. */
    selecting: boolean;
}): SheetDragBlock;
//# sourceMappingURL=sheet-release.d.ts.map