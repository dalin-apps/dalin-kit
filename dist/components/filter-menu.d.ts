import { type ReactElement, type ReactNode } from "react";
/** One row the menu offers: a filter to add, or a switch that ticks. */
export type FilterOption = {
    key: string;
    label: ReactNode;
    /** How many results it leaves, at the row's right end. Format it with `filterCount`. */
    count?: ReactNode;
    /** Ticks the row, for a switch that is on (mail's "Only people"). A ticked row shows no count. */
    checked?: boolean;
    onSelect: () => void;
};
/**
 * A kind of filter with its own list: mail's From, Date and Mailbox. On a
 * computer it is a submenu; on a phone it is a page swapped into the menu,
 * with a back row at its top.
 */
export type FilterFacet = {
    key: string;
    label: string;
    /** The rows, or undefined while they load. `onFacetOpen` says when to fetch them. */
    options?: readonly FilterOption[];
    /** What the list says while it has no rows: "Counting", "No senders". */
    empty?: ReactNode;
};
/** A choice made once, at the top of the menu: mail's "Search in", this mailbox or all mail. */
export type FilterChoice = {
    label: string;
    value: string;
    options: readonly {
        value: string;
        label: ReactNode;
    }[];
    onChange: (value: string) => void;
};
export type FilterMenuProps = {
    /** The control's name, for its tooltip and a screen reader. "Filters", "Filters: only Work". */
    label?: string;
    /**
     * The colour of the dot on the glyph, while a filter is on: a mailbox's
     * colour, Archive's red. Its presence is what marks the filter on, so
     * leave it out when nothing is narrowed (the owner's pick on 2026-11-24:
     * the coloured dot, in all four apps).
     */
    dot?: string | null;
    choice?: FilterChoice;
    facets?: readonly FilterFacet[];
    /** A facet's list was opened (its key), or closed by the phone's back row or the menu closing (null): fetch its counts now. */
    onFacetOpen?: (key: string | null) => void;
    /** Rows after the facets. The first group follows them directly, and a rule comes before each one after. */
    groups?: readonly (readonly FilterOption[])[];
    /** `"phone"` draws a 44px target and swaps facet pages into the menu. */
    variant?: "desktop" | "phone";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Wraps the trigger in the app's tooltip: `(trigger, label) => <Tip label={label}>{trigger}</Tip>`. */
    tooltip?: (trigger: ReactElement, label: string) => ReactNode;
    /** Where the menu lines up with the control. "end" by default, since the control ends a field. */
    align?: "start" | "center" | "end";
    /** The app's own class on the trigger. */
    className?: string;
    /** The app's own class on the menu, beside `dl-filter-menu`: mail's 44px phone rows. */
    menuClassName?: string;
};
/**
 * A count for a filter row, with "+" past a cap: "1,000+". Pass `capped`
 * when the server stopped counting.
 */
export declare function filterCount(count: number | undefined, capped?: boolean): string;
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
export declare function FilterMenu({ label, dot, choice, facets, onFacetOpen, groups, variant, open: openProp, onOpenChange, tooltip, align, className, menuClassName, }: FilterMenuProps): ReactNode;
//# sourceMappingURL=filter-menu.d.ts.map