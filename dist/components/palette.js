"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import { startedFromKeyboard } from "../helpers/input-modality.js";
import { cx } from "./cx.js";
import { SearchGlyph } from "./icons.js";
import { Kbd } from "./kbd.js";
import { RowMenu, pointAnchor, underAnchor } from "./palette-menu.js";
import { matchParts, scoreParts } from "./palette-match.js";
import { usePaletteResults } from "./palette-results.js";
import { useToasterTab } from "./toaster-tab.js";
/** The keys that move the highlight. They do nothing while the list answers an earlier query. */
const MOVE_KEYS = new Set(["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);
/**
 * The Enter hint's cap: the return arrow, as the key itself is printed. One
 * 20px cap, so the slot it holds open on every row costs the row's date 30px
 * and no more. The word would hold 60px open.
 */
const ENTER_KEY = "↵";
/** Whether a key press belongs to a field the reader is typing in. */
function inField(target) {
    if (!(target instanceof HTMLElement))
        return false;
    if (target.isContentEditable)
        return true;
    return target.matches("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='textbox']");
}
/** Whether the caret sits at the end of the field, with nothing selected. */
function caretAtEnd(input) {
    return input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
}
const PaletteContext = createContext(null);
function usePaletteContext(part) {
    const value = useContext(PaletteContext);
    if (!value)
        throw new Error(`<${part}> belongs inside a <Palette>.`);
    return value;
}
/** The palette's state, for a part an app draws itself inside a `<Palette>`. */
export function usePalette() {
    const ctx = usePaletteContext("usePalette");
    return {
        query: ctx.query,
        setQuery: ctx.setQuery,
        results: ctx.results,
        pages: ctx.pages.map((open) => open.page),
        openPage: ctx.openPage,
        back: () => ctx.backTo(ctx.pages.length - 1),
        input: ctx.inputRef.current,
        close: () => ctx.setOpen(false),
    };
}
/**
 * The root of the family's command palette: the dialog, its open state,
 * Ctrl K and the app's key, the motion rule, the toast's place in Tab, the
 * pages, and the list machinery. The parts inside it draw the field and
 * the list. `<CommandPalette>` is this root with the kit's parts in it.
 *
 *   <Palette sources={sources} actions={actions} appKey="/">
 *     <PaletteField start={<Chips />} filter={<FilterMenu ... />} />
 *     <PaletteLine>Tomorrow is Tue, Nov 25</PaletteLine>
 *     <PaletteList>
 *       {failed ? <PaletteNote tone="error" action={{ label: "Retry", onClick: retry }}>Search could not finish.</PaletteNote> : null}
 *     </PaletteList>
 *   </Palette>
 */
export function Palette({ open: openProp, onOpenChange, query: queryProp, onQueryChange, sources = NO_SOURCES, actions = NO_ACTIONS, actionsHeading = "Actions", tail, results: ownResults, marks: marksOf, placeholder = "Search", label = "Command palette", emptyText, hotkey = true, appKey, onEscape, finalFocus, zIndex, className, children, }) {
    const [ownOpen, setOwnOpen] = useState(false);
    const open = openProp ?? ownOpen;
    const [ownQuery, setOwnQuery] = useState("");
    const query = queryProp ?? ownQuery;
    const [pages, setPages] = useState(NO_PAGES);
    // The row the highlight is on, for the hint's verb.
    const [active, setActive] = useState(undefined);
    const [body, setBody] = useState(null);
    const [menu, setMenu] = useState(null);
    // An Enter pressed while the list was stale, waiting for the answer.
    const heldEnter = useRef(false);
    // An Enter pressed on a row that waits for the next answer (`dim: "waiting"`).
    // It belongs to that place in the list: a key or a pointer that moves the
    // highlight, new words, a page and a close each drop it.
    const heldRow = useRef(false);
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
    const setQuery = useCallback((next) => {
        if (queryProp === undefined)
            setOwnQuery(next);
        onQueryChange?.(next);
    }, [queryProp, onQueryChange]);
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
            // The next opening starts from an empty field, on the first page. An
            // app that owns the words decides what an opening starts from: mail
            // opens on the search the list shows.
            if (queryProp === undefined)
                setOwnQuery("");
            setPages(NO_PAGES);
            setMenu(null);
            heldEnter.current = false;
            heldRow.current = false;
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
    // The page on top decides what is searched.
    const top = pages[pages.length - 1]?.page;
    const asked = usePaletteResults({
        // A page's own sources answer on it, whatever list the first page uses.
        active: open && (!ownResults || top !== undefined),
        query,
        scope: pages.map((p) => p.page.id).join("/"),
        sources: top ? (top.sources ?? NO_SOURCES) : sources,
        actions: top ? (top.actions ?? NO_ACTIONS) : actions,
        actionsHeading: top ? (top.actionsHeading ?? "Actions") : actionsHeading,
        tail: top ? undefined : tail,
    });
    const results = useMemo(() => {
        if (!ownResults || top)
            return asked;
        return {
            groups: ownResults.groups.filter((group) => group.items.length > 0),
            answered: ownResults.query,
            stale: ownResults.query !== query,
            busy: ownResults.busy ? 1 : 0,
            failed: NO_FAILED,
            retry: asked.retry,
            byScore: NO_SCORED,
        };
    }, [ownResults, top, asked, query]);
    const { stale } = results;
    const staleRef = useRef(stale);
    staleRef.current = stale;
    const openPage = useCallback((page) => {
        setPages((prev) => [...prev, { page, parentQuery: query }]);
        setMenu(null);
        heldEnter.current = false;
        heldRow.current = false;
        setQuery("");
        inputRef.current?.focus({ preventScroll: true });
    }, [query, setQuery]);
    const backTo = useCallback((depth) => {
        if (depth < 0 || depth >= pages.length)
            return;
        const restored = pages[depth].parentQuery;
        setPages(pages.slice(0, depth));
        setMenu(null);
        heldEnter.current = false;
        heldRow.current = false;
        setQuery(restored);
        inputRef.current?.focus({ preventScroll: true });
    }, [pages, setQuery]);
    const select = (item) => {
        // A row from an earlier query runs nothing, by a press or by a key.
        if (staleRef.current)
            return;
        if (item.page) {
            openPage(item.page);
            item.onSelect?.();
            return;
        }
        if (!item.keepOpen)
            setOpen(false);
        item.onSelect?.();
    };
    // The answer an Enter was held for has arrived: run its first row.
    const first = body ? undefined : results.groups[0]?.items[0];
    useEffect(() => {
        if (stale || !heldEnter.current)
            return;
        heldEnter.current = false;
        if (first)
            select(first);
        // `select` and `first` are read as they stand when the list changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [results.groups, stale]);
    // An Enter held on a waiting row runs the highlighted row once it stops
    // waiting. An answer with nothing to highlight drops it, so no later
    // update runs a row nobody chose.
    useEffect(() => {
        if (!heldRow.current || stale)
            return;
        if (!active) {
            if (results.busy === 0)
                heldRow.current = false;
            return;
        }
        if (active.dim === "waiting")
            return;
        heldRow.current = false;
        select(active);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [results.groups, active, stale]);
    const keys = useRef(new WeakMap());
    const keyOf = useCallback((item) => keys.current.get(item) ?? item.id, []);
    // Each row's key in its group, so a menu knows which row is its own.
    for (const group of results.groups)
        for (const item of group.items)
            keys.current.set(item, `${group.id}:${item.id}`);
    const openMenu = useCallback((item, key, at) => {
        const entries = item.menu?.() ?? [];
        if (entries.length === 0)
            return false;
        const anchor = at instanceof Element ? underAnchor(at) : pointAnchor(at.x, at.y);
        setMenu({ key, entries, anchor, at: Date.now() });
        return true;
    }, []);
    const runEntry = (entry) => {
        if (!entry.keepOpen)
            setOpen(false);
        entry.onSelect();
    };
    const answered = results.answered ?? "";
    const marks = marksOf ? marksOf(answered) : answered;
    const placeholderNow = top?.placeholder ?? placeholder;
    const emptyNow = top ? top.emptyText : emptyText;
    const zStyle = zIndex === undefined ? undefined : { "--dl-palette-z": String(zIndex) };
    const value = {
        open,
        setOpen,
        query,
        setQuery,
        inputRef,
        hintId,
        placeholder: placeholderNow,
        pages,
        openPage,
        backTo,
        results,
        marks,
        active,
        select,
        emptyText: emptyNow,
        body,
        setBody,
        menu,
        openMenu,
        keyOf,
        heldRow,
    };
    return (_jsx(Dialog.Root, { open: open, onOpenChange: (next, details) => {
            if (!next && details.reason === "escape-key") {
                // The app's own Escape first, then one page back.
                if (onEscape?.()) {
                    details.cancel();
                    return;
                }
                if (pages.length > 0) {
                    details.cancel();
                    backTo(pages.length - 1);
                    return;
                }
            }
            setOpen(next);
        }, children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Backdrop, { className: "dl-palette-dim", "data-instant": instant ? "" : undefined, style: zStyle }), _jsx(Dialog.Popup, { ref: setPanel, "data-slot": "command-palette", className: cx("dl-palette", className), style: zStyle, "data-instant": instant ? "" : undefined, "aria-label": label, initialFocus: inputRef, finalFocus: finalFocus, 
                    // A key pressed inside means the keyboard is driving, and what it
                    // does next (Enter, Escape) should not animate. A press hands the
                    // turn back to the pointer. Heard on the way down: the field
                    // handles its own keys and does not always let them bubble.
                    onKeyDownCapture: (event) => {
                        if (event.key !== "Shift" && event.key !== "Control" && event.key !== "Alt" && event.key !== "Meta")
                            setInstant(true);
                        if (!stale || body)
                            return;
                        // The rows on screen answer an earlier query. Enter waits for
                        // this one's answer, and the arrows have nothing to move through.
                        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                            // A key meant for a menu or a control of the app's own is theirs.
                            if (event.target !== inputRef.current)
                                return;
                            event.preventDefault();
                            event.stopPropagation();
                            heldEnter.current = true;
                        }
                        else if (MOVE_KEYS.has(event.key) && event.target === inputRef.current) {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }, onPointerDownCapture: () => setInstant(false), children: _jsx(PaletteContext.Provider, { value: value, children: _jsxs(Autocomplete.Root, { open: true, inline: true, items: body ? NO_GROUPS : results.groups, value: query, onValueChange: (next, details) => {
                                // Choosing a row would write its title into the field.
                                if (details.reason === "item-press")
                                    return;
                                // A held Enter was for the words as they stood.
                                heldEnter.current = false;
                                heldRow.current = false;
                                setQuery(next);
                            }, 
                            // The sources and the action ranking have matched already.
                            filter: null, itemToStringValue: (item) => item.title, autoHighlight: "always", keepHighlight: true, onItemHighlighted: (item, details) => {
                                setActive(item);
                                // The highlight moved by a key or the pointer: a held Enter was for the row it left.
                                if (details.reason === "keyboard" || details.reason === "pointer")
                                    heldRow.current = false;
                            }, children: [children, _jsx(RowMenu, { state: menu, onClose: () => setMenu(null), onRun: runEntry, returnTo: inputRef })] }) }) })] }) }));
}
/**
 * The field row: the glyph, the open pages' crumbs, the app's pieces
 * before and after the words, the filter and the Esc cap. It also holds
 * the words a screen reader hears for the Enter hint and the count.
 */
export function PaletteField({ glyph, start, end, filter, completion, onKeyDown, readOnly, busy }) {
    const ctx = usePaletteContext("PaletteField");
    const { results, query, active, body, pages } = ctx;
    const asked = (results.answered ?? "").trim() !== "";
    const settled = !results.stale && results.busy === 0;
    const nothing = !body && results.groups.length === 0 && asked && settled;
    const count = results.groups.reduce((sum, group) => sum + group.items.length, 0);
    const keyDown = (event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) {
            event.preventBaseUIHandler?.();
            return;
        }
        const native = event.nativeEvent;
        // An IME confirming a candidate sends Enter and arrows too; those belong to the IME.
        if (native.isComposing || native.keyCode === 229)
            return;
        const input = event.currentTarget;
        const stop = () => {
            event.preventDefault();
            event.preventBaseUIHandler?.();
        };
        // Ctrl N and Ctrl P move the highlight, as in cmdk and in Emacs.
        if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && (event.key.toLowerCase() === "n" || event.key.toLowerCase() === "p")) {
            stop();
            input.dispatchEvent(new KeyboardEvent("keydown", { key: event.key.toLowerCase() === "n" ? "ArrowDown" : "ArrowUp", bubbles: true, cancelable: true }));
            return;
        }
        if (completion && !readOnly && ((event.key === "Tab" && !event.shiftKey) || (event.key === "ArrowRight" && caretAtEnd(input)))) {
            stop();
            completion.onAccept();
            return;
        }
        if (event.key === "ArrowRight" && caretAtEnd(input) && active && !results.stale) {
            const row = input.ownerDocument.getElementById(input.getAttribute("aria-activedescendant") ?? "");
            if (row && ctx.openMenu(active, ctx.keyOf(active), row))
                stop();
            return;
        }
        if (event.key === "Enter" && active?.dim === "waiting" && !results.stale) {
            stop();
            ctx.heldRow.current = true;
            return;
        }
        if (event.key === "Backspace" && input.value === "" && input.selectionStart === 0 && pages.length > 0) {
            stop();
            ctx.backTo(pages.length - 1);
        }
    };
    const input = (_jsx(Autocomplete.Input, { ref: ctx.inputRef, className: "dl-palette-input", placeholder: ctx.placeholder, "aria-label": ctx.placeholder, "aria-describedby": ctx.hintId, "aria-busy": results.stale || results.busy > 0 || busy || undefined, autoComplete: "off", autoCorrect: "off", spellCheck: false, readOnly: readOnly, onKeyDown: keyDown, "data-dl-owns-tab": completion && !readOnly ? "" : undefined }));
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dl-palette-query", children: [glyph ?? _jsx(SearchGlyph, {}), pages.map((open, depth) => (_jsx("button", { type: "button", className: "dl-palette-crumb", tabIndex: -1, "aria-label": `Back from ${open.page.crumb}`, onMouseDown: (event) => event.preventDefault(), onClick: () => ctx.backTo(depth), children: open.page.crumb }, `${open.page.id}:${depth}`))), start, completion === undefined ? (input) : (_jsxs("span", { className: "dl-palette-field", children: [completion ? (_jsxs("span", { className: "dl-palette-ghost", "aria-hidden": "true", children: [_jsx("span", { className: "dl-palette-ghost-typed", children: query }), completion.suffix] })) : null, input] })), end, filter, _jsx(Dialog.Close, { className: "dl-palette-close", "aria-label": "Close", tabIndex: -1, children: _jsx(Kbd, { children: "Esc" }) })] }), _jsx("span", { id: ctx.hintId, className: "dl-palette-status", children: `Press Enter to ${(active?.verb ?? "open").toLocaleLowerCase()} the highlighted result.` }), _jsx("div", { role: "status", "aria-live": "polite", className: "dl-palette-status", children: body
                    ? (body.status ?? "")
                    : nothing
                        ? "No results."
                        : asked && settled
                            ? `${count} ${count === 1 ? "result" : "results"}.`
                            : "" })] }));
}
/** A line of words under the field row: mail's date hint, "Showing results for". */
export function PaletteLine({ children, className }) {
    return _jsx("p", { className: cx("dl-palette-line", className), children: children });
}
/**
 * A status line in the list's place or under it: "Searching…", "Search
 * could not finish. Retry", "Searching Gmail for older mail…". The empty
 * line is one of these too.
 */
export function PaletteNote({ children, tone, action, className }) {
    return (_jsxs("p", { className: cx("dl-palette-note", className), "data-tone": tone, role: tone === "error" ? "alert" : undefined, children: [children, action ? (_jsxs(_Fragment, { children: [" ", _jsx("button", { type: "button", className: "dl-palette-note-action", 
                        // The caret stays in the field.
                        onMouseDown: (event) => event.preventDefault(), onClick: action.onClick, children: action.label })] })) : null] }));
}
/** A row's text with the query's words marked, or the letters the score took. */
export function PaletteMarked({ text, query, byScore = false }) {
    return (byScore ? scoreParts(text, query) : matchParts(text, query)).map((part, index) => part.match ? (_jsx("mark", { className: "dl-palette-mark", children: part.text }, index)) : (part.text));
}
/**
 * The list: groups under their headings, rows with the query marked, the
 * Enter hint on the highlighted one, and the line that says nothing was
 * found. While it answers an earlier query it is stale (`data-stale`).
 */
export function PaletteList({ emptyText, rowContent, children }) {
    const ctx = usePaletteContext("PaletteList");
    const { results, query, marks, active, menu } = ctx;
    const asked = (results.answered ?? "").trim() !== "";
    const settled = !results.stale && results.busy === 0;
    const nothing = results.groups.length === 0 && asked && settled;
    const empty = emptyText ?? ctx.emptyText;
    return (_jsxs("div", { className: "dl-palette-scroll", "data-empty": results.groups.length === 0 ? "" : undefined, children: [nothing ? _jsx("p", { className: "dl-palette-note", children: empty ? empty(query.trim()) : `No results for “${query.trim()}”.` }) : null, _jsx(Autocomplete.List, { className: "dl-palette-list", "data-stale": results.stale ? "" : undefined, children: (group) => (_jsxs(Autocomplete.Group, { items: group.items, className: "dl-palette-group", children: [group.heading ? _jsx(Autocomplete.GroupLabel, { className: "dl-palette-head", children: group.heading }) : null, _jsx(Autocomplete.Collection, { children: (item) => {
                                const key = `${group.id}:${item.id}`;
                                const byScore = results.byScore.has(item);
                                const own = rowContent?.(item, { highlighted: item === active, marks, byScore });
                                return (_jsxs(Autocomplete.Item, { value: item, className: cx("dl-palette-row", item.className), "data-done": item.done ? "" : undefined, "data-dim": item.dim === "waiting" ? "waiting" : item.dim ? "" : undefined, "data-menu-open": menu?.key === key ? "" : undefined, onClick: () => ctx.select(item), onContextMenu: item.menu
                                        ? (event) => {
                                            if (ctx.openMenu(item, key, { x: event.clientX, y: event.clientY }))
                                                event.preventDefault();
                                        }
                                        : undefined, children: [own !== undefined ? (own) : (_jsxs(_Fragment, { children: [item.icon ? (_jsx("span", { className: "dl-palette-icon", "aria-hidden": "true", children: item.icon })) : null, _jsxs("span", { className: "dl-palette-text", children: [_jsx("span", { className: "dl-palette-title", children: _jsx(PaletteMarked, { text: item.title, query: marks, byScore: byScore }) }), item.subtitle ? (_jsx("span", { className: "dl-palette-sub", children: byScore ? item.subtitle : _jsx(PaletteMarked, { text: item.subtitle, query: marks }) })) : null] }), item.meta ? _jsx("span", { className: "dl-palette-meta", children: item.meta }) : null] })), _jsxs("span", { className: "dl-palette-keys", "aria-hidden": "true", children: [item.keys && item.keys.length > 0 ? _jsx(Kbd, { keys: item.keys, className: "dl-palette-own" }) : null, _jsxs("span", { className: "dl-palette-enter", children: [item.verb ? _jsx("span", { className: "dl-palette-verb", children: item.verb }) : null, _jsx(Kbd, { children: ENTER_KEY })] })] })] }, key));
                            } }), group.note ? _jsx("p", { className: "dl-palette-note dl-palette-group-note", children: group.note }) : null] }, group.id)) }), children] }));
}
/**
 * A body that takes the list's place: calendar's questions about a
 * sentence. Draw it in place of `<PaletteList>`. While it shows, the
 * arrows and Enter are the app's own (through the field's `onKeyDown`),
 * and the status region says `status`.
 */
export function PaletteBody({ status, children, className }) {
    const ctx = usePaletteContext("PaletteBody");
    const { setBody } = ctx;
    useLayoutEffect(() => {
        setBody({ status });
    }, [setBody, status]);
    useLayoutEffect(() => () => setBody(null), [setBody]);
    return (_jsx("div", { className: cx("dl-palette-scroll", "dl-palette-body", className), "data-slot": "palette-body", children: children }));
}
/** One array each for "none", so a palette given neither does not search again on every render. */
const NO_SOURCES = [];
const NO_ACTIONS = [];
const NO_PAGES = [];
const NO_GROUPS = [];
const NO_FAILED = [];
const NO_SCORED = new Set();
//# sourceMappingURL=palette.js.map