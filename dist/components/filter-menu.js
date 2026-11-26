"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { cx } from "./cx.js";
import { CheckGlyph, ChevronLeftGlyph, ChevronRightGlyph, FilterGlyph } from "./icons.js";
import { Menu, MenuContent, MenuGroup, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger, } from "./menu.js";
/**
 * A count for a filter row, with "+" past a cap: "1,000+". Pass `capped`
 * when the server stopped counting.
 */
export function filterCount(count, capped = false) {
    if (count === undefined)
        return "";
    return capped ? `${count.toLocaleString()}+` : count.toLocaleString();
}
function OptionRow({ option }) {
    const count = option.count;
    return (_jsxs(MenuItem, { onClick: option.onSelect, children: [_jsx("span", { className: "dl-filter-text", children: option.label }), option.checked ? (_jsx(CheckGlyph, { className: "dl-menu-end" })) : count !== undefined && count !== null && count !== "" ? (_jsx("span", { className: "dl-filter-count", children: count })) : null] }));
}
function FacetRows({ facet }) {
    if (!facet.options?.length)
        return _jsx(MenuItem, { disabled: true, children: facet.empty ?? "No matches" });
    return facet.options.map((option) => _jsx(OptionRow, { option: option }, option.key));
}
/**
 * The family's filter control: the filter glyph, ending a search field or a
 * palette's input, and the menu it opens. Mail's search filter made general,
 * so any app can offer the same control.
 *
 * The menu holds, in order: an optional choice (a radio group under its
 * label), the facets (a submenu each on a computer, a page each on a
 * phone), then groups of plain rows. A row adds its filter through its own
 * `onSelect`; the app keeps the query, so the kit holds no filter state.
 *
 * The glyph stands alone, with no box behind it. It turns white and draws
 * its filled form under the pointer, while the menu is open, and while a
 * filter is on, when a dot in `dot`'s colour sits at its top right.
 *
 * A press keeps focus where it was, so the caret stays in the field the
 * control ends, and focus goes back there as the menu closes, so the next
 * word typed lands in the field. Opened from the keyboard, focus goes back
 * to the glyph.
 *
 *   <FilterMenu
 *     label="Filters"
 *     facets={[{ key: "from", label: "From", options: senders }]}
 *     onFacetOpen={setCounting}
 *     groups={[[{ key: "unread", label: "Unread", count: filterCount(n), onSelect: () => add("is:unread") }]]}
 *   />
 */
export function FilterMenu({ label = "Filters", dot = null, choice, facets = [], onFacetOpen, groups = [], variant = "desktop", open: openProp, onOpenChange, tooltip, align = "end", className, menuClassName, finalFocus, }) {
    const [openState, setOpenState] = useState(false);
    const open = openProp ?? openState;
    const [page, setPage] = useState(null);
    const phone = variant === "phone";
    const shown = phone && page ? facets.find((f) => f.key === page) ?? null : null;
    // What had focus as the menu opened: the field the control ends, since a
    // press on the glyph leaves the caret there. Base UI hands focus back to
    // the glyph once the menu has left the page, and the glyph passes that on
    // to the field, so the next word typed lands there. A function in
    // `finalFocus` would send focus to the field whatever had taken it since,
    // so this is done on the glyph's focus instead.
    //
    // `owed` says a close still has that return coming. It is set as the menu
    // starts to close and ends with the first of three things: the glyph takes
    // focus (the return, passed on), the menu opens again, or the menu has
    // left and Base UI has had its turn (`<MenuGone>`, which covers a close
    // that sends the glyph nothing, such as Tab out of the menu). After that
    // the glyph keeps any focus it is given, so the reader's own Tab reaches
    // it. Nothing here is timed: until 0.14.1 the return was owed for 400ms
    // from the close, and a menu that took longer to leave on a loaded machine
    // left focus on the glyph.
    const before = useRef(null);
    const owed = useRef(false);
    const setOpen = (next) => {
        if (next) {
            const active = typeof document === "undefined" ? null : document.activeElement;
            before.current = active instanceof HTMLElement && active !== document.body ? active : null;
        }
        owed.current = !next;
        setOpenState(next);
        onOpenChange?.(next);
        if (!next) {
            setPage(null);
            onFacetOpen?.(null);
        }
    };
    const passFocusOn = (e) => {
        const field = before.current;
        if (!owed.current || finalFocus !== undefined)
            return;
        owed.current = false;
        // Opened from the keyboard, focus was on the glyph, and it stays there.
        if (!field || field === e.currentTarget || !field.isConnected)
            return;
        field.focus({ preventScroll: true });
    };
    const openPage = (key) => {
        setPage(key);
        onFacetOpen?.(key);
    };
    const trigger = (_jsxs(MenuTrigger, { "aria-label": label, "data-slot": "filter-trigger", "data-variant": variant, "data-on": dot ? "" : undefined, className: cx("dl-filter", className), onMouseDown: (e) => e.preventDefault(), onFocus: passFocusOn, children: [_jsx(FilterGlyph, {}), dot ? _jsx("span", { "aria-hidden": "true", "data-slot": "filter-dot", className: "dl-filter-dot", style: { background: dot } }) : null] }));
    const rest = groups
        .filter((group) => group.length > 0)
        .map((group, i) => _jsx(MenuGroupRows, { rule: i > 0, rows: group }, i));
    return (_jsxs(Menu, { open: open, onOpenChange: setOpen, children: [tooltip ? tooltip(trigger, label) : trigger, _jsxs(MenuContent, { align: align, className: cx("dl-filter-menu", menuClassName), "data-variant": variant, finalFocus: finalFocus, children: [_jsx(MenuGone, { owed: owed }), shown ? (_jsxs(_Fragment, { children: [_jsxs(MenuItem, { closeOnClick: false, className: "dl-filter-back", onClick: () => openPage(null), children: [_jsx(ChevronLeftGlyph, {}), shown.label] }), _jsx(MenuSeparator, {}), _jsx(FacetRows, { facet: shown })] })) : (_jsxs(_Fragment, { children: [choice ? (_jsxs(_Fragment, { children: [_jsxs(MenuGroup, { children: [_jsx(MenuLabel, { children: choice.label }), _jsx(MenuRadioGroup, { value: choice.value, onValueChange: (value) => choice.onChange(String(value)), children: choice.options.map((option) => (_jsx(MenuRadioItem, { value: option.value, closeOnClick: choice.closes || undefined, children: option.label }, option.value))) })] }), facets.length || groups.some((g) => g.length) ? _jsx(MenuSeparator, {}) : null] })) : null, facets.map((facet) => phone ? (_jsxs(MenuItem, { closeOnClick: false, onClick: () => openPage(facet.key), children: [_jsx("span", { className: "dl-filter-text", children: facet.label }), _jsx(ChevronRightGlyph, { className: "dl-menu-end dl-menu-chevron" })] }, facet.key)) : (_jsxs(MenuSub, { onOpenChange: (next) => (next ? onFacetOpen?.(facet.key) : undefined), children: [_jsx(MenuSubTrigger, { children: facet.label }), _jsx(MenuSubContent, { className: "dl-filter-sub", children: _jsx(FacetRows, { facet: facet }) })] }, facet.key))), rest] }))] })] }));
}
/**
 * Ends a focus return nobody collected. It is mounted in the menu, so its
 * cleanup runs as the menu leaves the page. Base UI returns focus in a
 * microtask it queues from a layout cleanup of that same commit; a passive
 * cleanup runs after every layout one, so the microtask queued here runs
 * after Base UI's, and the glyph has had its focus by then if any was coming.
 */
function MenuGone({ owed }) {
    useEffect(() => () => {
        queueMicrotask(() => {
            owed.current = false;
        });
    }, [owed]);
    return null;
}
function MenuGroupRows({ rule, rows }) {
    return (_jsxs(_Fragment, { children: [rule ? _jsx(MenuSeparator, {}) : null, rows.map((option) => (_jsx(OptionRow, { option: option }, option.key)))] }));
}
//# sourceMappingURL=filter-menu.js.map