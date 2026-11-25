"use client";
import { useEffect, useRef } from "react";
/** How long a finger rests on a row before it is a long press: mail's 450ms. */
export const LONG_PRESS_MS = 450;
/** How far the finger may drift and still be pressing, not scrolling. */
const MOVE_TOLERANCE_PX = 10;
/** How soon after the lift a click is the lifting finger's own, and swallowed after a long press. */
const LIFT_CLICK_MS = 700;
/**
 * A long press on a row, mail's: 450ms of a still finger, or a right click
 * with a mouse. It swallows the click the lifting finger makes, so the row
 * does not also open, and Android's own context menu, which fires for the
 * same hold.
 */
export function useLongPress(onLongPress) {
    const timer = useRef(null);
    const start = useRef(null);
    const fired = useRef(false);
    /** When the finger of a long press lifted. A click long after it is a new one. */
    const liftedAt = useRef(0);
    /** Whether this touch moved past the tolerance: it is a scroll, and the browser's menu for it is not a hold. */
    const moved = useRef(false);
    const latest = useRef(onLongPress);
    latest.current = onLongPress;
    const cancel = () => {
        if (timer.current)
            clearTimeout(timer.current);
        timer.current = null;
    };
    useEffect(() => cancel, []);
    if (!onLongPress)
        return {};
    return {
        onTouchStart: (event) => {
            fired.current = false;
            moved.current = false;
            const touch = event.touches[0];
            if (!touch || event.touches.length > 1) {
                // A second finger makes it a pinch or a two-finger scroll, not a hold.
                cancel();
                start.current = null;
                return;
            }
            start.current = { x: touch.clientX, y: touch.clientY };
            cancel();
            timer.current = setTimeout(() => {
                timer.current = null;
                if (!start.current)
                    return;
                fired.current = true;
                latest.current?.(start.current);
            }, LONG_PRESS_MS);
        },
        onTouchMove: (event) => {
            const touch = event.touches[0];
            if (start.current && touch && Math.hypot(touch.clientX - start.current.x, touch.clientY - start.current.y) > MOVE_TOLERANCE_PX) {
                cancel();
                start.current = null;
                moved.current = true;
            }
        },
        onTouchEnd: () => {
            cancel();
            start.current = null;
            moved.current = false;
            liftedAt.current = performance.now();
        },
        onTouchCancel: () => {
            cancel();
            start.current = null;
            fired.current = false;
            moved.current = false;
        },
        onContextMenu: (event) => {
            event.preventDefault();
            // The hold already answered; this is the browser's own menu for it.
            if (fired.current)
                return;
            // The browser's menu for a finger that went on to scroll.
            if (moved.current)
                return;
            // A browser that names the hold first: the timer has nothing left to do.
            cancel();
            if (start.current)
                fired.current = true;
            latest.current?.({ x: event.clientX, y: event.clientY });
        },
        onClickCapture: (event) => {
            if (!fired.current)
                return;
            fired.current = false;
            // A long press the browser followed with no click of its own: this
            // one is a new activation (a key, a mouse), and it runs.
            if (performance.now() - liftedAt.current > LIFT_CLICK_MS)
                return;
            event.preventDefault();
            event.stopPropagation();
        },
    };
}
//# sourceMappingURL=long-press.js.map