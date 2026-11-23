"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { DALIN_APPS, dalinApp } from "./apps.js";
import { withClass } from "./cx.js";
import { CheckGlyph } from "./icons.js";
import { MenuContent, MenuLinkItem } from "./menu.js";
import { Wordmark } from "./wordmark.js";
/** How long the pointer rests on the wordmark before the menu opens, and how long it may leave before it closes. */
const HOVER_OPEN_MS = 150;
const HOVER_CLOSE_MS = 150;
/**
 * The family switcher: the app's wordmark as the way to the other three.
 *
 * Nothing shows at rest; the wordmark is the wordmark. Pointing at it, or
 * pressing it, opens the family's frosted menu under it, with an arrow. The
 * menu lists the four apps as their own wordmarks, each period in that
 * app's accent, with a check on the app you are in. Every row is a link to
 * the app, so a middle click or a long press does what it does on a link.
 *
 * From the keyboard the wordmark is a button: Enter or Space opens the
 * menu, the arrows move through it, Enter follows a row, and Escape closes
 * it and returns focus to the wordmark.
 *
 * It takes the wordmark's own `size`, `folded` and `rollOut`, so it goes
 * where the sidebar's `<Wordmark>` was. It needs menu.css and wordmark.css.
 */
export function FamilySwitcher({ app, size, folded, rollOut, label = "Switch app", hrefs, className, side = "bottom", align = "start", }) {
    return (
    // Not modal: a menu that opens under a resting pointer must not lock the
    // page's scroll or take the pointer from the rest of the app.
    _jsxs(MenuPrimitive.Root, { modal: false, children: [_jsx(MenuPrimitive.Trigger, { "data-slot": "family-switcher", className: withClass("dl-switcher-trigger", className), "aria-label": `dalin. ${dalinApp(app).name}. ${label}`, openOnHover: true, delay: HOVER_OPEN_MS, closeDelay: HOVER_CLOSE_MS, children: _jsx(Wordmark, { app: app, size: size, folded: folded, rollOut: rollOut }) }), _jsx(MenuContent, { className: "dl-switcher", side: side, align: align, "aria-label": "dalin apps", children: DALIN_APPS.map((item) => {
                    const current = item.id === app;
                    return (_jsxs(MenuLinkItem, { href: hrefs?.[item.id] ?? item.href, "aria-current": current ? "page" : undefined, children: [_jsx(Wordmark, { app: item.id, accent: "own" }), current ? _jsx(CheckGlyph, { className: "dl-menu-end" }) : null] }, item.id));
                }) })] }));
}
//# sourceMappingURL=family-switcher.js.map