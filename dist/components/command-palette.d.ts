import { type ReactNode } from "react";
/** One row of the palette: a result, or an action. */
export type PaletteItem = {
    /** Unique within its group. */
    id: string;
    /** The row's first line. The words of the query are marked in it. */
    title: string;
    /** A muted second line: where the result lives, or the line that matched. Marked the same way. */
    subtitle?: string;
    /** The row's icon, from the app's own set, drawn at 16px. */
    icon?: ReactNode;
    /** What ends the first line at the right: a date, a time, a count. */
    meta?: ReactNode;
    /** The action's own shortcut, as keycaps at the row's right end: `["R"]`, `["Ctrl", "N"]`. */
    keys?: readonly string[];
    /** More words the palette's own filter may match an action by, beside its title. */
    keywords?: string;
    /** Draws the title struck through and muted: a to-do that is done. */
    done?: boolean;
    /** Leaves the palette open after the row is chosen. It closes by default. */
    keepOpen?: boolean;
    /** What choosing the row does. The palette has closed by the time it runs, unless `keepOpen`. */
    onSelect: () => void;
};
/**
 * Something the palette searches: pages, events, messages, files. The app
 * owns the search; the palette shows what comes back under the heading.
 */
export type PaletteSource = {
    id: string;
    /** The group's heading, in sentence case: "Pages", "To-dos". */
    heading: string;
    /**
     * The rows for a query, now or as a promise. It is called with `""` as
     * the palette opens: return what to show before a word is typed (recent
     * items), or nothing. `signal` aborts when the query changes or the
     * palette closes, for a search that fetches.
     */
    search: (query: string, signal: AbortSignal) => PaletteItem[] | Promise<PaletteItem[]>;
};
export type CommandPaletteProps = {
    /** Whether the palette is open, for an app that owns that. Leave it out and the palette owns it. */
    open?: boolean;
    /** Called when the palette opens or closes, from a key, a row, Escape or a press outside. */
    onOpenChange?: (open: boolean) => void;
    /** What the palette searches, in the order the groups are shown. Keep the array stable between renders. */
    sources?: readonly PaletteSource[];
    /**
     * The app's actions: "New page", "Switch to Week view". The palette
     * filters them itself, by every word of the query in the title or the
     * keywords, and lists them after the sources' groups.
     */
    actions?: readonly PaletteItem[];
    /** The heading over the actions. "Actions". */
    actionsHeading?: string;
    /** The field's placeholder, which is also its accessible name. "Search". */
    placeholder?: string;
    /** The dialog's accessible name. "Command palette". */
    label?: string;
    /** What to say when a query finds nothing. Defaults to `No results for “query”.` */
    emptyText?: (query: string) => ReactNode;
    /** Whether Ctrl K (Cmd K on a Mac) opens and closes it. On by default. */
    hotkey?: boolean;
    /**
     * The app's own key for search, or several: `"/"`. It opens the palette
     * when pressed alone, outside a text field. It does not close it, since
     * the key is then typed into the query.
     */
    appKey?: string | readonly string[];
    /** Extra classes for the panel, beside `dl-palette`. */
    className?: string;
};
/**
 * The family's command palette: one field over grouped results, opened with
 * Ctrl K and the app's own key.
 *
 * It is a Base UI Dialog holding an inline Autocomplete, 600px wide and
 * frosted, with the app dimmed behind it. Results come in groups under
 * sentence-case headings, with the words of the query marked in each row.
 * The arrows move the focus, which always rests on a row, and that row
 * shows an Enter hint (the return arrow, as a keycap) where its own
 * shortcut would be. Enter runs it,
 * Escape closes the palette, and so does a press outside it.
 *
 * The app supplies what it searches (`sources`) and what it can do
 * (`actions`); the palette owns the field, the keys, the grouping and the
 * look (palette.css, which needs menu.css for the keycap).
 *
 * Opened from the keyboard it lands at once, with no animation, and it
 * closes at once after a key. Opened by a press on a search button it
 * fades in over the family's 150ms.
 *
 *   <CommandPalette
 *     appKey="/"
 *     placeholder="Search pages and to-dos"
 *     sources={[{ id: "pages", heading: "Pages", search: searchPages }]}
 *     actions={[{ id: "new", title: "New page", keys: ["N"], onSelect: newPage }]}
 *   />
 */
export declare function CommandPalette({ open: openProp, onOpenChange, sources, actions, actionsHeading, placeholder, label, emptyText, hotkey, appKey, className, }: CommandPaletteProps): ReactNode;
//# sourceMappingURL=command-palette.d.ts.map