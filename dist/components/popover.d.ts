import type { ReactNode } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
/**
 * The family's popover: shadcn's Base UI popover on the same frosted surface
 * as the menu, with the same arrow at its control. It holds whatever the app
 * puts in it, 12px in; the width is the app's.
 *
 *   <Popover>
 *     <PopoverTrigger>Share</PopoverTrigger>
 *     <PopoverContent style={{ width: 288 }}>
 *       <PopoverTitle>Share this page</PopoverTitle>
 *       <PopoverDescription>Anyone with the link can read it.</PopoverDescription>
 *     </PopoverContent>
 *   </Popover>
 */
export declare function Popover(props: PopoverPrimitive.Root.Props): ReactNode;
export declare function PopoverTrigger(props: PopoverPrimitive.Trigger.Props): ReactNode;
export type PopoverContentProps = PopoverPrimitive.Popup.Props & Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "anchor" | "collisionPadding"> & {
    /** Whether the popover points at its control with an arrow. On by default. */
    arrow?: boolean;
};
export declare function PopoverContent({ align, alignOffset, side, sideOffset, anchor, collisionPadding, arrow, className, children, ...props }: PopoverContentProps): ReactNode;
export declare function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props): ReactNode;
export declare function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props): ReactNode;
export declare function PopoverClose(props: PopoverPrimitive.Close.Props): ReactNode;
//# sourceMappingURL=popover.d.ts.map