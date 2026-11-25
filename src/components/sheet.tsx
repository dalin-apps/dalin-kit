"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { Drawer } from "@base-ui/react/drawer";
import { startedFromKeyboard } from "../helpers/input-modality.js";
import { LEAVING_ATTR } from "../helpers/leaving.js";
import { reducesMotion } from "../helpers/motion.js";
import { registerToastDock } from "../toast/toast-dock.js";
import { pushBackEntry, type BackEntry } from "./back-entry.js";
import { cx, withClass } from "./cx.js";
import { CloseGlyph } from "./icons.js";
import {
  SHEET_FLING_STALE_MS,
  nextSheetVelocity,
  sheetDragBlock,
  sheetShouldDismiss,
  type SheetDismissDistance,
} from "./sheet-release.js";
import { useToasterTab } from "./toaster-tab.js";

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
export const SHEET_NO_DRAG_ATTR = "data-dl-no-drag";
/** Base UI's own name for the same mark, which is what its Drawer reads. */
const BASE_IGNORE_ATTR = "data-base-ui-swipe-ignore";
/** What `noSheetDrag()` returns: the kit's mark and Base UI's, with the same value. */
export type SheetNoDragProps = { [SHEET_NO_DRAG_ATTR]: string; [BASE_IGNORE_ATTR]: string };
/** How far a sheet ranks as a toast dock: with the phone's search, over the bar and a parked chip. */
const COVER_RANK = 50;

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
export function noSheetDrag(axis?: "x" | "y"): SheetNoDragProps {
  const value = axis ?? "";
  return { [SHEET_NO_DRAG_ATTR]: value, [BASE_IGNORE_ATTR]: value };
}

type Gesture = {
  /** The kit's answer for the release in hand: close, settle, or no answer. */
  verdict: boolean | null;
  /** Whether Base UI asked to close on this release. */
  baseTried: boolean;
};

type SheetContextValue = {
  open: boolean;
  layout: SheetLayout;
  instant: boolean;
  modal: boolean | "trap-focus";
  swipe: boolean;
  virtualKeyboard: boolean;
  /** How many sheets this one stands over. */
  depth: number;
  gesture: RefObject<Gesture>;
  /** The sheet's own closing distance, read at each release. */
  distance: RefObject<SheetDismissDistance | undefined>;
  /** Closes the sheet for a drag the kit's rule accepts and Base UI's did not. */
  swipeClose: (event: Event) => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheet(part: string): SheetContextValue {
  const value = useContext(SheetContext);
  if (!value) throw new Error(`<${part}> must be inside a <Sheet>.`);
  return value;
}

/** Whether an open or close came from a key: the key itself, or a click a key made. */
function fromKey(event: Event | undefined): boolean {
  if (!event) return false;
  if (event.type.startsWith("key")) return true;
  return event.type === "click" && (event as MouseEvent).detail === 0;
}

export function Sheet({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onOpenChangeComplete,
  layout = "sheet",
  modal = true,
  swipe = true,
  dismissDistance,
  dismissOnOutsidePress = true,
  systemBack = false,
  ownsEscape,
  virtualKeyboard = false,
  actionsRef,
  children,
}: SheetProps): ReactNode {
  const parent = useContext(SheetContext);
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = openProp ?? ownOpen;
  const openRef = useRef(open);
  openRef.current = open;

  // Whether this open or close lands with no slide: a key started it, or
  // motion is reduced. Read as `open` changes, in render, so the first
  // frame already knows.
  const [instant, setInstant] = useState(false);
  const byKey = useRef(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    setInstant(byKey.current || startedFromKeyboard() || reducesMotion());
  }
  useEffect(() => {
    byKey.current = false;
  }, [open]);

  const base = useRef<Drawer.Root.Actions | null>(null);
  const gesture = useRef<Gesture>({ verdict: null, baseTried: false });
  const distance = useRef(dismissDistance);
  distance.current = dismissDistance;
  const backRef = useRef(systemBack);
  backRef.current = systemBack;
  /** The reason the kit gives a close it asked Base UI for, and the event behind it. */
  const forced = useRef<{ reason: SheetChangeReason; event: Event | undefined } | null>(null);
  /** Whether the sheet is in the tree: a sheet the app unmounts to close leaves no closed render. */
  const mounted = useRef(false);

  // What waits for the exit: `close(then)`. It runs once the slide has
  // ended and every history entry the sheet pushed has gone.
  const pendingThen = useRef<(() => void) | null>(null);
  const afterExit = useRef<Array<() => void>>([]);
  const exitDone = useRef(!open);
  // The sheet's history entry, as the phone's search keeps one: in a ref
  // and not tied to one effect's cleanup, since strict mode runs every
  // effect twice as a tree mounts.
  const backEntry = useRef<BackEntry | null>(null);
  /** Entries taken off from the screen whose traversal has not landed. */
  const popping = useRef(0);
  const flush = useCallback(() => {
    if (!exitDone.current || backEntry.current || popping.current > 0) return;
    const runs = afterExit.current;
    afterExit.current = [];
    for (const run of runs) run();
  }, []);

  const changeRef = useRef(onOpenChange);
  changeRef.current = onOpenChange;
  const escapeRef = useRef(ownsEscape);
  escapeRef.current = ownsEscape;
  const controlled = openProp !== undefined;

  const handleChange = useCallback(
    (next: boolean, native: SheetNativeDetails) => {
      const asked = forced.current;
      forced.current = null;
      if (!next && !asked && native.reason === "swipe") {
        // Base UI would close on this release. The kit's rule has already
        // judged it (the gesture's own listeners), and a no settles it back.
        gesture.current.baseTried = true;
        if (gesture.current.verdict === false) {
          native.cancel();
          return;
        }
      }
      const event = asked ? asked.event : (native.event as Event | undefined);
      let reason = asked ? asked.reason : native.reason;
      // Android's back reaches a sheet through the browser's CloseWatcher
      // before history sees it. With `systemBack` on, that is the same back.
      if (reason === "close-watcher" && backRef.current) reason = "system-back";
      if (!next && reason === "escape-key" && escapeRef.current && event) {
        const target = event.target instanceof Element ? event.target : null;
        if (escapeRef.current(target, event as KeyboardEvent)) {
          native.cancel();
          // The key is the field's: let it travel on to whoever listens.
          native.allowPropagation();
          return;
        }
      }
      const details: SheetChangeDetails = {
        reason,
        event,
        cancel: () => native.cancel(),
        get isCanceled() {
          return native.isCanceled;
        },
        native,
      };
      changeRef.current?.(next, details);
      if (native.isCanceled) {
        pendingThen.current = null;
        return;
      }
      byKey.current = fromKey(event);
      if (!next && pendingThen.current) {
        afterExit.current.push(pendingThen.current);
        pendingThen.current = null;
      }
      if (!controlled) setOwnOpen(next);
    },
    [controlled],
  );

  const completeRef = useRef(onOpenChangeComplete);
  completeRef.current = onOpenChangeComplete;
  const handleComplete = useCallback(
    (now: boolean) => {
      completeRef.current?.(now);
      if (now) return;
      exitDone.current = true;
      flush();
    },
    [flush],
  );
  useEffect(() => {
    // An open sheet has an exit ahead of it.
    if (open) exitDone.current = false;
  }, [open]);

  const swipeClose = useCallback((event: Event) => {
    if (!openRef.current) return;
    forced.current = { reason: "swipe", event };
    base.current?.close();
    // Base UI answers inside close(). A reason it never read is dropped,
    // or the next change would wear it.
    forced.current = null;
  }, []);

  // Whether a close was let through and the sheet is still up a task
  // later, asked once the app that owns `open` has had its say. Timers in
  // a ref, so an unmount clears them.
  const timers = useRef(new Set<number>());
  const afterClose = useCallback((run: () => void) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      if (mounted.current) run();
    }, 0);
    timers.current.add(id);
  }, []);

  useImperativeHandle(
    actionsRef,
    () => ({
      close(then) {
        if (!openRef.current) {
          then?.();
          return;
        }
        pendingThen.current = then ?? null;
        base.current?.close();
        // Base UI answers inside close(). A `then` it never took is dropped,
        // or a later close would run it.
        pendingThen.current = null;
        if (!then) return;
        // An app that owns `open` may let the close pass and keep the sheet
        // up. That close did not happen, so its `then` is dropped too.
        afterClose(() => {
          if (!openRef.current) return;
          afterExit.current = afterExit.current.filter((run) => run !== then);
        });
      },
    }),
    [afterClose],
  );

  const onBack = useCallback(() => {
    backEntry.current = null;
    forced.current = { reason: "system-back", event: undefined };
    base.current?.close();
    forced.current = null;
    // A refused back keeps the sheet up, so it needs its entry again, or
    // the next back would leave the app. Refused means the sheet is still
    // in the tree and still open: `cancel()`, or an app that owns `open`
    // and kept it. A sheet the app unmounted gets no entry.
    afterClose(() => {
      if (!openRef.current || !backRef.current || backEntry.current) return;
      backEntry.current = pushBackEntry(onBack);
    });
  }, [afterClose]);
  useEffect(() => {
    if (open && systemBack) {
      if (!backEntry.current) backEntry.current = pushBackEntry(onBack);
    } else if (backEntry.current) {
      const entry = backEntry.current;
      backEntry.current = null;
      // Counted until its own traversal lands, so a sheet opened again in
      // the meantime is not taken for one whose entry has gone.
      popping.current += 1;
      entry.pop(() => {
        popping.current -= 1;
        flush();
      });
    }
  }, [open, systemBack, onBack, flush]);
  useEffect(() => {
    mounted.current = true;
    const pending = timers.current;
    return () => {
      mounted.current = false;
      for (const id of pending) window.clearTimeout(id);
      pending.clear();
      queueMicrotask(() => {
        if (mounted.current) return;
        const entry = backEntry.current;
        backEntry.current = null;
        entry?.pop();
      });
    };
  }, []);

  const depth = parent ? parent.depth + 1 : 0;
  const value = useMemo<SheetContextValue>(
    () => ({ open, layout, instant, modal, swipe, virtualKeyboard, depth, gesture, distance, swipeClose }),
    [open, layout, instant, modal, swipe, virtualKeyboard, depth, swipeClose],
  );

  return (
    <SheetContext.Provider value={value}>
      <Drawer.Root
        open={open}
        onOpenChange={handleChange}
        onOpenChangeComplete={handleComplete}
        modal={modal}
        disablePointerDismissal={!dismissOnOutsidePress}
        actionsRef={base}
      >
        {virtualKeyboard ? <Drawer.VirtualKeyboardProvider>{children}</Drawer.VirtualKeyboardProvider> : children}
      </Drawer.Root>
    </SheetContext.Provider>
  );
}

/** A button that opens the sheet, for a sheet that owns its own state. */
export function SheetTrigger(props: Drawer.Trigger.Props): ReactNode {
  return <Drawer.Trigger data-slot="sheet-trigger" {...props} />;
}

/** Whether text inside the panel is selected: a drag would fight the selection's own handles. */
function selectingIn(panel: HTMLElement): boolean {
  const doc = panel.ownerDocument;
  const active = doc.activeElement;
  if ((active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) && panel.contains(active)) {
    try {
      const { selectionStart, selectionEnd } = active;
      if (selectionStart !== null && selectionEnd !== null && selectionStart < selectionEnd) return true;
    } catch {
      // A field with no selection to read (a checkbox) has none.
    }
  }
  const selection = doc.getSelection?.();
  if (!selection || selection.isCollapsed) return false;
  return panel.contains(selection.anchorNode) || panel.contains(selection.focusNode);
}

/** The touch a gesture follows, by its identifier, among an event's touches. */
function touchOf(list: TouchList | undefined, id: number): Touch | null {
  if (!list) return null;
  for (let i = 0; i < list.length; i++) {
    const touch = list[i];
    if (touch && touch.identifier === id) return touch;
  }
  return null;
}

const isTouch = (event: Event): event is TouchEvent => "touches" in event;
const isTouchPointer = (event: Event) => !isTouch(event) && (event as PointerEvent).pointerType === "touch";

/** Where the mouse is, top to bottom. */
function mouseY(event: Event): number | null {
  const y = (event as PointerEvent).clientY;
  return typeof y === "number" ? y : null;
}

/**
 * The kit's half of the drag. Base UI moves the panel and decides by its
 * own rule. These listeners stand on either side of its handlers and make
 * the family's rule the one that counts:
 *
 * - As a press lands (capture, on the sheet's own viewport, which runs
 *   before React hands the event to Base UI), the start rules are asked. A
 *   press that may not drag writes Base UI's ignore mark on the viewport,
 *   and Base UI then starts nothing for that gesture. A drag follows one
 *   touch: a second finger neither starts a gesture nor ends this one.
 * - As the finger lifts (capture, at the window, so before Base UI), the
 *   release is judged from where Base UI has the panel and from the kit's
 *   own reading of the speed. A close Base UI then asks for is refused if
 *   the answer was no (`<Sheet>`'s `onOpenChange`).
 * - After Base UI has had the release (bubble, at the window), a yes that
 *   Base UI did not act on closes the sheet, from where the finger let go.
 *   Something inside the sheet may stop the release on its way up, so the
 *   next frame finishes it too, and a verdict belongs to its own release
 *   alone: no later move acts on it.
 */
function useSheetGesture(viewport: HTMLElement | null, panel: HTMLElement | null, sheet: SheetContextValue): void {
  const { open, layout, swipe, gesture, distance, swipeClose } = sheet;
  const openedAt = useRef(0);
  useEffect(() => {
    if (open) openedAt.current = performance.now();
  }, [open]);
  const draggable = swipe && layout === "sheet";

  useEffect(() => {
    if (!viewport || !panel) return;
    const win = viewport.ownerDocument.defaultView;
    if (!win) return;
    /** What the gesture in hand follows: a mouse, one touch by its identifier, or nothing. */
    let tracking: { kind: "mouse" } | { kind: "touch"; id: number } | null = null;
    let last = { y: 0, t: 0 };
    let velocity = 0;
    let scrolledAt = Number.NEGATIVE_INFINITY;
    /** The release the verdict was given for, and the frame that finishes it if nothing else does. */
    let judged: Event | null = null;
    let frame = 0;
    /** Where the press landed, top to bottom. */
    let startY = 0;
    /**
     * The travel Base UI drops as it takes its origin from the first move:
     * a phone sends no touchmove until the finger has gone some 15px. The
     * kit draws it back with `translate` beside Base UI's `transform`, and
     * counts it in the release. Null until known.
     */
    let gap: number | null = null;
    let moved = false;
    let gapFrame = 0;

    /** Whether Base UI has the panel under a finger: it writes both while it drags. */
    const dragging = () => panel.style.transform !== "" || panel.style.transition === "none";
    /** How far down Base UI has the panel, in px. */
    const offsetNow = () => Number.parseFloat(panel.style.getPropertyValue("--drawer-swipe-movement-y")) || 0;

    /** Where the followed pointer is on this event, top to bottom, or null when the event is not its own. */
    const yOf = (event: Event): number | null => {
      if (!tracking) return null;
      if (tracking.kind === "touch") {
        if (!isTouch(event)) return null;
        const touch = touchOf(event.touches, tracking.id) ?? touchOf(event.changedTouches, tracking.id);
        return touch ? touch.clientY : null;
      }
      return isTouch(event) || isTouchPointer(event) ? null : mouseY(event);
    };

    const clearFrame = () => {
      if (frame) win.cancelAnimationFrame(frame);
      frame = 0;
    };
    const showGap = (px: number) => {
      if (px > 0) panel.style.setProperty("translate", `0 ${px}px`);
      else panel.style.removeProperty("translate");
    };
    /** Reads the dropped travel once Base UI has the panel: the finger's travel less Base UI's. */
    const learnGap = () => {
      if (gap !== null || !moved || !dragging()) return;
      const offset = offsetNow();
      if (offset < 0) return;
      gap = Math.max(0, last.y - startY - offset);
      showGap(gap);
    };
    const clearGap = () => {
      if (gapFrame) win.cancelAnimationFrame(gapFrame);
      gapFrame = 0;
      gap = null;
      moved = false;
      showGap(0);
    };

    const onStart = (event: Event) => {
      if (isTouchPointer(event)) return;
      let start: typeof tracking;
      let y: number | null;
      if (isTouch(event)) {
        // A second finger while one is down is no new gesture. A followed
        // touch missing from the screen's list has ended unseen (its target
        // left the page), and this press starts afresh.
        if (tracking?.kind === "touch" && touchOf(event.touches, tracking.id)) return;
        const touch = event.changedTouches?.[0] ?? event.touches[0];
        if (!touch) return;
        start = { kind: "touch", id: touch.identifier };
        y = touch.clientY;
      } else {
        if ((event as PointerEvent).button !== 0) return;
        start = { kind: "mouse" };
        y = mouseY(event);
      }
      const target = event.target instanceof Element ? event.target : null;
      const now = event.timeStamp;
      const blocked =
        !draggable ||
        sheetDragBlock({
          sinceOpen: now - openedAt.current,
          sinceScroll: now - scrolledAt,
          onSelect: target?.closest("select") != null,
          selecting: selectingIn(panel),
        }) !== null;
      viewport.toggleAttribute(BASE_IGNORE_ATTR, blocked);
      tracking = y === null ? null : start;
      last = { y: y ?? 0, t: now };
      startY = last.y;
      clearGap();
      velocity = 0;
      judged = null;
      clearFrame();
      gesture.current.verdict = null;
      gesture.current.baseTried = false;
    };

    /**
     * Gives the release its verdict, from the finger's travel since the
     * press: Base UI's offset and the travel it dropped. `moveDy` is for a
     * release that moved the panel itself (a mouse's last move), which Base
     * UI counts before it decides.
     */
    const judge = (event: Event, cancelled: boolean, moveDy?: number) => {
      judged = event;
      learnGap();
      const panelOffset = moveDy === undefined ? offsetNow() : afterMove(offsetNow(), moveDy);
      const offset = panelOffset + (gap ?? 0);
      const fresh = moveDy !== undefined && moveDy !== 0;
      const held = !fresh && event.timeStamp - last.t > SHEET_FLING_STALE_MS;
      gesture.current.verdict = !dragging()
        ? null
        : !cancelled &&
          sheetShouldDismiss({
            offset,
            height: panel.offsetHeight,
            velocity: held ? 0 : velocity,
            distance: distance.current,
          });
      gesture.current.baseTried = false;
      // The bubble listener may never hear this release: the next frame
      // finishes it then, still before anything is drawn.
      clearFrame();
      frame = win.requestAnimationFrame(() => {
        frame = 0;
        if (judged === event) flushSync(() => finish(event));
      });
    };

    const finish = (event: Event) => {
      if (judged !== event) return;
      judged = null;
      tracking = null;
      clearFrame();
      const { verdict, baseTried } = gesture.current;
      gesture.current.verdict = null;
      // Base UI lets go of the panel as it takes the release. One still
      // under its drag never heard the release, and is left to it.
      if (dragging()) return;
      // The dropped travel goes with Base UI's offset, on the same curve.
      clearGap();
      if (verdict === true && !baseTried) swipeClose(event);
    };

    const onMove = (event: Event) => {
      if (isTouchPointer(event)) {
        // Before its first touchmove the browser still sends pointer moves,
        // from the first pixel. Where Base UI holds the panel from the press
        // (the handle, or a body with nothing to scroll, so no scroll to
        // tell apart), the panel follows them until Base UI has a move.
        const pointer = event as PointerEvent;
        if (tracking?.kind === "touch" && !moved && pointer.isPrimary && dragging()) {
          showGap(Math.max(0, pointer.clientY - startY));
        }
        return;
      }
      const y = yOf(event);
      if (y === null) return;
      // Base UI has taken every move before this one.
      if (moved) learnGap();
      moved = true;
      const dy = y - last.y;
      velocity = nextSheetVelocity(velocity, dy, event.timeStamp - last.t);
      // A mouse's release can arrive as a move with no button down, and
      // Base UI moves the panel by it before it ends the drag. The kit
      // counts that move too, then judges.
      const releasing = !isTouch(event) && (event as PointerEvent).buttons === 0 && dragging();
      if (releasing) judge(event, false, dy);
      last = { y, t: event.timeStamp };
      // Base UI takes this move after the kit: the dropped travel is read
      // once it has, before the frame is drawn.
      if (!releasing && gap === null && !gapFrame) {
        gapFrame = win.requestAnimationFrame(() => {
          gapFrame = 0;
          learnGap();
        });
      }
    };
    const onMoveAfter = (event: Event) => {
      finish(event);
    };
    /** Whether this end is the followed pointer's own. */
    const ownEnd = (event: Event): boolean => {
      if (!tracking || isTouchPointer(event)) return false;
      if (tracking.kind === "touch") return isTouch(event) && touchOf(event.changedTouches, tracking.id) !== null;
      return !isTouch(event);
    };
    const onEnd = (event: Event) => {
      if (ownEnd(event)) judge(event, event.type.endsWith("cancel"));
    };
    const onEndAfter = (event: Event) => {
      finish(event);
    };
    const onScroll = (event: Event) => {
      scrolledAt = event.timeStamp;
    };

    const starts = ["touchstart", "pointerdown"] as const;
    const ends = ["touchend", "touchcancel", "pointerup", "pointercancel"] as const;
    for (const name of starts) viewport.addEventListener(name, onStart, { capture: true, passive: true });
    viewport.addEventListener("scroll", onScroll, { capture: true, passive: true });
    win.addEventListener("touchmove", onMove, { capture: true, passive: true });
    win.addEventListener("pointermove", onMove, { capture: true, passive: true });
    win.addEventListener("pointermove", onMoveAfter, { passive: true });
    for (const name of ends) {
      win.addEventListener(name, onEnd, { capture: true, passive: true });
      win.addEventListener(name, onEndAfter, { passive: true });
    }
    return () => {
      clearFrame();
      clearGap();
      for (const name of starts) viewport.removeEventListener(name, onStart, true);
      viewport.removeEventListener("scroll", onScroll, true);
      win.removeEventListener("touchmove", onMove, true);
      win.removeEventListener("pointermove", onMove, true);
      win.removeEventListener("pointermove", onMoveAfter);
      for (const name of ends) {
        win.removeEventListener(name, onEnd, true);
        win.removeEventListener(name, onEndAfter);
      }
    };
  }, [viewport, panel, draggable, gesture, distance, swipeClose]);
}

/**
 * Where Base UI puts the panel after one more move of `dy`: the travel adds
 * up as it is, except above the resting place, where Base UI draws the
 * square root of the pull.
 */
function afterMove(offset: number, dy: number): number {
  const raw = (offset >= 0 ? offset : -(offset ** 2)) + dy;
  return raw >= 0 ? raw : -Math.sqrt(-raw);
}

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
export type SheetVars = { [name: `--${string}`]: string | number };

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
export function SheetContent({
  label,
  container,
  keepMounted,
  scrim = true,
  handle = true,
  closeLabel = "Close",
  toastCover = true,
  className,
  scrimClassName,
  viewportClassName,
  vars,
  children,
  ref,
  ...props
}: SheetContentProps): ReactNode {
  const sheet = useSheet("SheetContent");
  const { open, layout, instant, modal, depth, virtualKeyboard } = sheet;
  // The elements as state: Base UI mounts them a commit after `open` turns
  // true, and the listeners and the toaster's dock need them once they are
  // there.
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  // The app's own ref on the panel, beside the kit's.
  const appRef = useRef(ref);
  appRef.current = ref;
  const panelRef = useCallback((node: HTMLDivElement | null) => {
    setPanel(node);
    const own = appRef.current;
    if (typeof own === "function") own(node);
    else if (own) own.current = node;
  }, []);

  useSheetGesture(viewport, panel, sheet);

  // The sheet hides the bottom bar, so it is a cover for the toaster, for
  // as long as it is open. A closing sheet covers nothing.
  useEffect(() => {
    if (!panel || !open || !toastCover) return;
    return registerToastDock(panel, { kind: "cover", rank: COVER_RANK + depth });
  }, [panel, open, toastCover, depth]);
  // A toast raised over the sheet keeps its Undo in reach of Tab.
  useToasterTab(open && modal !== false ? panel : null);

  const marks = {
    "data-layout": layout,
    "data-instant": instant ? "" : undefined,
    // The mark the kit's close fade leaves on a copy. The toaster and an
    // app's focus trap read it as "this is on its way out".
    [LEAVING_ATTR]: open ? undefined : "",
  };
  // The depth and the app's own variables, on the parts that read them.
  const partStyle =
    depth > 0 || vars ? ({ ...vars, ...(depth > 0 ? { "--dl-sheet-depth": depth } : null) } as Record<string, string | number>) : undefined;

  return (
    <Drawer.Portal container={container} keepMounted={keepMounted}>
      {scrim ? (
        <Drawer.Backdrop
          forceRender
          data-slot="sheet-scrim"
          className={cx("dl-sheet-scrim", scrimClassName)}
          style={partStyle}
          {...marks}
        />
      ) : null}
      <Drawer.Viewport
        ref={setViewport}
        data-slot="sheet-viewport"
        className={cx("dl-sheet-viewport", viewportClassName)}
        style={partStyle}
        data-layout={layout}
        data-kb={virtualKeyboard ? "base" : undefined}
      >
        <Drawer.Popup
          ref={panelRef}
          data-slot="sheet"
          aria-label={label}
          {...marks}
          {...props}
          className={withClass("dl-sheet", className)}
        >
          {layout === "sheet" && handle ? <SheetHandle /> : null}
          {layout === "dialog" ? (
            <Drawer.Close data-slot="sheet-x" className="dl-sheet-x" aria-label={closeLabel}>
              <CloseGlyph />
            </Drawer.Close>
          ) : null}
          {children}
        </Drawer.Popup>
      </Drawer.Viewport>
    </Drawer.Portal>
  );
}

/**
 * The grab handle: a strip with the family's pill on it. `<SheetContent>`
 * draws one at its top, so an app draws its own only where the handle
 * does something else as well, as mail's does on a tap.
 */
export function SheetHandle({ className, children, ...props }: ComponentProps<"div">): ReactNode {
  return (
    <div data-slot="sheet-handle" aria-hidden="true" {...props} className={cx("dl-sheet-handle", className)}>
      {children ?? <span className="dl-sheet-handle-pill" />}
    </div>
  );
}

/** A row at the top of the sheet: a title between a Cancel and a Done. It does not scroll. */
export function SheetHeader({ className, ...props }: ComponentProps<"div">): ReactNode {
  return <div data-slot="sheet-header" {...props} className={cx("dl-sheet-header", className)} />;
}

/** The sheet's heading, which also names it for a screen reader. */
export function SheetTitle({ className, ...props }: Drawer.Title.Props): ReactNode {
  return <Drawer.Title data-slot="sheet-title" {...props} className={withClass("dl-sheet-title", className)} />;
}

/** A muted line under the title, which a screen reader hears as the sheet's description. */
export function SheetDescription({ className, ...props }: Drawer.Description.Props): ReactNode {
  return (
    <Drawer.Description
      data-slot="sheet-description"
      {...props}
      className={withClass("dl-sheet-description", className)}
    />
  );
}

/**
 * The part of the sheet that scrolls. A finger drags the sheet from here
 * once the body is at its top, and a mouse selects text here and drags
 * the sheet by everything around it.
 */
export function SheetBody({ className, ...props }: Drawer.Content.Props): ReactNode {
  return <Drawer.Content data-slot="sheet-body" {...props} className={withClass("dl-sheet-body", className)} />;
}

/** A row pinned to the foot of the sheet, under the body: Cancel and Done. */
export function SheetFooter({ className, ...props }: ComponentProps<"div">): ReactNode {
  return <div data-slot="sheet-footer" {...props} className={cx("dl-sheet-footer", className)} />;
}

/** A button that closes the sheet. `onOpenChange` hears `"close-press"`. */
export function SheetClose(props: Drawer.Close.Props): ReactNode {
  return <Drawer.Close data-slot="sheet-close" {...props} />;
}
