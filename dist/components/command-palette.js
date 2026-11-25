"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Palette, PaletteField, PaletteList } from "./palette.js";
export { SOURCE_WAIT_MS } from "./palette-results.js";
/**
 * The family's command palette: one field over grouped results, opened with
 * Ctrl K and the app's own key. It is `<Palette>` with the kit's own field
 * and list in it (palette.tsx); an app whose palette needs more (chips, a
 * completion, a body of its own) builds on those parts instead.
 *
 * It is a Base UI Dialog holding an inline Autocomplete, 600px wide and
 * frosted, with the app dimmed behind it. Results come in groups under
 * sentence-case headings, with the words of the query marked in each row.
 * The arrows move the focus, and so do Ctrl N and Ctrl P. It always rests
 * on a row, and that row shows an Enter hint (the return arrow, as a
 * keycap) where its own shortcut would be, with the row's verb before it
 * where the row names one ("Reveal"). Enter runs it, Escape closes the palette, and so does a
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
export function CommandPalette({ open, onOpenChange, sources, actions, actionsHeading, placeholder, label, emptyText, hotkey, appKey, filter, className, }) {
    return (_jsxs(Palette, { open: open, onOpenChange: onOpenChange, sources: sources, actions: actions, actionsHeading: actionsHeading, placeholder: placeholder, label: label, emptyText: emptyText, hotkey: hotkey, appKey: appKey, className: className, children: [_jsx(PaletteField, { filter: filter }), _jsx(PaletteList, {})] }));
}
//# sourceMappingURL=command-palette.js.map