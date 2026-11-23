"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
import { createPortal } from "react-dom";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { useRender } from "@base-ui/react/use-render";
import { withClass } from "./cx.js";
/** How long a finger rests on the trigger before the menu opens: Base UI's own. */
const LONG_PRESS_MS = 500;
/** How far that finger may move and still be a long press. */
const LONG_PRESS_MOVE_PX = 10;
/** Null under `modal`, where Base UI's own context menu is in charge. */
const PlainContext = createContext(null);
/**
 * The family's context menu: the same frosted menu, opened at the pointer by
 * a right click or a long press. It has no arrow, since it is anchored to
 * nothing, and it opens at once, since it is used too often to wait on
 * (menu.css).
 *
 * It is not modal. Base UI's context menu always is: it lays a layer over
 * the page, so a second right click, or a click on another row, only closed
 * the menu, and the page could not scroll under it. Base UI takes no `modal`
 * for it, so this one is its Menu opened at a point: the same parts, keys
 * and submenus, with the page left alone. Pass `modal` for Base UI's own.
 *
 * Its rows are the menu's own (`MenuItem`, `MenuSeparator`, `MenuShortcut`,
 * `MenuLabel`, `MenuSub` and the rest, from menu.tsx).
 *
 *   <ContextMenu>
 *     <ContextMenuTrigger render={<li className="row" />}>...</ContextMenuTrigger>
 *     <ContextMenuContent>
 *       <MenuItem onClick={reply}><ReplyIcon /> Reply</MenuItem>
 *       <MenuSeparator />
 *       <MenuItem variant="destructive" onClick={archive}>
 *         <ArchiveIcon /> Archive <MenuShortcut keys={["E"]} />
 *       </MenuItem>
 *     </ContextMenuContent>
 *   </ContextMenu>
 */
export function ContextMenu({ modal = false, ...props }) {
    return modal ? _jsx(ContextMenuPrimitive.Root, { ...props }) : _jsx(PlainContextMenu, { ...props });
}
function PlainContextMenu({ open: openProp, defaultOpen = false, onOpenChange, disabled = false, children, ...props }) {
    const [ownOpen, setOwnOpen] = useState(defaultOpen);
    const open = openProp ?? ownOpen;
    const [point, setPoint] = useState({ x: 0, y: 0, touch: false });
    const before = useRef(null);
    // The trigger Base UI asks for is drawn in <body>, once the page is there.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const change = useCallback((next, details) => {
        onOpenChange?.(next, details);
        if (details.isCanceled)
            return;
        if (openProp === undefined)
            setOwnOpen(next);
    }, [openProp, onOpenChange]);
    const anchor = useMemo(() => ({
        // A finger hides the point under it, so a touch gets a little room.
        getBoundingClientRect: () => DOMRect.fromRect({ x: point.x, y: point.y, width: point.touch ? 10 : 0, height: point.touch ? 10 : 0 }),
    }), [point]);
    const openAt = useCallback((x, y, touch, event, trigger) => {
        const active = document.activeElement;
        before.current = active instanceof HTMLElement && active !== document.body ? active : null;
        setPoint({ x, y, touch });
        // Base UI makes its own details for a change it starts. This one the
        // trigger started, so it says the same things in the same shape.
        let canceled = false;
        const details = {
            reason: "trigger-press",
            event,
            trigger,
            cancel: () => {
                canceled = true;
            },
            allowPropagation: () => { },
            get isCanceled() {
                return canceled;
            },
            isPropagationAllowed: false,
        };
        change(true, details);
    }, [change]);
    const returnFocus = useCallback(() => {
        // Back to what had focus before the menu opened. With nothing to go
        // back to, focus is left where it falls: the hidden trigger never
        // takes it.
        const to = before.current;
        return to && to.isConnected ? to : false;
    }, []);
    const plain = useMemo(() => ({ open, disabled, anchor, openAt, returnFocus, mounted }), [open, disabled, anchor, openAt, returnFocus, mounted]);
    return (_jsx(PlainContext.Provider, { value: plain, children: _jsxs(MenuPrimitive.Root, { open: open, onOpenChange: change, disabled: disabled, modal: false, ...props, children: [mounted
                    ? createPortal(_jsx(MenuPrimitive.Trigger, { render: _jsx("span", { hidden: true }), nativeButton: false, tabIndex: -1, "aria-hidden": "true", "data-slot": "context-menu-anchor" }), document.body)
                    : null, children] }) }));
}
/** The area a right click or long press opens the menu from. Renders a `<div>`; pass `render` for another element. */
export function ContextMenuTrigger(props) {
    const plain = useContext(PlainContext);
    return plain ? _jsx(PlainTrigger, { plain: plain, ...props }) : _jsx(ContextMenuPrimitive.Trigger, { "data-slot": "context-menu-trigger", ...props });
}
function PlainTrigger({ plain, render, ...elementProps }) {
    const press = useRef(null);
    const endPress = useCallback(() => {
        if (press.current)
            window.clearTimeout(press.current.timer);
        press.current = null;
    }, []);
    useEffect(() => endPress, [endPress]);
    const { disabled, openAt } = plain;
    return useRender({
        defaultTagName: "div",
        render: render,
        state: { open: plain.open },
        // The same mark Base UI's own trigger carries while its menu is open.
        stateAttributesMapping: { open: (value) => (value ? { "data-popup-open": "" } : null) },
        props: {
            "data-slot": "context-menu-trigger",
            ...elementProps,
            style: { WebkitTouchCallout: "none", ...elementProps.style },
            onContextMenu: (event) => {
                elementProps.onContextMenu?.(event);
                if (disabled || event.defaultPrevented)
                    return;
                // The browser's own menu stays shut, and an outer trigger does not open too.
                event.preventDefault();
                event.stopPropagation();
                endPress();
                openAt(event.clientX, event.clientY, false, event.nativeEvent, event.currentTarget);
            },
            // A long press, for a phone that sends no `contextmenu` (iOS).
            onTouchStart: (event) => {
                elementProps.onTouchStart?.(event);
                endPress();
                const touch = event.touches.length === 1 ? event.touches[0] : undefined;
                if (disabled || !touch)
                    return;
                const { clientX: x, clientY: y } = touch;
                const native = event.nativeEvent;
                const trigger = event.currentTarget;
                const timer = window.setTimeout(() => {
                    press.current = null;
                    openAt(x, y, true, native, trigger);
                }, LONG_PRESS_MS);
                press.current = { x, y, timer };
            },
            onTouchMove: (event) => {
                elementProps.onTouchMove?.(event);
                const touch = event.touches[0];
                if (!press.current || !touch)
                    return;
                const moved = Math.max(Math.abs(touch.clientX - press.current.x), Math.abs(touch.clientY - press.current.y));
                if (moved > LONG_PRESS_MOVE_PX)
                    endPress();
            },
            onTouchEnd: (event) => {
                elementProps.onTouchEnd?.(event);
                endPress();
            },
            onTouchCancel: (event) => {
                elementProps.onTouchCancel?.(event);
                endPress();
            },
        },
    });
}
/** The context menu's surface, at the pointer. No arrow. */
export function ContextMenuContent({ align, alignOffset, side, sideOffset, collisionPadding = 8, className, children, finalFocus, ...props }) {
    const plain = useContext(PlainContext);
    if (!plain) {
        return (_jsx(ContextMenuPrimitive.Portal, { children: _jsx(ContextMenuPrimitive.Positioner, { className: "dl-menu-positioner", align: align, alignOffset: alignOffset, side: side, sideOffset: sideOffset, collisionPadding: collisionPadding, children: _jsx(ContextMenuPrimitive.Popup, { "data-slot": "context-menu-content", className: withClass("dl-menu dl-context-menu", className), finalFocus: finalFocus, ...props, children: _jsx("div", { className: "dl-menu-list", children: children }) }) }) }));
    }
    if (!plain.mounted)
        return null;
    // Base UI's own placement for a context menu: from the point's corner,
    // a little over it, so the pointer starts inside the surface's edge.
    const placed = side === undefined && (align ?? "start") !== "center";
    // Drawn from <body>, like the trigger above. Base UI leaves a menu that is
    // not modal two focus guards and a marker where its portal sits in the
    // tree, and here that is the app's own list or table.
    return createPortal(_jsx(MenuPrimitive.Portal, { children: _jsx(MenuPrimitive.Positioner, { className: "dl-menu-positioner", anchor: plain.anchor, positionMethod: "fixed", align: align ?? "start", alignOffset: alignOffset ?? (placed ? 2 : 0), side: side ?? "bottom", sideOffset: sideOffset ?? (placed ? -5 : 0), collisionPadding: collisionPadding, children: _jsx(MenuPrimitive.Popup, { "data-slot": "context-menu-content", className: withClass("dl-menu dl-context-menu", className), finalFocus: finalFocus ?? plain.returnFocus, ...props, children: _jsx("div", { className: "dl-menu-list", children: children }) }) }) }), document.body);
}
//# sourceMappingURL=context-menu.js.map