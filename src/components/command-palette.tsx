"use client";

import type { ReactNode } from "react";
import { Palette, PaletteField, PaletteList } from "./palette.js";
import type { PaletteItem, PaletteSource } from "./palette-types.js";

export type { PaletteAnswer, PaletteGroup, PaletteItem, PaletteMenuEntry, PalettePage, PaletteSource } from "./palette-types.js";
export { SOURCE_WAIT_MS } from "./palette-results.js";

export type CommandPaletteProps = {
  /** Whether the palette is open, for an app that owns that. Leave it out and the palette owns it. */
  open?: boolean;
  /** Called when the palette opens or closes, from a key, a row, Escape or a press outside. */
  onOpenChange?: (open: boolean) => void;
  /** What the palette searches, in the order the groups are shown. Keep the array stable between renders. */
  sources?: readonly PaletteSource[];
  /**
   * The app's actions: "New page", "Switch to Week view". The palette
   * ranks them itself (every word of the query in the title or the
   * keywords first, then the rows cmdk's command-score finds) and lists
   * them after the sources' groups.
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
  /**
   * A control at the end of the field, before the Esc cap: a `<FilterMenu>`.
   * Keep the filters as the app's own state and build `sources` from them
   * (a `useMemo` on the filters): a new `sources` asks every source again
   * for the words in the field.
   */
  filter?: ReactNode;
  /** Extra classes for the panel, beside `dl-palette`. */
  className?: string;
};

/**
 * The family's command palette: one field over grouped results, opened with
 * Ctrl K and the app's own key. It is `<Palette>` with the kit's own field
 * and list in it (palette.tsx); an app whose palette needs more (chips, a
 * completion, a body of its own) builds on those parts instead.
 *
 * It is a Base UI Dialog holding an inline Autocomplete, 600px wide and
 * frosted, with the app dimmed behind it. Results come in groups under
 * sentence-case headings, with the words of the query marked in each row.
 * The arrows move the focus, and so do Ctrl N and Ctrl P. It always rests
 * on a row, and that row shows an Enter hint (the return arrow, as a
 * keycap) where its own shortcut would be, with the row's verb before it
 * where the row names one ("Reveal"). Enter runs it, Escape closes the palette, and so does a
 * press outside it.
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
  open,
  onOpenChange,
  sources,
  actions,
  actionsHeading,
  placeholder,
  label,
  emptyText,
  hotkey,
  appKey,
  filter,
  className,
}: CommandPaletteProps): ReactNode {
  return (
    <Palette
      open={open}
      onOpenChange={onOpenChange}
      sources={sources}
      actions={actions}
      actionsHeading={actionsHeading}
      placeholder={placeholder}
      label={label}
      emptyText={emptyText}
      hotkey={hotkey}
      appKey={appKey}
      className={className}
    >
      <PaletteField filter={filter} />
      <PaletteList />
    </Palette>
  );
}
