import { type ComponentProps, type ReactNode } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
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
export declare function Menu(props: MenuPrimitive.Root.Props): ReactNode;
export declare function MenuTrigger(props: MenuPrimitive.Trigger.Props): ReactNode;
type Placement = Pick<MenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "anchor" | "collisionPadding" | "collisionAvoidance">;
export type MenuContentProps = MenuPrimitive.Popup.Props & Placement & {
    /**
     * Whether the menu points at its control with an arrow. On by default:
     * an anchored menu has one. A submenu and a context menu have none.
     */
    arrow?: boolean;
};
/** How far an anchored surface stands off its control: the arrow's height and a hair. */
export declare const ARROW_OFFSET_PX = 10;
/** The same for a surface with no arrow. */
export declare const PLAIN_OFFSET_PX = 4;
/**
 * The menu's surface: portal, positioner, the frosted popup, its arrow and its rows.
 *
 * Focus goes back to the trigger as the menu closes, which is Base UI's own
 * rule. A menu the app opens itself, anchored to something else, has a
 * trigger nothing draws (Base UI needs one to place a submenu), and focus
 * sent there is lost. So where the trigger does not show, focus goes back
 * to whatever had it before the menu opened. `finalFocus` wins over both.
 */
export declare function MenuContent({ align, alignOffset, side, sideOffset, anchor, collisionPadding, collisionAvoidance, arrow, className, children, finalFocus, ...props }: MenuContentProps): ReactNode;
export declare function MenuGroup(props: MenuPrimitive.Group.Props): ReactNode;
export type MenuLabelProps = MenuPrimitive.GroupLabel.Props & {
    /** Lines the label up with rows that have an icon. */
    inset?: boolean;
};
/** A group's heading. Write it in sentence case; the kit does not change its case. */
export declare function MenuLabel({ className, inset, ...props }: MenuLabelProps): ReactNode;
export type MenuItemVariant = "default" | "destructive";
export type MenuItemProps = MenuPrimitive.Item.Props & {
    /** `"destructive"` is the red row: delete, archive, remove. */
    variant?: MenuItemVariant;
    /** Lines the words up with rows that have an icon, for a row with none. */
    inset?: boolean;
};
/** The attribute a picked row, and every menu open as it was picked, carry while the menu closes. */
export declare const MENU_PICKED_ATTR = "data-picked";
/**
 * Marks a row the pointer picked, and every menu open at that moment (a
 * submenu's parents close with it), so menu.css blinks the row off for
 * `--dl-t-pick` before the menus fade. The marks go a moment after the
 * close, since a menu kept mounted would otherwise carry them into its next
 * close. Paint only: nothing waits on it.
 */
export declare function markMenuPick(row: Element): void;
/**
 * A row. A click on it runs `onClick` at once and closes the menu, and a
 * row picked with the pointer blinks off for `--dl-t-pick` (60ms) before the
 * menu fades (menu.css).
 */
export declare function MenuItem({ className, variant, inset, closeOnClick, onClick, onPointerUp, ...props }: MenuItemProps): ReactNode;
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
export declare function MenuLinkItem({ className, variant, inset, closeOnClick, onClick, onPointerUp, ...props }: MenuLinkItemProps): ReactNode;
export declare function MenuCheckboxItem({ className, children, ...props }: MenuPrimitive.CheckboxItem.Props): ReactNode;
export declare function MenuRadioGroup(props: MenuPrimitive.RadioGroup.Props): ReactNode;
export declare function MenuRadioItem({ className, children, ...props }: MenuPrimitive.RadioItem.Props): ReactNode;
export declare function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props): ReactNode;
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
export declare function MenuShortcut({ keys, children, className, "aria-keyshortcuts": said, ...props }: MenuShortcutProps): ReactNode;
export declare function MenuSub(props: MenuPrimitive.SubmenuRoot.Props): ReactNode;
export type MenuSubTriggerProps = MenuPrimitive.SubmenuTrigger.Props & {
    inset?: boolean;
};
/** A row that opens a submenu: a chevron ends it. */
export declare function MenuSubTrigger({ className, inset, children, ...props }: MenuSubTriggerProps): ReactNode;
/** A submenu's surface: beside its row, with no arrow. */
export declare function MenuSubContent({ align, alignOffset, side, sideOffset, arrow, ...props }: MenuContentProps): ReactNode;
export {};
//# sourceMappingURL=menu.d.ts.map