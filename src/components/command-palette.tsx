"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import { startedFromKeyboard } from "../helpers/input-modality.js";
import { cx } from "./cx.js";
import { SearchGlyph } from "./icons.js";
import { Kbd } from "./kbd.js";
import { matchParts, matchesQuery } from "./palette-match.js";
import { useToasterTab } from "./toaster-tab.js";

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
   * palette closes, for a search that fetches. A query's list is shown
   * once every source has answered it, so answer at once where the rows
   * are already in memory.
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

type Group = { id: string; heading: string; items: PaletteItem[] };

/**
 * The list on screen: the query it answers, the sources' groups in the
 * order the sources were given, and the groups of any source that answered
 * after the list was shown, in the order they arrived.
 */
type Shown = { query: string | null; groups: Group[]; late: Group[] };

/** Before the first answer: no list at all, the actions included, so nothing is on screen for a first group to land over. */
const NOTHING_SHOWN: Shown = { query: null, groups: [], late: [] };

const ACTIONS_ID = "dl:actions";

/**
 * How long a query's list waits for its slowest source. Past it the list is
 * shown without that source, whose group joins at the end when it answers.
 */
export const SOURCE_WAIT_MS = 400;

/** The keys that move the highlight. They do nothing while the list answers an earlier query. */
const MOVE_KEYS = new Set(["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

/**
 * The Enter hint's cap: the return arrow, as the key itself is printed. One
 * 20px cap, so the slot it holds open on every row costs the row's date 30px
 * and no more. The word would hold 60px open.
 */
const ENTER_KEY = "\u21b5";

/** Whether a key press belongs to a field the reader is typing in. */
function inField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.matches("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='textbox']");
}

/** A row's text with the query's words marked. */
function Marked({ text, query }: { text: string; query: string }): ReactNode {
  return matchParts(text, query).map((part, index) =>
    part.match ? (
      <mark key={index} className="dl-palette-mark">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}

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
export function CommandPalette({
  open: openProp,
  onOpenChange,
  sources = NO_SOURCES,
  actions = NO_ACTIONS,
  actionsHeading = "Actions",
  placeholder = "Search",
  label = "Command palette",
  emptyText,
  hotkey = true,
  appKey,
  className,
}: CommandPaletteProps): ReactNode {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<Shown>(NOTHING_SHOWN);
  // How many sources have yet to answer the query in the field.
  const [busy, setBusy] = useState(0);
  // An Enter pressed while the list was stale, waiting for the answer.
  const heldEnter = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // The panel's element as state: a toast over the dim keeps its action in
  // reach of Tab while the panel is up (toaster-tab.ts).
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  useToasterTab(open ? panel : null);
  const hintId = useId();
  // Whether the palette lands, and leaves, without animation: the keyboard
  // opened it, or the last thing done in it was a key.
  const [instant, setInstant] = useState(false);
  const byKey = useRef(false);

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOwnOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  // What opened it is read as it opens, in render, so the first frame of the
  // palette already knows whether to animate.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setInstant(byKey.current || startedFromKeyboard());
      byKey.current = false;
    } else {
      // The next opening starts from an empty field.
      setQuery("");
      setShown(NOTHING_SHOWN);
      setBusy(0);
      heldEnter.current = false;
    }
  }

  // Ctrl K, and the app's own key.
  const openRef = useRef(open);
  openRef.current = open;
  const appKeys = useMemo(() => (appKey === undefined ? [] : typeof appKey === "string" ? [appKey] : [...appKey]), [appKey]);
  useEffect(() => {
    if (!hotkey && appKeys.length === 0) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey) return;
      const mod = event.metaKey || event.ctrlKey;
      if (hotkey && mod && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        byKey.current = !openRef.current;
        setInstant(true);
        setOpen(!openRef.current);
      } else if (!mod && !openRef.current && appKeys.includes(event.key) && !inField(event.target)) {
        event.preventDefault();
        byKey.current = true;
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey, appKeys, setOpen]);

  // Ask every source. A layout effect, so what the sources answer at once
  // is in the first frame the palette paints. The list is shown whole, once
  // every source has answered this query, so no group lands over rows that
  // are already on screen and moves the highlight off its row.
  useLayoutEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const answers = new Map<string, PaletteItem[]>();
    let out = 0;
    let shownYet = false;
    const show = () => {
      shownYet = true;
      setShown({
        query,
        groups: sources
          .filter((source) => answers.has(source.id))
          .map((source) => ({ id: source.id, heading: source.heading, items: answers.get(source.id)! })),
        late: [],
      });
    };
    const settle = (source: PaletteSource, items: PaletteItem[]) => {
      if (controller.signal.aborted) return;
      out -= 1;
      setBusy(out);
      if (!shownYet) {
        answers.set(source.id, items);
        if (out === 0) show();
        return;
      }
      // The list went up without this source. Its group joins at the end.
      setShown((prev) =>
        prev.query === query ? { ...prev, late: [...prev.late, { id: source.id, heading: source.heading, items }] } : prev,
      );
    };
    for (const source of sources) {
      let answer: PaletteItem[] | Promise<PaletteItem[]>;
      try {
        answer = source.search(query, controller.signal);
      } catch {
        answer = [];
      }
      if (Array.isArray(answer)) {
        answers.set(source.id, answer);
        continue;
      }
      out += 1;
      answer.then(
        (items) => settle(source, items),
        // A search that failed shows nothing, the same as one that found nothing.
        () => settle(source, []),
      );
    }
    setBusy(out);
    if (out === 0) {
      show();
      return () => controller.abort();
    }
    const wait = window.setTimeout(() => {
      if (!shownYet && !controller.signal.aborted) show();
    }, SOURCE_WAIT_MS);
    return () => {
      controller.abort();
      window.clearTimeout(wait);
    };
  }, [open, query, sources]);

  // The list answers an earlier query until this one's answer is shown.
  const stale = shown.query !== query;
  const staleRef = useRef(stale);
  staleRef.current = stale;

  const groups = useMemo<Group[]>(() => {
    // The actions are matched against the query the list answers, so the
    // whole list changes together.
    const answered = shown.query;
    if (answered === null) return [];
    const matched = actions.filter((action) => matchesQuery(`${action.title} ${action.keywords ?? ""}`, answered));
    const found: Group[] = [...shown.groups, { id: ACTIONS_ID, heading: actionsHeading, items: matched }, ...shown.late];
    return found.filter((group) => group.items.length > 0);
  }, [shown, actions, actionsHeading]);

  const select = (item: PaletteItem) => {
    // A row from an earlier query runs nothing, by a press or by a key.
    if (staleRef.current) return;
    if (!item.keepOpen) setOpen(false);
    item.onSelect();
  };

  // The answer an Enter was held for has arrived: run its first row.
  const first = groups[0]?.items[0];
  useEffect(() => {
    if (stale || !heldEnter.current) return;
    heldEnter.current = false;
    if (first) select(first);
    // `select` and `first` are read as they stand when the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, stale]);

  const marks = shown.query ?? "";
  const asked = marks.trim() !== "";
  const settled = !stale && busy === 0;
  const nothing = groups.length === 0 && asked && settled;
  const count = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dl-palette-dim" data-instant={instant ? "" : undefined} />
        <Dialog.Popup
          ref={setPanel}
          data-slot="command-palette"
          className={cx("dl-palette", className)}
          data-instant={instant ? "" : undefined}
          aria-label={label}
          initialFocus={inputRef}
          // A key pressed inside means the keyboard is driving, and what it
          // does next (Enter, Escape) should not animate. A press hands the
          // turn back to the pointer. Heard on the way down: the field
          // handles its own keys and does not always let them bubble.
          onKeyDownCapture={(event: ReactKeyboardEvent) => {
            if (event.key !== "Shift" && event.key !== "Control" && event.key !== "Alt" && event.key !== "Meta") setInstant(true);
            if (!stale) return;
            // The rows on screen answer an earlier query. Enter waits for
            // this one's answer, and the arrows have nothing to move through.
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.stopPropagation();
              heldEnter.current = true;
            } else if (MOVE_KEYS.has(event.key)) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onPointerDownCapture={() => setInstant(false)}
        >
          <Autocomplete.Root
            open
            inline
            items={groups}
            value={query}
            onValueChange={(value, details) => {
              // Choosing a row would write its title into the field.
              if (details.reason === "item-press") return;
              // A held Enter was for the words as they stood.
              heldEnter.current = false;
              setQuery(value);
            }}
            // The sources and the action filter above have matched already.
            filter={null}
            itemToStringValue={(item: PaletteItem) => item.title}
            autoHighlight="always"
            keepHighlight
          >
            <div className="dl-palette-query">
              <SearchGlyph />
              <Autocomplete.Input
                ref={inputRef}
                className="dl-palette-input"
                placeholder={placeholder}
                aria-label={placeholder}
                aria-describedby={hintId}
                aria-busy={stale || busy > 0 || undefined}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <Dialog.Close className="dl-palette-close" aria-label="Close" tabIndex={-1}>
                <Kbd>Esc</Kbd>
              </Dialog.Close>
            </div>
            {/* The hint is a picture of a key, hidden from a screen reader; these are its words. */}
            <span id={hintId} className="dl-palette-status">
              Press Enter to open the highlighted result.
            </span>
            {/* One region that stays mounted, so a change in its words is announced. */}
            <div role="status" aria-live="polite" className="dl-palette-status">
              {nothing ? "No results." : asked && settled ? `${count} ${count === 1 ? "result" : "results"}.` : ""}
            </div>
            <div className="dl-palette-scroll" data-empty={groups.length === 0 ? "" : undefined}>
              {nothing ? <p className="dl-palette-note">{emptyText ? emptyText(query.trim()) : `No results for “${query.trim()}”.`}</p> : null}
              <Autocomplete.List className="dl-palette-list" data-stale={stale ? "" : undefined}>
                {(group: Group) => (
                  <Autocomplete.Group key={group.id} items={group.items} className="dl-palette-group">
                    <Autocomplete.GroupLabel className="dl-palette-head">{group.heading}</Autocomplete.GroupLabel>
                    <Autocomplete.Collection>
                      {(item: PaletteItem) => (
                        <Autocomplete.Item
                          key={`${group.id}:${item.id}`}
                          value={item}
                          className="dl-palette-row"
                          data-done={item.done ? "" : undefined}
                          onClick={() => select(item)}
                        >
                          {item.icon ? (
                            <span className="dl-palette-icon" aria-hidden="true">
                              {item.icon}
                            </span>
                          ) : null}
                          <span className="dl-palette-text">
                            <span className="dl-palette-title">
                              <Marked text={item.title} query={marks} />
                            </span>
                            {item.subtitle ? (
                              <span className="dl-palette-sub">
                                <Marked text={item.subtitle} query={marks} />
                              </span>
                            ) : null}
                          </span>
                          {item.meta ? <span className="dl-palette-meta">{item.meta}</span> : null}
                          {/* The row's own shortcut, and the Enter hint that takes
                              its place on the focused row. One slot holds both, so
                              nothing in the row moves as the focus does. */}
                          <span className="dl-palette-keys" aria-hidden="true">
                            {item.keys && item.keys.length > 0 ? <Kbd keys={item.keys} className="dl-palette-own" /> : null}
                            <Kbd className="dl-palette-enter">{ENTER_KEY}</Kbd>
                          </span>
                        </Autocomplete.Item>
                      )}
                    </Autocomplete.Collection>
                  </Autocomplete.Group>
                )}
              </Autocomplete.List>
            </div>
          </Autocomplete.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** One array each for "none", so a palette given neither does not search again on every render. */
const NO_SOURCES: readonly PaletteSource[] = [];
const NO_ACTIONS: readonly PaletteItem[] = [];
