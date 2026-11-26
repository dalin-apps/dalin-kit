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
/**
 * No drag starts this soon after the sheet opens: the tap that opened it is
 * still ending, and a phone sends that tap's mouse events after it. It was
 * 500 until 0.14, where a deliberate second press paid for it: a press that
 * landed inside the guard stayed ignored however long it was held (the
 * owner's pick on 2026-11-26).
 */
export const SHEET_OPEN_GUARD_MS = 150;
/** No drag starts this soon after the sheet's body scrolled: a scroll that just reached the top is still a scroll. */
export const SHEET_SCROLL_GUARD_MS = 100;

/**
 * How far down a sheet must travel to close: a number of px, or a function
 * of the sheet's own height. `<Sheet dismissDistance>` takes one.
 */
export type SheetDismissDistance = number | ((height: number) => number);

/**
 * The default distance, mail's and calendar's: 96px or 40% of the sheet's
 * height, whichever is less. A sheet with no measured height gets 96px.
 */
export function sheetDismissDistance(height: number): number {
  return height > 0 ? Math.min(SHEET_DISMISS_PX, height * SHEET_DISMISS_FRACTION) : SHEET_DISMISS_PX;
}

/** The distance in force for a sheet of this height. A value that is no positive number falls back to the default. */
export function resolveSheetDismissDistance(distance: SheetDismissDistance | undefined, height: number): number {
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
export function sheetShouldDismiss(args: {
  offset: number;
  height: number;
  velocity: number;
  distance?: SheetDismissDistance;
}): boolean {
  const { offset, height, velocity, distance } = args;
  if (!(offset > 0)) return false;
  const flung = velocity > SHEET_FLING_VELOCITY && offset >= SHEET_FLING_MIN_PX;
  return offset > resolveSheetDismissDistance(distance, height) || flung;
}

/** A flick's speed is read over this much of the end of the drag, at most. */
export const SHEET_FLING_WINDOW_MS = 100;
/** And over no more than this many of its last moves. */
const FLING_MOVES = 3;
/** No stretch of a drag counts as shorter than this, so two events a millisecond apart are no flick. */
const FLING_MIN_MS = 8;

/** Where the pointer was on a drag, top to bottom in px, and when, in ms. */
export type SheetSample = { y: number; t: number };

/**
 * The speed of a release, in px per ms, positive downward, from the drag's
 * own samples: where the pointer was and when, oldest first, the release
 * last where it moved. Samples that did not move are left out, as Base
 * UI leaves them, since some Android phones send one just before the lift.
 *
 * It is distance over time across the last few moves: up to three, within
 * the last 100ms, or the last move alone where that one took longer. A
 * loaded frame holds a move back and then hands it over late, and one slow
 * sample does not then outweigh the flick it ends. A pointer that has not
 * moved for 80ms before it lifts has no speed left.
 */
export function sheetReleaseVelocity(samples: readonly SheetSample[], releasedAt: number): number {
  const n = samples.length;
  const end = samples[n - 1];
  let from = samples[n - 2];
  if (!end || !from) return 0;
  if (releasedAt - end.t > SHEET_FLING_STALE_MS) return 0;
  for (let i = n - 3; i >= Math.max(0, n - 1 - FLING_MOVES); i--) {
    const sample = samples[i];
    if (!sample || end.t - sample.t > SHEET_FLING_WINDOW_MS) break;
    from = sample;
  }
  return (end.y - from.y) / Math.max(end.t - from.t, FLING_MIN_MS);
}

/** Why a press may not start a drag, or null when it may. */
export type SheetDragBlock = "opening" | "scrolled" | "select" | "selection" | null;

/**
 * The start rules Base UI's Drawer lacks, which are vaul's. A press starts
 * no drag in the sheet's first 150ms (`SHEET_OPEN_GUARD_MS`), for a tenth
 * of a second after its body scrolled, on a `<select>`, or while text in it
 * is selected.
 * Base UI already holds a drag back while a scrolling body is off its top,
 * and leaves alone a region that opts out (`SHEET_NO_DRAG_ATTR`).
 */
export function sheetDragBlock(args: {
  /** Ms since the sheet opened. */
  sinceOpen: number;
  /** Ms since anything inside the sheet scrolled. */
  sinceScroll: number;
  /** Whether the press landed on a `<select>`. */
  onSelect: boolean;
  /** Whether text inside the sheet is selected. */
  selecting: boolean;
}): SheetDragBlock {
  if (args.sinceOpen < SHEET_OPEN_GUARD_MS) return "opening";
  if (args.sinceScroll < SHEET_SCROLL_GUARD_MS) return "scrolled";
  if (args.onSelect) return "select";
  if (args.selecting) return "selection";
  return null;
}
