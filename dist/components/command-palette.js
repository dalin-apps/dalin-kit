"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import { startedFromKeyboard } from "../helpers/input-modality.js";
import { cx } from "./cx.js";
import { SearchGlyph } from "./icons.js";
import { Kbd } from "./kbd.js";
import { matchParts, matchesQuery } from "./palette-match.js";
import { useToasterTab } from "./toaster-tab.js";
/** Before the first answer: no list at all, the actions included, so nothing is on screen for a first group to land over. */
const NOTHING_SHOWN = { query: null, groups: [], late: [] };
const ACTIONS_ID = "dl:actions";
/**
 * How long a query's list waits for its slowest source. Past it the list is
 * shown without that source, whose group joins at the end when it answers.
 */
export const SOURCE_WAIT_MS = 400;
/** The keys that move the highlight. They do nothing while the list answers an earlier query. */
const MOVE_KEYS = new Set(["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);
/**
 * The Enter hint's cap: the return arrow, as the key itself is printed. One
 * 20px cap, so the slot it holds open on every row costs the row's date 30px
 * and no more. The word would hold 60px open.
 */
const ENTER_KEY = "\u21b5";
/** Whether a key press belongs to a field the reader is typing in. */
function inField(target) {
    if (!(target instanceof HTMLElement))
        return false;
    if (target.isContentEditable)
        return true;
    return target.matches("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='textbox']");
}
/** A row's text with the query's words marked. */
function Marked({ text, query }) {
    return matchParts(text, query).map((part, index) => part.match ? (_jsx("mark", { className: "dl-palette-mark", children: part.text }, index)) : (part.text));
}
/**
 * The family's command palette: one field over grouped results, opened with
 * Ctrl K and the app's own key.
 *
 * It is a Base UI Dialog holding an inline Autocomplete, 600px wide and
 * frosted, with the app dimmed behind it. Results come in groups under
 * sentence-case headings, with the words of the query marked in each row.
 * The arrows move the focus, which always rests on a row, and that row
 * shows an Enter hint (the return arrow, as a keycap) where its own
 * shortcut would be, with the row's verb before it where the row names
 * one ("Reveal"). Enter runs it, Escape closes the palette, and so does a
 * press outside it.
 *
 * The app supplies what it searches (`sources`) and what it can do
 * (`actions`); the palette owns the field, the keys, the grouping and the
 * look (palette.css, which needs menu.css for the keycap).
 *
 * Opened from the keyboard it lands at once, with no animation, and it
 * closes at once after a key. Opened by a press on a search button it
 * fades in over the family's 150ms.
 *
 * The list on screen always answers one query. A source may answer later,
 * and until every source has answered the query in the field, the last
 * list stays where it is, marked stale (`data-stale`): its rows run
 * nothing, the arrows move nothing, and Enter is held. When the answer
 * arrives the whole list changes at once and a held Enter runs its first
 * row. Typing again lets the held Enter go. A source slower than
 * `SOURCE_WAIT_MS` no longer holds the list back: the rest is shown, and
 * its group joins at the end, under the actions, so no row on screen moves
 * and the highlight stays on the row it was on.
 *
 *   <CommandPalette
 *     appKey="/"
 *     placeholder="Search pages and to-dos"
 *     sources={[{ id: "pages", heading: "Pages", search: searchPages }]}
 *     actions={[{ id: "new", title: "New page", keys: ["N"], onSelect: newPage }]}
 *   />
 */
export function CommandPalette({ open: openProp, onOpenChange, sources = NO_SOURCES, actions = NO_ACTIONS, actionsHeading = "Actions", placeholder = "Search", label = "Command palette", emptyText, hotkey = true, appKey, className, }) {
    const [ownOpen, setOwnOpen] = useState(false);
    const open = openProp ?? ownOpen;
    const [query, setQuery] = useState("");
    const [shown, setShown] = useState(NOTHING_SHOWN);
    // How many sources have yet to answer the query in the field.
    const [busy, setBusy] = useState(0);
    // The row the highlight is on, for the hint's verb.
    const [active, setActive] = useState(undefined);
    // An Enter pressed while the list was stale, waiting for the answer.
    const heldEnter = useRef(false);
    const inputRef = useRef(null);
    // The panel's element as state: a toast over the dim keeps its action in
    // reach of Tab while the panel is up (toaster-tab.ts).
    const [panel, setPanel] = useState(null);
    useToasterTab(open ? panel : null);
    const hintId = useId();
    // Whether the palette lands, and leaves, without animation: the keyboard
    // opened it, or the last thing done in it was a key.
    const [instant, setInstant] = useState(false);
    const byKey = useRef(false);
    const setOpen = useCallback((next) => {
        if (openProp === undefined)
            setOwnOpen(next);
        onOpenChange?.(next);
    }, [openProp, onOpenChange]);
    // What opened it is read as it opens, in render, so the first frame of the
    // palette already knows whether to animate.
    const [wasOpen, setWasOpen] = useState(open);
    if (wasOpen !== open) {
        setWasOpen(open);
        if (open) {
            setInstant(byKey.current || startedFromKeyboard());
            byKey.current = false;
        }
        else {
            // The next opening starts from an empty field.
            setQuery("");
            setShown(NOTHING_SHOWN);
            setBusy(0);
            heldEnter.current = false;
        }
    }
    // Ctrl K, and the app's own key.
    const openRef = useRef(open);
    openRef.current = open;
    const appKeys = useMemo(() => (appKey === undefined ? [] : typeof appKey === "string" ? [appKey] : [...appKey]), [appKey]);
    useEffect(() => {
        if (!hotkey && appKeys.length === 0)
            return;
        const onKey = (event) => {
            if (event.defaultPrevented || event.isComposing || event.altKey)
                return;
            const mod = event.metaKey || event.ctrlKey;
            if (hotkey && mod && !event.shiftKey && event.key.toLowerCase() === "k") {
                event.preventDefault();
                byKey.current = !openRef.current;
                setInstant(true);
                setOpen(!openRef.current);
            }
            else if (!mod && !openRef.current && appKeys.includes(event.key) && !inField(event.target)) {
                event.preventDefault();
                byKey.current = true;
                setOpen(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [hotkey, appKeys, setOpen]);
    // Ask every source. A layout effect, so what the sources answer at once
    // is in the first frame the palette paints. The list is shown whole, once
    // every source has answered this query, so no group lands over rows that
    // are already on screen and moves the highlight off its row.
    useLayoutEffect(() => {
        if (!open)
            return;
        const controller = new AbortController();
        const answers = new Map();
        let out = 0;
        let shownYet = false;
        const show = () => {
            shownYet = true;
            setShown({
                query,
                groups: sources
                    .filter((source) => answers.has(source.id))
                    .map((source) => ({ id: source.id, heading: source.heading, items: answers.get(source.id) })),
                late: [],
            });
        };
        const settle = (source, items) => {
            if (controller.signal.aborted)
                return;
            out -= 1;
            setBusy(out);
            if (!shownYet) {
                answers.set(source.id, items);
                if (out === 0)
                    show();
                return;
            }
            // The list went up without this source. Its group joins at the end.
            setShown((prev) => prev.query === query ? { ...prev, late: [...prev.late, { id: source.id, heading: source.heading, items }] } : prev);
        };
        for (const source of sources) {
            let answer;
            try {
                answer = source.search(query, controller.signal);
            }
            catch {
                answer = [];
            }
            if (Array.isArray(answer)) {
                answers.set(source.id, answer);
                continue;
            }
            out += 1;
            answer.then((items) => settle(source, items), 
            // A search that failed shows nothing, the same as one that found nothing.
            () => settle(source, []));
        }
        setBusy(out);
        if (out === 0) {
            show();
            return () => controller.abort();
        }
        const wait = window.setTimeout(() => {
            if (!shownYet && !controller.signal.aborted)
                show();
        }, SOURCE_WAIT_MS);
        return () => {
            controller.abort();
            window.clearTimeout(wait);
        };
    }, [open, query, sources]);
    // The list answers an earlier query until this one's answer is shown.
    const stale = shown.query !== query;
    const staleRef = useRef(stale);
    staleRef.current = stale;
    const groups = useMemo(() => {
        // The actions are matched against the query the list answers, so the
        // whole list changes together.
        const answered = shown.query;
        if (answered === null)
            return [];
        const matched = actions.filter((action) => matchesQuery(`${action.title} ${action.keywords ?? ""}`, answered));
        const found = [...shown.groups, { id: ACTIONS_ID, heading: actionsHeading, items: matched }, ...shown.late];
        return found.filter((group) => group.items.length > 0);
    }, [shown, actions, actionsHeading]);
    const select = (item) => {
        // A row from an earlier query runs nothing, by a press or by a key.
        if (staleRef.current)
            return;
        if (!item.keepOpen)
            setOpen(false);
        item.onSelect();
    };
    // The answer an Enter was held for has arrived: run its first row.
    const first = groups[0]?.items[0];
    useEffect(() => {
        if (stale || !heldEnter.current)
            return;
        heldEnter.current = false;
        if (first)
            select(first);
        // `select` and `first` are read as they stand when the list changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shown, stale]);
    const marks = shown.query ?? "";
    const asked = marks.trim() !== "";
    const settled = !stale && busy === 0;
    const nothing = groups.length === 0 && asked && settled;
    const count = groups.reduce((sum, group) => sum + group.items.length, 0);
    return (_jsx(Dialog.Root, { open: open, onOpenChange: setOpen, children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Backdrop, { className: "dl-palette-dim", "data-instant": instant ? "" : undefined }), _jsx(Dialog.Popup, { ref: setPanel, "data-slot": "command-palette", className: cx("dl-palette", className), "data-instant": instant ? "" : undefined, "aria-label": label, initialFocus: inputRef, 
                    // A key pressed inside means the keyboard is driving, and what it
                    // does next (Enter, Escape) should not animate. A press hands the
                    // turn back to the pointer. Heard on the way down: the field
                    // handles its own keys and does not always let them bubble.
                    onKeyDownCapture: (event) => {
                        if (event.key !== "Shift" && event.key !== "Control" && event.key !== "Alt" && event.key !== "Meta")
                            setInstant(true);
                        if (!stale)
                            return;
                        // The rows on screen answer an earlier query. Enter waits for
                        // this one's answer, and the arrows have nothing to move through.
                        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            event.stopPropagation();
                            heldEnter.current = true;
                        }
                        else if (MOVE_KEYS.has(event.key)) {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }, onPointerDownCapture: () => setInstant(false), children: _jsxs(Autocomplete.Root, { open: true, inline: true, items: groups, value: query, onValueChange: (value, details) => {
                            // Choosing a row would write its title into the field.
                            if (details.reason === "item-press")
                                return;
                            // A held Enter was for the words as they stood.
                            heldEnter.current = false;
                            setQuery(value);
                        }, 
                        // The sources and the action filter above have matched already.
                        filter: null, itemToStringValue: (item) => item.title, autoHighlight: "always", keepHighlight: true, onItemHighlighted: (item) => setActive(item), children: [_jsxs("div", { className: "dl-palette-query", children: [_jsx(SearchGlyph, {}), _jsx(Autocomplete.Input, { ref: inputRef, className: "dl-palette-input", placeholder: placeholder, "aria-label": placeholder, "aria-describedby": hintId, "aria-busy": stale || busy > 0 || undefined, autoComplete: "off", autoCorrect: "off", spellCheck: false }), _jsx(Dialog.Close, { className: "dl-palette-close", "aria-label": "Close", tabIndex: -1, children: _jsx(Kbd, { children: "Esc" }) })] }), _jsx("span", { id: hintId, className: "dl-palette-status", children: `Press Enter to ${(active?.verb ?? "open").toLocaleLowerCase()} the highlighted result.` }), _jsx("div", { role: "status", "aria-live": "polite", className: "dl-palette-status", children: nothing ? "No results." : asked && settled ? `${count} ${count === 1 ? "result" : "results"}.` : "" }), _jsxs("div", { className: "dl-palette-scroll", "data-empty": groups.length === 0 ? "" : undefined, children: [nothing ? _jsx("p", { className: "dl-palette-note", children: emptyText ? emptyText(query.trim()) : `No results for “${query.trim()}”.` }) : null, _jsx(Autocomplete.List, { className: "dl-palette-list", "data-stale": stale ? "" : undefined, children: (group) => (_jsxs(Autocomplete.Group, { items: group.items, className: "dl-palette-group", children: [_jsx(Autocomplete.GroupLabel, { className: "dl-palette-head", children: group.heading }), _jsx(Autocomplete.Collection, { children: (item) => (_jsxs(Autocomplete.Item, { value: item, className: "dl-palette-row", "data-done": item.done ? "" : undefined, onClick: () => select(item), children: [item.icon ? (_jsx("span", { className: "dl-palette-icon", "aria-hidden": "true", children: item.icon })) : null, _jsxs("span", { className: "dl-palette-text", children: [_jsx("span", { className: "dl-palette-title", children: _jsx(Marked, { text: item.title, query: marks }) }), item.subtitle ? (_jsx("span", { className: "dl-palette-sub", children: _jsx(Marked, { text: item.subtitle, query: marks }) })) : null] }), item.meta ? _jsx("span", { className: "dl-palette-meta", children: item.meta }) : null, _jsxs("span", { className: "dl-palette-keys", "aria-hidden": "true", children: [item.keys && item.keys.length > 0 ? _jsx(Kbd, { keys: item.keys, className: "dl-palette-own" }) : null, _jsxs("span", { className: "dl-palette-enter", children: [item.verb ? _jsx("span", { className: "dl-palette-verb", children: item.verb }) : null, _jsx(Kbd, { children: ENTER_KEY })] })] })] }, `${group.id}:${item.id}`)) })] }, group.id)) })] })] }) })] }) }));
}
/** One array each for "none", so a palette given neither does not search again on every render. */
const NO_SOURCES = [];
const NO_ACTIONS = [];
//# sourceMappingURL=command-palette.js.map