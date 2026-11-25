/**
 * What a released drag does to a sheet, and when a drag may start.
 *
 * The numbers are the family's own, the practice room's drawer rule, which
 * the apps carry in two forms. Mail's and calendar's sheets close past 96px
 * or 40% of the sheet's height, whichever is less. The Settings sheet in
 * all four apps closes past a flat 96px, with no share of the height. Both
 * close on a flick faster than half a pixel a millisecond once the sheet
 * has travelled 16px. The two differ on a sheet shorter than 240px, where
 * 40% of the height comes before 96px.
 *
 * So the distance is the sheet's to choose (`dismissDistance` on
 * `<Sheet>`): the first form by default, and `SHEET_DISMISS_PX` for the
 * flat one. Base UI's Drawer has another rule again (half the height, or
 * the same flick with no least travel), so the kit judges every release
 * itself and its answer wins (sheet.tsx). Pure, so the rule is tested
 * without a pointer.
 */
/** Travel that closes a sheet outright. */
export const SHEET_DISMISS_PX = 96;
/** Or this share of the sheet's own height, whichever is smaller. */
export const SHEET_DISMISS_FRACTION = 0.4;
/** A release faster than this, in px per ms, is a flick. */
export const SHEET_FLING_VELOCITY = 0.5;
/** Travel a flick needs, so a twitch is not one. */
export const SHEET_FLING_MIN_PX = 16;
/** A finger still for this long before it lifts has no speed left. */
export const SHEET_FLING_STALE_MS = 80;
/** No drag starts this soon after the sheet opens: the tap that opened it is still ending. */
export const SHEET_OPEN_GUARD_MS = 500;
/** No drag starts this soon after the sheet's body scrolled: a scroll that just reached the top is still a scroll. */
export const SHEET_SCROLL_GUARD_MS = 100;
/**
 * The default distance, mail's and calendar's: 96px or 40% of the sheet's
 * height, whichever is less. A sheet with no measured height gets 96px.
 */
export function sheetDismissDistance(height) {
    return height > 0 ? Math.min(SHEET_DISMISS_PX, height * SHEET_DISMISS_FRACTION) : SHEET_DISMISS_PX;
}
/** The distance in force for a sheet of this height. A value that is no positive number falls back to the default. */
export function resolveSheetDismissDistance(distance, height) {
    const value = typeof distance === "function" ? distance(height) : distance;
    return typeof value === "number" && value > 0 ? value : sheetDismissDistance(height);
}
/**
 * Whether a release closes the sheet. `offset` is how far down it sits, in
 * px, `height` is its own height, and `velocity` is px per ms at the
 * release, positive downward. `distance` is the sheet's own closing
 * distance, where it has one: `SHEET_DISMISS_PX` is the Settings sheets'
 * flat 96px.
 *
 * The apps' copies disagree on the edge itself: calendar closes at the
 * distance and at 16px of a flick, mail and the Settings sheets only past
 * them. Here a release closes past the distance, and a flick counts from
 * 16px on.
 */
export function sheetShouldDismiss(args) {
    const { offset, height, velocity, distance } = args;
    if (!(offset > 0))
        return false;
    const flung = velocity > SHEET_FLING_VELOCITY && offset >= SHEET_FLING_MIN_PX;
    return offset > resolveSheetDismissDistance(distance, height) || flung;
}
/**
 * The speed of a drag, in px per ms, after one more move. Weighted toward
 * the newest sample, so one event landing a millisecond after the last
 * can't read as a flick: mail's smoothing.
 */
export function nextSheetVelocity(previous, delta, dt) {
    if (!(dt > 0))
        return previous;
    const sample = delta / dt;
    return previous === 0 ? sample : previous * 0.3 + sample * 0.7;
}
/**
 * The start rules Base UI's Drawer lacks, which are vaul's. A press starts
 * no drag in the sheet's first half second, for a tenth of a second after
 * its body scrolled, on a `<select>`, or while text in it is selected.
 * Base UI already holds a drag back while a scrolling body is off its top,
 * and leaves alone a region that opts out (`SHEET_NO_DRAG_ATTR`).
 */
export function sheetDragBlock(args) {
    if (args.sinceOpen < SHEET_OPEN_GUARD_MS)
        return "opening";
    if (args.sinceScroll < SHEET_SCROLL_GUARD_MS)
        return "scrolled";
    if (args.onSelect)
        return "select";
    if (args.selecting)
        return "selection";
    return null;
}
//# sourceMappingURL=sheet-release.js.map