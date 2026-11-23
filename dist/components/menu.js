"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayoutEffect, useRef } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cx, withClass } from "./cx.js";
import { CheckGlyph, ChevronRightGlyph } from "./icons.js";
import { Kbd } from "./kbd.js";
import { ariaKeyShortcuts } from "./key-names.js";
/**
 * The family's menu: shadcn's Base UI dropdown menu, restyled once and
 * shared. The parts and their props are Base UI's; what the kit adds is the
 * look (menu.css) and four habits:
 *
 * - `<MenuContent>` draws an arrow at its control. A menu is anchored, so it
 *   points at what opened it. Pass `arrow={false}` for one that should not.
 * - `<MenuItem variant="destructive">` is the red row.
 * - `<MenuShortcut keys>` puts keycaps at the row's right end, and says the
 *   shortcut on the row as `aria-keyshortcuts`.
 * - `<MenuLabel>` is a group's heading, written in sentence case. Base UI
 *   needs it inside a `<MenuGroup>`.
 *
 *   <Menu>
 *     <MenuTrigger>More</MenuTrigger>
 *     <MenuContent>
 *       <MenuItem onClick={reply}><ReplyIcon /> Reply</MenuItem>
 *       <MenuItem onClick={star}><StarIcon /> Star <MenuShortcut keys={["S"]} /></MenuItem>
 *       <MenuSeparator />
 *       <MenuItem variant="destructive" onClick={archive}><ArchiveIcon /> Archive</MenuItem>
 *     </MenuContent>
 *   </Menu>
 *
 * The same rows go in a `<ContextMenuContent>` (context-menu.tsx): a context
 * menu is this menu opened at the pointer, with no arrow.
 */
export function Menu(props) {
    return _jsx(MenuPrimitive.Root, { ...props });
}
export function MenuTrigger(props) {
    return _jsx(MenuPrimitive.Trigger, { "data-slot": "menu-trigger", ...props });
}
/** How far an anchored surface stands off its control: the arrow's height and a hair. */
export const ARROW_OFFSET_PX = 10;
/** The same for a surface with no arrow. */
export const PLAIN_OFFSET_PX = 4;
/** The menu's surface: portal, positioner, the frosted popup, its arrow and its rows. */
export function MenuContent({ align = "start", alignOffset = 0, side = "bottom", sideOffset, anchor, collisionPadding = 8, arrow = true, className, children, ...props }) {
    return (_jsx(MenuPrimitive.Portal, { children: _jsx(MenuPrimitive.Positioner, { className: "dl-menu-positioner", align: align, alignOffset: alignOffset, side: side, sideOffset: sideOffset ?? (arrow ? ARROW_OFFSET_PX : PLAIN_OFFSET_PX), anchor: anchor, collisionPadding: collisionPadding, children: _jsxs(MenuPrimitive.Popup, { "data-slot": "menu-content", className: withClass("dl-menu", className), ...props, children: [arrow ? _jsx(MenuPrimitive.Arrow, { className: "dl-menu-arrow" }) : null, _jsx("div", { className: "dl-menu-list", children: children })] }) }) }));
}
export function MenuGroup(props) {
    return _jsx(MenuPrimitive.Group, { "data-slot": "menu-group", ...props });
}
/** A group's heading. Write it in sentence case; the kit does not change its case. */
export function MenuLabel({ className, inset, ...props }) {
    return (_jsx(MenuPrimitive.GroupLabel, { "data-slot": "menu-label", "data-inset": inset ? "" : undefined, className: withClass("dl-menu-label", className), ...props }));
}
export function MenuItem({ className, variant = "default", inset, ...props }) {
    return (_jsx(MenuPrimitive.Item, { "data-slot": "menu-item", "data-variant": variant, "data-inset": inset ? "" : undefined, className: withClass("dl-menu-item", className), ...props }));
}
/** A row that is a link: it navigates, and opens in a new tab on a middle click as a link does. */
export function MenuLinkItem({ className, variant = "default", inset, ...props }) {
    return (_jsx(MenuPrimitive.LinkItem, { "data-slot": "menu-link-item", "data-variant": variant, "data-inset": inset ? "" : undefined, className: withClass("dl-menu-item", className), ...props }));
}
export function MenuCheckboxItem({ className, children, ...props }) {
    return (_jsxs(MenuPrimitive.CheckboxItem, { "data-slot": "menu-checkbox-item", className: withClass("dl-menu-item", className), ...props, children: [children, _jsx(MenuPrimitive.CheckboxItemIndicator, { className: "dl-menu-end", children: _jsx(CheckGlyph, {}) })] }));
}
export function MenuRadioGroup(props) {
    return _jsx(MenuPrimitive.RadioGroup, { "data-slot": "menu-radio-group", ...props });
}
export function MenuRadioItem({ className, children, ...props }) {
    return (_jsxs(MenuPrimitive.RadioItem, { "data-slot": "menu-radio-item", className: withClass("dl-menu-item", className), ...props, children: [children, _jsx(MenuPrimitive.RadioItemIndicator, { className: "dl-menu-end", children: _jsx(CheckGlyph, {}) })] }));
}
export function MenuSeparator({ className, ...props }) {
    return _jsx(MenuPrimitive.Separator, { "data-slot": "menu-separator", className: withClass("dl-menu-separator", className), ...props });
}
/**
 * A row's shortcut: keycaps at its right end. Renders nothing without a key.
 *
 * The caps are a picture, hidden from a screen reader: left in, a row named
 * "Star" would read "Star S". The shortcut is said on the row instead, as
 * its `aria-keyshortcuts`, which a screen reader announces as a shortcut.
 */
export function MenuShortcut({ keys, children, className, "aria-keyshortcuts": said, ...props }) {
    const caps = useRef(null);
    const none = (!keys || keys.length === 0) && (children === null || children === undefined || children === false);
    const drawn = keys && keys.length > 0 ? keys : typeof children === "string" || typeof children === "number" ? [String(children)] : [];
    const shortcut = none ? "" : (said ?? ariaKeyShortcuts(drawn));
    // The attribute belongs on the row, which is this part's ancestor and not
    // its own element, so it is written there as the caps mount.
    useLayoutEffect(() => {
        const row = caps.current?.closest('[role^="menuitem"]');
        if (!row || !shortcut)
            return;
        row.setAttribute("aria-keyshortcuts", shortcut);
        return () => row.removeAttribute("aria-keyshortcuts");
    }, [shortcut]);
    if (none)
        return null;
    return (_jsx("span", { ref: caps, "data-slot": "menu-shortcut", "aria-hidden": "true", className: cx("dl-menu-end", className), ...props, children: _jsx(Kbd, { keys: keys, children: children }) }));
}
export function MenuSub(props) {
    return _jsx(MenuPrimitive.SubmenuRoot, { ...props });
}
/** A row that opens a submenu: a chevron ends it. */
export function MenuSubTrigger({ className, inset, children, ...props }) {
    return (_jsxs(MenuPrimitive.SubmenuTrigger, { "data-slot": "menu-sub-trigger", "data-inset": inset ? "" : undefined, className: withClass("dl-menu-item", className), ...props, children: [children, _jsx(ChevronRightGlyph, { className: "dl-menu-end dl-menu-chevron" })] }));
}
/** A submenu's surface: beside its row, with no arrow. */
export function MenuSubContent({ align = "start", alignOffset = -5, side = "right", sideOffset = 2, arrow = false, ...props }) {
    return _jsx(MenuContent, { align: align, alignOffset: alignOffset, side: side, sideOffset: sideOffset, arrow: arrow, ...props });
}
//# sourceMappingURL=menu.js.map