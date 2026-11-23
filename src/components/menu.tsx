"use client";

import type { ComponentProps, ReactNode } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cx, withClass } from "./cx.js";
import { CheckGlyph, ChevronRightGlyph } from "./icons.js";
import { Kbd } from "./kbd.js";

/**
 * The family's menu: shadcn's Base UI dropdown menu, restyled once and
 * shared. The parts and their props are Base UI's; what the kit adds is the
 * look (menu.css) and four habits:
 *
 * - `<MenuContent>` draws an arrow at its control. A menu is anchored, so it
 *   points at what opened it. Pass `arrow={false}` for one that should not.
 * - `<MenuItem variant="destructive">` is the red row.
 * - `<MenuShortcut keys>` puts keycaps at the row's right end.
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
  "align" | "alignOffset" | "side" | "sideOffset" | "anchor" | "collisionPadding"
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

/** The menu's surface: portal, positioner, the frosted popup, its arrow and its rows. */
export function MenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset,
  anchor,
  collisionPadding = 8,
  arrow = true,
  className,
  children,
  ...props
}: MenuContentProps): ReactNode {
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
      >
        <MenuPrimitive.Popup data-slot="menu-content" className={withClass("dl-menu", className)} {...props}>
          {arrow ? <MenuPrimitive.Arrow className="dl-menu-arrow" /> : null}
          <div className="dl-menu-list">{children}</div>
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

/** A row that is a link: it navigates, and opens in a new tab on a middle click as a link does. */
export function MenuLinkItem({ className, variant = "default", inset, ...props }: MenuLinkItemProps): ReactNode {
  return (
    <MenuPrimitive.LinkItem
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
};

/** A row's shortcut: keycaps at its right end. Renders nothing without a key. */
export function MenuShortcut({ keys, children, className, ...props }: MenuShortcutProps): ReactNode {
  const none = (!keys || keys.length === 0) && (children === null || children === undefined || children === false);
  if (none) return null;
  return (
    <span data-slot="menu-shortcut" className={cx("dl-menu-end", className)} {...props}>
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
