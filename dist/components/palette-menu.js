"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import {} from "react";
import { Menu, MenuContent, MenuItem, MenuSeparator } from "./menu.js";
import { cx } from "./cx.js";
/** A zero-size box at a point, for a menu opened at the pointer. */
export function pointAnchor(x, y) {
    return { getBoundingClientRect: () => DOMRect.fromRect({ x, y, width: 0, height: 0 }) };
}
/** A point just under a row's start, for a menu opened from the keyboard. */
export function underAnchor(element) {
    const box = element.getBoundingClientRect();
    return pointAnchor(box.left + 24, box.bottom);
}
/**
 * A press that lands as the finger that long-pressed lifts is outside the
 * new menu. It must not close it.
 */
const LIFT_GRACE_MS = 700;
/**
 * The open row menu, if any: the family's frosted menu at a point, with no
 * arrow. One per list. `onRun` is told which entry ran, after the menu has
 * closed.
 */
export function RowMenu({ state, onClose, onRun, className, returnTo, }) {
    return (_jsx(Menu, { open: state !== null, modal: false, onOpenChange: (open, details) => {
            if (open)
                return;
            if (details.reason === "outside-press" && state && Date.now() - state.at < LIFT_GRACE_MS)
                return;
            onClose();
        }, children: _jsx(MenuContent, { anchor: state?.anchor, side: "bottom", align: "start", arrow: false, className: cx("dl-palette-menu", className), finalFocus: returnTo, children: state?.entries.map((entry, index) => entry === "separator" ? (_jsx(MenuSeparator, {}, `separator-${index}`)) : (_jsx(MenuItem, { variant: entry.destructive ? "destructive" : undefined, onClick: () => {
                    onClose();
                    onRun(entry);
                }, children: entry.label }, `${entry.label}-${index}`))) }) }));
}
//# sourceMappingURL=palette-menu.js.map