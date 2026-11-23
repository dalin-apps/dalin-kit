"use client";

import { useCallback, useLayoutEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cx, withClass } from "./cx.js";
import { CheckGlyph, ChevronRightGlyph } from "./icons.js";
import { Kbd } from "./kbd.js";
import { ariaKeyShortcuts } from "./key-names.js";

/**
 * The family's menu: shadcn's Base UI dropdown menu, restyled once and
 * shared. The parts and their props are Base UI's; what the kit adds is the
 * look (menu.css) and five habits:
 *
 * - `<MenuContent>` draws an arrow at its control. A menu is anchored, so it
 *   points at what opened it. Pass `arrow={false}` for one that should not.
 * - `<MenuItem variant="destructive">` is the red row.
 * - `<MenuLinkItem>` closes its menu on a click, as a plain row does.
 * - `<MenuShortcut keys>` puts keycaps at the row's right end, and says the
 *   shortcut on the row as `aria-keyshortcuts`.
 * - `<MenuLabel>` is a group's heading, written in sentence case. Base UI
 *   needs it inside a `<MenuGroup>`.
 *
 *   <Menu>
 *     <MenuTrigger>More</MenuTrigger>
 *     <MenuContent>
 *       <MenuItem onClick={reply}><ReplyIcon /> Reply</MenuItem>
 *       <MenuItem onClick={star}><StarIcon /> Star <MenuShortcut keys={["S"]} /></MenuItem>
 *       <MenuSeparator />
 *       <MenuItem variant="destructive" onClick={archive}><ArchiveIcon /> Archive</MenuItem>
 *     </MenuContent>
 *   </Menu>
 *
 * The same rows go in a `<ContextMenuContent>` (context-menu.tsx): a context
 * menu is this menu opened at the pointer, with no arrow.
 */
export function Menu(props: MenuPrimitive.Root.Props): ReactNode {
  return <MenuPrimitive.Root {...props} />;
}

export function MenuTrigger(props: MenuPrimitive.Trigger.Props): ReactNode {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />;
}

type Placement = Pick<
  MenuPrimitive.Positioner.Props,
  "align" | "alignOffset" | "side" | "sideOffset" | "anchor" | "collisionPadding" | "collisionAvoidance"
>;

export type MenuContentProps = MenuPrimitive.Popup.Props &
  Placement & {
    /**
     * Whether the menu points at its control with an arrow. On by default:
     * an anchored menu has one. A submenu and a context menu have none.
     */
    arrow?: boolean;
  };

/** How far an anchored surface stands off its control: the arrow's height and a hair. */
export const ARROW_OFFSET_PX = 10;
/** The same for a surface with no arrow. */
export const PLAIN_OFFSET_PX = 4;

/** Whether focus can go back to a menu's trigger: it is on the page and something draws it. */
function showsOnPage(el: HTMLElement): boolean {
  if (!el.isConnected || el.getAttribute("aria-hidden") === "true" || el.closest("[hidden], [inert]")) return false;
  return typeof el.checkVisibility !== "function" || el.checkVisibility();
}

/**
 * The menu's surface: portal, positioner, the frosted popup, its arrow and its rows.
 *
 * Focus goes back to the trigger as the menu closes, which is Base UI's own
 * rule. A menu the app opens itself, anchored to something else, has a
 * trigger nothing draws (Base UI needs one to place a submenu), and focus
 * sent there is lost. So where the trigger does not show, focus goes back
 * to whatever had it before the menu opened. `finalFocus` wins over both.
 */
export function MenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset,
  anchor,
  collisionPadding = 8,
  collisionAvoidance,
  arrow = true,
  className,
  children,
  finalFocus,
  ...props
}: MenuContentProps): ReactNode {
  // Read as the rows mount, which is as the menu opens and before Base UI
  // moves focus into it.
  const opened = useRef<{ list: HTMLElement; before: HTMLElement | null } | null>(null);
  const markOpened = useCallback((list: HTMLDivElement | null) => {
    if (!list) return;
    const active = document.activeElement;
    opened.current = { list, before: active instanceof HTMLElement && active !== document.body ? active : null };
  }, []);
  const returnFocus = useCallback((): HTMLElement | boolean => {
    const from = opened.current;
    if (!from) return true;
    // The popup names its trigger, and stays whole as it leaves the page.
    const id = from.list.closest('[role="menu"]')?.getAttribute("aria-labelledby");
    const trigger = id ? document.getElementById(id) : null;
    if (trigger && showsOnPage(trigger)) return true;
    return from.before && from.before.isConnected ? from.before : false;
  }, []);
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="dl-menu-positioner"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset ?? (arrow ? ARROW_OFFSET_PX : PLAIN_OFFSET_PX)}
        anchor={anchor}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={withClass("dl-menu", className)}
          finalFocus={finalFocus ?? returnFocus}
          {...props}
        >
          {arrow ? <MenuPrimitive.Arrow className="dl-menu-arrow" /> : null}
          <div ref={markOpened} className="dl-menu-list">
            {children}
          </div>
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function MenuGroup(props: MenuPrimitive.Group.Props): ReactNode {
  return <MenuPrimitive.Group data-slot="menu-group" {...props} />;
}

export type MenuLabelProps = MenuPrimitive.GroupLabel.Props & {
  /** Lines the label up with rows that have an icon. */
  inset?: boolean;
};

/** A group's heading. Write it in sentence case; the kit does not change its case. */
export function MenuLabel({ className, inset, ...props }: MenuLabelProps): ReactNode {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menu-label"
      data-inset={inset ? "" : undefined}
      className={withClass("dl-menu-label", className)}
      {...props}
    />
  );
}

export type MenuItemVariant = "default" | "destructive";

export type MenuItemProps = MenuPrimitive.Item.Props & {
  /** `"destructive"` is the red row: delete, archive, remove. */
  variant?: MenuItemVariant;
  /** Lines the words up with rows that have an icon, for a row with none. */
  inset?: boolean;
};

export function MenuItem({ className, variant = "default", inset, ...props }: MenuItemProps): ReactNode {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      data-variant={variant}
      data-inset={inset ? "" : undefined}
      className={withClass("dl-menu-item", className)}
      {...props}
    />
  );
}

export type MenuLinkItemProps = MenuPrimitive.LinkItem.Props & {
  variant?: MenuItemVariant;
  inset?: boolean;
};

/**
 * A row that is a link: it navigates, and opens in a new tab on a middle
 * click as a link does. A click closes the menu, as every other row's does:
 * Base UI leaves a link row's menu open, which stays on screen over a link
 * the app handles itself (an in-app route, a new tab). Pass
 * `closeOnClick={false}` to keep it open.
 */
export function MenuLinkItem({ className, variant = "default", inset, closeOnClick = true, ...props }: MenuLinkItemProps): ReactNode {
  return (
    <MenuPrimitive.LinkItem
      closeOnClick={closeOnClick}
      data-slot="menu-link-item"
      data-variant={variant}
      data-inset={inset ? "" : undefined}
      className={withClass("dl-menu-item", className)}
      {...props}
    />
  );
}

export function MenuCheckboxItem({ className, children, ...props }: MenuPrimitive.CheckboxItem.Props): ReactNode {
  return (
    <MenuPrimitive.CheckboxItem data-slot="menu-checkbox-item" className={withClass("dl-menu-item", className)} {...props}>
      {children}
      <MenuPrimitive.CheckboxItemIndicator className="dl-menu-end">
        <CheckGlyph />
      </MenuPrimitive.CheckboxItemIndicator>
    </MenuPrimitive.CheckboxItem>
  );
}

export function MenuRadioGroup(props: MenuPrimitive.RadioGroup.Props): ReactNode {
  return <MenuPrimitive.RadioGroup data-slot="menu-radio-group" {...props} />;
}

export function MenuRadioItem({ className, children, ...props }: MenuPrimitive.RadioItem.Props): ReactNode {
  return (
    <MenuPrimitive.RadioItem data-slot="menu-radio-item" className={withClass("dl-menu-item", className)} {...props}>
      {children}
      <MenuPrimitive.RadioItemIndicator className="dl-menu-end">
        <CheckGlyph />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

export function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props): ReactNode {
  return <MenuPrimitive.Separator data-slot="menu-separator" className={withClass("dl-menu-separator", className)} {...props} />;
}

export type MenuShortcutProps = Omit<ComponentProps<"span">, "children"> & {
  /** The keys, one cap each: `["Ctrl", "K"]`. */
  keys?: readonly string[];
  /** One cap's text, in place of `keys`. */
  children?: ReactNode;
  /**
   * The shortcut in ARIA's words, for the row: "Control+K". Left out, it is
   * read from the caps (key-names.ts). Pass it for a shortcut the caps don't
   * spell, such as two chords: "Meta+Enter Control+Enter".
   */
  "aria-keyshortcuts"?: string;
};

/**
 * A row's shortcut: keycaps at its right end. Renders nothing without a key.
 *
 * The caps are a picture, hidden from a screen reader: left in, a row named
 * "Star" would read "Star S". The shortcut is said on the row instead, as
 * its `aria-keyshortcuts`, which a screen reader announces as a shortcut.
 */
export function MenuShortcut({ keys, children, className, "aria-keyshortcuts": said, ...props }: MenuShortcutProps): ReactNode {
  const caps = useRef<HTMLSpanElement>(null);
  const none = (!keys || keys.length === 0) && (children === null || children === undefined || children === false);
  const drawn = keys && keys.length > 0 ? keys : typeof children === "string" || typeof children === "number" ? [String(children)] : [];
  const shortcut = none ? "" : (said ?? ariaKeyShortcuts(drawn));
  // The attribute belongs on the row, which is this part's ancestor and not
  // its own element, so it is written there as the caps mount.
  useLayoutEffect(() => {
    const row = caps.current?.closest<HTMLElement>('[role^="menuitem"]');
    if (!row || !shortcut) return;
    row.setAttribute("aria-keyshortcuts", shortcut);
    return () => row.removeAttribute("aria-keyshortcuts");
  }, [shortcut]);
  if (none) return null;
  return (
    <span ref={caps} data-slot="menu-shortcut" aria-hidden="true" className={cx("dl-menu-end", className)} {...props}>
      <Kbd keys={keys}>{children}</Kbd>
    </span>
  );
}

export function MenuSub(props: MenuPrimitive.SubmenuRoot.Props): ReactNode {
  return <MenuPrimitive.SubmenuRoot {...props} />;
}

export type MenuSubTriggerProps = MenuPrimitive.SubmenuTrigger.Props & { inset?: boolean };

/** A row that opens a submenu: a chevron ends it. */
export function MenuSubTrigger({ className, inset, children, ...props }: MenuSubTriggerProps): ReactNode {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="menu-sub-trigger"
      data-inset={inset ? "" : undefined}
      className={withClass("dl-menu-item", className)}
      {...props}
    >
      {children}
      <ChevronRightGlyph className="dl-menu-end dl-menu-chevron" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

/** A submenu's surface: beside its row, with no arrow. */
export function MenuSubContent({
  align = "start",
  alignOffset = -5,
  side = "right",
  sideOffset = 2,
  arrow = false,
  ...props
}: MenuContentProps): ReactNode {
  return <MenuContent align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset} arrow={arrow} {...props} />;
}
