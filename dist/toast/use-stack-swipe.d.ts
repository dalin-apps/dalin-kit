/**
 * Swiping the toast stack out of the bottom bar's nav pill, and back into it
 * (ported from the CS practice room redesign).
 *
 * A finger that lands on the pill, or in the gaps level with it, and travels
 * up past a line just above the pill fans the stack out. With the stack out, a
 * finger travelling down from the same place tucks it back. The tap band still
 * does both with a tap.
 *
 * The tap on a tab is the thing protected here. Nothing is decided on the way
 * down: no `preventDefault`, no timer, no pointer capture. A press only
 * becomes a swipe once it has travelled the slop in `stack-swipe.ts`,
 * which a tap never does, so the click that switches tabs reaches the tab
 * exactly as it did before this existed. Capture is taken at the claim and
 * only for a mouse. A touch is already captured by the element it started on,
 * which is what keeps the moves arriving after the finger leaves the pill, and
 * taking capture on the way down would retarget the release and swallow the
 * tap.
 *
 * The pill is painted, never re-rendered. The pull's progress, the finger's
 * place along the pill and the lift are custom properties written on the pill
 * itself and on Sonner's list. On the root they would be inherited by every
 * element on the page and restyle it each frame.
 *
 * What the app's bottom bar owes this hook: the pill carries `data-dl-pill`
 * (or the app passes its own selector as `pill`), spreads the returned
 * handlers, and sets `touch-action: none`. What the hook writes on the pill
 * for the app's own stylesheet to draw: `data-pull="on"` while a finger pulls
 * and `data-pull="swell"` for 460ms once the stack moves, with `--pull` (0 to
 * 1), `--pull-x` (the finger's place along the pill) and `--pull-lift` (px).
 *
 * Three things an app may add (StackSwipeHost). `liftTarget` names a second
 * element that gets `--pull-lift` too, for a piece beside the pill that rises
 * with it. `onFan` and `onTuck` are the two ticks apart, for an app whose
 * haptics differ by direction. And `pullOn` says when the matched pill draws
 * the pull at all: where another bar can stand in the pill's place and draws
 * none, the hook writes nothing and the peeking cards stay down with it.
 *
 * @see `stack-swipe.ts`, what a drag means
 * @see `toast-band.tsx`, the gaps beside the pill
 */
import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
/** The nav pill, when the app does not name its own. */
export declare const DEFAULT_PILL_SELECTOR = "[data-dl-pill]";
/** What differs from app to app, shared by the pill's swipe and the band. */
export type StackSwipeHost = {
    /** A selector for the bottom bar's nav pill. Defaults to `[data-dl-pill]`. */
    pill?: string;
    /**
     * Called once each time the stack fans out or tucks under a finger, for the
     * app's own haptic tick. Nothing is played when it is left out.
     */
    onTick?: () => void;
    /**
     * The tick for the stack fanning out alone, in place of `onTick`. For an
     * app whose haptics differ by direction: something arriving, something
     * leaving.
     */
    onFan?: () => void;
    /** The tick for the stack tucking away alone, in place of `onTick`. */
    onTuck?: () => void;
    /**
     * A selector for a second element that gets `--pull-lift` as the pill
     * does, and loses it with the pill: a piece of the bar beside the pill that
     * should rise with it under a pull.
     */
    liftTarget?: string;
    /**
     * A selector the matched pill must also match to draw the pull. For a bar
     * whose middle piece is not always the pill (a selection bar that swaps in
     * and draws no lens): while the piece does not match, the swipe still fans
     * and tucks the stack, but nothing is written on the piece and the peeking
     * cards do not lift, since there is no lift for them to follow. Left out,
     * the pill always draws.
     */
    pullOn?: string;
    /**
     * Whether motion is reduced right now. Left out, it is the kit's one
     * answer (helpers/motion.ts): the app's reader if it named one with
     * `setMotionReader`, else the switch the `<Toaster>` was handed as
     * selectors, else the system's setting. So an app that has told the
     * `<Toaster>` about its switch passes nothing here.
     */
    reducedMotion?: () => boolean;
};
export type StackSwipeOptions = StackSwipeHost & {
    /**
     * Where the handlers are spread. The pill takes a press anywhere on it; the
     * band only one level with the pill, since the strip under it runs into the
     * system's home gesture.
     */
    zone: "pill" | "band";
};
export type StackSwipe = {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
    /**
     * Swallows a click that arrives just after a claimed swipe, before the next
     * press. Browsers send none for a touch that travelled; this is the
     * backstop, spread as `onClickCapture` so it runs before the tab's own
     * handler does.
     */
    onClickCapture: (event: ReactMouseEvent<HTMLElement>) => void;
};
/**
 * The app's tick for the stack moving: its own tick for that direction when
 * it has one, else the one tick for both.
 */
export declare function stackTick(host: StackSwipeHost, open: boolean): void;
/** Reads a drag on the pill or the gaps beside it as the toast stack's swipe. */
export declare function useStackSwipe({ zone, pill, onTick, onFan, onTuck, liftTarget, pullOn, reducedMotion, }: StackSwipeOptions): StackSwipe;
//# sourceMappingURL=use-stack-swipe.d.ts.map