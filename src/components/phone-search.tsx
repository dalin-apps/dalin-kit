"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { registerToastDock } from "../toast/toast-dock.js";
import { cx } from "./cx.js";
import { SearchGlyph } from "./icons.js";

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
  /** Called when search closes: Cancel, Escape, the system's back, a row. */
  onOpenChange: (open: boolean) => void;
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
  /** Something inside the field before the words, such as calendar's calendar picker. */
  fieldStart?: ReactNode;
  /** Something inside the field after the words, such as a filter icon. */
  fieldEnd?: ReactNode;
  /** Extra classes for the sheet, beside `dl-phone-search`. */
  className?: string;
};

export type PhoneSearchAvatarProps = {
  /** One or two letters. */
  initials: string;
  /** The circle's fill. Left out, it is a neutral grey. */
  color?: string;
  className?: string;
};

/** A person's circle as a row's lead: 28px, white initials. */
export function PhoneSearchAvatar({ initials, color, className }: PhoneSearchAvatarProps): ReactNode {
  return (
    <span
      className={cx("dl-phone-search-avatar", className)}
      style={color ? { background: color } : undefined}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/** How far a search sheet ranks as a toast dock: over the bar and a parked chip, with the other sheets. */
const COVER_RANK = 50;

function Sections({
  sections,
  choose,
}: {
  sections: readonly PhoneSearchSection[];
  choose: (row: { keepOpen?: boolean; onSelect: () => void }) => void;
}): ReactNode {
  return sections.map((section) => {
    const empty = !section.children && (!section.rows || section.rows.length === 0);
    if (empty) return null;
    return (
      <section key={section.id ?? section.heading} className="dl-phone-search-section">
        <h2 className="dl-phone-search-heading">{section.heading}</h2>
        {section.children ??
          section.rows!.map((row) => (
            <button key={row.id} type="button" className="dl-phone-search-row" onClick={() => choose(row)}>
              {row.leading}
              {row.subtitle ? (
                <span className="dl-phone-search-two">
                  <b>{row.title}</b>
                  <small>{row.subtitle}</small>
                </span>
              ) : (
                <span className="dl-phone-search-one">{row.title}</span>
              )}
            </button>
          ))}
      </section>
    );
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
export function PhoneSearch({
  open,
  onOpenChange,
  query: queryProp,
  onQueryChange,
  onSubmit,
  placeholder = "Search",
  cancelLabel = "Cancel",
  action,
  sections = NO_SECTIONS,
  results,
  children,
  emptyText,
  fieldStart,
  fieldEnd,
  className,
}: PhoneSearchProps): ReactNode {
  const [ownQuery, setOwnQuery] = useState("");
  const query = queryProp ?? ownQuery;
  // The sheet's element as state: Base UI mounts it a commit after `open`
  // turns true, and the toaster's dock must be registered once it is there.
  const [sheet, setSheet] = useState<HTMLDivElement | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  const setQuery = useCallback(
    (next: string) => {
      if (queryProp === undefined) setOwnQuery(next);
      onQueryChange?.(next);
    },
    [queryProp, onQueryChange],
  );

  // Each opening starts from an empty field. Read in render, so the sheet
  // never paints one frame of the last search.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open && queryProp === undefined && ownQuery !== "") setOwnQuery("");
  }

  // The caret goes in as the field mounts, which is as the tap's handler
  // returns. A phone raises its keyboard only for a focus that a touch
  // caused, and a focus set a frame later is too late for that.
  const focusField = useCallback((node: HTMLInputElement | null) => {
    input.current = node;
    node?.focus({ preventScroll: true });
  }, []);

  // The sheet hides the bottom bar, so it is a cover for the toaster.
  useEffect(() => {
    if (!sheet) return;
    return registerToastDock(sheet, { kind: "cover", rank: COVER_RANK });
  }, [sheet]);

  const choose = (row: { keepOpen?: boolean; onSelect: () => void }) => {
    if (!row.keepOpen) onOpenChange(false);
    row.onSelect();
  };

  const asked = query.trim() !== "";
  const found = results?.some((section) => section.children || (section.rows && section.rows.length > 0)) ?? false;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Popup
          ref={setSheet}
          data-slot="phone-search"
          className={cx("dl-phone-search", className)}
          aria-label={placeholder}
          initialFocus={input}
        >
          <form
            className="dl-phone-search-head"
            role="search"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              onSubmit?.(query);
            }}
          >
            <label className="dl-phone-search-field">
              <SearchGlyph />
              {fieldStart}
              <input
                ref={focusField}
                type="search"
                className="dl-phone-search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              {fieldEnd}
            </label>
            <Dialog.Close className="dl-phone-search-cancel">{cancelLabel}</Dialog.Close>
          </form>
          <div className="dl-phone-search-body">
            {asked ? (
              children ??
              (found ? (
                <Sections sections={results!} choose={choose} />
              ) : results ? (
                <p className="dl-phone-search-note">{emptyText ? emptyText(query.trim()) : `No results for “${query.trim()}”.`}</p>
              ) : null)
            ) : (
              <>
                {action ? (
                  <button type="button" className="dl-phone-search-row dl-phone-search-action" onClick={() => choose(action)}>
                    {action.icon}
                    <span className="dl-phone-search-one">{action.label}</span>
                  </button>
                ) : null}
                <Sections sections={sections} choose={choose} />
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const NO_SECTIONS: readonly PhoneSearchSection[] = [];
