import { type ReactNode } from "react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
export type ContextMenuProps = Omit<ContextMenuPrimitive.Root.Props, "children"> & {
    /** The trigger and the surface. */
    children?: ReactNode;
    /**
     * Whether the menu is modal. Off by default: the page under it still
     * scrolls, and a right click on another row opens that row's menu. `true`
     * is Base UI's own context menu, which lays a layer over the page that
     * takes every press and locks its scroll.
     */
    modal?: boolean;
};
/**
 * The family's context menu: the same frosted menu, opened at the pointer by
 * a right click or a long press. It has no arrow, since it is anchored to
 * nothing, and it opens at once, since it is used too often to wait on
 * (menu.css).
 *
 * It is not modal. Base UI's context menu always is: it lays a layer over
 * the page, so a second right click, or a click on another row, only closed
 * the menu, and the page could not scroll under it. Base UI takes no `modal`
 * for it, so this one is its Menu opened at a point: the same parts, keys
 * and submenus, with the page left alone. Pass `modal` for Base UI's own.
 *
 * Its rows are the menu's own (`MenuItem`, `MenuSeparator`, `MenuShortcut`,
 * `MenuLabel`, `MenuSub` and the rest, from menu.tsx).
 *
 *   <ContextMenu>
 *     <ContextMenuTrigger render={<li className="row" />}>...</ContextMenuTrigger>
 *     <ContextMenuContent>
 *       <MenuItem onClick={reply}><ReplyIcon /> Reply</MenuItem>
 *       <MenuSeparator />
 *       <MenuItem variant="destructive" onClick={archive}>
 *         <ArchiveIcon /> Archive <MenuShortcut keys={["E"]} />
 *       </MenuItem>
 *     </ContextMenuContent>
 *   </ContextMenu>
 */
export declare function ContextMenu({ modal, ...props }: ContextMenuProps): ReactNode;
/** The area a right click or long press opens the menu from. Renders a `<div>`; pass `render` for another element. */
export declare function ContextMenuTrigger(props: ContextMenuPrimitive.Trigger.Props): ReactNode;
export type ContextMenuContentProps = ContextMenuPrimitive.Popup.Props & Pick<ContextMenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding">;
/** The context menu's surface, at the pointer. No arrow. */
export declare function ContextMenuContent({ align, alignOffset, side, sideOffset, collisionPadding, className, children, finalFocus, ...props }: ContextMenuContentProps): ReactNode;
//# sourceMappingURL=context-menu.d.ts.map