"use client";
import { useEffect, useRef } from "react";
/** How long a finger rests on a row before it is a long press: mail's 450ms. */
export const LONG_PRESS_MS = 450;
/** How far the finger may drift and still be pressing, not scrolling. */
const MOVE_TOLERANCE_PX = 10;
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
            const touch = event.touches[0];
            if (!touch || event.touches.length > 1)
                return;
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
            if (start.current && touch && Math.hypot(touch.clientX - start.current.x, touch.clientY - start.current.y) > MOVE_TOLERANCE_PX)
                cancel();
        },
        onTouchEnd: () => {
            cancel();
            start.current = null;
        },
        onTouchCancel: () => {
            cancel();
            start.current = null;
        },
        onContextMenu: (event) => {
            event.preventDefault();
            // The hold already answered; this is the browser's own menu for it.
            if (fired.current)
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
            event.preventDefault();
            event.stopPropagation();
        },
    };
}
//# sourceMappingURL=long-press.js.map