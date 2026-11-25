"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState, } from "react";
import { flushSync } from "react-dom";
import { Drawer } from "@base-ui/react/drawer";
import { startedFromKeyboard } from "../helpers/input-modality.js";
import { LEAVING_ATTR } from "../helpers/leaving.js";
import { reducesMotion } from "../helpers/motion.js";
import { registerToastDock } from "../toast/toast-dock.js";
import { pushBackEntry } from "./back-entry.js";
import { cx, withClass } from "./cx.js";
import { CloseGlyph } from "./icons.js";
import { sheetDragBlock, sheetReleaseVelocity, sheetShouldDismiss, } from "./sheet-release.js";
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
 *
 * It writes the kit's mark and Base UI's own, so React owns both: a region
 * that stops spreading it (mail's PDF once zoomed back out) drags again.
 */
export function noSheetDrag(axis) {
    const value = axis ?? "";
    return { [SHEET_NO_DRAG_ATTR]: value, [BASE_IGNORE_ATTR]: value };
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
    const backRef = useRef(systemBack);
    backRef.current = systemBack;
    /** The reason the kit gives a close it asked Base UI for, and the event behind it. */
    const forced = useRef(null);
    /** Whether the sheet is in the tree: a sheet the app unmounts to close leaves no closed render. */
    const mounted = useRef(false);
    // What waits for the exit: `close(then)`. It runs once the slide has
    // ended and every history entry the sheet pushed has gone.
    const pendingThen = useRef(null);
    const afterExit = useRef([]);
    const exitDone = useRef(!open);
    // The sheet's history entry, as the phone's search keeps one: in a ref
    // and not tied to one effect's cleanup, since strict mode runs every
    // effect twice as a tree mounts.
    const backEntry = useRef(null);
    /** Entries taken off from the screen whose traversal has not landed. */
    const popping = useRef(0);
    const flush = useCallback(() => {
        if (!exitDone.current || backEntry.current || popping.current > 0)
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
        if (!next && !asked && native.reason === "swipe") {
            // Base UI would close on this release. The kit's rule has already
            // judged it (the gesture's own listeners), and a no settles it back.
            gesture.current.baseTried = true;
            if (gesture.current.verdict === false) {
                native.cancel();
                return;
            }
        }
        const event = asked ? asked.event : native.event;
        let reason = asked ? asked.reason : native.reason;
        // Android's back reaches a sheet through the browser's CloseWatcher
        // before history sees it. With `systemBack` on, that is the same back.
        if (reason === "close-watcher" && backRef.current)
            reason = "system-back";
        if (!next && reason === "escape-key" && escapeRef.current && event) {
            const target = event.target instanceof Element ? event.target : null;
            if (escapeRef.current(target, event)) {
                native.cancel();
                // The key is the field's: let it travel on to whoever listens.
                native.allowPropagation();
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
    // Whether a close was let through and the sheet is still up a task
    // later, asked once the app that owns `open` has had its say. Timers in
    // a ref, so an unmount clears them.
    const timers = useRef(new Set());
    const afterClose = useCallback((run) => {
        const id = window.setTimeout(() => {
            timers.current.delete(id);
            if (mounted.current)
                run();
        }, 0);
        timers.current.add(id);
    }, []);
    useImperativeHandle(actionsRef, () => ({
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
            if (!then)
                return;
            // An app that owns `open` may let the close pass and keep the sheet
            // up. That close did not happen, so its `then` is dropped too.
            afterClose(() => {
                if (!openRef.current)
                    return;
                afterExit.current = afterExit.current.filter((run) => run !== then);
            });
        },
    }), [afterClose]);
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
            if (!openRef.current || !backRef.current || backEntry.current)
                return;
            backEntry.current = pushBackEntry(onBack);
        });
    }, [afterClose]);
    useEffect(() => {
        if (open && systemBack) {
            if (!backEntry.current)
                backEntry.current = pushBackEntry(onBack);
        }
        else if (backEntry.current) {
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
            for (const id of pending)
                window.clearTimeout(id);
            pending.clear();
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
/** The touch a gesture follows, by its identifier, among an event's touches. */
function touchOf(list, id) {
    if (!list)
        return null;
    for (let i = 0; i < list.length; i++) {
        const touch = list[i];
        if (touch && touch.identifier === id)
            return touch;
    }
    return null;
}
const isTouch = (event) => "touches" in event;
const isTouchPointer = (event) => !isTouch(event) && event.pointerType === "touch";
/** Where the mouse is, top to bottom. */
function mouseY(event) {
    const y = event.clientY;
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
 *   release is judged from the finger's own travel and from the kit's own
 *   samples of it, the lift's place among them: a loaded frame can hold
 *   the last move back until the lift, and Base UI's panel then stands a
 *   move behind the finger. A close Base UI then asks for is refused if
 *   the answer was no (`<Sheet>`'s `onOpenChange`).
 * - After Base UI has had the release (bubble, at the window), a yes that
 *   Base UI did not act on closes the sheet, from where the finger let go.
 *   Something inside the sheet may stop the release on its way up, so the
 *   next frame finishes it too, and a verdict belongs to its own release
 *   alone: no later move acts on it.
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
        /** What the gesture in hand follows: a mouse, one touch by its identifier, or nothing. */
        let tracking = null;
        let last = { y: 0, t: 0 };
        /** Where the followed pointer has been, oldest first: the press, then each move that moved it. */
        let samples = [];
        const sample = (y, t) => {
            const prev = samples[samples.length - 1];
            if (prev && Math.abs(y - prev.y) < 1)
                return;
            samples.push({ y, t });
            if (samples.length > 8)
                samples.shift();
        };
        let scrolledAt = Number.NEGATIVE_INFINITY;
        /** The release the verdict was given for, and the frame that finishes it if nothing else does. */
        let judged = null;
        let frame = 0;
        /** Where the press landed, top to bottom. */
        let startY = 0;
        /**
         * The travel Base UI drops as it takes its origin from the first move:
         * a phone sends no touchmove until the finger has gone some 15px. The
         * kit draws it back with `translate` beside Base UI's `transform`, and
         * counts it in the release. Null until known.
         */
        let gap = null;
        let moved = false;
        let gapFrame = 0;
        /** Whether Base UI has the panel under a finger: it writes both while it drags. */
        const dragging = () => panel.style.transform !== "" || panel.style.transition === "none";
        /** How far down Base UI has the panel, in px. */
        const offsetNow = () => Number.parseFloat(panel.style.getPropertyValue("--drawer-swipe-movement-y")) || 0;
        /** Where the followed pointer is on this event, top to bottom, or null when the event is not its own. */
        const yOf = (event) => {
            if (!tracking)
                return null;
            if (tracking.kind === "touch") {
                if (!isTouch(event))
                    return null;
                const touch = touchOf(event.touches, tracking.id) ?? touchOf(event.changedTouches, tracking.id);
                return touch ? touch.clientY : null;
            }
            return isTouch(event) || isTouchPointer(event) ? null : mouseY(event);
        };
        const clearFrame = () => {
            if (frame)
                win.cancelAnimationFrame(frame);
            frame = 0;
        };
        const showGap = (px) => {
            if (px > 0)
                panel.style.setProperty("translate", `0 ${px}px`);
            else
                panel.style.removeProperty("translate");
        };
        /** Reads the dropped travel once Base UI has the panel: the finger's travel less Base UI's. */
        const learnGap = () => {
            if (gap !== null || !moved || !dragging())
                return;
            const offset = offsetNow();
            if (offset < 0)
                return;
            gap = Math.max(0, last.y - startY - offset);
            showGap(gap);
        };
        const clearGap = () => {
            if (gapFrame)
                win.cancelAnimationFrame(gapFrame);
            gapFrame = 0;
            gap = null;
            moved = false;
            showGap(0);
        };
        const onStart = (event) => {
            if (isTouchPointer(event))
                return;
            let start;
            let y;
            if (isTouch(event)) {
                // A second finger while one is down is no new gesture. A followed
                // touch missing from the screen's list has ended unseen (its target
                // left the page), and this press starts afresh.
                if (tracking?.kind === "touch" && touchOf(event.touches, tracking.id))
                    return;
                const touch = event.changedTouches?.[0] ?? event.touches[0];
                if (!touch)
                    return;
                start = { kind: "touch", id: touch.identifier };
                y = touch.clientY;
            }
            else {
                if (event.button !== 0)
                    return;
                start = { kind: "mouse" };
                y = mouseY(event);
            }
            const target = event.target instanceof Element ? event.target : null;
            const now = event.timeStamp;
            const blocked = !draggable ||
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
            samples = [{ ...last }];
            judged = null;
            clearFrame();
            gesture.current.verdict = null;
            gesture.current.baseTried = false;
        };
        /**
         * Gives the release its verdict, from the finger's travel since the
         * press: Base UI's offset, the travel it dropped, and `releaseDy`, the
         * travel the release carries past the last move Base UI took (a
         * mouse's last move, or a lift a loaded frame held the move back for).
         * The speed is the kit's own reading of its samples.
         */
        const judge = (event, cancelled, releaseDy = 0) => {
            judged = event;
            learnGap();
            const offset = afterMove(offsetNow(), releaseDy) + (gap ?? 0);
            gesture.current.verdict = !dragging()
                ? null
                : !cancelled &&
                    sheetShouldDismiss({
                        offset,
                        height: panel.offsetHeight,
                        velocity: sheetReleaseVelocity(samples, event.timeStamp),
                        distance: distance.current,
                    });
            gesture.current.baseTried = false;
            // The bubble listener may never hear this release: the next frame
            // finishes it then, still before anything is drawn.
            clearFrame();
            frame = win.requestAnimationFrame(() => {
                frame = 0;
                if (judged === event)
                    flushSync(() => finish(event));
            });
        };
        const finish = (event) => {
            if (judged !== event)
                return;
            judged = null;
            tracking = null;
            clearFrame();
            const { verdict, baseTried } = gesture.current;
            gesture.current.verdict = null;
            // Base UI lets go of the panel as it takes the release. One still
            // under its drag never heard the release, and is left to it.
            if (dragging())
                return;
            // The dropped travel goes with Base UI's offset, on the same curve.
            clearGap();
            if (verdict === true && !baseTried)
                swipeClose(event);
        };
        const onMove = (event) => {
            if (isTouchPointer(event)) {
                // Before its first touchmove the browser still sends pointer moves,
                // from the first pixel. Where Base UI holds the panel from the press
                // (the handle, or a body with nothing to scroll, so no scroll to
                // tell apart), the panel follows them until Base UI has a move.
                const pointer = event;
                if (tracking?.kind === "touch" && !moved && pointer.isPrimary && dragging()) {
                    showGap(Math.max(0, pointer.clientY - startY));
                }
                return;
            }
            const y = yOf(event);
            if (y === null)
                return;
            // Base UI has taken every move before this one.
            if (moved)
                learnGap();
            moved = true;
            const dy = y - last.y;
            sample(y, event.timeStamp);
            // A mouse's release can arrive as a move with no button down, and
            // Base UI moves the panel by it before it ends the drag. The kit
            // counts that move too, then judges.
            const releasing = !isTouch(event) && event.buttons === 0 && dragging();
            if (releasing)
                judge(event, false, dy);
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
        const onMoveAfter = (event) => {
            finish(event);
        };
        /** Whether this end is the followed pointer's own. */
        const ownEnd = (event) => {
            if (!tracking || isTouchPointer(event))
                return false;
            if (tracking.kind === "touch")
                return isTouch(event) && touchOf(event.changedTouches, tracking.id) !== null;
            return !isTouch(event);
        };
        const onEnd = (event) => {
            if (!ownEnd(event))
                return;
            const cancelled = event.type.endsWith("cancel");
            // The lift's own place: under a loaded frame it can be past the last
            // move anyone heard. A cancel's place means nothing.
            const y = cancelled ? null : yOf(event);
            if (y === null) {
                judge(event, cancelled);
                return;
            }
            sample(y, event.timeStamp);
            judge(event, false, y - last.y);
        };
        const onEndAfter = (event) => {
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
            clearFrame();
            clearGap();
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
 * Where Base UI puts the panel after one more move of `dy`: the travel adds
 * up as it is, except above the resting place, where Base UI draws the
 * square root of the pull.
 */
function afterMove(offset, dy) {
    const raw = (offset >= 0 ? offset : -(offset ** 2)) + dy;
    return raw >= 0 ? raw : -Math.sqrt(-raw);
}
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
export function SheetContent({ label, container, keepMounted, scrim = true, handle = true, closeLabel = "Close", toastCover = true, className, scrimClassName, viewportClassName, vars, children, ref, ...props }) {
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
    // A modal sheet holds Tab itself, on the press, and a toast raised over
    // it keeps its Undo in reach. Base UI's focus guards would turn Tab back
    // a frame late, and a second press inside that frame left the sheet.
    useToasterTab(open && modal !== false ? panel : null, { hold: true });
    const marks = {
        "data-layout": layout,
        "data-instant": instant ? "" : undefined,
        // The mark the kit's close fade leaves on a copy. The toaster and an
        // app's focus trap read it as "this is on its way out".
        [LEAVING_ATTR]: open ? undefined : "",
    };
    // The depth and the app's own variables, on the parts that read them.
    const partStyle = depth > 0 || vars ? { ...vars, ...(depth > 0 ? { "--dl-sheet-depth": depth } : null) } : undefined;
    return (_jsxs(Drawer.Portal, { container: container, keepMounted: keepMounted, children: [scrim ? (_jsx(Drawer.Backdrop, { forceRender: true, "data-slot": "sheet-scrim", className: cx("dl-sheet-scrim", scrimClassName), style: partStyle, ...marks })) : null, _jsx(Drawer.Viewport, { ref: setViewport, "data-slot": "sheet-viewport", className: cx("dl-sheet-viewport", viewportClassName), style: partStyle, "data-layout": layout, "data-kb": virtualKeyboard ? "base" : undefined, children: _jsxs(Drawer.Popup, { ref: panelRef, "data-slot": "sheet", "aria-label": label, "aria-modal": modal !== false ? true : undefined, ...marks, ...props, className: withClass("dl-sheet", className), children: [layout === "sheet" && handle ? _jsx(SheetHandle, {}) : null, layout === "dialog" ? (_jsx(Drawer.Close, { "data-slot": "sheet-x", className: "dl-sheet-x", "aria-label": closeLabel, children: _jsx(CloseGlyph, {}) })) : null, children] }) })] }));
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