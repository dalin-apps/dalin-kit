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

type Group = { id: string; heading: string; items: PaletteItem[] };

const ACTIONS_ID = "dl:actions";

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
  const [results, setResults] = useState<Record<string, PaletteItem[]>>({});
  const [busy, setBusy] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
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
      setResults({});
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

  // Ask every source. A layout effect, so what a source answers at once is
  // in the first frame the palette paints. A source that answers later
  // keeps its last rows on screen until the new ones arrive.
  useLayoutEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const settle = (id: string, items: PaletteItem[]) => {
      if (controller.signal.aborted) return;
      setResults((prev) => ({ ...prev, [id]: items }));
    };
    for (const source of sources) {
      let answer: PaletteItem[] | Promise<PaletteItem[]>;
      try {
        answer = source.search(query, controller.signal);
      } catch {
        answer = [];
      }
      if (Array.isArray(answer)) {
        settle(source.id, answer);
        continue;
      }
      setBusy((n) => n + 1);
      answer
        .then(
          (items) => settle(source.id, items),
          // A search that failed shows nothing, the same as one that found nothing.
          () => settle(source.id, []),
        )
        .finally(() => setBusy((n) => n - 1));
    }
    return () => controller.abort();
  }, [open, query, sources]);

  const groups = useMemo<Group[]>(() => {
    const found: Group[] = sources.map((source) => ({
      id: source.id,
      heading: source.heading,
      items: results[source.id] ?? [],
    }));
    const matched = actions.filter((action) => matchesQuery(`${action.title} ${action.keywords ?? ""}`, query));
    found.push({ id: ACTIONS_ID, heading: actionsHeading, items: matched });
    return found.filter((group) => group.items.length > 0);
  }, [sources, results, actions, actionsHeading, query]);

  const select = (item: PaletteItem) => {
    if (!item.keepOpen) setOpen(false);
    item.onSelect();
  };

  const asked = query.trim() !== "";
  const nothing = groups.length === 0 && asked && busy === 0;
  const count = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dl-palette-dim" data-instant={instant ? "" : undefined} />
        <Dialog.Popup
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
                aria-busy={busy > 0 || undefined}
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
              {nothing ? "No results." : asked && busy === 0 ? `${count} ${count === 1 ? "result" : "results"}.` : ""}
            </div>
            <div className="dl-palette-scroll" data-empty={groups.length === 0 ? "" : undefined}>
              {nothing ? <p className="dl-palette-note">{emptyText ? emptyText(query.trim()) : `No results for “${query.trim()}”.`}</p> : null}
              <Autocomplete.List className="dl-palette-list">
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
                              <Marked text={item.title} query={query} />
                            </span>
                            {item.subtitle ? (
                              <span className="dl-palette-sub">
                                <Marked text={item.subtitle} query={query} />
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
