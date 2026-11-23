"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { useRender } from "@base-ui/react/use-render";
import { withClass } from "./cx.js";

/** How long a finger rests on the trigger before the menu opens: Base UI's own. */
const LONG_PRESS_MS = 500;
/** How far that finger may move and still be a long press. */
const LONG_PRESS_MOVE_PX = 10;

type ChangeDetails = Parameters<NonNullable<ContextMenuPrimitive.Root.Props["onOpenChange"]>>[1];

/** What the kit's own, not modal, context menu shares with its trigger and its surface. */
type Plain = {
  open: boolean;
  disabled: boolean;
  /** The point the menu opens at, as an anchor Base UI can place against. */
  anchor: { getBoundingClientRect: () => DOMRect };
  /** Opens the menu at a point, for the event that asked. */
  openAt: (x: number, y: number, touch: boolean, event: Event, trigger: Element) => void;
  /** Where focus goes as the menu closes: back to what had it before. */
  returnFocus: () => HTMLElement | boolean;
  /** Whether the page is there to draw into: false on the server and in the first render. */
  mounted: boolean;
};

/** Null under `modal`, where Base UI's own context menu is in charge. */
const PlainContext = createContext<Plain | null>(null);

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
export function ContextMenu({ modal = false, ...props }: ContextMenuProps): ReactNode {
  return modal ? <ContextMenuPrimitive.Root {...props} /> : <PlainContextMenu {...props} />;
}

function PlainContextMenu({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  children,
  ...props
}: Omit<ContextMenuProps, "modal">): ReactNode {
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = openProp ?? ownOpen;
  const [point, setPoint] = useState({ x: 0, y: 0, touch: false });
  const before = useRef<HTMLElement | null>(null);
  // The trigger Base UI asks for is drawn in <body>, once the page is there.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const change = useCallback(
    (next: boolean, details: ChangeDetails) => {
      // Base UI's menu closes on a pointer that leaves it when it was not
      // opened by a click, and a right click is not one to it. A context
      // menu stays until a click outside, Escape or a row, like the
      // family's other menus, so that close is turned away before the app
      // hears of it.
      if (!next && details.reason === "trigger-hover") {
        details.cancel();
        return;
      }
      onOpenChange?.(next, details);
      if (details.isCanceled) return;
      if (openProp === undefined) setOwnOpen(next);
    },
    [openProp, onOpenChange],
  );

  const anchor = useMemo(
    () => ({
      // A finger hides the point under it, so a touch gets a little room.
      getBoundingClientRect: () => DOMRect.fromRect({ x: point.x, y: point.y, width: point.touch ? 10 : 0, height: point.touch ? 10 : 0 }),
    }),
    [point],
  );

  const openAt = useCallback<Plain["openAt"]>(
    (x, y, touch, event, trigger) => {
      const active = document.activeElement;
      before.current = active instanceof HTMLElement && active !== document.body ? active : null;
      setPoint({ x, y, touch });
      // Base UI makes its own details for a change it starts. This one the
      // trigger started, so it says the same things in the same shape.
      let canceled = false;
      const details = {
        reason: "trigger-press",
        event,
        trigger,
        cancel: () => {
          canceled = true;
        },
        allowPropagation: () => {},
        get isCanceled() {
          return canceled;
        },
        isPropagationAllowed: false,
      } as unknown as ChangeDetails;
      change(true, details);
    },
    [change],
  );

  const returnFocus = useCallback(() => {
    // Back to what had focus before the menu opened. With nothing to go
    // back to, focus is left where it falls: the hidden trigger never
    // takes it.
    const to = before.current;
    return to && to.isConnected ? to : false;
  }, []);

  const plain = useMemo<Plain>(
    () => ({ open, disabled, anchor, openAt, returnFocus, mounted }),
    [open, disabled, anchor, openAt, returnFocus, mounted],
  );

  return (
    <PlainContext.Provider value={plain}>
      <MenuPrimitive.Root open={open} onOpenChange={change as MenuPrimitive.Root.Props["onOpenChange"]} disabled={disabled} modal={false} {...props}>
        {/* Base UI gives a top-level menu its place among the open menus
            through its trigger: with none, a submenu reads as a sibling of
            the menu it belongs to and closes it. The menu is opened by the
            area below and not by a control, so the trigger is one nothing
            draws and nothing can reach, kept in <body> and out of the
            app's own markup, where a stray element could break a list or
            a table. */}
        {mounted
          ? createPortal(
              <MenuPrimitive.Trigger render={<span hidden />} nativeButton={false} tabIndex={-1} aria-hidden="true" data-slot="context-menu-anchor" />,
              document.body,
            )
          : null}
        {children}
      </MenuPrimitive.Root>
    </PlainContext.Provider>
  );
}

/** The area a right click or long press opens the menu from. Renders a `<div>`; pass `render` for another element. */
export function ContextMenuTrigger(props: ContextMenuPrimitive.Trigger.Props): ReactNode {
  const plain = useContext(PlainContext);
  return plain ? <PlainTrigger plain={plain} {...props} /> : <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

function PlainTrigger({ plain, render, ...elementProps }: ContextMenuPrimitive.Trigger.Props & { plain: Plain }): ReactNode {
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  const endPress = useCallback(() => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  }, []);
  useEffect(() => endPress, [endPress]);

  const { disabled, openAt } = plain;
  return useRender({
    defaultTagName: "div",
    render: render as useRender.RenderProp<{ open: boolean }>,
    state: { open: plain.open },
    // The same mark Base UI's own trigger carries while its menu is open.
    stateAttributesMapping: { open: (value) => (value ? { "data-popup-open": "" } : null) },
    props: {
      "data-slot": "context-menu-trigger",
      ...elementProps,
      style: { WebkitTouchCallout: "none", ...(elementProps.style as object | undefined) },
      onContextMenu: (event: ReactMouseEvent<HTMLElement>) => {
        (elementProps.onContextMenu as ((event: ReactMouseEvent<HTMLElement>) => void) | undefined)?.(event);
        if (disabled || event.defaultPrevented) return;
        // The browser's own menu stays shut, and an outer trigger does not open too.
        event.preventDefault();
        event.stopPropagation();
        endPress();
        openAt(event.clientX, event.clientY, false, event.nativeEvent, event.currentTarget);
      },
      // A long press, for a phone that sends no `contextmenu` (iOS).
      onTouchStart: (event: ReactTouchEvent<HTMLElement>) => {
        (elementProps.onTouchStart as ((event: ReactTouchEvent<HTMLElement>) => void) | undefined)?.(event);
        endPress();
        const touch = event.touches.length === 1 ? event.touches[0] : undefined;
        if (disabled || !touch) return;
        const { clientX: x, clientY: y } = touch;
        const native = event.nativeEvent;
        const trigger = event.currentTarget;
        const timer = window.setTimeout(() => {
          press.current = null;
          openAt(x, y, true, native, trigger);
        }, LONG_PRESS_MS);
        press.current = { x, y, timer };
      },
      onTouchMove: (event: ReactTouchEvent<HTMLElement>) => {
        (elementProps.onTouchMove as ((event: ReactTouchEvent<HTMLElement>) => void) | undefined)?.(event);
        const touch = event.touches[0];
        if (!press.current || !touch) return;
        const moved = Math.max(Math.abs(touch.clientX - press.current.x), Math.abs(touch.clientY - press.current.y));
        if (moved > LONG_PRESS_MOVE_PX) endPress();
      },
      onTouchEnd: (event: ReactTouchEvent<HTMLElement>) => {
        (elementProps.onTouchEnd as ((event: ReactTouchEvent<HTMLElement>) => void) | undefined)?.(event);
        endPress();
      },
      onTouchCancel: (event: ReactTouchEvent<HTMLElement>) => {
        (elementProps.onTouchCancel as ((event: ReactTouchEvent<HTMLElement>) => void) | undefined)?.(event);
        endPress();
      },
    },
  });
}

export type ContextMenuContentProps = ContextMenuPrimitive.Popup.Props &
  Pick<ContextMenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding">;

/** The context menu's surface, at the pointer. No arrow. */
export function ContextMenuContent({
  align,
  alignOffset,
  side,
  sideOffset,
  collisionPadding = 8,
  className,
  children,
  finalFocus,
  ...props
}: ContextMenuContentProps): ReactNode {
  const plain = useContext(PlainContext);
  if (!plain) {
    return (
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Positioner
          className="dl-menu-positioner"
          align={align}
          alignOffset={alignOffset}
          side={side}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
        >
          <ContextMenuPrimitive.Popup
            data-slot="context-menu-content"
            className={withClass("dl-menu dl-context-menu", className)}
            finalFocus={finalFocus}
            {...props}
          >
            <div className="dl-menu-list">{children}</div>
          </ContextMenuPrimitive.Popup>
        </ContextMenuPrimitive.Positioner>
      </ContextMenuPrimitive.Portal>
    );
  }
  if (!plain.mounted) return null;
  // Base UI's own placement for a context menu: from the point's corner,
  // a little over it, so the pointer starts inside the surface's edge.
  const placed = side === undefined && (align ?? "start") !== "center";
  // Drawn from <body>, like the trigger above. Base UI leaves a menu that is
  // not modal two focus guards and a marker where its portal sits in the
  // tree, and here that is the app's own list or table.
  return createPortal(
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="dl-menu-positioner"
        anchor={plain.anchor}
        positionMethod="fixed"
        align={align ?? "start"}
        alignOffset={alignOffset ?? (placed ? 2 : 0)}
        side={side ?? "bottom"}
        sideOffset={sideOffset ?? (placed ? -5 : 0)}
        collisionPadding={collisionPadding}
      >
        <MenuPrimitive.Popup
          data-slot="context-menu-content"
          className={withClass("dl-menu dl-context-menu", className)}
          finalFocus={finalFocus ?? plain.returnFocus}
          {...props}
        >
          <div className="dl-menu-list">{children}</div>
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>,
    document.body,
  );
}
