import { type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";
/** How long a finger rests on a row before it is a long press: mail's 450ms. */
export declare const LONG_PRESS_MS = 450;
/** The handlers a row spreads on itself for a long press. Empty when there is nothing to do on one. */
export type LongPressHandlers = {
    onTouchStart?: (event: ReactTouchEvent) => void;
    onTouchMove?: (event: ReactTouchEvent) => void;
    onTouchEnd?: () => void;
    onTouchCancel?: () => void;
    onContextMenu?: (event: ReactMouseEvent) => void;
    onClickCapture?: (event: ReactMouseEvent) => void;
};
/**
 * A long press on a row, mail's: 450ms of a still finger, or a right click
 * with a mouse. It swallows the click the lifting finger makes, so the row
 * does not also open, and Android's own context menu, which fires for the
 * same hold.
 */
export declare function useLongPress(onLongPress: ((point: {
    x: number;
    y: number;
}) => void) | undefined): LongPressHandlers;
//# sourceMappingURL=long-press.d.ts.map