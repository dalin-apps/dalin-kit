"use client";

import type { ReactNode } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { withClass } from "./cx.js";
import { ARROW_OFFSET_PX, PLAIN_OFFSET_PX } from "./menu.js";

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
export function Popover(props: PopoverPrimitive.Root.Props): ReactNode {
  return <PopoverPrimitive.Root {...props} />;
}

export function PopoverTrigger(props: PopoverPrimitive.Trigger.Props): ReactNode {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

export type PopoverContentProps = PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "anchor" | "collisionPadding"
  > & {
    /** Whether the popover points at its control with an arrow. On by default. */
    arrow?: boolean;
  };

export function PopoverContent({
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset,
  anchor,
  collisionPadding = 8,
  arrow = true,
  className,
  children,
  ...props
}: PopoverContentProps): ReactNode {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        className="dl-menu-positioner"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset ?? (arrow ? ARROW_OFFSET_PX : PLAIN_OFFSET_PX)}
        anchor={anchor}
        collisionPadding={collisionPadding}
      >
        <PopoverPrimitive.Popup data-slot="popover-content" className={withClass("dl-popover", className)} {...props}>
          {arrow ? <PopoverPrimitive.Arrow className="dl-menu-arrow" /> : null}
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props): ReactNode {
  return <PopoverPrimitive.Title data-slot="popover-title" className={withClass("dl-popover-title", className)} {...props} />;
}

export function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props): ReactNode {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={withClass("dl-popover-description", className)}
      {...props}
    />
  );
}

export function PopoverClose(props: PopoverPrimitive.Close.Props): ReactNode {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}
