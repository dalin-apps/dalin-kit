"use client";

import { type ReactNode, type RefObject } from "react";
import { Menu, MenuContent, MenuItem, MenuSeparator } from "./menu.js";
import { cx } from "./cx.js";
import type { PaletteMenuEntry } from "./palette-types.js";

/** Something a menu can be placed against. */
export type RowMenuAnchor = { getBoundingClientRect: () => DOMRect };

/** A row's menu as it stands open: whose it is, what it holds, and where. */
export type RowMenuState = {
  /** The row the menu belongs to, which stays highlighted while it is open. */
  key: string;
  entries: readonly PaletteMenuEntry[];
  anchor: RowMenuAnchor;
  /** When it opened, so the lift of the finger that long-pressed does not close it. */
  at: number;
};

/** A zero-size box at a point, for a menu opened at the pointer. */
export function pointAnchor(x: number, y: number): RowMenuAnchor {
  return { getBoundingClientRect: () => DOMRect.fromRect({ x, y, width: 0, height: 0 }) };
}

/** A point just under a row's start, for a menu opened from the keyboard. */
export function underAnchor(element: Element): RowMenuAnchor {
  const box = element.getBoundingClientRect();
  return pointAnchor(box.left + 24, box.bottom);
}

/**
 * A press that lands as the finger that long-pressed lifts is outside the
 * new menu. It must not close it.
 */
const LIFT_GRACE_MS = 700;

/**
 * The open row menu, if any: the family's frosted menu at a point, with no
 * arrow. One per list. `onRun` is told which entry ran, after the menu has
 * closed.
 */
export function RowMenu({
  state,
  onClose,
  onRun,
  className,
  returnTo,
}: {
  state: RowMenuState | null;
  onClose: () => void;
  onRun: (entry: Exclude<PaletteMenuEntry, "separator">) => void;
  className?: string;
  /** Where focus goes back to as the menu closes: the palette's field. */
  returnTo?: RefObject<HTMLElement | null>;
}): ReactNode {
  return (
    <Menu
      open={state !== null}
      modal={false}
      onOpenChange={(open, details) => {
        if (open) return;
        if (details.reason === "outside-press" && state && Date.now() - state.at < LIFT_GRACE_MS) return;
        onClose();
      }}
    >
      <MenuContent
        anchor={state?.anchor}
        side="bottom"
        align="start"
        arrow={false}
        className={cx("dl-palette-menu", className)}
        finalFocus={returnTo}
      >
        {state?.entries.map((entry, index) =>
          entry === "separator" ? (
            <MenuSeparator key={`separator-${index}`} />
          ) : (
            <MenuItem
              key={`${entry.label}-${index}`}
              variant={entry.destructive ? "destructive" : undefined}
              onClick={() => {
                onClose();
                onRun(entry);
              }}
            >
              {entry.label}
            </MenuItem>
          ),
        )}
      </MenuContent>
    </Menu>
  );
}
