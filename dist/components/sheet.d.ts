import { type ComponentProps, type ReactNode, type Ref } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { type SheetDismissDistance } from "./sheet-release.js";
/**
 * The family's sheet: one bottom sheet for the four apps, on Base UI's
 * Drawer. Each app had hand-built its own (three in calendar alone), and
 * each copy had its own drag, its own focus trap and its own exit.
 *
 *   <Sheet open={open} onOpenChange={(next) => setOpen(next)}>
 *     <SheetContent label="Move to">
 *       <SheetBody>
 *         <SheetTitle>Move to</SheetTitle>
 *         ...
 *       </SheetBody>
 *     </SheetContent>
 *   </Sheet>
 *
 * What it does, with the reason for each where the reason is not plain:
 *
 * - It rises from the foot of the screen over `--dl-t-sheet` and sinks the
 *   same way, with the page dimmed by `--dl-scrim` behind it. Opened or
 *   closed from the keyboard, or under reduced motion, it lands at once.
 * - It drags from anywhere on it, once its scrolling body is at the top.
 *   Base UI's Drawer does that part. The kit adds the start rules Base UI
 *   lacks (sheet-release.ts) and judges the release by the family's rule.
 * - The panel carries no transform at rest, and its frost is a layer
 *   behind its content (sheet.css). A transform or a backdrop filter on
 *   the panel would make it the containing block for anything fixed
 *   inside it, which drive's and notes' sheets hold.
 * - Focus lands on the panel, not on its first control: a focused field
 *   would raise the phone's keyboard over the sheet.
 * - Every close asks `onOpenChange` first, with its reason, and the app
 *   may refuse it with `details.cancel()`. A refused swipe settles back.
 * - It tells the kit's toaster it covers the bar, and a toast's action
 *   joins its Tab loop, as in the phone's search and the palette.
 *
 * A sheet opened over another is a `<Sheet>` drawn inside the first one's
 * content. Escape, the scrim and a swipe then close the top one alone.
 */
/** A phone sheet at the foot of the screen, or a small dialog in the middle of the window. */
export type SheetLayout = "sheet" | "dialog";
/** Base UI's own account of an open or a close. */
export type SheetNativeDetails = Parameters<NonNullable<Drawer.Root.Props["onOpenChange"]>>[1];
/**
 * Why the sheet is opening or closing. Base UI's reasons, and one of the
 * kit's: `"system-back"` is Android's back button or the iOS back swipe,
 * with `systemBack` on, whether the history entry or the browser's
 * CloseWatcher took it.
 *
 * `"outside-press"` is a press on the scrim, `"escape-key"` the key,
 * `"swipe"` a drag released past the family's rule, `"close-press"` a
 * `<SheetClose>` or the dialog's X, `"trigger-press"` a `<SheetTrigger>`,
 * `"imperative-action"` the `close()` of `actionsRef`, `"focus-out"` focus
 * leaving a sheet that is not modal, and `"close-watcher"` Android's back
 * gesture where the browser gives it to a sheet with `systemBack` off.
 */
export type SheetChangeReason = SheetNativeDetails["reason"] | "system-back";
export type SheetChangeDetails = {
    /** What asked for the change. */
    reason: SheetChangeReason;
    /** The event behind it, where there is one. */
    event: Event | undefined;
    /**
     * Refuses the change: the sheet stays as it is. A swipe settles back, and
     * a system back keeps its history entry. Call it inside `onOpenChange`.
     */
    cancel: () => void;
    /** Whether `cancel()` was called. */
    readonly isCanceled: boolean;
    /** Base UI's own details. */
    native: SheetNativeDetails;
};
export type SheetActions = {
    /**
     * Closes the sheet as its own Close does. `onOpenChange` hears
     * `"imperative-action"` and may refuse. `then` runs once the exit has
     * finished and the sheet's history entry, if it has one, has gone: the
     * moment a row may navigate. It does not run for a refused close, nor
     * for one an app that owns `open` let pass and then kept the sheet open.
     */
    close: (then?: () => void) => void;
};
export type SheetProps = {
    /** Whether the sheet is open, for an app that owns it. Leave it out and the sheet owns it. */
    open?: boolean;
    /** Whether it starts open, where the sheet owns the state. */
    defaultOpen?: boolean;
    /**
     * Called before every open and close, with the reason. The scrim, Escape,
     * a swipe, a Close, the system's back and `actionsRef.close()` all ask
     * here first, and `details.cancel()` refuses any of them, which is how an
     * editor with unsaved words asks before it goes.
     */
    onOpenChange?: (open: boolean, details: SheetChangeDetails) => void;
    /**
     * Called once the sheet has finished opening or closing, after its slide.
     * A close under reduced motion finishes at once. The place for a haptic,
     * for focus work, and for whatever must wait for the exit.
     */
    onOpenChangeComplete?: (open: boolean) => void;
    /**
     * A phone sheet, or the small centred dialog the Settings sheets become
     * on a computer: no handle, an X, and a shorter open and close. The
     * breakpoint is the app's, so the app passes the answer.
     */
    layout?: SheetLayout;
    /**
     * Whether the sheet holds the page: `true` traps focus, locks the page's
     * scroll and takes presses outside it. `false` leaves the page in use,
     * as mail's compose does while it peeks. `"trap-focus"` holds Tab alone.
     */
    modal?: boolean | "trap-focus";
    /** Whether a drag closes the sheet. Off for a sheet whose drag is the app's own. */
    swipe?: boolean;
    /**
     * How far down a release closes the sheet, in px, or as a function of
     * the sheet's height. Left out, it is mail's and calendar's rule: 96px
     * or 40% of the height, whichever is less. The Settings sheets pass
     * `SHEET_DISMISS_PX`, their flat 96px, which a short sheet needs said:
     * under 240px tall the two differ. The flick is the same either way.
     */
    dismissDistance?: SheetDismissDistance;
    /** Whether a press outside the sheet closes it. On by default. */
    dismissOnOutsidePress?: boolean;
    /**
     * Whether the sheet owns the system's back while it is open, with one
     * history entry (back-entry.ts). Off by default: drive and mail give
     * their layers entries of their own, and two would stack.
     */
    systemBack?: boolean;
    /**
     * Whether something inside the sheet takes this Escape for itself, such
     * as a field with text to drop first. While it answers true the sheet
     * stays open and the key goes on to that field. Calendar passes its
     * `fieldOwnsEscape`.
     */
    ownsEscape?: (target: Element | null, event: KeyboardEvent) => boolean;
    /**
     * Turns on Base UI's own keyboard handling (`Drawer.VirtualKeyboardProvider`).
     * Off by default: mail and notes run their own caret follow, and the two
     * would fight. Without it the sheet reads the app's `--kb-inset`.
     */
    virtualKeyboard?: boolean;
    /** `close(then)`, for a row that closes the sheet and then acts. */
    actionsRef?: Ref<SheetActions>;
    children?: ReactNode;
};
/** The attribute that marks a region whose gestures are its own. `""` for every drag, `"x"` or `"y"` for one axis. */
export declare const SHEET_NO_DRAG_ATTR = "data-dl-no-drag";
/** Base UI's own name for the same mark, which is what its Drawer reads. */
declare const BASE_IGNORE_ATTR = "data-base-ui-swipe-ignore";
/** What `noSheetDrag()` returns: the kit's mark and Base UI's, with the same value. */
export type SheetNoDragProps = {
    [SHEET_NO_DRAG_ATTR]: string;
    [BASE_IGNORE_ATTR]: string;
};
/**
 * Props for a region inside a sheet that owns its own gestures: a media
 * scrubber, a PDF being panned. With `"x"`, a sideways drag is the
 * region's and a downward one still moves the sheet: mail's swipe between
 * attachments.
 *
 *   <div {...noSheetDrag("x")}>...</div>
 *
 * It writes the kit's mark and Base UI's own, so React owns both: a region
 * that stops spreading it (mail's PDF once zoomed back out) drags again.
 */
export declare function noSheetDrag(axis?: "x" | "y"): SheetNoDragProps;
export declare function Sheet({ open: openProp, defaultOpen, onOpenChange, onOpenChangeComplete, layout, modal, swipe, dismissDistance, dismissOnOutsidePress, systemBack, ownsEscape, virtualKeyboard, actionsRef, children, }: SheetProps): ReactNode;
/** A button that opens the sheet, for a sheet that owns its own state. */
export declare function SheetTrigger(props: Drawer.Trigger.Props): ReactNode;
export type SheetContentProps = Omit<Drawer.Popup.Props, "children"> & {
    /**
     * The sheet's accessible name, for one with no `<SheetTitle>`. A title
     * names the sheet by itself.
     */
    label?: string;
    /**
     * The element the sheet is drawn into, in place of `<body>`. Calendar
     * draws its event sheet into the search dialog, so that dialog's focus
     * trap reaches it.
     */
    container?: Drawer.Portal.Props["container"];
    /** Keeps the sheet in the document while it is closed. */
    keepMounted?: boolean;
    /** Whether the page is dimmed behind the sheet. On by default; a sheet over a sheet dims the one under it. */
    scrim?: boolean;
    /** Whether the grab handle is drawn. On by default, and never in the dialog layout. */
    handle?: boolean;
    /** The accessible name of the dialog layout's X. "Close". */
    closeLabel?: string;
    /** Whether the sheet tells the kit's toaster it covers the bottom bar. On by default. */
    toastCover?: boolean;
    /** Extra classes for the scrim, beside `dl-sheet-scrim`. */
    scrimClassName?: string;
    /** Extra classes for the box that places the panel, beside `dl-sheet-viewport`. */
    viewportClassName?: string;
    /**
     * The sheet's own variables (sheet.css), for this sheet alone:
     * `vars={{ "--dl-sheet-z": 72 }}`. They are written on the scrim and on
     * the box that places the panel, and the panel inherits them from the
     * box. A variable in `className` or `style` reaches the panel alone, and
     * the scrim's and the box's own (`--dl-sheet-z`, `--dl-sheet-scrim`,
     * `--dl-sheet-lift`, `--dl-sheet-kb`, the dialog's timing) never see it.
     */
    vars?: SheetVars;
    children?: ReactNode;
};
/** Variables for one sheet, by name: `{ "--dl-sheet-z": 72 }`. */
export type SheetVars = {
    [name: `--${string}`]: string | number;
};
/**
 * The sheet itself: the scrim, the box that places the panel, and the
 * panel, with the handle drawn at its top. `className`, `style` and every
 * other prop go to the panel. `vars` go to the scrim and to the box, and
 * the panel inherits them. `initialFocus` and `finalFocus` are Base UI's
 * own: focus lands on the panel unless `initialFocus` names a
 * target, and goes back to what opened the sheet.
 *
 * Each part carries `data-layout`, and the panel and the scrim Base UI's
 * state (`data-open`, `data-starting-style`, `data-ending-style`,
 * `data-swiping`, `data-nested-drawer-open`), for the app's own rules.
 */
export declare function SheetContent({ label, container, keepMounted, scrim, handle, closeLabel, toastCover, className, scrimClassName, viewportClassName, vars, children, ref, ...props }: SheetContentProps): ReactNode;
/**
 * The grab handle: a strip with the family's pill on it. `<SheetContent>`
 * draws one at its top, so an app draws its own only where the handle
 * does something else as well, as mail's does on a tap.
 */
export declare function SheetHandle({ className, children, ...props }: ComponentProps<"div">): ReactNode;
/** A row at the top of the sheet: a title between a Cancel and a Done. It does not scroll. */
export declare function SheetHeader({ className, ...props }: ComponentProps<"div">): ReactNode;
/** The sheet's heading, which also names it for a screen reader. */
export declare function SheetTitle({ className, ...props }: Drawer.Title.Props): ReactNode;
/** A muted line under the title, which a screen reader hears as the sheet's description. */
export declare function SheetDescription({ className, ...props }: Drawer.Description.Props): ReactNode;
/**
 * The part of the sheet that scrolls. A finger drags the sheet from here
 * once the body is at its top, and a mouse selects text here and drags
 * the sheet by everything around it.
 */
export declare function SheetBody({ className, ...props }: Drawer.Content.Props): ReactNode;
/** A row pinned to the foot of the sheet, under the body: Cancel and Done. */
export declare function SheetFooter({ className, ...props }: ComponentProps<"div">): ReactNode;
/** A button that closes the sheet. `onOpenChange` hears `"close-press"`. */
export declare function SheetClose(props: Drawer.Close.Props): ReactNode;
export {};
//# sourceMappingURL=sheet.d.ts.map