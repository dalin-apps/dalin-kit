"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { registerToastDock } from "../toast/toast-dock.js";
import { pushBackEntry, type BackEntry } from "./back-entry.js";
import { cx } from "./cx.js";
import { SearchGlyph } from "./icons.js";
import { useToasterTab } from "./toaster-tab.js";

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

/**
 * What a tap on the field leaves alone: a control of the app's own, in
 * `fieldStart` or `fieldEnd`. Anything else in the field (the glass, the
 * padding, the app's plain words) gives the caret to the input.
 */
const FIELD_CONTROL =
  "button, a[href], input, select, textarea, summary, label, [role='button'], [role='combobox'], [role='listbox'], [role='switch'], [role='checkbox'], [role='menuitem'], [contenteditable=''], [contenteditable='true'], [tabindex]:not([tabindex='-1'])";

/** Whether a press on the field landed on one of those controls. */
function onFieldControl(event: ReactMouseEvent<HTMLElement>): boolean {
  const target = event.target instanceof Element ? event.target : null;
  const control = target?.closest(FIELD_CONTROL) ?? null;
  return control !== null && control !== event.currentTarget && event.currentTarget.contains(control);
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
export function PhoneSearch({
  open,
  onOpenChange,
  systemBack = true,
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

  // A toast raised over the sheet keeps its Undo in reach of Tab.
  useToasterTab(open ? sheet : null);

  // The sheet's history entry. Kept in a ref and not tied to one effect's
  // cleanup: React's strict mode runs every effect twice as a tree mounts,
  // and an entry popped and pushed again in one task would lose the second
  // to the first's traversal.
  const backEntry = useRef<BackEntry | null>(null);
  const closeRef = useRef(onOpenChange);
  closeRef.current = onOpenChange;
  useEffect(() => {
    if (open && systemBack) {
      backEntry.current ??= pushBackEntry(() => {
        backEntry.current = null;
        closeRef.current(false);
      });
    } else if (backEntry.current) {
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
        if (mounted.current) return;
        const entry = backEntry.current;
        backEntry.current = null;
        entry?.pop();
      });
    };
  }, []);

  const choose = (row: { keepOpen?: boolean; onSelect: () => void }) => {
    if (row.keepOpen) {
      row.onSelect();
      return;
    }
    const entry = backEntry.current;
    backEntry.current = null;
    onOpenChange(false);
    // With an entry of its own, the row runs once that entry has gone.
    if (entry) entry.pop(row.onSelect);
    else row.onSelect();
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
            {/* A plain box, never a <label>: a label hands every tap on it to
                its first control, which would be the app's picker in
                `fieldStart` and not the input. */}
            <div
              className="dl-phone-search-field"
              // A press on a part that takes no focus would blur the input
              // first, and a phone would drop its keyboard for a moment.
              onMouseDown={(event) => {
                if (!onFieldControl(event)) event.preventDefault();
              }}
              onClick={(event) => {
                if (!onFieldControl(event)) input.current?.focus({ preventScroll: true });
              }}
            >
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
            </div>
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
