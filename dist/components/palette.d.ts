import { type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { type PaletteResults } from "./palette-results.js";
import type { PaletteGroup, PaletteItem, PalettePage, PaletteSource } from "./palette-types.js";
/** A list the app built itself, in place of the palette asking `sources`: mail's and calendar's own searches. */
export type PaletteOwnResults = {
    /** The groups to draw, in order. */
    groups: readonly PaletteGroup[];
    /**
     * The words these groups answer. While they differ from the words in the
     * field the list is stale: it dims, its rows run nothing, and Enter is
     * held until groups for the new words arrive.
     */
    query: string;
    /** Whether a search is still out, for `aria-busy` and the count a screen reader hears. */
    busy?: boolean;
};
/** What a part of the palette may read and do: the words, the list, the pages. */
export type PaletteControls = {
    query: string;
    setQuery: (query: string) => void;
    /** The list on screen, and where it stands. */
    results: PaletteResults;
    /** The pages open over the first, innermost last. */
    pages: readonly PalettePage[];
    openPage: (page: PalettePage) => void;
    /** Goes back one page. Does nothing on the first. */
    back: () => void;
    /** The field, for an app that measures or focuses it. */
    input: HTMLInputElement | null;
    close: () => void;
};
/** The palette's state, for a part an app draws itself inside a `<Palette>`. */
export declare function usePalette(): PaletteControls;
/** The palette's own props, which an attribute passed through to the panel may not name. */
type PaletteOwnProps = {
    /** Whether the palette is open, for an app that owns that. Leave it out and the palette owns it. */
    open?: boolean;
    /** Called when the palette opens or closes, from a key, a row, Escape or a press outside. */
    onOpenChange?: (open: boolean) => void;
    /** The words in the field, for an app that owns them. Leave it out and the palette owns them. */
    query?: string;
    /** Called as the words change. */
    onQueryChange?: (query: string) => void;
    /** What the palette searches on its first page, in the order the groups are shown. Keep the array stable between renders. */
    sources?: readonly PaletteSource[];
    /**
     * The app's actions on its first page. The palette ranks them itself:
     * every word of the query in the title or the keywords first, then the
     * rows cmdk's command-score finds, and lists them after the sources'
     * groups.
     */
    actions?: readonly PaletteItem[];
    /** The heading over the actions. "Actions". */
    actionsHeading?: string;
    /** Rows that end the list under no heading, after any late group: mail's "Show all". A function of the words the list answers. */
    tail?: (query: string) => readonly PaletteItem[];
    /** The app's own list, in place of `sources`, `actions` and `tail`. */
    results?: PaletteOwnResults;
    /** The words to mark in a row, from the words the list answers: mail marks the words and not its chips. */
    marks?: (query: string) => string;
    /** The field's placeholder on the first page, which is also its accessible name. "Search". */
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
    /**
     * Asked first when Escape is pressed. Return true when the key was spent
     * on something of the app's own (calendar's sentence questions), and the
     * palette stays where it is. Otherwise Escape goes back one page, and on
     * the first page closes the palette.
     */
    onEscape?: () => boolean;
    /** Where focus goes as the palette closes: Base UI's `finalFocus`, for an app that hands it on. */
    finalFocus?: Dialog.Popup.Props["finalFocus"];
    /**
     * The palette's z-index, for an app that stands it under a window of its
     * own (mail's compose at 50). Written as `--dl-palette-z` on the dim and
     * the panel. The default is `--dl-z-palette`, 90.
     */
    zIndex?: number;
    /** Extra classes for the panel, beside `dl-palette`. */
    className?: string;
    /** The field, the list, the lines: `<PaletteField>`, `<PaletteList>`, `<PaletteNote>`, `<PaletteBody>`. */
    children?: ReactNode;
};
/**
 * `<Palette>`'s props. Any other attribute (a `data-*` marker, an `id`)
 * goes to the panel, Base UI's popup, beside the kit's own: mail's
 * shortcut gating and compose fold read their markers there. The kit's
 * `data-slot`, `role`, `aria-label`, `aria-labelledby`, `aria-modal`,
 * `tabIndex` and `hidden` win over one of the same name, and `style` is
 * laid under the palette's z-index.
 */
export type PaletteProps = PaletteOwnProps & Omit<HTMLAttributes<HTMLDivElement>, keyof PaletteOwnProps | KitPopupProp>;
/**
 * The panel's attributes the kit and Base UI own: the dialog's role and
 * name, the popup's tabIndex -1 (focus restore and the toast's Tab fallback
 * land on it) and Base UI's hidden. Base UI lays an element's own props over
 * its internal ones, so one of these from the app would win; they are
 * dropped before the rest go to the panel.
 */
type KitPopupProp = "role" | "aria-label" | "aria-labelledby" | "aria-modal" | "tabIndex" | "hidden" | "data-slot";
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
export declare function Palette({ open: openProp, onOpenChange, query: queryProp, onQueryChange, sources, actions, actionsHeading, tail, results: ownResults, marks: marksOf, placeholder, label, emptyText, hotkey, appKey, onEscape, finalFocus, zIndex, className, children, style, onKeyDownCapture, onPointerDownCapture, ...passed }: PaletteProps): ReactNode;
/** A ghost completion over the field: the rest of a name, laid after the words in a fainter ink. */
export type PaletteCompletion = {
    /** What would follow the words: "na Ito" after "da". */
    suffix: string;
    /** Takes it: Tab, or ArrowRight with the caret at the end. */
    onAccept: () => void;
};
export type PaletteFieldProps = {
    /** The glyph that leads the row. The magnifying glass, unless set: mail's spinner while it searches. */
    glyph?: ReactNode;
    /** Inside the row before the words, after any page's crumb: mail's scope and its chips. */
    start?: ReactNode;
    /** Inside the row after the words, before the filter. */
    end?: ReactNode;
    /** A control at the end of the row, before the Esc cap: a `<FilterMenu>`. */
    filter?: ReactNode;
    /**
     * A ghost completion over the field. Pass null while there is nothing to
     * offer, and leave it out in a palette that never offers one: the field
     * wraps the input for it, and should not take or drop that wrapper as
     * the words change.
     */
    completion?: PaletteCompletion | null;
    /**
     * The app's own keys, heard before the palette's. Calling
     * `preventDefault()` keeps a key from the palette and from Base UI:
     * mail's Backspace at the start that removes the last chip.
     */
    onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
    /** Holds the words still while something else takes the keys: calendar's sentence questions. */
    readOnly?: boolean;
    /** Marks the field busy for a search of the app's own, beside the palette's own sources. */
    busy?: boolean;
};
/**
 * The field row: the glyph, the open pages' crumbs, the app's pieces
 * before and after the words, the filter and the Esc cap. It also holds
 * the words a screen reader hears for the Enter hint and the count.
 */
export declare function PaletteField({ glyph, start, end, filter, completion, onKeyDown, readOnly, busy }: PaletteFieldProps): ReactNode;
/** A line of words under the field row: mail's date hint, "Showing results for". */
export declare function PaletteLine({ children, className }: {
    children?: ReactNode;
    className?: string;
}): ReactNode;
export type PaletteNoteProps = {
    children?: ReactNode;
    /** `"error"` draws the line in the family's red and makes it an alert: "Search could not finish." */
    tone?: "error";
    /** A button at the end of the line: Retry. */
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
};
/**
 * A status line in the list's place or under it: "Searching…", "Search
 * could not finish. Retry", "Searching Gmail for older mail…". The empty
 * line is one of these too.
 */
export declare function PaletteNote({ children, tone, action, className }: PaletteNoteProps): ReactNode;
/** What a row is, for an app that draws a row's insides itself. */
export type PaletteRowState = {
    /** Whether the highlight is on the row. */
    highlighted: boolean;
    /** The words to mark in it. */
    marks: string;
    /** Whether only the score found it, so its letters are marked and not whole words. */
    byScore: boolean;
};
/** A row's text with the query's words marked, or the letters the score took. */
export declare function PaletteMarked({ text, query, byScore }: {
    text: string;
    query: string;
    byScore?: boolean;
}): ReactNode;
export type PaletteListProps = {
    /** What to say when a query finds nothing. The root's, or `No results for “query”.` */
    emptyText?: (query: string) => ReactNode;
    /**
     * The insides of a row, for a row the kit's anatomy does not fit (mail's
     * avatar and second line, calendar's cut title). Return undefined to keep
     * the kit's. The row's keys and Enter hint always end it.
     */
    rowContent?: (item: PaletteItem, state: PaletteRowState) => ReactNode | undefined;
    /** Lines under the list, in its scroller: `<PaletteNote>`s. */
    children?: ReactNode;
};
/**
 * The list: groups under their headings, rows with the query marked, the
 * Enter hint on the highlighted one, and the line that says nothing was
 * found. While it answers an earlier query it is stale (`data-stale`).
 */
export declare function PaletteList({ emptyText, rowContent, children }: PaletteListProps): ReactNode;
export type PaletteBodyProps = {
    /** What the status region says while the body shows, in place of the count. */
    status?: string;
    children?: ReactNode;
    className?: string;
};
/**
 * A body that takes the list's place: calendar's questions about a
 * sentence. Draw it in place of `<PaletteList>`. While it shows, the
 * arrows and Enter are the app's own (through the field's `onKeyDown`),
 * and the status region says `status`.
 */
export declare function PaletteBody({ status, children, className }: PaletteBodyProps): ReactNode;
export {};
//# sourceMappingURL=palette.d.ts.map