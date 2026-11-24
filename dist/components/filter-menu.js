"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
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
 * control ends.
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
    const setOpen = (next) => {
        setOpenState(next);
        onOpenChange?.(next);
        if (!next) {
            setPage(null);
            onFacetOpen?.(null);
        }
    };
    const openPage = (key) => {
        setPage(key);
        onFacetOpen?.(key);
    };
    const trigger = (_jsxs(MenuTrigger, { "aria-label": label, "data-slot": "filter-trigger", "data-variant": variant, "data-on": dot ? "" : undefined, className: cx("dl-filter", className), onMouseDown: (e) => e.preventDefault(), children: [_jsx(FilterGlyph, {}), dot ? _jsx("span", { "aria-hidden": "true", "data-slot": "filter-dot", className: "dl-filter-dot", style: { background: dot } }) : null] }));
    const rest = groups
        .filter((group) => group.length > 0)
        .map((group, i) => _jsx(MenuGroupRows, { rule: i > 0, rows: group }, i));
    return (_jsxs(Menu, { open: open, onOpenChange: setOpen, children: [tooltip ? tooltip(trigger, label) : trigger, _jsx(MenuContent, { align: align, className: cx("dl-filter-menu", menuClassName), "data-variant": variant, finalFocus: finalFocus, children: shown ? (_jsxs(_Fragment, { children: [_jsxs(MenuItem, { closeOnClick: false, className: "dl-filter-back", onClick: () => openPage(null), children: [_jsx(ChevronLeftGlyph, {}), shown.label] }), _jsx(MenuSeparator, {}), _jsx(FacetRows, { facet: shown })] })) : (_jsxs(_Fragment, { children: [choice ? (_jsxs(_Fragment, { children: [_jsxs(MenuGroup, { children: [_jsx(MenuLabel, { children: choice.label }), _jsx(MenuRadioGroup, { value: choice.value, onValueChange: (value) => choice.onChange(String(value)), children: choice.options.map((option) => (_jsx(MenuRadioItem, { value: option.value, closeOnClick: choice.closes || undefined, children: option.label }, option.value))) })] }), facets.length || groups.some((g) => g.length) ? _jsx(MenuSeparator, {}) : null] })) : null, facets.map((facet) => phone ? (_jsxs(MenuItem, { closeOnClick: false, onClick: () => openPage(facet.key), children: [_jsx("span", { className: "dl-filter-text", children: facet.label }), _jsx(ChevronRightGlyph, { className: "dl-menu-end dl-menu-chevron" })] }, facet.key)) : (_jsxs(MenuSub, { onOpenChange: (next) => (next ? onFacetOpen?.(facet.key) : undefined), children: [_jsx(MenuSubTrigger, { children: facet.label }), _jsx(MenuSubContent, { className: "dl-filter-sub", children: _jsx(FacetRows, { facet: facet }) })] }, facet.key))), rest] })) })] }));
}
function MenuGroupRows({ rule, rows }) {
    return (_jsxs(_Fragment, { children: [rule ? _jsx(MenuSeparator, {}) : null, rows.map((option) => (_jsx(OptionRow, { option: option }, option.key)))] }));
}
//# sourceMappingURL=filter-menu.js.map