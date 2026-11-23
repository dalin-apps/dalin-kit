"use client";

import { useRef, useState, type ReactNode } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { DALIN_APPS, dalinApp, type DalinApp } from "./apps.js";
import { withClass } from "./cx.js";
import { CheckGlyph } from "./icons.js";
import { MenuContent, MenuLinkItem } from "./menu.js";
import { Wordmark, type WordmarkProps } from "./wordmark.js";

/** How long the pointer rests on the wordmark before the menu opens, and how long it may leave before it closes. */
const HOVER_OPEN_MS = 150;
const HOVER_CLOSE_MS = 150;

export type FamilySwitcherProps = Pick<WordmarkProps, "size" | "folded" | "rollOut"> & {
  /** The app this is drawn in: its wordmark is the trigger, and its row is the checked one. */
  app: DalinApp;
  /**
   * What the control does, for its accessible name, which reads
   * "dalin. mail. Switch app". Pass the words in the app's language.
   */
  label?: string;
  /**
   * Another address for an app, in place of its own. For a preview or a
   * local build, where the family is not on dalin.pro:
   * `{ mail: "http://localhost:3000" }`.
   */
  hrefs?: Partial<Record<DalinApp, string>>;
  /** Extra classes for the trigger, beside `dl-switcher-trigger`. */
  className?: MenuPrimitive.Trigger.Props["className"];
  /**
   * Which side of the wordmark the menu opens on, and how it lines up. To
   * the right, from the wordmark's top: the owner's pick on 2026-11-22. The
   * phone's header, with no column beside its title, passes `"bottom"`.
   */
  side?: MenuPrimitive.Positioner.Props["side"];
  align?: MenuPrimitive.Positioner.Props["align"];
};

/**
 * Where the menu may go when its side has no room: the opposite side, and
 * along its own edge. Never the other axis, so a menu asked to stand beside
 * the wordmark is never put under it.
 */
const STAY_BESIDE = { side: "flip", align: "shift", fallbackAxisSide: "none" } as const;

/**
 * The family switcher: the app's wordmark as the way to the other three.
 *
 * Nothing shows at rest; the wordmark is the wordmark. Pointing at it, or
 * pressing it, opens the family's frosted menu to its right, from its top,
 * with an arrow: over the top of the next column, and never under the
 * wordmark, where it covered mail's Compose and notes' search. The menu
 * lists the four apps as their own wordmarks, each period in that app's
 * accent, with a check on the app you are in. Every row is a link to the
 * app, so a middle click or a long press does what it does on a link.
 *
 * From the keyboard the wordmark is a button: Enter or Space opens the
 * menu, the arrows move through it, Enter follows a row, and Escape closes
 * it and returns focus to the wordmark.
 *
 * A menu the resting pointer opened is only shown. It takes no focus, so
 * the app's single-key shortcuts go on working under it, and Escape closes
 * it with focus left where it was. It becomes a menu in use once the
 * pointer moves into it, or the wordmark is pressed.
 *
 * It takes the wordmark's own `size`, `folded` and `rollOut`, so it goes
 * where the sidebar's `<Wordmark>` was. It needs menu.css and wordmark.css.
 */
export function FamilySwitcher({
  app,
  size,
  folded,
  rollOut,
  label = "Switch app",
  hrefs,
  className,
  side = "right",
  align = "start",
}: FamilySwitcherProps): ReactNode {
  const [open, setOpen] = useState(false);
  // Whether a resting pointer opened the menu and nothing has been done in
  // it since. While so, the menu is shown and not in use.
  const shown = useRef(false);
  const before = useRef<Element | null>(null);
  const use = () => {
    shown.current = false;
  };
  return (
    // Not modal: a menu that opens under a resting pointer must not lock the
    // page's scroll or take the pointer from the rest of the app.
    <MenuPrimitive.Root
      modal={false}
      open={open}
      onOpenChange={(next, details) => {
        if (next) {
          shown.current = details.reason === "trigger-hover";
          before.current = document.activeElement;
        }
        setOpen(next);
      }}
    >
      <MenuPrimitive.Trigger
        data-slot="family-switcher"
        className={withClass("dl-switcher-trigger", className)}
        aria-label={`dalin. ${dalinApp(app).name}. ${label}`}
        openOnHover
        delay={HOVER_OPEN_MS}
        closeDelay={HOVER_CLOSE_MS}
        onClick={use}
        onKeyDown={use}
      >
        <Wordmark app={app} size={size} folded={folded} rollOut={rollOut} />
      </MenuPrimitive.Trigger>
      <MenuContent
        className="dl-switcher"
        side={side}
        align={align}
        collisionAvoidance={STAY_BESIDE}
        aria-label="dalin apps"
        // Base UI moves focus into every menu as it opens. For one a
        // resting pointer opened, that takes the keys from the app: focus
        // goes straight back to what had it, which Base UI reads as focus
        // returning and not as leaving the menu.
        onFocus={(event) => {
          if (!shown.current) return;
          const to = before.current;
          if (to instanceof HTMLElement && to !== document.body && to.isConnected) to.focus({ preventScroll: true });
          else (event.target as HTMLElement).blur();
        }}
        // The pointer has moved into it: it is in use from here.
        onPointerMove={use}
        onMouseMove={use}
        // Closed while only shown (Escape, the pointer leaving), focus stays where it is.
        finalFocus={() => !shown.current}
      >
        {DALIN_APPS.map((item) => {
          const current = item.id === app;
          return (
            <MenuLinkItem key={item.id} href={hrefs?.[item.id] ?? item.href} aria-current={current ? "page" : undefined}>
              <Wordmark app={item.id} accent="own" />
              {current ? <CheckGlyph className="dl-menu-end" /> : null}
            </MenuLinkItem>
          );
        })}
      </MenuContent>
    </MenuPrimitive.Root>
  );
}
