/**
 * @file The arithmetic behind swiping the toast stack out of the tab bar.
 *
 * A finger that lands on the nav pill and travels up past a line just above
 * it fans the toast stack out. With the stack out, the same finger travelling
 * down tucks it back. Everything a drag can mean is decided here, pure, so
 * the table in `stack-swipe.test.ts` pins it and the hook that runs it
 * (`use-stack-swipe.ts`) only reads pointers and paints.
 *
 * The one rule this file exists to keep: a tap on a tab navigates exactly as
 * fast as it did before the gesture existed. So nothing is decided on the way
 * down and nothing waits. A press is read only once it has travelled
 * {@link SWIPE_SLOP_PX} along the axis that can mean something, which a tap
 * never does, and a browser sends no click for a touch that has.
 *
 * Ported from the CS practice room redesign, where the decisions are on the
 * dalin plans page "Swipe up on the tab bar to open the toast stack". The
 * numbers are that app's, unchanged: the two pills share a construction.
 */
/** How far a press travels before it stops being a tap and is claimed. */
export declare const SWIPE_SLOP_PX = 10;
/** How far above the pill's top edge the line sits that opens the stack. */
export declare const SWIPE_LINE_PX = 12;
/**
 * How far past the slop a downward drag travels before it tucks the stack.
 * A distance rather than a line, because a line under the pill would sit
 * inside the system's home gesture strip on a phone with no safe area.
 */
export declare const SWIPE_TUCK_PX = 18;
/** The most the pill lifts under an upward pull before the line. */
export declare const SWIPE_LIFT_MAX_PX = 6;
/**
 * How long a claimed swipe swallows the click that may follow it. Browsers
 * send none for a touch that travelled; this is the backstop.
 */
export declare const SWIPE_CLICK_GUARD_MS = 400;
/** Where a press began, in viewport pixels, and what it could become. */
export type SwipeStart = {
    x: number;
    y: number;
    /** The pill's top edge as measured on the way down. */
    pillTop: number;
    /** Whether the stack was already fanned out when the press began. */
    open: boolean;
};
/**
 * What the press is claimed as: 1 up to open, -1 down to tuck, 0 not yet.
 *
 * Only the direction that can do something is claimed: up while the stack is
 * tucked, down while it is out. The other direction stays nobody's, which on
 * a pill with `touch-action: none` means it does nothing at all.
 */
export declare function claimSwipe(start: SwipeStart, x: number, y: number): -1 | 0 | 1;
/** The line a claimed upward swipe has to cross. */
export declare function swipeLine(start: SwipeStart): number;
/** What a claimed swipe means at the pointer's current position. */
export type SwipeRead = 
/** Still pulling: how far toward the line, 0 to 1, and how far the pill lifts. */
{
    kind: "pull";
    progress: number;
    lift: number;
}
/** The finger crossed the line: fan the stack out. */
 | {
    kind: "open";
}
/** Pulling down: how far toward the tuck, 0 to 1. */
 | {
    kind: "tuck-pull";
    progress: number;
}
/** Far enough down: tuck the stack away. */
 | {
    kind: "tuck";
};
/**
 * Reads a claimed swipe at `y`.
 *
 * Progress runs from the end of the slop to the line, so the light under the
 * finger starts from nothing the moment the press is claimed and is full the
 * frame before the stack opens.
 */
export declare function readSwipe(start: SwipeStart, direction: -1 | 1, y: number): SwipeRead;
/**
 * Whether a press on the band beside the pill may start a swipe.
 *
 * The gaps beside the pill count, the strip under it does not: that strip runs
 * down into the bottom safe area, where the system's own home gesture starts.
 */
export declare function inSwipeBand(y: number, pillTop: number, pillBottom: number): boolean;
//# sourceMappingURL=stack-swipe.d.ts.map