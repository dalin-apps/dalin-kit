"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { cx } from "./cx.js";
import { CheckGlyph, ChevronLeftGlyph, ChevronRightGlyph, FilterGlyph } from "./icons.js";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "./menu.js";

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
  options: readonly { value: string; label: ReactNode }[];
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
export function filterCount(count: number | undefined, capped = false): string {
  if (count === undefined) return "";
  return capped ? `${count.toLocaleString()}+` : count.toLocaleString();
}

function OptionRow({ option }: { option: FilterOption }): ReactNode {
  const count = option.count;
  return (
    <MenuItem onClick={option.onSelect}>
      <span className="dl-filter-text">{option.label}</span>
      {option.checked ? (
        <CheckGlyph className="dl-menu-end" />
      ) : count !== undefined && count !== null && count !== "" ? (
        <span className="dl-filter-count">{count}</span>
      ) : null}
    </MenuItem>
  );
}

function FacetRows({ facet }: { facet: FilterFacet }): ReactNode {
  if (!facet.options?.length) return <MenuItem disabled>{facet.empty ?? "No matches"}</MenuItem>;
  return facet.options.map((option) => <OptionRow key={option.key} option={option} />);
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
export function FilterMenu({
  label = "Filters",
  dot = null,
  choice,
  facets = [],
  onFacetOpen,
  groups = [],
  variant = "desktop",
  open: openProp,
  onOpenChange,
  tooltip,
  align = "end",
  className,
  menuClassName,
}: FilterMenuProps): ReactNode {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const [page, setPage] = useState<string | null>(null);
  const phone = variant === "phone";
  const shown = phone && page ? facets.find((f) => f.key === page) ?? null : null;

  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
    if (!next) {
      setPage(null);
      onFacetOpen?.(null);
    }
  };
  const openPage = (key: string | null) => {
    setPage(key);
    onFacetOpen?.(key);
  };

  const trigger = (
    <MenuTrigger
      aria-label={label}
      data-slot="filter-trigger"
      data-variant={variant}
      data-on={dot ? "" : undefined}
      className={cx("dl-filter", className)}
      onMouseDown={(e) => e.preventDefault()}
    >
      <FilterGlyph />
      {dot ? <span aria-hidden="true" data-slot="filter-dot" className="dl-filter-dot" style={{ background: dot }} /> : null}
    </MenuTrigger>
  );

  const rest = groups
    .filter((group) => group.length > 0)
    .map((group, i) => <MenuGroupRows key={i} rule={i > 0} rows={group} />);

  return (
    <Menu open={open} onOpenChange={setOpen}>
      {tooltip ? tooltip(trigger, label) : trigger}
      <MenuContent align={align} className={cx("dl-filter-menu", menuClassName)} data-variant={variant}>
        {shown ? (
          <>
            <MenuItem closeOnClick={false} className="dl-filter-back" onClick={() => openPage(null)}>
              <ChevronLeftGlyph />
              {shown.label}
            </MenuItem>
            <MenuSeparator />
            <FacetRows facet={shown} />
          </>
        ) : (
          <>
            {choice ? (
              <>
                <MenuGroup>
                  <MenuLabel>{choice.label}</MenuLabel>
                  <MenuRadioGroup value={choice.value} onValueChange={(value) => choice.onChange(String(value))}>
                    {choice.options.map((option) => (
                      <MenuRadioItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuGroup>
                {facets.length || groups.some((g) => g.length) ? <MenuSeparator /> : null}
              </>
            ) : null}
            {facets.map((facet) =>
              phone ? (
                <MenuItem key={facet.key} closeOnClick={false} onClick={() => openPage(facet.key)}>
                  <span className="dl-filter-text">{facet.label}</span>
                  <ChevronRightGlyph className="dl-menu-end dl-menu-chevron" />
                </MenuItem>
              ) : (
                <MenuSub key={facet.key} onOpenChange={(next) => (next ? onFacetOpen?.(facet.key) : undefined)}>
                  <MenuSubTrigger>{facet.label}</MenuSubTrigger>
                  <MenuSubContent className="dl-filter-sub">
                    <FacetRows facet={facet} />
                  </MenuSubContent>
                </MenuSub>
              ),
            )}
            {rest}
          </>
        )}
      </MenuContent>
    </Menu>
  );
}

function MenuGroupRows({ rule, rows }: { rule: boolean; rows: readonly FilterOption[] }): ReactNode {
  return (
    <>
      {rule ? <MenuSeparator /> : null}
      {rows.map((option) => (
        <OptionRow key={option.key} option={option} />
      ))}
    </>
  );
}
