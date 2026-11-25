"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { registerToastDock } from "../toast/toast-dock.js";
import { pushBackEntry } from "./back-entry.js";
import { cx } from "./cx.js";
import { SearchGlyph } from "./icons.js";
import { useLongPress } from "./long-press.js";
import { RowMenu, pointAnchor } from "./palette-menu.js";
import { matchParts, scoreParts } from "./palette-match.js";
import { usePaletteResults } from "./palette-results.js";
import { useToasterTab } from "./toaster-tab.js";
/** A person's circle as a row's lead: 28px, white initials. */
export function PhoneSearchAvatar({ initials, color, className }) {
    return (_jsx("span", { className: cx("dl-phone-search-avatar", className), style: color ? { background: color } : undefined, "aria-hidden": "true", children: initials }));
}
/**
 * What a tap on the field leaves alone: a control of the app's own, in
 * `fieldStart` or `fieldEnd`. Anything else in the field (the glass, the
 * padding, the app's plain words) gives the caret to the input.
 */
const FIELD_CONTROL = "button, a[href], input, select, textarea, summary, label, [role='button'], [role='combobox'], [role='listbox'], [role='switch'], [role='checkbox'], [role='menuitem'], [contenteditable=''], [contenteditable='true'], [tabindex]:not([tabindex='-1'])";
/** Whether a press on the field landed on one of those controls. */
function onFieldControl(event) {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest(FIELD_CONTROL) ?? null;
    return control !== null && control !== event.currentTarget && event.currentTarget.contains(control);
}
/** How far a search sheet ranks as a toast dock: over the bar and a parked chip, with the other sheets. */
const COVER_RANK = 50;
/** A row's words with the query's words marked, or, for a row only the score found, the letters it took. */
function PhoneMarked({ text, query, byScore = false }) {
    return (byScore ? scoreParts(text, query) : matchParts(text, query)).map((part, index) => part.match ? (_jsx("mark", { className: "dl-phone-search-mark", children: part.text }, index)) : (part.text));
}
/** One of the kit's rows: a tap runs it, a long press opens its menu or the app's own hold. */
function PhoneRow({ title, subtitle, leading, meta, onTap, onHold, held, }) {
    const hold = useLongPress(onHold);
    return (_jsxs("button", { type: "button", className: "dl-phone-search-row", "data-held": held ? "" : undefined, onClick: onTap, ...hold, children: [leading, subtitle ? (_jsxs("span", { className: "dl-phone-search-two", children: [_jsx("b", { children: title }), _jsx("small", { children: subtitle })] })) : (_jsx("span", { className: "dl-phone-search-one", children: title })), meta !== undefined && meta !== null && meta !== false ? _jsx("span", { className: "dl-phone-search-meta", children: meta }) : null] }));
}
function Sections({ sections, choose, hold, heldKey, }) {
    return sections.map((section) => {
        const empty = !section.children && (!section.rows || section.rows.length === 0);
        if (empty)
            return null;
        const sectionKey = section.id ?? section.heading;
        return (_jsxs("section", { className: "dl-phone-search-section", children: [_jsx("h2", { className: "dl-phone-search-heading", children: section.heading }), section.children ??
                    section.rows.map((row) => {
                        const key = `${sectionKey}:${row.id}`;
                        return (_jsx(PhoneRow, { title: row.title, subtitle: row.subtitle, leading: row.leading, meta: row.meta, onTap: () => choose(row), onHold: hold(key, row), held: heldKey === key }, row.id));
                    })] }, sectionKey));
    });
}
/** The groups the sources and actions answered, as sections of the kit's rows with the query marked. */
function GroupSections({ groups, marks, byScore, choose, hold, heldKey, }) {
    return groups.map((group) => (_jsxs("section", { className: "dl-phone-search-section", children: [group.heading ? _jsx("h2", { className: "dl-phone-search-heading", children: group.heading }) : null, group.items.map((item) => {
                const key = `${group.id}:${item.id}`;
                const scored = byScore.has(item);
                return (_jsx(PhoneRow, { title: _jsx(PhoneMarked, { text: item.title, query: marks, byScore: scored }), subtitle: item.subtitle ? _jsx(PhoneMarked, { text: item.subtitle, query: marks }) : undefined, leading: item.icon, meta: item.meta, onTap: () => choose(item), onHold: hold(key, item), held: heldKey === key }, item.id));
            }), group.note ? _jsx("p", { className: "dl-phone-search-note", children: group.note }) : null] }, group.id)));
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
 * The results follow the on-screen keyboard: the sheet measures what the
 * keyboard covers (`visualViewport`) and phone.css pads the list by it, so
 * the last row scrolls clear of the keys.
 *
 * It owns the system's back while it is open (back-entry.ts): one history
 * entry, pushed as it opens. The back button or the back swipe closes
 * search, and Cancel, Escape or a row takes the entry off. A row's action
 * runs once the entry has gone, a moment after the tap: run first, a row
 * that opens a page would push its own entry, and that is the one the step
 * back would take. `systemBack={false}` leaves history alone.
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
export function PhoneSearch({ open, onOpenChange, systemBack = true, query: queryProp, onQueryChange, onSubmit, placeholder = "Search", cancelLabel = "Cancel", action, sections = NO_SECTIONS, results, sources, actions, actionsHeading = "Actions", narrowed = false, children, beforeQuery, covered = false, emptyText, fieldStart, fieldEnd, className, }) {
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
    // The sheet hides the bottom bar, so it is a cover for the toaster. Not
    // while it is itself covered: what is drawn over it owns the screen then.
    useEffect(() => {
        if (!sheet || covered)
            return;
        return registerToastDock(sheet, { kind: "cover", rank: COVER_RANK });
    }, [sheet, covered]);
    // The on-screen keyboard. A phone lays it over the page without resizing
    // it, so a sheet fixed to the screen keeps its full height and its last
    // rows sit under the keys. The visual viewport is what is left in view:
    // what it lacks of the window's height is the keyboard, written on the
    // sheet for phone.css to pad the results by. Nothing is written while
    // nothing is covered, so an app's own `--kb-inset` still applies.
    useEffect(() => {
        const view = window.visualViewport;
        if (!sheet || !view)
            return;
        const write = () => {
            // A pinch zoom shrinks the visual viewport too, and is no keyboard.
            const covered = view.scale > 1.01 ? 0 : Math.round(window.innerHeight - view.offsetTop - view.height);
            if (covered > 0)
                sheet.style.setProperty("--dl-phone-kb", `${covered}px`);
            else
                sheet.style.removeProperty("--dl-phone-kb");
        };
        write();
        view.addEventListener("resize", write);
        view.addEventListener("scroll", write);
        return () => {
            view.removeEventListener("resize", write);
            view.removeEventListener("scroll", write);
        };
    }, [sheet]);
    // A toast raised over the sheet keeps its Undo in reach of Tab.
    useToasterTab(open && !covered ? sheet : null);
    // The sheet's history entry. Kept in a ref and not tied to one effect's
    // cleanup: React's strict mode runs every effect twice as a tree mounts,
    // and an entry popped and pushed again in one task would lose the second
    // to the first's traversal.
    const backEntry = useRef(null);
    const closeRef = useRef(onOpenChange);
    closeRef.current = onOpenChange;
    useEffect(() => {
        if (open && systemBack) {
            backEntry.current ??= pushBackEntry(() => {
                backEntry.current = null;
                closeRef.current(false);
            });
        }
        else if (backEntry.current) {
            const entry = backEntry.current;
            backEntry.current = null;
            entry.pop();
        }
    }, [open, systemBack]);
    // An app that unmounts the sheet to close it (calendar) leaves no closed
    // render to pop from, so the entry goes as the sheet does. A microtask
    // later, so strict mode's unmount and remount in one task takes nothing.
    const mounted = useRef(false);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            queueMicrotask(() => {
                if (mounted.current)
                    return;
                const entry = backEntry.current;
                backEntry.current = null;
                entry?.pop();
            });
        };
    }, []);
    // The sources and actions, asked as the palette asks them.
    const searching = sources !== undefined || actions !== undefined;
    const answers = usePaletteResults({
        active: open && searching,
        query,
        sources: sources ?? NO_SOURCES,
        actions: actions ?? NO_ACTIONS,
        actionsHeading,
        actionsNeedWords: true,
    });
    const staleRef = useRef(answers.stale);
    staleRef.current = answers.stale;
    const choose = (row, fromList = false) => {
        // A row from an earlier query runs nothing.
        if (fromList && staleRef.current)
            return;
        const run = () => row.onSelect?.();
        if (row.keepOpen) {
            run();
            return;
        }
        const entry = backEntry.current;
        backEntry.current = null;
        onOpenChange(false);
        // With an entry of its own, the row runs once that entry has gone.
        if (entry)
            entry.pop(run);
        else
            run();
    };
    const chooseFromList = (row) => choose(row, true);
    // A row's menu, opened by a long press.
    const [menu, setMenu] = useState(null);
    const hold = (key, row) => {
        if (row.menu) {
            const entriesOf = row.menu;
            return (point) => {
                const entries = entriesOf();
                if (entries.length > 0)
                    setMenu({ key, entries, anchor: pointAnchor(point.x, point.y), at: Date.now() });
            };
        }
        return row.onLongPress;
    };
    if (!open && menu)
        setMenu(null);
    const asked = query.trim() !== "" || narrowed;
    const found = results?.some((section) => section.children || (section.rows && section.rows.length > 0)) ?? false;
    const answered = answers.answered ?? "";
    const settled = !answers.stale && answers.busy === 0;
    const groupList = (groups) => (_jsx("div", { className: "dl-phone-search-results", "data-stale": answers.stale ? "" : undefined, "aria-busy": answers.stale || answers.busy > 0 || undefined, children: _jsx(GroupSections, { groups: groups, marks: answered, byScore: answers.byScore, choose: chooseFromList, hold: hold, heldKey: menu?.key ?? null }) }));
    const emptyNote = (_jsx("p", { className: "dl-phone-search-note", children: emptyText ? emptyText(query.trim()) : query.trim() ? `No results for “${query.trim()}”.` : "No results." }));
    return (_jsx(Dialog.Root, { open: open, 
        // Covered, the sheet is no longer the screen: the page goes back to
        // what covers it, and nothing done there closes search.
        modal: !covered, disablePointerDismissal: covered, onOpenChange: (next, details) => {
            if (covered && !next) {
                details.cancel();
                details.allowPropagation();
                return;
            }
            onOpenChange(next, details);
        }, children: _jsx(Dialog.Portal, { children: _jsxs(Dialog.Popup, { ref: setSheet, "data-slot": "phone-search", className: cx("dl-phone-search", className), "aria-label": placeholder, initialFocus: input, "data-covered": covered ? "" : undefined, inert: covered, children: [_jsxs("form", { className: "dl-phone-search-head", role: "search", onSubmit: (event) => {
                            event.preventDefault();
                            onSubmit?.(query);
                        }, children: [_jsxs("div", { className: "dl-phone-search-field", 
                                // A press on a part that takes no focus would blur the input
                                // first, and a phone would drop its keyboard for a moment.
                                onMouseDown: (event) => {
                                    if (!onFieldControl(event))
                                        event.preventDefault();
                                }, onClick: (event) => {
                                    if (!onFieldControl(event))
                                        input.current?.focus({ preventScroll: true });
                                }, children: [_jsx(SearchGlyph, {}), fieldStart, _jsx("input", { ref: focusField, type: "search", className: "dl-phone-search-input", value: query, onChange: (event) => setQuery(event.target.value), placeholder: placeholder, "aria-label": placeholder, enterKeyHint: "search", autoComplete: "off", autoCorrect: "off", autoCapitalize: "none", spellCheck: false }), fieldEnd] }), _jsx(Dialog.Close, { className: "dl-phone-search-cancel", children: cancelLabel })] }), _jsx("div", { className: "dl-phone-search-body", children: asked ? (children ??
                            (found ? (_jsx(Sections, { sections: results, choose: choose, hold: hold, heldKey: menu?.key ?? null })) : results ? (emptyNote) : searching ? (answers.groups.length > 0 ? (groupList(answers.groups)) : settled && answers.answered !== null ? (emptyNote) : null) : null)) : (_jsxs(_Fragment, { children: [action ? (_jsxs("button", { type: "button", className: "dl-phone-search-row dl-phone-search-action", onClick: () => choose(action), children: [action.icon, _jsx("span", { className: "dl-phone-search-one", children: action.label })] })) : null, searching && answers.groups.length > 0 ? groupList(answers.groups) : null, _jsx(Sections, { sections: sections, choose: choose, hold: hold, heldKey: menu?.key ?? null }), beforeQuery] })) }), _jsx(RowMenu, { state: menu, onClose: () => setMenu(null), onRun: (entry) => choose(entry), className: "dl-phone-search-menu" })] }) }) }));
}
const NO_SECTIONS = [];
const NO_SOURCES = [];
const NO_ACTIONS = [];
//# sourceMappingURL=phone-search.js.map