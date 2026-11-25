"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import { registerToastDock } from "../toast/toast-dock.js";
import { pushBackEntry, type BackEntry } from "./back-entry.js";
import { cx } from "./cx.js";
import { SearchGlyph } from "./icons.js";
import { useLongPress } from "./long-press.js";
import { RowMenu, pointAnchor, type RowMenuState } from "./palette-menu.js";
import { matchParts, scoreParts } from "./palette-match.js";
import { usePaletteResults } from "./palette-results.js";
import type { PaletteGroup, PaletteItem, PaletteMenuEntry, PaletteSource } from "./palette-types.js";
import type { PaletteCompletion } from "./palette.js";
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
  /** What ends the row at the right, small and faint: a size, "7 items". */
  meta?: ReactNode;
  /** Leaves search open after the row is tapped. It closes by default. */
  keepOpen?: boolean;
  /**
   * What else the row can do, as the family's menu at the finger: opened by
   * a long press (450ms of a still finger), or a right click. The same
   * entries a palette row's `menu` takes.
   */
  menu?: () => readonly PaletteMenuEntry[];
  /** A long press of the app's own, for a row whose hold does something other than a menu. `menu` wins. */
  onLongPress?: (point: { x: number; y: number }) => void;
  /**
   * Keeps the row lit, for a hold of the app's own (`onLongPress`) whose
   * menu is up. A row's `menu` lights it by itself.
   */
  held?: boolean;
  /**
   * Steps the row back, at a palette row's steps: `true` is 85%, for a row
   * the app no longer vouches for, `"waiting"` 60%, for a row left from
   * the last answer. Both at once, since nothing on the sheet fades. A tap
   * still runs it.
   */
  dim?: boolean | "waiting";
  /** Extra classes for the row, beside `dl-phone-search-row`. */
  className?: string;
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
  /**
   * What search asks, the same sources the desktop palette is given. Before
   * a word is typed each source's answer to `""` is a section, under the
   * action row and before `sections`. With a query, the sources' groups
   * come back as sections, and the list changes only once every source has
   * answered, as the palette's does; a source slower than `SOURCE_WAIT_MS`
   * joins at the end. `results` and `children` win over them, so an app
   * moves over one surface at a time.
   */
  sources?: readonly PaletteSource[];
  /**
   * The app's actions, the palette's own. Ranked against a query as the
   * palette ranks them, and listed after the sources' groups. Before a word
   * is typed they are not listed: the action row is the one that leads.
   */
  actions?: readonly PaletteItem[];
  /** The heading over the actions. "Actions". */
  actionsHeading?: string;
  /**
   * Whether a filter in `fieldEnd` is on. The sheet then shows `results`
   * before a word is typed, as it does for a query, so a pick with no words
   * lists what it leaves.
   */
  narrowed?: boolean;
  /** For a query: the app's own results in place of `results`. */
  children?: ReactNode;
  /**
   * Before any query: the app's own content under the sections, such as
   * calendar's line that says what search finds. A line of words takes the
   * class `dl-phone-search-note`.
   */
  beforeQuery?: ReactNode;
  /**
   * Hides the sheet under something the app draws over it, such as the
   * reader a result opened, without closing search. The sheet stays
   * mounted, so the results, their scroll and the query are there on the
   * way back. While covered it is out of sight and inert, it gives the
   * page back (no focus trap, no scroll lock, nothing hidden from a screen
   * reader), and Escape and presses are the covering surface's own.
   */
  covered?: boolean;
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
  /**
   * The insides of a row drawn from `sources` or `actions`, for a row the
   * kit's anatomy does not fit: drive's names cut in the middle. Return
   * undefined to keep the kit's. The row's tap, long press, `dim` and
   * `className` stay the kit's.
   */
  rowContent?: (item: PaletteItem, state: PhoneSearchRowState) => ReactNode | undefined;
  /**
   * A source's group laid out by the app, under the group's heading:
   * calendar's day headings and its Past divider between the rows. `row`
   * draws one of the kit's rows for an item (keyed by its id); the app puts
   * its own lines between them, each with a key of its own. Return
   * undefined to keep the kit's plain run of rows.
   */
  groupContent?: (group: PaletteGroup, row: (item: PaletteItem) => ReactNode) => ReactNode | undefined;
  /**
   * A ghost completion in the field, the palette's: faint words after the
   * typed ones. A tap on them takes it, and so do Tab and ArrowRight at the
   * end on a keyboard. Pass null while there is nothing to offer, and leave
   * it out where search never offers one: the field wraps the input for it.
   */
  completion?: PhoneSearchCompletion | null;
  /** The field's input, for an app that focuses, blurs or measures it. */
  inputRef?: Ref<HTMLInputElement>;
  /**
   * The app's results scroll themselves (mail's message list). The body
   * then stops scrolling and gives its height to them, and leaves its
   * bottom space (the safe area, 32px and the keyboard) to that scroller:
   * pad it by `var(--dl-phone-search-end)`, which the body writes, so the
   * keyboard is counted once.
   */
  ownScroller?: boolean;
  /** Extra classes for the sheet, beside `dl-phone-search`. */
  className?: string;
};

/** What a row drawn from `sources` is, for an app that draws its insides itself. */
export type PhoneSearchRowState = {
  /** The words to mark in it: the words the list answers. */
  marks: string;
  /** Whether only the score found it, so its letters are marked and not whole words. */
  byScore: boolean;
  /** Whether its menu is up. */
  held: boolean;
};

/** What a ghost completion on the phone is: the palette's, and a tap on the faint words takes it too. */
export type PhoneSearchCompletion = PaletteCompletion;

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

/** What a row hands `choose`: whether search stays open, and what to run. */
type Chosen = { keepOpen?: boolean; onSelect?: () => void };

/** A row's words with the query's words marked, or, for a row only the score found, the letters it took. */
function PhoneMarked({ text, query, byScore = false }: { text: string; query: string; byScore?: boolean }): ReactNode {
  return (byScore ? scoreParts(text, query) : matchParts(text, query)).map((part, index) =>
    part.match ? (
      <mark key={index} className="dl-phone-search-mark">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}

/** One of the kit's rows: a tap runs it, a long press opens its menu or the app's own hold. */
function PhoneRow({
  title,
  subtitle,
  leading,
  meta,
  content,
  onTap,
  onHold,
  held,
  dim,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  meta?: ReactNode;
  /** The app's own insides, in place of the four above. */
  content?: ReactNode;
  onTap: () => void;
  onHold?: (point: { x: number; y: number }) => void;
  held?: boolean;
  dim?: boolean | "waiting";
  className?: string;
}): ReactNode {
  // While a finger's hold runs, the row says so: phone.css lights it as it
  // lights the row whose menu is up.
  const [pressing, setPressing] = useState(false);
  const hold = useLongPress(onHold, setPressing);
  return (
    <button
      type="button"
      className={cx("dl-phone-search-row", className)}
      data-held={held ? "" : undefined}
      data-pressing={pressing ? "" : undefined}
      data-dim={dim === "waiting" ? "waiting" : dim ? "" : undefined}
      onClick={onTap}
      {...hold}
    >
      {content !== undefined ? content : <RowInsides title={title} subtitle={subtitle} leading={leading} meta={meta} />}
    </button>
  );
}

/** The kit's anatomy of a row: the lead, one line or two, and the meta. */
function RowInsides({ title, subtitle, leading, meta }: { title: ReactNode; subtitle?: ReactNode; leading?: ReactNode; meta?: ReactNode }): ReactNode {
  return (
    <>
      {leading}
      {subtitle ? (
        <span className="dl-phone-search-two">
          <b>{title}</b>
          <small>{subtitle}</small>
        </span>
      ) : (
        <span className="dl-phone-search-one">{title}</span>
      )}
      {meta !== undefined && meta !== null && meta !== false ? <span className="dl-phone-search-meta">{meta}</span> : null}
    </>
  );
}

type Hold = (key: string, row: { menu?: () => readonly PaletteMenuEntry[]; onLongPress?: (point: { x: number; y: number }) => void }) =>
  | ((point: { x: number; y: number }) => void)
  | undefined;

function Sections({
  sections,
  choose,
  hold,
  heldKey,
}: {
  sections: readonly PhoneSearchSection[];
  choose: (row: Chosen) => void;
  hold: Hold;
  heldKey: string | null;
}): ReactNode {
  return sections.map((section) => {
    const empty = !section.children && (!section.rows || section.rows.length === 0);
    if (empty) return null;
    const sectionKey = section.id ?? section.heading;
    return (
      <section key={sectionKey} className="dl-phone-search-section">
        <h2 className="dl-phone-search-heading">{section.heading}</h2>
        {section.children ??
          section.rows!.map((row) => {
            const key = `${sectionKey}:${row.id}`;
            return (
              <PhoneRow
                key={row.id}
                title={row.title}
                subtitle={row.subtitle}
                leading={row.leading}
                meta={row.meta}
                onTap={() => choose(row)}
                onHold={hold(key, row)}
                held={heldKey === key || row.held}
                dim={row.dim}
                className={row.className}
              />
            );
          })}
      </section>
    );
  });
}

/** The groups the sources and actions answered, as sections of the kit's rows with the query marked. */
function GroupSections({
  groups,
  marks,
  byScore,
  choose,
  hold,
  heldKey,
  rowContent,
  groupContent,
}: {
  groups: readonly PaletteGroup[];
  marks: string;
  /** The rows only the score found. */
  byScore: ReadonlySet<PaletteItem>;
  choose: (row: Chosen) => void;
  hold: Hold;
  heldKey: string | null;
  rowContent?: PhoneSearchProps["rowContent"];
  groupContent?: PhoneSearchProps["groupContent"];
}): ReactNode {
  return groups.map((group) => {
    const row = (item: PaletteItem): ReactNode => {
      const key = `${group.id}:${item.id}`;
      const scored = byScore.has(item);
      const held = heldKey === key;
      const own = rowContent?.(item, { marks, byScore: scored, held });
      return (
        <PhoneRow
          key={item.id}
          title={<PhoneMarked text={item.title} query={marks} byScore={scored} />}
          subtitle={item.subtitle ? <PhoneMarked text={item.subtitle} query={marks} /> : undefined}
          leading={item.icon}
          meta={item.meta}
          content={own}
          onTap={() => choose(item)}
          onHold={hold(key, item)}
          held={held}
          dim={item.dim}
          className={item.className}
        />
      );
    };
    const laid = groupContent?.(group, row);
    return (
      <section key={group.id} className="dl-phone-search-section">
        {group.heading ? <h2 className="dl-phone-search-heading">{group.heading}</h2> : null}
        {laid !== undefined ? laid : group.items.map(row)}
        {group.note ? <p className="dl-phone-search-note">{group.note}</p> : null}
      </section>
    );
  });
}

/** Whether the caret sits at the end of the field, with nothing selected. */
function caretAtEnd(input: HTMLInputElement): boolean {
  return input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
}

/** Hands a node to an app's ref, a function or an object. */
function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
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
  sources,
  actions,
  actionsHeading = "Actions",
  narrowed = false,
  children,
  beforeQuery,
  covered = false,
  emptyText,
  fieldStart,
  fieldEnd,
  rowContent,
  groupContent,
  completion,
  inputRef,
  ownScroller = false,
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
  const appInput = useRef(inputRef);
  appInput.current = inputRef;
  const focusField = useCallback((node: HTMLInputElement | null) => {
    input.current = node;
    assignRef(appInput.current, node);
    node?.focus({ preventScroll: true });
  }, []);

  // The sheet hides the bottom bar, so it is a cover for the toaster. Not
  // while it is itself covered: what is drawn over it owns the screen then.
  useEffect(() => {
    if (!sheet || covered) return;
    return registerToastDock(sheet, { kind: "cover", rank: COVER_RANK });
  }, [sheet, covered]);

  // The on-screen keyboard. A phone lays it over the page without resizing
  // it, so a sheet fixed to the screen keeps its full height and its last
  // rows sit under the keys. The visual viewport is what is left in view:
  // what it lacks of the window's height is the keyboard, written on the
  // sheet for phone.css to pad the results by. Nothing is written while
  // nothing is covered, so an app's own `--kb-inset` still applies.
  useEffect(() => {
    const view = window.visualViewport;
    if (!sheet || !view) return;
    const write = () => {
      // A pinch zoom shrinks the visual viewport too, and is no keyboard.
      const covered = view.scale > 1.01 ? 0 : Math.round(window.innerHeight - view.offsetTop - view.height);
      if (covered > 0) sheet.style.setProperty("--dl-phone-kb", `${covered}px`);
      else sheet.style.removeProperty("--dl-phone-kb");
    };
    write();
    view.addEventListener("resize", write);
    view.addEventListener("scroll", write);
    return () => {
      view.removeEventListener("resize", write);
      view.removeEventListener("scroll", write);
    };
  }, [sheet]);

  // A toast raised over the sheet keeps its Undo in reach of Tab.
  useToasterTab(open && !covered ? sheet : null);

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

  // The sources and actions, asked as the palette asks them.
  const searching = sources !== undefined || actions !== undefined;
  const answers = usePaletteResults({
    active: open && searching,
    query,
    sources: sources ?? NO_SOURCES,
    actions: actions ?? NO_ACTIONS,
    actionsHeading,
    actionsNeedWords: true,
  });
  const staleRef = useRef(answers.stale);
  staleRef.current = answers.stale;

  const choose = (row: Chosen, fromList = false) => {
    // A row from an earlier query runs nothing.
    if (fromList && staleRef.current) return;
    const run = () => row.onSelect?.();
    if (row.keepOpen) {
      run();
      return;
    }
    const entry = backEntry.current;
    backEntry.current = null;
    onOpenChange(false);
    // With an entry of its own, the row runs once that entry has gone.
    if (entry) entry.pop(run);
    else run();
  };
  const chooseFromList = (row: Chosen) => choose(row, true);

  // A row's menu, opened by a long press.
  const [menu, setMenu] = useState<RowMenuState | null>(null);
  const hold: Hold = (key, row) => {
    if (row.menu) {
      const entriesOf = row.menu;
      return (point) => {
        const entries = entriesOf();
        if (entries.length > 0) setMenu({ key, entries, anchor: pointAnchor(point.x, point.y), at: Date.now() });
      };
    }
    return row.onLongPress;
  };
  if (!open && menu) setMenu(null);

  const asked = query.trim() !== "" || narrowed;
  const found = results?.some((section) => section.children || (section.rows && section.rows.length > 0)) ?? false;
  const answered = answers.answered ?? "";
  const settled = !answers.stale && answers.busy === 0;
  const groupList = (groups: readonly PaletteGroup[]) => (
    <div className="dl-phone-search-results" data-stale={answers.stale ? "" : undefined} aria-busy={answers.stale || answers.busy > 0 || undefined}>
      <GroupSections
        groups={groups}
        marks={answered}
        byScore={answers.byScore}
        choose={chooseFromList}
        hold={hold}
        heldKey={menu?.key ?? null}
        rowContent={rowContent}
        groupContent={groupContent}
      />
    </div>
  );
  const emptyNote = (
    <p className="dl-phone-search-note">{emptyText ? emptyText(query.trim()) : query.trim() ? `No results for “${query.trim()}”.` : "No results."}</p>
  );

  const keyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!completion || event.nativeEvent.isComposing) return;
    if ((event.key === "Tab" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) || (event.key === "ArrowRight" && caretAtEnd(event.currentTarget))) {
      event.preventDefault();
      completion.onAccept();
    }
  };
  const field = (
    <input
      ref={focusField}
      type="search"
      className="dl-phone-search-input"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      onKeyDown={keyDown}
      placeholder={placeholder}
      aria-label={placeholder}
      enterKeyHint="search"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      spellCheck={false}
      // A forward Tab takes the completion, so the toast's place in the loop waits for that press.
      data-dl-owns-tab={completion ? "" : undefined}
    />
  );

  return (
    <Dialog.Root
      open={open}
      // Covered, the sheet is no longer the screen: the page goes back to
      // what covers it, and nothing done there closes search.
      modal={!covered}
      disablePointerDismissal={covered}
      onOpenChange={(next, details) => {
        if (covered && !next) {
          details.cancel();
          details.allowPropagation();
          return;
        }
        onOpenChange(next, details);
      }}
    >
      <Dialog.Portal>
        <Dialog.Popup
          ref={setSheet}
          data-slot="phone-search"
          className={cx("dl-phone-search", className)}
          aria-label={placeholder}
          initialFocus={input}
          data-covered={covered ? "" : undefined}
          inert={covered}
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
              {completion === undefined ? (
                field
              ) : (
                <span className="dl-phone-search-entry">
                  {completion ? (
                    <span className="dl-phone-search-ghost">
                      <span className="dl-phone-search-ghost-typed" aria-hidden="true">
                        {query}
                      </span>
                      <button
                        type="button"
                        className="dl-phone-search-ghost-rest"
                        aria-label={`Complete as ${query}${completion.suffix}`}
                        tabIndex={-1}
                        // The caret stays in the field, and the keyboard up.
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          completion.onAccept();
                          input.current?.focus({ preventScroll: true });
                        }}
                      >
                        {completion.suffix}
                      </button>
                    </span>
                  ) : null}
                  {field}
                </span>
              )}
              {fieldEnd}
            </div>
            <Dialog.Close className="dl-phone-search-cancel">{cancelLabel}</Dialog.Close>
          </form>
          <div className="dl-phone-search-body" data-own-scroller={ownScroller ? "" : undefined}>
            {asked ? (
              children ??
              (found ? (
                <Sections sections={results!} choose={choose} hold={hold} heldKey={menu?.key ?? null} />
              ) : results ? (
                emptyNote
              ) : searching ? (
                answers.groups.length > 0 ? (
                  groupList(answers.groups)
                ) : settled && answers.answered !== null ? (
                  emptyNote
                ) : null
              ) : null)
            ) : (
              <>
                {action ? (
                  <button type="button" className="dl-phone-search-row dl-phone-search-action" onClick={() => choose(action)}>
                    {action.icon}
                    <span className="dl-phone-search-one">{action.label}</span>
                  </button>
                ) : null}
                {searching && answers.groups.length > 0 ? groupList(answers.groups) : null}
                <Sections sections={sections} choose={choose} hold={hold} heldKey={menu?.key ?? null} />
                {beforeQuery}
              </>
            )}
          </div>
          <RowMenu
            state={menu}
            onClose={() => setMenu(null)}
            onRun={(entry) => choose(entry)}
            className="dl-phone-search-menu"
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const NO_SECTIONS: readonly PhoneSearchSection[] = [];
const NO_SOURCES: readonly PaletteSource[] = [];
const NO_ACTIONS: readonly PaletteItem[] = [];
