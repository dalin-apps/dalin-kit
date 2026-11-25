"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import { startedFromKeyboard } from "../helpers/input-modality.js";
import { cx } from "./cx.js";
import { SearchGlyph } from "./icons.js";
import { Kbd } from "./kbd.js";
import { RowMenu, pointAnchor, underAnchor, type RowMenuState } from "./palette-menu.js";
import { matchParts, scoreParts } from "./palette-match.js";
import { usePaletteResults, type PaletteResults } from "./palette-results.js";
import type { PaletteGroup, PaletteItem, PaletteMenuEntry, PalettePage, PaletteSource } from "./palette-types.js";
import { useToasterTab } from "./toaster-tab.js";

/** The keys that move the highlight. They do nothing while the list answers an earlier query. */
const MOVE_KEYS = new Set(["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

/**
 * The Enter hint's cap: the return arrow, as the key itself is printed. One
 * 20px cap, so the slot it holds open on every row costs the row's date 30px
 * and no more. The word would hold 60px open.
 */
const ENTER_KEY = "↵";

/** Whether a key press belongs to a field the reader is typing in. */
function inField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.matches("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='textbox']");
}

/** Whether the caret sits at the end of the field, with nothing selected. */
function caretAtEnd(input: HTMLInputElement): boolean {
  return input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
}

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

/** One open page, and the words its parent held when it opened. */
type OpenPage = { page: PalettePage; parentQuery: string };

/** A body that takes the list's place, and what the status region says while it shows. */
type BodyState = { status?: string };

type PaletteContextValue = {
  /** How many rows the list hands Base UI, for `aria-expanded`. */
  rowCount: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  inputRef: MutableRefObject<HTMLInputElement | null>;
  hintId: string;
  placeholder: string;
  pages: readonly OpenPage[];
  openPage: (page: PalettePage) => void;
  backTo: (depth: number) => void;
  results: PaletteResults;
  marks: string;
  active: PaletteItem | undefined;
  select: (item: PaletteItem) => void;
  emptyText: ((query: string) => ReactNode) | undefined;
  body: BodyState | null;
  setBody: (body: BodyState | null) => void;
  menu: RowMenuState | null;
  openMenu: (item: PaletteItem, key: string, at: Element | { x: number; y: number }) => boolean;
  keyOf: (item: PaletteItem) => string;
  heldRow: MutableRefObject<boolean>;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

function usePaletteContext(part: string): PaletteContextValue {
  const value = useContext(PaletteContext);
  if (!value) throw new Error(`<${part}> belongs inside a <Palette>.`);
  return value;
}

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
export function usePalette(): PaletteControls {
  const ctx = usePaletteContext("usePalette");
  return {
    query: ctx.query,
    setQuery: ctx.setQuery,
    results: ctx.results,
    pages: ctx.pages.map((open) => open.page),
    openPage: ctx.openPage,
    back: () => ctx.backTo(ctx.pages.length - 1),
    input: ctx.inputRef.current,
    close: () => ctx.setOpen(false),
  };
}

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
export type PaletteProps = PaletteOwnProps &
  Omit<HTMLAttributes<HTMLDivElement>, keyof PaletteOwnProps | KitPopupProp>;

/**
 * The panel's attributes the kit and Base UI own: the dialog's role and
 * name, the popup's tabIndex -1 (focus restore and the toast's Tab fallback
 * land on it) and Base UI's hidden. Base UI lays an element's own props over
 * its internal ones, so one of these from the app would win; they are
 * dropped before the rest go to the panel.
 */
type KitPopupProp = "role" | "aria-label" | "aria-labelledby" | "aria-modal" | "tabIndex" | "hidden" | "data-slot";
const KIT_POPUP_PROPS: readonly string[] = ["role", "aria-label", "aria-labelledby", "aria-modal", "tabIndex", "hidden", "data-slot"];

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
export function Palette({
  open: openProp,
  onOpenChange,
  query: queryProp,
  onQueryChange,
  sources = NO_SOURCES,
  actions = NO_ACTIONS,
  actionsHeading = "Actions",
  tail,
  results: ownResults,
  marks: marksOf,
  placeholder = "Search",
  label = "Command palette",
  emptyText,
  hotkey = true,
  appKey,
  onEscape,
  finalFocus,
  zIndex,
  className,
  children,
  style,
  onKeyDownCapture,
  onPointerDownCapture,
  ...passed
}: PaletteProps): ReactNode {
  const attributes: Record<string, unknown> = { ...passed };
  for (const name of KIT_POPUP_PROPS) delete attributes[name];
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const [ownQuery, setOwnQuery] = useState("");
  const query = queryProp ?? ownQuery;
  const [pages, setPages] = useState<readonly OpenPage[]>(NO_PAGES);
  // The row the highlight is on, for the hint's verb.
  const [active, setActive] = useState<PaletteItem | undefined>(undefined);
  const [body, setBody] = useState<BodyState | null>(null);
  const [menu, setMenu] = useState<RowMenuState | null>(null);
  // An Enter pressed while the list was stale, waiting for the answer.
  const heldEnter = useRef(false);
  // The controls that held the last Escape, each said to be an open menu.
  const escapeHeld = useRef<EscapeHeld>(NO_ESCAPE_HELD);
  // An Enter pressed on a row that waits for the next answer (`dim: "waiting"`).
  // It belongs to that place in the list: a key or a pointer that moves the
  // highlight, new words, a page and a close each drop it.
  const heldRow = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // The panel's element as state: a toast over the dim keeps its action in
  // reach of Tab while the panel is up (toaster-tab.ts).
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  // Held, as the sheet's is: Base UI's focus guards turn Tab back a frame
  // late, and two quick presses from the filter left the palette.
  useToasterTab(open ? panel : null, PALETTE_TAB);
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
  const setQuery = useCallback(
    (next: string) => {
      if (queryProp === undefined) setOwnQuery(next);
      onQueryChange?.(next);
    },
    [queryProp, onQueryChange],
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
      // The next opening starts from an empty field, on the first page. An
      // app that owns the words decides what an opening starts from: mail
      // opens on the search the list shows.
      if (queryProp === undefined) setOwnQuery("");
      setPages(NO_PAGES);
      setMenu(null);
      heldEnter.current = false;
      heldRow.current = false;
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

  // The page on top decides what is searched.
  const top = pages[pages.length - 1]?.page;
  const asked = usePaletteResults({
    // A page's own sources answer on it, whatever list the first page uses.
    active: open && (!ownResults || top !== undefined),
    query,
    scope: pages.map((p) => p.page.id).join("/"),
    sources: top ? (top.sources ?? NO_SOURCES) : sources,
    actions: top ? (top.actions ?? NO_ACTIONS) : actions,
    actionsHeading: top ? (top.actionsHeading ?? "Actions") : actionsHeading,
    tail: top ? undefined : tail,
  });
  const results: PaletteResults = useMemo(() => {
    if (!ownResults || top) return asked;
    return {
      groups: ownResults.groups.filter((group) => group.items.length > 0),
      answered: ownResults.query,
      stale: ownResults.query !== query,
      busy: ownResults.busy ? 1 : 0,
      failed: NO_FAILED,
      retry: asked.retry,
      byScore: NO_SCORED,
    };
  }, [ownResults, top, asked, query]);
  const { stale } = results;
  const keys = useRef(new WeakMap<PaletteItem, string>());
  const keyOf = useCallback((item: PaletteItem) => keys.current.get(item) ?? item.id, []);

  // A new list starts on its first row. Base UI keeps the highlight's
  // index, so a list whose rows changed under it (a filter pick) put the
  // highlight on whatever row now stood there. The same rows coming back,
  // or a late group joining at the end, keep it where it is. Base UI has no
  // way to set the highlight, so the list is handed to it empty for one
  // commit, before paint, and it comes back to the first row on its own.
  const shownRows = body ? NO_ROWS : results.groups.flatMap((group) => group.items.map((item) => `${group.id}:${item.id}`));
  const rowSignature = shownRows.join("\n");
  const [lastRows, setLastRows] = useState<{ signature: string; rows: readonly string[] }>({ signature: rowSignature, rows: shownRows });
  const [rehighlight, setRehighlight] = useState(false);
  if (lastRows.signature !== rowSignature) {
    setLastRows({ signature: rowSignature, rows: shownRows });
    // Found by its key: an app that builds its own list may hand new objects for the same rows.
    const activeKey = active ? keys.current.get(active) : undefined;
    const at = activeKey === undefined ? -1 : lastRows.rows.indexOf(activeKey);
    const kept = at >= 0 && shownRows[at] === activeKey;
    if (at > 0 && !kept && shownRows.length > 0) {
      setRehighlight(true);
      // An Enter held on a row the list no longer has is for nothing on it.
      heldRow.current = false;
    }
  }
  useLayoutEffect(() => {
    if (rehighlight) setRehighlight(false);
  }, [rehighlight]);

  const staleRef = useRef(stale);
  staleRef.current = stale;

  const openPage = useCallback(
    (page: PalettePage) => {
      setPages((prev) => [...prev, { page, parentQuery: query }]);
      setMenu(null);
      heldEnter.current = false;
      heldRow.current = false;
      setQuery("");
      inputRef.current?.focus({ preventScroll: true });
    },
    [query, setQuery],
  );
  const backTo = useCallback(
    (depth: number) => {
      if (depth < 0 || depth >= pages.length) return;
      const restored = pages[depth]!.parentQuery;
      setPages(pages.slice(0, depth));
      setMenu(null);
      heldEnter.current = false;
      heldRow.current = false;
      setQuery(restored);
      inputRef.current?.focus({ preventScroll: true });
    },
    [pages, setQuery],
  );

  const select = (item: PaletteItem) => {
    // A row from an earlier query runs nothing, by a press or by a key.
    if (staleRef.current) return;
    if (item.page) {
      openPage(item.page);
      item.onSelect?.();
      return;
    }
    if (!item.keepOpen) setOpen(false);
    item.onSelect?.();
  };

  // The answer an Enter was held for has arrived: run its first row.
  const first = body ? undefined : results.groups[0]?.items[0];
  useEffect(() => {
    if (stale || !heldEnter.current) return;
    heldEnter.current = false;
    if (first) select(first);
    // `select` and `first` are read as they stand when the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.groups, stale]);

  // An Enter held on a waiting row runs the highlighted row once it stops
  // waiting. An answer with nothing to highlight drops it, so no later
  // update runs a row nobody chose.
  useEffect(() => {
    if (!heldRow.current || stale) return;
    if (!active) {
      if (results.busy === 0) heldRow.current = false;
      return;
    }
    if (active.dim === "waiting") return;
    heldRow.current = false;
    select(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.groups, active, stale]);

  // Each row's key in its group, so a menu knows which row is its own.
  for (const group of results.groups) for (const item of group.items) keys.current.set(item, `${group.id}:${item.id}`);

  const openMenu = useCallback((item: PaletteItem, key: string, at: Element | { x: number; y: number }) => {
    const entries = item.menu?.() ?? [];
    if (entries.length === 0) return false;
    const anchor = at instanceof Element ? underAnchor(at) : pointAnchor(at.x, at.y);
    setMenu({ key, entries, anchor, at: Date.now() });
    return true;
  }, []);
  const runEntry = (entry: Exclude<PaletteMenuEntry, "separator">) => {
    if (!entry.keepOpen) setOpen(false);
    entry.onSelect();
  };

  const answered = results.answered ?? "";
  const marks = marksOf ? marksOf(answered) : answered;
  const placeholderNow = top?.placeholder ?? placeholder;
  const emptyNow = top ? top.emptyText : emptyText;
  const zStyle = zIndex === undefined ? undefined : ({ "--dl-palette-z": String(zIndex) } as CSSProperties);

  const value: PaletteContextValue = {
    rowCount: rehighlight ? 0 : shownRows.length,
    open,
    setOpen,
    query,
    setQuery,
    inputRef,
    hintId,
    placeholder: placeholderNow,
    pages,
    openPage,
    backTo,
    results,
    marks,
    active,
    select,
    emptyText: emptyNow,
    body,
    setBody,
    menu,
    openMenu,
    keyOf,
    heldRow,
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next, details) => {
        if (!next && details.reason === "escape-key") {
          // A menu of the palette's own that is open takes Escape first: the
          // filter's, pressed before focus has moved into it, and a row's.
          // The key goes on to the menu, which closes on it. A control that
          // says it is open but did not take the last press (it is open
          // still) does not hold the palette a second time. One press is
          // heard twice, by the panel and then the document, and both hear
          // the same answer.
          const press = details.event;
          const held = menu ? null : panel ? ownMenusOpen(panel, inputRef.current) : [];
          const last = escapeHeld.current;
          const again = last.press !== press && held !== null && held.length > 0 && held.every((el) => last.controls.has(el));
          if (menu || (held && held.length > 0 && !again)) {
            escapeHeld.current = { press, controls: new Set(held ?? []) };
            details.cancel();
            details.allowPropagation();
            return;
          }
          escapeHeld.current = NO_ESCAPE_HELD;
          // The app's own Escape first, then one page back.
          if (onEscape?.()) {
            details.cancel();
            return;
          }
          if (pages.length > 0) {
            details.cancel();
            backTo(pages.length - 1);
            return;
          }
        }
        setOpen(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="dl-palette-dim" data-instant={instant ? "" : undefined} style={zStyle} />
        <Dialog.Popup
          {...attributes}
          ref={setPanel}
          data-slot="command-palette"
          className={cx("dl-palette", className)}
          style={zStyle ? { ...style, ...zStyle } : style}
          data-instant={instant ? "" : undefined}
          aria-label={label}
          aria-modal="true"
          initialFocus={inputRef}
          finalFocus={finalFocus}
          // A key pressed inside means the keyboard is driving, and what it
          // does next (Enter, Escape) should not animate. A press hands the
          // turn back to the pointer. Heard on the way down: the field
          // handles its own keys and does not always let them bubble.
          onKeyDownCapture={(event: ReactKeyboardEvent<HTMLDivElement>) => {
            onKeyDownCapture?.(event);
            if (event.key !== "Shift" && event.key !== "Control" && event.key !== "Alt" && event.key !== "Meta") setInstant(true);
            // Any other key may open a menu again: its next Escape is its own.
            if (event.key !== "Escape") escapeHeld.current = NO_ESCAPE_HELD;
            // A key the app has spent is the app's: no held Enter, no held arrows.
            if (event.defaultPrevented) return;
            // An IME's Enter and arrows are its own, stale list or not.
            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
            if (!stale || body) return;
            // The rows on screen answer an earlier query. Enter waits for
            // this one's answer, and the arrows have nothing to move through.
            if (event.key === "Enter") {
              // A key meant for a menu or a control of the app's own is theirs.
              if (event.target !== inputRef.current) return;
              event.preventDefault();
              event.stopPropagation();
              heldEnter.current = true;
            } else if (MOVE_KEYS.has(event.key) && event.target === inputRef.current) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onPointerDownCapture={(event) => {
            onPointerDownCapture?.(event);
            setInstant(false);
            escapeHeld.current = NO_ESCAPE_HELD;
          }}
        >
          <PaletteContext.Provider value={value}>
            <Autocomplete.Root
              open
              inline
              items={body || rehighlight ? NO_GROUPS : results.groups}
              value={query}
              onValueChange={(next, details) => {
                // Choosing a row would write its title into the field.
                if (details.reason === "item-press") return;
                // A held Enter was for the words as they stood.
                heldEnter.current = false;
                heldRow.current = false;
                setQuery(next);
              }}
              // The sources and the action ranking have matched already.
              filter={null}
              itemToStringValue={(item: PaletteItem) => item.title}
              autoHighlight="always"
              keepHighlight
              onItemHighlighted={(item: PaletteItem | undefined, details: { reason: string }) => {
                setActive(item);
                // The highlight moved by a key or the pointer: a held Enter was for the row it left.
                if (details.reason === "keyboard" || details.reason === "pointer") heldRow.current = false;
              }}
            >
              {children}
              <RowMenu state={menu} onClose={() => setMenu(null)} onRun={runEntry} returnTo={inputRef} />
            </Autocomplete.Root>
          </PaletteContext.Provider>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

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
export function PaletteField({ glyph, start, end, filter, completion, onKeyDown, readOnly, busy }: PaletteFieldProps): ReactNode {
  const ctx = usePaletteContext("PaletteField");
  const { results, query, active, body, pages } = ctx;
  const asked = (results.answered ?? "").trim() !== "";
  const settled = !results.stale && results.busy === 0;
  const nothing = !body && results.groups.length === 0 && asked && settled;
  const count = results.groups.reduce((sum, group) => sum + group.items.length, 0);

  const keyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      (event as unknown as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.();
      return;
    }
    const native = event.nativeEvent;
    // An IME confirming a candidate sends Enter and arrows too; those belong
    // to the IME. Base UI would run the highlighted row on that Enter and
    // move the highlight on those arrows, so its handler is held back. The
    // key itself is not cancelled: the IME still needs it.
    if (native.isComposing || native.keyCode === 229) {
      (event as unknown as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.();
      return;
    }
    const input = event.currentTarget;
    const stop = () => {
      event.preventDefault();
      (event as unknown as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.();
    };
    // Ctrl N and Ctrl P move the highlight, as in cmdk and in Emacs.
    if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && (event.key.toLowerCase() === "n" || event.key.toLowerCase() === "p")) {
      stop();
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: event.key.toLowerCase() === "n" ? "ArrowDown" : "ArrowUp", bubbles: true, cancelable: true }),
      );
      return;
    }
    if (completion && !readOnly && ((event.key === "Tab" && !event.shiftKey) || (event.key === "ArrowRight" && caretAtEnd(input)))) {
      stop();
      completion.onAccept();
      return;
    }
    if (event.key === "ArrowRight" && caretAtEnd(input) && active && !results.stale) {
      const row = input.ownerDocument.getElementById(input.getAttribute("aria-activedescendant") ?? "");
      if (row && ctx.openMenu(active, ctx.keyOf(active), row)) stop();
      return;
    }
    if (event.key === "Enter" && active?.dim === "waiting" && !results.stale) {
      stop();
      ctx.heldRow.current = true;
      return;
    }
    if (event.key === "Backspace" && input.value === "" && input.selectionStart === 0 && pages.length > 0) {
      stop();
      ctx.backTo(pages.length - 1);
    }
  };

  const input = (
    <Autocomplete.Input
      ref={ctx.inputRef}
      className="dl-palette-input"
      placeholder={ctx.placeholder}
      aria-label={ctx.placeholder}
      aria-describedby={ctx.hintId}
      aria-busy={results.stale || results.busy > 0 || busy || undefined}
      // The list is always open to Base UI; a screen reader hears it
      // expanded only while it holds a row.
      aria-expanded={ctx.rowCount > 0}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      readOnly={readOnly}
      onKeyDown={keyDown}
      // A forward Tab takes the completion, so the toast's place in the
      // loop waits for that press. Shift+Tab, and a field that is read
      // only, leave Tab to the loop.
      data-dl-owns-tab={completion && !readOnly ? "" : undefined}
    />
  );

  return (
    <>
      <div className="dl-palette-query">
        {glyph ?? <SearchGlyph />}
        {pages.map((open, depth) => (
          <button
            key={`${open.page.id}:${depth}`}
            type="button"
            className="dl-palette-crumb"
            tabIndex={-1}
            aria-label={`Back from ${open.page.crumb}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => ctx.backTo(depth)}
          >
            {open.page.crumb}
          </button>
        ))}
        {start}
        {completion === undefined ? (
          input
        ) : (
          <span className="dl-palette-field">
            {completion ? (
              <span className="dl-palette-ghost" aria-hidden="true">
                <span className="dl-palette-ghost-typed">{query}</span>
                {completion.suffix}
              </span>
            ) : null}
            {input}
          </span>
        )}
        {end}
        {filter}
        <Dialog.Close className="dl-palette-close" aria-label="Close" tabIndex={-1}>
          <Kbd>Esc</Kbd>
        </Dialog.Close>
      </div>
      {/* The hint is a picture of a key, hidden from a screen reader; these are its words. */}
      <span id={ctx.hintId} className="dl-palette-status">
        {`Press Enter to ${(active?.verb ?? "open").toLocaleLowerCase()} the highlighted result.`}
      </span>
      {/* One region that stays mounted, so a change in its words is announced. */}
      <div role="status" aria-live="polite" className="dl-palette-status">
        {body
          ? (body.status ?? "")
          : nothing
            ? "No results."
            : asked && settled
              ? `${count} ${count === 1 ? "result" : "results"}.`
              : ""}
      </div>
    </>
  );
}

/** A line of words under the field row: mail's date hint, "Showing results for". */
export function PaletteLine({ children, className }: { children?: ReactNode; className?: string }): ReactNode {
  return <p className={cx("dl-palette-line", className)}>{children}</p>;
}

export type PaletteNoteProps = {
  children?: ReactNode;
  /** `"error"` draws the line in the family's red and makes it an alert: "Search could not finish." */
  tone?: "error";
  /** A button at the end of the line: Retry. */
  action?: { label: string; onClick: () => void };
  className?: string;
};

/**
 * A status line in the list's place or under it: "Searching…", "Search
 * could not finish. Retry", "Searching Gmail for older mail…". The empty
 * line is one of these too.
 */
export function PaletteNote({ children, tone, action, className }: PaletteNoteProps): ReactNode {
  return (
    <p className={cx("dl-palette-note", className)} data-tone={tone} role={tone === "error" ? "alert" : undefined}>
      {children}
      {action ? (
        <>
          {" "}
          <button
            type="button"
            className="dl-palette-note-action"
            // The caret stays in the field.
            onMouseDown={(event) => event.preventDefault()}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        </>
      ) : null}
    </p>
  );
}

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
export function PaletteMarked({ text, query, byScore = false }: { text: string; query: string; byScore?: boolean }): ReactNode {
  return (byScore ? scoreParts(text, query) : matchParts(text, query)).map((part, index) =>
    part.match ? (
      <mark key={index} className="dl-palette-mark">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}

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
export function PaletteList({ emptyText, rowContent, children }: PaletteListProps): ReactNode {
  const ctx = usePaletteContext("PaletteList");
  const { results, query, marks, active, menu } = ctx;
  const asked = (results.answered ?? "").trim() !== "";
  const settled = !results.stale && results.busy === 0;
  const nothing = results.groups.length === 0 && asked && settled;
  const empty = emptyText ?? ctx.emptyText;
  return (
    <div className="dl-palette-scroll" data-empty={results.groups.length === 0 ? "" : undefined}>
      {nothing ? <p className="dl-palette-note">{empty ? empty(query.trim()) : `No results for “${query.trim()}”.`}</p> : null}
      <Autocomplete.List className="dl-palette-list" data-stale={results.stale ? "" : undefined}>
        {(group: PaletteGroup) => (
          <Autocomplete.Group key={group.id} items={group.items} className="dl-palette-group">
            {group.heading ? <Autocomplete.GroupLabel className="dl-palette-head">{group.heading}</Autocomplete.GroupLabel> : null}
            <Autocomplete.Collection>
              {(item: PaletteItem) => {
                const key = `${group.id}:${item.id}`;
                const byScore = results.byScore.has(item);
                const own = rowContent?.(item, { highlighted: item === active, marks, byScore });
                return (
                  <Autocomplete.Item
                    key={key}
                    value={item}
                    className={cx("dl-palette-row", item.className)}
                    data-done={item.done ? "" : undefined}
                    data-dim={item.dim === "waiting" ? "waiting" : item.dim ? "" : undefined}
                    data-menu-open={menu?.key === key ? "" : undefined}
                    onClick={() => ctx.select(item)}
                    onContextMenu={
                      item.menu
                        ? (event) => {
                            if (ctx.openMenu(item, key, { x: event.clientX, y: event.clientY })) event.preventDefault();
                          }
                        : undefined
                    }
                  >
                    {own !== undefined ? (
                      own
                    ) : (
                      <>
                        {item.icon ? (
                          <span className="dl-palette-icon" aria-hidden="true">
                            {item.icon}
                          </span>
                        ) : null}
                        <span className="dl-palette-text">
                          <span className="dl-palette-title">
                            <PaletteMarked text={item.title} query={marks} byScore={byScore} />
                          </span>
                          {item.subtitle ? (
                            <span className="dl-palette-sub">
                              {byScore ? item.subtitle : <PaletteMarked text={item.subtitle} query={marks} />}
                            </span>
                          ) : null}
                        </span>
                        {item.meta ? <span className="dl-palette-meta">{item.meta}</span> : null}
                      </>
                    )}
                    {/* The row's own shortcut, and the Enter hint that takes
                        its place on the focused row. One slot holds both, so
                        nothing in the row moves as the focus does. */}
                    <span className="dl-palette-keys" aria-hidden="true">
                      {item.keys && item.keys.length > 0 ? <Kbd keys={item.keys} className="dl-palette-own" /> : null}
                      <span className="dl-palette-enter">
                        {item.verb ? <span className="dl-palette-verb">{item.verb}</span> : null}
                        <Kbd>{ENTER_KEY}</Kbd>
                      </span>
                    </span>
                  </Autocomplete.Item>
                );
              }}
            </Autocomplete.Collection>
            {group.note ? <p className="dl-palette-note dl-palette-group-note">{group.note}</p> : null}
          </Autocomplete.Group>
        )}
      </Autocomplete.List>
      {children}
    </div>
  );
}

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
export function PaletteBody({ status, children, className }: PaletteBodyProps): ReactNode {
  const ctx = usePaletteContext("PaletteBody");
  const { setBody } = ctx;
  useLayoutEffect(() => {
    setBody({ status });
  }, [setBody, status]);
  useLayoutEffect(() => () => setBody(null), [setBody]);
  return (
    <div className={cx("dl-palette-scroll", "dl-palette-body", className)} data-slot="palette-body">
      {children}
    </div>
  );
}

/** The palette's place in the toaster's Tab loop: held, so Tab never leaves it. */
const PALETTE_TAB = { hold: true } as const;

/** The last Escape a menu held: the press, and the controls open as it came. */
type EscapeHeld = { press: Event | undefined; controls: ReadonlySet<Element> };
const NO_ESCAPE_HELD: EscapeHeld = { press: undefined, controls: new Set() };

/** The kit's own menu triggers, open whenever they say so. */
const KIT_TRIGGERS = new Set(["menu-trigger", "menu-sub-trigger", "filter-trigger", "context-menu-trigger"]);

/**
 * The menus of the palette's own that are open: their triggers inside the
 * panel. A trigger counts when it has a popup (`aria-haspopup` and not
 * "false"), says it is expanded, and is one of the kit's or has its popup
 * mounted outside the panel (a popup floats in a portal; a listbox drawn
 * inline in the body is always there and is no menu). The field says
 * expanded for its list, and is not one.
 */
function ownMenusOpen(panel: HTMLElement, input: HTMLInputElement | null): Element[] {
  const open: Element[] = [];
  for (const el of panel.querySelectorAll('[aria-haspopup][aria-expanded="true"]')) {
    if (el === input || el.getAttribute("aria-haspopup") === "false") continue;
    if (KIT_TRIGGERS.has(el.getAttribute("data-slot") ?? "")) {
      open.push(el);
      continue;
    }
    const ids = (el.getAttribute("aria-controls") ?? "").split(/\s+/).filter(Boolean);
    const popup = ids.map((id) => el.ownerDocument.getElementById(id)).find((node) => node !== null);
    if (popup && !panel.contains(popup)) open.push(el);
  }
  return open;
}

/** One array each for "none", so a palette given neither does not search again on every render. */
const NO_SOURCES: readonly PaletteSource[] = [];
const NO_ACTIONS: readonly PaletteItem[] = [];
const NO_PAGES: readonly OpenPage[] = [];
const NO_GROUPS: PaletteGroup[] = [];
const NO_ROWS: readonly string[] = [];
const NO_FAILED: readonly string[] = [];
const NO_SCORED: ReadonlySet<PaletteItem> = new Set();
