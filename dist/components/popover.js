"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { withClass } from "./cx.js";
import { ARROW_OFFSET_PX, PLAIN_OFFSET_PX } from "./menu.js";
/**
 * The family's popover: shadcn's Base UI popover on the same frosted surface
 * as the menu, with the same arrow at its control. It holds whatever the app
 * puts in it, 12px in; the width is the app's.
 *
 *   <Popover>
 *     <PopoverTrigger>Share</PopoverTrigger>
 *     <PopoverContent style={{ width: 288 }}>
 *       <PopoverTitle>Share this page</PopoverTitle>
 *       <PopoverDescription>Anyone with the link can read it.</PopoverDescription>
 *     </PopoverContent>
 *   </Popover>
 */
export function Popover(props) {
    return _jsx(PopoverPrimitive.Root, { ...props });
}
export function PopoverTrigger(props) {
    return _jsx(PopoverPrimitive.Trigger, { "data-slot": "popover-trigger", ...props });
}
export function PopoverContent({ align = "center", alignOffset = 0, side = "bottom", sideOffset, anchor, collisionPadding = 8, arrow = true, className, children, ...props }) {
    return (_jsx(PopoverPrimitive.Portal, { children: _jsx(PopoverPrimitive.Positioner, { className: "dl-menu-positioner", align: align, alignOffset: alignOffset, side: side, sideOffset: sideOffset ?? (arrow ? ARROW_OFFSET_PX : PLAIN_OFFSET_PX), anchor: anchor, collisionPadding: collisionPadding, children: _jsxs(PopoverPrimitive.Popup, { "data-slot": "popover-content", className: withClass("dl-popover", className), ...props, children: [arrow ? _jsx(PopoverPrimitive.Arrow, { className: "dl-menu-arrow" }) : null, children] }) }) }));
}
export function PopoverTitle({ className, ...props }) {
    return _jsx(PopoverPrimitive.Title, { "data-slot": "popover-title", className: withClass("dl-popover-title", className), ...props });
}
export function PopoverDescription({ className, ...props }) {
    return (_jsx(PopoverPrimitive.Description, { "data-slot": "popover-description", className: withClass("dl-popover-description", className), ...props }));
}
export function PopoverClose(props) {
    return _jsx(PopoverPrimitive.Close, { "data-slot": "popover-close", ...props });
}
//# sourceMappingURL=popover.js.map