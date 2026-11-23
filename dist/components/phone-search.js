"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { registerToastDock } from "../toast/toast-dock.js";
import { cx } from "./cx.js";
import { SearchGlyph } from "./icons.js";
/** A person's circle as a row's lead: 28px, white initials. */
export function PhoneSearchAvatar({ initials, color, className }) {
    return (_jsx("span", { className: cx("dl-phone-search-avatar", className), style: color ? { background: color } : undefined, "aria-hidden": "true", children: initials }));
}
/** How far a search sheet ranks as a toast dock: over the bar and a parked chip, with the other sheets. */
const COVER_RANK = 50;
function Sections({ sections, choose, }) {
    return sections.map((section) => {
        const empty = !section.children && (!section.rows || section.rows.length === 0);
        if (empty)
            return null;
        return (_jsxs("section", { className: "dl-phone-search-section", children: [_jsx("h2", { className: "dl-phone-search-heading", children: section.heading }), section.children ??
                    section.rows.map((row) => (_jsxs("button", { type: "button", className: "dl-phone-search-row", onClick: () => choose(row), children: [row.leading, row.subtitle ? (_jsxs("span", { className: "dl-phone-search-two", children: [_jsx("b", { children: row.title }), _jsx("small", { children: row.subtitle })] })) : (_jsx("span", { className: "dl-phone-search-one", children: row.title }))] }, row.id)))] }, section.id ?? section.heading));
    });
}
/**
 * The phone's search, the same in all four apps: a full-screen sheet that
 * opens with the caret already in the field.
 *
 * The header's magnifying glass opens it. It covers the screen and the
 * bottom bar, with the field where the title was and Cancel at its right.
 * Before a word is typed it shows what calendar's search shows: the app's
 * create action as a row in the accent, then the app's sections (what is
 * recent or coming up, then people or places). Once there is a query it
 * shows the app's results.
 *
 * The field takes focus as it mounts, which React does as the tap's own
 * handler returns, before any timer or frame. That is what lets a phone
 * raise its keyboard. The sheet opens and closes at once, with no slide:
 * the keyboard is already moving.
 *
 * The sheet tells the kit's toaster it covers the bar, so a toast raised
 * while it is open announces on the bottom edge and not under it. Nothing
 * else is needed for that.
 *
 *   <PhoneSearch
 *     open={open}
 *     onOpenChange={setOpen}
 *     placeholder="Search mail and people"
 *     action={{ label: "Compose", icon: <PenIcon />, onSelect: compose }}
 *     sections={[{ heading: "Recent", rows: recent }, { heading: "People", rows: people }]}
 *     results={results}
 *     onQueryChange={search}
 *   />
 */
export function PhoneSearch({ open, onOpenChange, query: queryProp, onQueryChange, onSubmit, placeholder = "Search", cancelLabel = "Cancel", action, sections = NO_SECTIONS, results, children, emptyText, fieldStart, fieldEnd, className, }) {
    const [ownQuery, setOwnQuery] = useState("");
    const query = queryProp ?? ownQuery;
    // The sheet's element as state: Base UI mounts it a commit after `open`
    // turns true, and the toaster's dock must be registered once it is there.
    const [sheet, setSheet] = useState(null);
    const input = useRef(null);
    const setQuery = useCallback((next) => {
        if (queryProp === undefined)
            setOwnQuery(next);
        onQueryChange?.(next);
    }, [queryProp, onQueryChange]);
    // Each opening starts from an empty field. Read in render, so the sheet
    // never paints one frame of the last search.
    const [wasOpen, setWasOpen] = useState(open);
    if (wasOpen !== open) {
        setWasOpen(open);
        if (open && queryProp === undefined && ownQuery !== "")
            setOwnQuery("");
    }
    // The caret goes in as the field mounts, which is as the tap's handler
    // returns. A phone raises its keyboard only for a focus that a touch
    // caused, and a focus set a frame later is too late for that.
    const focusField = useCallback((node) => {
        input.current = node;
        node?.focus({ preventScroll: true });
    }, []);
    // The sheet hides the bottom bar, so it is a cover for the toaster.
    useEffect(() => {
        if (!sheet)
            return;
        return registerToastDock(sheet, { kind: "cover", rank: COVER_RANK });
    }, [sheet]);
    const choose = (row) => {
        if (!row.keepOpen)
            onOpenChange(false);
        row.onSelect();
    };
    const asked = query.trim() !== "";
    const found = results?.some((section) => section.children || (section.rows && section.rows.length > 0)) ?? false;
    return (_jsx(Dialog.Root, { open: open, onOpenChange: onOpenChange, children: _jsx(Dialog.Portal, { children: _jsxs(Dialog.Popup, { ref: setSheet, "data-slot": "phone-search", className: cx("dl-phone-search", className), "aria-label": placeholder, initialFocus: input, children: [_jsxs("form", { className: "dl-phone-search-head", role: "search", onSubmit: (event) => {
                            event.preventDefault();
                            onSubmit?.(query);
                        }, children: [_jsxs("label", { className: "dl-phone-search-field", children: [_jsx(SearchGlyph, {}), fieldStart, _jsx("input", { ref: focusField, type: "search", className: "dl-phone-search-input", value: query, onChange: (event) => setQuery(event.target.value), placeholder: placeholder, "aria-label": placeholder, enterKeyHint: "search", autoComplete: "off", autoCorrect: "off", autoCapitalize: "none", spellCheck: false }), fieldEnd] }), _jsx(Dialog.Close, { className: "dl-phone-search-cancel", children: cancelLabel })] }), _jsx("div", { className: "dl-phone-search-body", children: asked ? (children ??
                            (found ? (_jsx(Sections, { sections: results, choose: choose })) : results ? (_jsx("p", { className: "dl-phone-search-note", children: emptyText ? emptyText(query.trim()) : `No results for “${query.trim()}”.` })) : null)) : (_jsxs(_Fragment, { children: [action ? (_jsxs("button", { type: "button", className: "dl-phone-search-row dl-phone-search-action", onClick: () => choose(action), children: [action.icon, _jsx("span", { className: "dl-phone-search-one", children: action.label })] })) : null, _jsx(Sections, { sections: sections, choose: choose })] })) })] }) }) }));
}
const NO_SECTIONS = [];
//# sourceMappingURL=phone-search.js.map