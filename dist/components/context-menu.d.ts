import type { ReactNode } from "react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
/**
 * The family's context menu: the same frosted menu, opened at the pointer by
 * a right click or a long press. It has no arrow, since it is anchored to
 * nothing, and it opens at once, since it is used too often to wait on
 * (menu.css).
 *
 * Its rows are the menu's own (`MenuItem`, `MenuSeparator`, `MenuShortcut`,
 * `MenuLabel`, `MenuSub` and the rest, from menu.tsx): Base UI's context
 * menu is its menu under another root.
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
export declare function ContextMenu(props: ContextMenuPrimitive.Root.Props): ReactNode;
/** The area a right click or long press opens the menu from. Renders a `<div>`; pass `render` for another element. */
export declare function ContextMenuTrigger(props: ContextMenuPrimitive.Trigger.Props): ReactNode;
export type ContextMenuContentProps = ContextMenuPrimitive.Popup.Props & Pick<ContextMenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding">;
/** The context menu's surface, at the pointer. No arrow. */
export declare function ContextMenuContent({ align, alignOffset, side, sideOffset, collisionPadding, className, children, ...props }: ContextMenuContentProps): ReactNode;
//# sourceMappingURL=context-menu.d.ts.map