import { type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
/** One row of the phone's search: a suggestion before a query, or a result after one. */
export type PhoneSearchRow = {
    /** Unique within its section. */
    id: string;
    /** The row's words. */
    title: ReactNode;
    /** A fainter second line: where it lives, an address, when it was edited. */
    subtitle?: ReactNode;
    /** What leads the row: a 20px glyph from the app's own set, or a `<PhoneSearchAvatar>`. */
    leading?: ReactNode;
    /** Leaves search open after the row is tapped. It closes by default. */
    keepOpen?: boolean;
    /** What tapping the row does. Search has closed by the time it runs, unless `keepOpen`. */
    onSelect: () => void;
};
/** A group of rows under a heading: "Recent", "People", "Places". */
export type PhoneSearchSection = {
    /** Unique among the sections. Falls back to the heading. */
    id?: string;
    /** The heading, in sentence case. */
    heading: string;
    /** The section's rows, drawn by the kit. */
    rows?: readonly PhoneSearchRow[];
    /** The app's own rows in place of `rows`, for a list the kit has no row for, such as calendar's agenda lines. */
    children?: ReactNode;
};
/** The row in the accent that leads the suggestions: the app's create action. */
export type PhoneSearchAction = {
    /** "Compose", "New event", "New page", "Upload". */
    label: string;
    /** Its glyph, from the app's own set. */
    icon?: ReactNode;
    onSelect: () => void;
};
export type PhoneSearchProps = {
    /** Whether search is open. The app owns this: the header's search icon sets it. */
    open: boolean;
    /**
     * Called when search closes: Cancel, Escape, the system's back, a row.
     * Cancel and Escape pass Base UI's details, with the reason. The system's
     * back passes none.
     */
    onOpenChange: (open: boolean, details?: PhoneSearchChangeDetails) => void;
    /**
     * Whether the sheet owns the system's back while it is open. On by
     * default: opening pushes one history entry, the back button or the back
     * swipe closes search, and closing by Cancel, Escape or a row takes the
     * entry off again. Pass `false` in an app that already gives search an
     * entry of its own, or the two would stack.
     */
    systemBack?: boolean;
    /** The words in the field, for an app that owns them. Leave it out and the sheet owns them. */
    query?: string;
    /** Called as the words change. */
    onQueryChange?: (query: string) => void;
    /** Called when the keyboard's Search key is pressed. */
    onSubmit?: (query: string) => void;
    /** The field's placeholder, which is also the sheet's accessible name: "Search mail and people". */
    placeholder?: string;
    /** The word on the button that closes search. "Cancel". */
    cancelLabel?: string;
    /** Before any query: the app's create action, as a row in the accent. */
    action?: PhoneSearchAction;
    /** Before any query: what is recent or coming up, then people or places. */
    sections?: readonly PhoneSearchSection[];
    /** For a query: the results, in sections. */
    results?: readonly PhoneSearchSection[];
    /** For a query: the app's own results in place of `results`. */
    children?: ReactNode;
    /** What to say when a query finds nothing. Defaults to `No results for “query”.` */
    emptyText?: (query: string) => ReactNode;
    /**
     * Something inside the field before the words, such as calendar's calendar
     * picker. A tap on a control here is that control's own; a tap anywhere
     * else on the field puts the caret in the input.
     */
    fieldStart?: ReactNode;
    /** Something inside the field after the words, such as a filter icon. The same rule holds. */
    fieldEnd?: ReactNode;
    /** Extra classes for the sheet, beside `dl-phone-search`. */
    className?: string;
};
/** What Base UI says about a close: `reason` is `"escape-key"`, `"close-press"` and so on. */
export type PhoneSearchChangeDetails = Parameters<NonNullable<Dialog.Root.Props["onOpenChange"]>>[1];
export type PhoneSearchAvatarProps = {
    /** One or two letters. */
    initials: string;
    /** The circle's fill. Left out, it is a neutral grey. */
    color?: string;
    className?: string;
};
/** A person's circle as a row's lead: 28px, white initials. */
export declare function PhoneSearchAvatar({ initials, color, className }: PhoneSearchAvatarProps): ReactNode;
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
export declare function PhoneSearch({ open, onOpenChange, systemBack, query: queryProp, onQueryChange, onSubmit, placeholder, cancelLabel, action, sections, results, children, emptyText, fieldStart, fieldEnd, className, }: PhoneSearchProps): ReactNode;
//# sourceMappingURL=phone-search.d.ts.map