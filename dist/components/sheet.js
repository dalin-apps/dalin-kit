"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState, } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { startedFromKeyboard } from "../helpers/input-modality.js";
import { LEAVING_ATTR } from "../helpers/leaving.js";
import { reducesMotion } from "../helpers/motion.js";
import { registerToastDock } from "../toast/toast-dock.js";
import { pushBackEntry } from "./back-entry.js";
import { cx, withClass } from "./cx.js";
import { CloseGlyph } from "./icons.js";
import { SHEET_FLING_STALE_MS, nextSheetVelocity, sheetDragBlock, sheetShouldDismiss, } from "./sheet-release.js";
import { useToasterTab } from "./toaster-tab.js";
/** The attribute that marks a region whose gestures are its own. `""` for every drag, `"x"` or `"y"` for one axis. */
export const SHEET_NO_DRAG_ATTR = "data-dl-no-drag";
/** Base UI's own name for the same mark, which is what its Drawer reads. */
const BASE_IGNORE_ATTR = "data-base-ui-swipe-ignore";
/** How far a sheet ranks as a toast dock: with the phone's search, over the bar and a parked chip. */
const COVER_RANK = 50;
/**
 * Props for a region inside a sheet that owns its own gestures: a media
 * scrubber, a PDF being panned. With `"x"`, a sideways drag is the
 * region's and a downward one still moves the sheet: mail's swipe between
 * attachments.
 *
 *   <div {...noSheetDrag("x")}>...</div>
 */
export function noSheetDrag(axis) {
    return { [SHEET_NO_DRAG_ATTR]: axis ?? "" };
}
const SheetContext = createContext(null);
function useSheet(part) {
    const value = useContext(SheetContext);
    if (!value)
        throw new Error(`<${part}> must be inside a <Sheet>.`);
    return value;
}
/** Whether an open or close came from a key: the key itself, or a click a key made. */
function fromKey(event) {
    if (!event)
        return false;
    if (event.type.startsWith("key"))
        return true;
    return event.type === "click" && event.detail === 0;
}
export function Sheet({ open: openProp, defaultOpen = false, onOpenChange, onOpenChangeComplete, layout = "sheet", modal = true, swipe = true, dismissDistance, dismissOnOutsidePress = true, systemBack = false, ownsEscape, virtualKeyboard = false, actionsRef, children, }) {
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
    const base = useRef(null);
    const gesture = useRef({ verdict: null, baseTried: false });
    const distance = useRef(dismissDistance);
    distance.current = dismissDistance;
    /** The reason the kit gives a close it asked Base UI for, and the event behind it. */
    const forced = useRef(null);
    /** Whether the last close asked for was refused. */
    const refused = useRef(false);
    // What waits for the exit: `close(then)`. It runs once the slide has
    // ended and the history entry has gone, whichever is later.
    const pendingThen = useRef(null);
    const afterExit = useRef([]);
    const exitDone = useRef(!open);
    const backGone = useRef(true);
    const flush = useCallback(() => {
        if (!exitDone.current || !backGone.current)
            return;
        const runs = afterExit.current;
        afterExit.current = [];
        for (const run of runs)
            run();
    }, []);
    const changeRef = useRef(onOpenChange);
    changeRef.current = onOpenChange;
    const escapeRef = useRef(ownsEscape);
    escapeRef.current = ownsEscape;
    const controlled = openProp !== undefined;
    const handleChange = useCallback((next, native) => {
        const asked = forced.current;
        forced.current = null;
        refused.current = false;
        if (!next && !asked && native.reason === "swipe") {
            // Base UI would close on this release. The kit's rule has already
            // judged it (the gesture's own listeners), and a no settles it back.
            gesture.current.baseTried = true;
            if (gesture.current.verdict === false) {
                native.cancel();
                refused.current = true;
                return;
            }
        }
        const event = asked ? asked.event : native.event;
        const reason = asked ? asked.reason : native.reason;
        if (!next && reason === "escape-key" && escapeRef.current && event) {
            const target = event.target instanceof Element ? event.target : null;
            if (escapeRef.current(target, event)) {
                native.cancel();
                // The key is the field's: let it travel on to whoever listens.
                native.allowPropagation();
                refused.current = true;
                return;
            }
        }
        const details = {
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
            refused.current = true;
            pendingThen.current = null;
            return;
        }
        byKey.current = fromKey(event);
        if (!next && pendingThen.current) {
            afterExit.current.push(pendingThen.current);
            pendingThen.current = null;
        }
        if (!controlled)
            setOwnOpen(next);
    }, [controlled]);
    const completeRef = useRef(onOpenChangeComplete);
    completeRef.current = onOpenChangeComplete;
    const handleComplete = useCallback((now) => {
        completeRef.current?.(now);
        if (now)
            return;
        exitDone.current = true;
        flush();
    }, [flush]);
    useEffect(() => {
        // An open sheet has an exit ahead of it.
        if (open)
            exitDone.current = false;
    }, [open]);
    const swipeClose = useCallback((event) => {
        if (!openRef.current)
            return;
        forced.current = { reason: "swipe", event };
        base.current?.close();
        // Base UI answers inside close(). A reason it never read is dropped,
        // or the next change would wear it.
        forced.current = null;
    }, []);
    useImperativeHandle(actionsRef, () => ({
        close(then) {
            if (!openRef.current) {
                then?.();
                return;
            }
            pendingThen.current = then ?? null;
            base.current?.close();
        },
    }), []);
    // The sheet's history entry, as the phone's search keeps one: in a ref
    // and not tied to one effect's cleanup, since strict mode runs every
    // effect twice as a tree mounts.
    const backEntry = useRef(null);
    const backRef = useRef(systemBack);
    backRef.current = systemBack;
    const onBack = useCallback(() => {
        backEntry.current = null;
        backGone.current = true;
        forced.current = { reason: "system-back", event: undefined };
        base.current?.close();
        forced.current = null;
        // A refused back keeps the sheet up, so it needs its entry again, or
        // the next back would leave the app. Asked a task later, once an app
        // that owns `open` has had its say.
        window.setTimeout(() => {
            if (!openRef.current || !backRef.current || backEntry.current)
                return;
            backGone.current = false;
            backEntry.current = pushBackEntry(onBack);
        }, 0);
    }, []);
    useEffect(() => {
        if (open && systemBack) {
            if (!backEntry.current) {
                backGone.current = false;
                backEntry.current = pushBackEntry(onBack);
            }
        }
        else if (backEntry.current) {
            const entry = backEntry.current;
            backEntry.current = null;
            entry.pop(() => {
                backGone.current = true;
                flush();
            });
        }
    }, [open, systemBack, onBack, flush]);
    // A sheet the app unmounts to close leaves no closed render to pop from.
    const mounted = useRef(false);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            queueMicrotask(() => {
                if (mounted.current)
                    return;
                const entry = backEntry.current;
                backEntry.current = null;
                entry?.pop();
            });
        };
    }, []);
    const depth = parent ? parent.depth + 1 : 0;
    const value = useMemo(() => ({ open, layout, instant, modal, swipe, virtualKeyboard, depth, gesture, distance, swipeClose }), [open, layout, instant, modal, swipe, virtualKeyboard, depth, swipeClose]);
    return (_jsx(SheetContext.Provider, { value: value, children: _jsx(Drawer.Root, { open: open, onOpenChange: handleChange, onOpenChangeComplete: handleComplete, modal: modal, disablePointerDismissal: !dismissOnOutsidePress, actionsRef: base, children: virtualKeyboard ? _jsx(Drawer.VirtualKeyboardProvider, { children: children }) : children }) }));
}
/** A button that opens the sheet, for a sheet that owns its own state. */
export function SheetTrigger(props) {
    return _jsx(Drawer.Trigger, { "data-slot": "sheet-trigger", ...props });
}
/** Whether text inside the panel is selected: a drag would fight the selection's own handles. */
function selectingIn(panel) {
    const doc = panel.ownerDocument;
    const active = doc.activeElement;
    if ((active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) && panel.contains(active)) {
        try {
            const { selectionStart, selectionEnd } = active;
            if (selectionStart !== null && selectionEnd !== null && selectionStart < selectionEnd)
                return true;
        }
        catch {
            // A field with no selection to read (a checkbox) has none.
        }
    }
    const selection = doc.getSelection?.();
    if (!selection || selection.isCollapsed)
        return false;
    return panel.contains(selection.anchorNode) || panel.contains(selection.focusNode);
}
/** Where on the screen an event's pointer is, top to bottom. */
function pointY(event) {
    if ("touches" in event) {
        const touch = event.touches[0] ?? event.changedTouches?.[0];
        return touch ? touch.clientY : null;
    }
    const y = event.clientY;
    return typeof y === "number" ? y : null;
}
const isTouchPointer = (event) => !("touches" in event) && event.pointerType === "touch";
/**
 * The kit's half of the drag. Base UI moves the panel and decides by its
 * own rule. These listeners stand on either side of its handlers and make
 * the family's rule the one that counts:
 *
 * - As a press lands (capture, on the sheet's own viewport, which runs
 *   before React hands the event to Base UI), the start rules are asked. A
 *   press that may not drag writes Base UI's ignore mark on the viewport,
 *   and Base UI then starts nothing for that gesture.
 * - As the finger lifts (capture, at the window, so before Base UI), the
 *   release is judged from where Base UI has the panel and from the kit's
 *   own reading of the speed. A close Base UI then asks for is refused if
 *   the answer was no (`<Sheet>`'s `onOpenChange`).
 * - After Base UI has had the release (bubble, at the window), a yes that
 *   Base UI did not act on closes the sheet.
 */
function useSheetGesture(viewport, panel, sheet) {
    const { open, layout, swipe, gesture, distance, swipeClose } = sheet;
    const openedAt = useRef(0);
    useEffect(() => {
        if (open)
            openedAt.current = performance.now();
    }, [open]);
    const draggable = swipe && layout === "sheet";
    useEffect(() => {
        if (!viewport || !panel)
            return;
        const win = viewport.ownerDocument.defaultView;
        if (!win)
            return;
        let tracking = false;
        let last = { y: 0, t: 0 };
        let velocity = 0;
        let scrolledAt = Number.NEGATIVE_INFINITY;
        /** Whether Base UI has the panel under a finger: it writes both while it drags. */
        const dragging = () => panel.style.transform !== "" || panel.style.transition === "none";
        const onStart = (event) => {
            if (isTouchPointer(event))
                return;
            if (!("touches" in event) && event.button !== 0)
                return;
            const target = event.target instanceof Element ? event.target : null;
            // A region of the app's own gestures is named in the kit's attribute,
            // and Base UI reads its own: the mark is copied across once.
            const own = target?.closest(`[${SHEET_NO_DRAG_ATTR}]`);
            if (own && !own.hasAttribute(BASE_IGNORE_ATTR)) {
                own.setAttribute(BASE_IGNORE_ATTR, own.getAttribute(SHEET_NO_DRAG_ATTR) ?? "");
            }
            const now = event.timeStamp;
            const blocked = !draggable ||
                sheetDragBlock({
                    sinceOpen: now - openedAt.current,
                    sinceScroll: now - scrolledAt,
                    onSelect: target?.closest("select") != null,
                    selecting: selectingIn(panel),
                }) !== null;
            viewport.toggleAttribute(BASE_IGNORE_ATTR, blocked);
            const y = pointY(event);
            tracking = y !== null;
            last = { y: y ?? 0, t: now };
            velocity = 0;
            gesture.current.verdict = null;
            gesture.current.baseTried = false;
        };
        const judge = (event, cancelled) => {
            if (!dragging()) {
                gesture.current.verdict = null;
                return;
            }
            const offset = Number.parseFloat(panel.style.getPropertyValue("--drawer-swipe-movement-y")) || 0;
            const held = event.timeStamp - last.t > SHEET_FLING_STALE_MS;
            gesture.current.verdict =
                !cancelled &&
                    sheetShouldDismiss({
                        offset,
                        height: panel.offsetHeight,
                        velocity: held ? 0 : velocity,
                        distance: distance.current,
                    });
            gesture.current.baseTried = false;
        };
        const finish = (event) => {
            tracking = false;
            const { verdict, baseTried } = gesture.current;
            gesture.current.verdict = null;
            if (verdict === true && !baseTried)
                swipeClose(event);
        };
        // A mouse's release can arrive as a move with no button down, and Base
        // UI ends the drag on it.
        const releasedInMove = (event) => !("touches" in event) && event.buttons === 0 && dragging();
        const onMove = (event) => {
            if (!tracking || isTouchPointer(event))
                return;
            const y = pointY(event);
            if (y === null)
                return;
            if (releasedInMove(event)) {
                judge(event, false);
                return;
            }
            velocity = nextSheetVelocity(velocity, y - last.y, event.timeStamp - last.t);
            last = { y, t: event.timeStamp };
        };
        const onMoveAfter = (event) => {
            if (tracking && !isTouchPointer(event) && gesture.current.verdict !== null)
                finish(event);
        };
        const onEnd = (event) => {
            if (tracking && !isTouchPointer(event))
                judge(event, event.type.endsWith("cancel"));
        };
        const onEndAfter = (event) => {
            if (tracking && !isTouchPointer(event))
                finish(event);
        };
        const onScroll = (event) => {
            scrolledAt = event.timeStamp;
        };
        const starts = ["touchstart", "pointerdown"];
        const ends = ["touchend", "touchcancel", "pointerup", "pointercancel"];
        for (const name of starts)
            viewport.addEventListener(name, onStart, { capture: true, passive: true });
        viewport.addEventListener("scroll", onScroll, { capture: true, passive: true });
        win.addEventListener("touchmove", onMove, { capture: true, passive: true });
        win.addEventListener("pointermove", onMove, { capture: true, passive: true });
        win.addEventListener("pointermove", onMoveAfter, { passive: true });
        for (const name of ends) {
            win.addEventListener(name, onEnd, { capture: true, passive: true });
            win.addEventListener(name, onEndAfter, { passive: true });
        }
        return () => {
            for (const name of starts)
                viewport.removeEventListener(name, onStart, true);
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
 * The sheet itself: the scrim, the box that places the panel, and the
 * panel, with the handle drawn at its top. `className`, `style` and every
 * other prop go to the panel, and `initialFocus` and `finalFocus` are
 * Base UI's own: focus lands on the panel unless `initialFocus` names a
 * target, and goes back to what opened the sheet.
 *
 * Each part carries `data-layout`, and the panel and the scrim Base UI's
 * state (`data-open`, `data-starting-style`, `data-ending-style`,
 * `data-swiping`, `data-nested-drawer-open`), for the app's own rules.
 */
export function SheetContent({ label, container, keepMounted, scrim = true, handle = true, closeLabel = "Close", toastCover = true, className, scrimClassName, viewportClassName, children, ref, ...props }) {
    const sheet = useSheet("SheetContent");
    const { open, layout, instant, modal, depth, virtualKeyboard } = sheet;
    // The elements as state: Base UI mounts them a commit after `open` turns
    // true, and the listeners and the toaster's dock need them once they are
    // there.
    const [panel, setPanel] = useState(null);
    const [viewport, setViewport] = useState(null);
    // The app's own ref on the panel, beside the kit's.
    const appRef = useRef(ref);
    appRef.current = ref;
    const panelRef = useCallback((node) => {
        setPanel(node);
        const own = appRef.current;
        if (typeof own === "function")
            own(node);
        else if (own)
            own.current = node;
    }, []);
    useSheetGesture(viewport, panel, sheet);
    // The sheet hides the bottom bar, so it is a cover for the toaster, for
    // as long as it is open. A closing sheet covers nothing.
    useEffect(() => {
        if (!panel || !open || !toastCover)
            return;
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
    const depthStyle = depth > 0 ? { "--dl-sheet-depth": depth } : undefined;
    return (_jsxs(Drawer.Portal, { container: container, keepMounted: keepMounted, children: [scrim ? (_jsx(Drawer.Backdrop, { forceRender: true, "data-slot": "sheet-scrim", className: cx("dl-sheet-scrim", scrimClassName), style: depthStyle, ...marks })) : null, _jsx(Drawer.Viewport, { ref: setViewport, "data-slot": "sheet-viewport", className: cx("dl-sheet-viewport", viewportClassName), style: depthStyle, "data-layout": layout, "data-kb": virtualKeyboard ? "base" : undefined, children: _jsxs(Drawer.Popup, { ref: panelRef, "data-slot": "sheet", "aria-label": label, ...marks, ...props, className: withClass("dl-sheet", className), children: [layout === "sheet" && handle ? _jsx(SheetHandle, {}) : null, layout === "dialog" ? (_jsx(Drawer.Close, { "data-slot": "sheet-x", className: "dl-sheet-x", "aria-label": closeLabel, children: _jsx(CloseGlyph, {}) })) : null, children] }) })] }));
}
/**
 * The grab handle: a strip with the family's pill on it. `<SheetContent>`
 * draws one at its top, so an app draws its own only where the handle
 * does something else as well, as mail's does on a tap.
 */
export function SheetHandle({ className, children, ...props }) {
    return (_jsx("div", { "data-slot": "sheet-handle", "aria-hidden": "true", ...props, className: cx("dl-sheet-handle", className), children: children ?? _jsx("span", { className: "dl-sheet-handle-pill" }) }));
}
/** A row at the top of the sheet: a title between a Cancel and a Done. It does not scroll. */
export function SheetHeader({ className, ...props }) {
    return _jsx("div", { "data-slot": "sheet-header", ...props, className: cx("dl-sheet-header", className) });
}
/** The sheet's heading, which also names it for a screen reader. */
export function SheetTitle({ className, ...props }) {
    return _jsx(Drawer.Title, { "data-slot": "sheet-title", ...props, className: withClass("dl-sheet-title", className) });
}
/** A muted line under the title, which a screen reader hears as the sheet's description. */
export function SheetDescription({ className, ...props }) {
    return (_jsx(Drawer.Description, { "data-slot": "sheet-description", ...props, className: withClass("dl-sheet-description", className) }));
}
/**
 * The part of the sheet that scrolls. A finger drags the sheet from here
 * once the body is at its top, and a mouse selects text here and drags
 * the sheet by everything around it.
 */
export function SheetBody({ className, ...props }) {
    return _jsx(Drawer.Content, { "data-slot": "sheet-body", ...props, className: withClass("dl-sheet-body", className) });
}
/** A row pinned to the foot of the sheet, under the body: Cancel and Done. */
export function SheetFooter({ className, ...props }) {
    return _jsx("div", { "data-slot": "sheet-footer", ...props, className: cx("dl-sheet-footer", className) });
}
/** A button that closes the sheet. `onOpenChange` hears `"close-press"`. */
export function SheetClose(props) {
    return _jsx(Drawer.Close, { "data-slot": "sheet-close", ...props });
}
//# sourceMappingURL=sheet.js.map