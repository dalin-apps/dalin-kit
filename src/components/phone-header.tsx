"use client";

import type { ComponentProps, ReactNode } from "react";
import type { DalinApp } from "./apps.js";
import { cx } from "./cx.js";
import { FamilySwitcher } from "./family-switcher.js";
import { SearchGlyph } from "./icons.js";
import { Wordmark } from "./wordmark.js";

/** The wordmark's size on the phone's title row: the desktop sidebar's own, whose x-height meets the 28px title's. */
export const PHONE_MARK_PX = 32;

export type PhoneHeaderIconProps = Omit<ComponentProps<"button">, "aria-label"> & {
  /** What the icon does, for a screen reader: "Refresh", "Sort". The glyph has no words. */
  label: string;
};

/**
 * One plain icon on the phone's title row: a 20px glyph in a 44px target,
 * muted, with no box behind it at rest or when pressed. Pass the glyph as
 * its child. The header's search icon is one of these, drawn for you.
 */
export function PhoneHeaderIcon({ label, className, type = "button", children, ...props }: PhoneHeaderIconProps): ReactNode {
  return (
    <button type={type} data-slot="phone-header-icon" className={cx("dl-phone-icon", className)} aria-label={label} {...props}>
      {children}
    </button>
  );
}

export type PhoneHeaderProps = {
  /**
   * A large title: "Inbox", "Wednesday". A string, or the app's own node
   * for a title that does something, such as mail's folder button with its
   * chevron.
   */
  title?: ReactNode;
  /**
   * The app's wordmark in place of a title, for the home screen: drive's
   * Home and notes' main list. Drawn at 32px.
   */
  wordmark?: DalinApp;
  /** Makes that wordmark the family switcher: a press opens the menu of the four apps, under the title. */
  switcher?: boolean;
  /**
   * One muted line under a large title: "All mailboxes · 44 unread",
   * "November 4". A wordmark takes none, since a line under the app's name
   * reads as a tagline.
   */
  line?: ReactNode;
  /** Opens the app's search. With it, the header draws the magnifying glass. */
  onSearch?: () => void;
  /** The search icon's accessible name. "Search". */
  searchLabel?: string;
  /**
   * The one other icon the row may hold, a `<PhoneHeaderIcon>`: refresh,
   * sort. It keeps the far right, and search sits to its left.
   */
  action?: ReactNode;
  className?: string;
};

/**
 * The phone's header, the same in all four apps: a title row, and under a
 * large title one muted line.
 *
 * The title is a large title or the app's wordmark. At the right of its row
 * sit at most two plain icons. Search is a magnifying glass, never a field:
 * alone it takes the far right, and beside another icon it sits to that
 * icon's left, so the icon the app already had stays where it was.
 *
 * The header is not sticky and has no fill: the screen scrolls it away with
 * the list, as mail's does. `phone.css` styles it.
 *
 *   <PhoneHeader title="Inbox" line="All mailboxes · 44 unread" onSearch={openSearch} />
 *   <PhoneHeader wordmark="notes" onSearch={openSearch}
 *     action={<PhoneHeaderIcon label="Refresh" onClick={refresh}><RefreshIcon /></PhoneHeaderIcon>} />
 */
export function PhoneHeader({
  title,
  wordmark,
  switcher = false,
  line,
  onSearch,
  searchLabel = "Search",
  action,
  className,
}: PhoneHeaderProps): ReactNode {
  const icons = onSearch || action;
  return (
    <header data-slot="phone-header" className={cx("dl-phone-head", className)}>
      <div className="dl-phone-head-row">
        {wordmark ? (
          <h1 className="dl-phone-mark">
            {switcher ? (
              // Under the title: a phone has no column beside it for the menu to open over.
              <FamilySwitcher app={wordmark} size={PHONE_MARK_PX} side="bottom" />
            ) : (
              <Wordmark app={wordmark} size={PHONE_MARK_PX} />
            )}
          </h1>
        ) : (
          <h1 className="dl-phone-title">{title}</h1>
        )}
        {icons ? (
          <div className="dl-phone-head-icons">
            {onSearch ? (
              <PhoneHeaderIcon label={searchLabel} className="dl-phone-search-icon" onClick={onSearch}>
                <SearchGlyph />
              </PhoneHeaderIcon>
            ) : null}
            {action}
          </div>
        ) : null}
      </div>
      {line && !wordmark ? <p className="dl-phone-line">{line}</p> : null}
    </header>
  );
}
