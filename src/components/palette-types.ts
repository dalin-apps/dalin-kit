import type { ReactNode } from "react";

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
  /**
   * What Enter does to the row, in one word, where "open" is not it:
   * "Reveal" for a file shown in its folder. Drawn beside the Enter hint on
   * the highlighted row, and said in the hint a screen reader hears.
   */
  verb?: string;
  /** The action's own shortcut, as keycaps at the row's right end: `["R"]`, `["Ctrl", "N"]`. */
  keys?: readonly string[];
  /** More words the palette's own filter may match an action by, beside its title. */
  keywords?: string;
  /** Draws the title struck through and muted: a to-do that is done. */
  done?: boolean;
  /**
   * Steps the row back. `true` is 85%, for a row that still acts but that
   * the app no longer vouches for: mail's stored rows after a search that
   * failed. `"waiting"` is 60%, after 120ms, for a row left from the last
   * answer while this one is on its way: a press still runs it, and Enter
   * on it waits until the highlighted row is no longer waiting, then runs
   * that row. Typing again lets the held Enter go. The phone's search
   * draws the same steps, at once.
   */
  dim?: boolean | "waiting";
  /** Extra classes for the row, beside `dl-palette-row` (`dl-phone-search-row` on the phone): calendar's past events. */
  className?: string;
  /** Leaves the palette open after the row is chosen. It closes by default. */
  keepOpen?: boolean;
  /**
   * A page the row opens in the same field: its own placeholder, sources
   * and actions, with its name as a crumb before the words. The palette
   * stays open. `onSelect` runs as well, where the row has one.
   */
  page?: PalettePage;
  /**
   * What else the row can do, as a menu: a message's Reply and Archive, a
   * person's Copy address. Opened by a right click on the row, by
   * ArrowRight at the end of the field while the row is highlighted, and by
   * a long press on the phone. Called as the menu opens.
   */
  menu?: () => readonly PaletteMenuEntry[];
  /** Data of the app's own, for `rowContent` to draw from. The kit never reads it. */
  data?: unknown;
  /**
   * What choosing the row does. The palette has closed by the time it runs,
   * unless `keepOpen`. Required, unless the row opens a `page`.
   */
  onSelect?: () => void;
};

/** One line of a row's menu, or a rule between two groups of them. */
export type PaletteMenuEntry =
  | {
      label: string;
      /** The red row, for a destructive one. */
      destructive?: boolean;
      /** Leaves the palette open after it runs. It closes by default, as a row does. */
      keepOpen?: boolean;
      onSelect: () => void;
    }
  | "separator";

/**
 * Something the palette searches: pages, events, messages, files. The app
 * owns the search; the palette shows what comes back under the heading.
 */
export type PaletteSource = {
  id: string;
  /** The group's heading, in sentence case: "Pages", "To-dos". An empty heading draws none. */
  heading: string;
  /**
   * The rows for a query, now or as a promise. It is called with `""` as
   * the palette opens: return what to show before a word is typed (recent
   * items), or nothing. `signal` aborts when the query changes or the
   * palette closes, for a search that fetches. A query's list is shown
   * once every source has answered it, so answer at once where the rows
   * are already in memory. The answer may also carry a `note`, a line
   * under the group ("Showing 30 of 112").
   */
  search: (query: string, signal: AbortSignal) => PaletteAnswer | Promise<PaletteAnswer>;
};

/** What a source answers: its rows, or its rows with a line under them. */
export type PaletteAnswer = PaletteItem[] | { items: PaletteItem[]; note?: ReactNode };

/** A group on screen: a source's answer, the actions, or a group an app built itself. */
export type PaletteGroup = {
  id: string;
  /** The heading. Empty or left out, the group has none: mail's "Show all" row. */
  heading?: string;
  items: PaletteItem[];
  /** A line under the group's rows, in the note's muted words. */
  note?: ReactNode;
};

/**
 * What the app has selected, and what can be done to it: drive's file and
 * its Star, Tags…, Move to…, Rename F2, Download, Share… and Archive Del.
 * The palette leads with it, under a heading that names the selection, and
 * ranks its rows against the words as it ranks the actions.
 */
export type PaletteSelection = {
  /** The selection's name, as the group's heading: "Budget 2025-02.xlsx", "3 files". */
  heading: string;
  /** The verbs, each with its own `keys`, in the order the app wants them with no words typed. */
  items: readonly PaletteItem[];
};

/**
 * A page a row opens in the palette's own field (cmdk's nested pages):
 * "Move to", then the folders. Backspace on an empty field and Escape go
 * back one page.
 */
export type PalettePage = {
  /** Unique among the pages a palette can open. */
  id: string;
  /** The page's name, drawn as a crumb before the words: "Move to". */
  crumb: string;
  /** The field's placeholder on this page. The palette's own, unless set. */
  placeholder?: string;
  sources?: readonly PaletteSource[];
  actions?: readonly PaletteItem[];
  actionsHeading?: string;
  /** What to say when a query on this page finds nothing. */
  emptyText?: (query: string) => ReactNode;
};
