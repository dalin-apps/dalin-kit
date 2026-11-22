"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Toaster as SonnerToaster, useSonner } from "sonner";
import { setToastCount, setToastsExpanded, useToastsExpanded, } from "./toast-stack.js";
import { refreshToastDock, useToastDockState } from "./toast-dock.js";
import { setPhoneMaxWidth, usePhoneLayout } from "./use-phone-layout.js";
// How long a freshly-arrived mobile toast stays popped above the card
// (bubble-in + hold) before it starts slotting into the stack.
const ANNOUNCE_MS = 1150;
// How long the "shuffle into the stack" motion runs after the hold (covers
// the notif-slot-in / notif-shuffle-back keyframes in toast.css: the dive
// starts from the announce pop a size above the pill).
// On desktop it is the window the tuck's 260ms slide finishes inside.
const SLOT_MS = 720;
// Mobile toasts linger behind the card far longer than the Sonner default
// (4s) so the stack persists.
const MOBILE_DURATION_MS = 30000;
// The desktop's hold in the corner before a toast tucks behind the window's
// edge, and how long its tab then stays there. A toast that asks something
// (an action button) or reports a failure holds for Sonner's own 4s, because
// a tab is easy to miss and the hold is the easy window to answer it in.
const DESKTOP_ANNOUNCE_MS = 1600;
const DESKTOP_ATTENTION_MS = 4000;
const DESKTOP_DURATION_MS = 10000;
// The desktop column shows five tabs rather than Sonner's three, so a burst
// of toasts stays in view. The phone keeps three behind the pill.
const DESKTOP_VISIBLE = 5;
/**
 * On the phone a fanned toast leaves whichever way it is pushed. Sonner
 * derives its swipe directions from `position`, and
 * "bottom-right" yields down and right alone. That reasons about a corner;
 * the phone's toast is centred over the pill with room on every side. The
 * desktop column does hang off a corner, so it keeps Sonner's own two.
 */
const PHONE_SWIPE_DIRECTIONS = ["top", "right", "bottom", "left"];
/** The tint class for each toast kind (toast.css). A bare `toast.message`
 *  carries none and wears the plain glass. */
const TOAST_CLASS_NAMES = {
    error: "toast-error",
    success: "toast-success",
    warning: "toast-warning",
    info: "toast-info",
};
/** The phone's announce hold. A toast with a button holds as long as the
 *  desktop's does, because the announce is the only window its button can
 *  be pressed in (toast.css); once it tucks behind the pill the
 *  stack has to be fanned out first. */
function mobileHold(arrived) {
    return arrived.some((t) => t.action) ? DESKTOP_ATTENTION_MS : ANNOUNCE_MS;
}
/** The desktop's hold in the corner, where a failure counts as a question. */
function desktopHold(arrived) {
    return arrived.some((t) => t.action || t.type === "error")
        ? DESKTOP_ATTENTION_MS
        : DESKTOP_ANNOUNCE_MS;
}
/**
 * The announce -> slot clock, restarted whenever a new toast id appears. The
 * arriving toast is always Sonner's front (newest) one; the phone's pill
 * choreography and the desktop tuck (toast.css) key off the phase classes
 * this returns.
 */
function useAnnouncePhase(toasts, holdFor, onAnnounce) {
    const [phase, setPhase] = useState(null);
    const seenIds = useRef(new Set());
    const timers = useRef([]);
    useEffect(() => {
        const arrived = toasts.filter((t) => !seenIds.current.has(String(t.id)));
        seenIds.current = new Set(toasts.map((t) => String(t.id)));
        if (arrived.length === 0)
            return;
        timers.current.forEach(clearTimeout);
        // Before the phase class lands, so where the toast announces is measured
        // in the same commit that starts it.
        onAnnounce();
        // The hold is measured by what arrived, not by what is already stacked.
        const hold = holdFor(arrived);
        setPhase("announce");
        timers.current = [
            setTimeout(() => setPhase("slotting"), hold),
            setTimeout(() => setPhase(null), hold + SLOT_MS),
        ];
    }, [toasts, holdFor, onAnnounce]);
    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    return phase;
}
/**
 * The dock the phone's toaster draws: the live one (toast-dock.ts), held for
 * the rest of an announce it began under. A sheet that closes while its toast
 * is still above it would otherwise drop the toast to the pill mid-flight; the
 * toast finishes over the line it started on, and the stack is behind the
 * pill when the phases end.
 */
function useHeldDock(phase, phone) {
    const live = useToastDockState();
    const held = useRef(null);
    if (live)
        held.current = live;
    else if (phase === null)
        held.current = null;
    return phone ? (live ?? held.current) : null;
}
/**
 * Sonner pauses every toast's dismiss timer while a pointer is down on the
 * stack, and clears that flag on a `pointerup` at the list. Nothing else
 * clears it, and two ordinary things stop that release arriving: a gesture
 * the browser cancels, and the list unmounting under the finger, which it
 * does whenever the last toast goes (Sonner renders no list for an empty
 * stack). The flag lives above the list and survives the remount, so from
 * then on NOTHING auto-dismisses and the toaster looks frozen. The desktop
 * column takes the pointer on every tab, so it meets this far more often
 * than the pointer-inert phone stack did.
 *
 * So the release is re-sent from here, as a bare `pointerup` at the list,
 * where the only handler that reads it lives. The cards inside never see it,
 * so no half-finished swipe is completed by it.
 *
 * THE RULE: the re-send is never delivered while any pointer is down. The
 * event bubbles to the document and the window, where every other gesture
 * listener in an app is bound (dnd-kit's PointerSensor checks no
 * `pointerId`, and a hand-written drag rarely does), so a toast arriving
 * mid-drag would end that drag where it stood. Window capture
 * listeners count the pointers that are down, by `pointerId` so a second
 * finger is handled. A release that is wanted while one is down is DEFERRED:
 * it goes out from a `setTimeout(0)` after the last pointer is released, so
 * the real release has finished running its own handlers and every gesture
 * listener has already torn itself down. Two things want a release: a toast
 * appearing on an empty stack, and the end of a gesture that began inside
 * the toaster. The re-send's own events are ignored by the tracker, or it
 * would answer itself.
 */
let sending = false;
function sendRelease(root) {
    const list = root?.querySelector("[data-sonner-toaster]");
    if (!list)
        return;
    sending = true;
    try {
        list.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    }
    finally {
        sending = false;
    }
}
function useTimerRelease(root, idle) {
    const request = useRef(null);
    useEffect(() => {
        const el = root.current;
        if (!el)
            return;
        const down = new Set();
        const armed = new Set();
        let pending = false;
        let timer;
        // One timer at a time; it re-checks both conditions when it fires, since
        // a pointer can land between the real release and this task.
        const flush = () => {
            if (!pending || down.size > 0 || timer !== undefined)
                return;
            timer = setTimeout(() => {
                timer = undefined;
                if (!pending || down.size > 0)
                    return;
                pending = false;
                sendRelease(el);
            }, 0);
        };
        request.current = () => {
            pending = true;
            flush();
        };
        const onDown = (event) => {
            if (sending)
                return;
            down.add(event.pointerId);
            if (event.target instanceof Node && el.contains(event.target)) {
                armed.add(event.pointerId);
            }
        };
        const onEnd = (event) => {
            if (sending)
                return;
            down.delete(event.pointerId);
            if (armed.delete(event.pointerId))
                pending = true;
            flush();
        };
        window.addEventListener("pointerdown", onDown, true);
        window.addEventListener("pointerup", onEnd, true);
        window.addEventListener("pointercancel", onEnd, true);
        return () => {
            window.removeEventListener("pointerdown", onDown, true);
            window.removeEventListener("pointerup", onEnd, true);
            window.removeEventListener("pointercancel", onEnd, true);
            if (timer !== undefined)
                clearTimeout(timer);
            request.current = null;
        };
    }, [root]);
    useEffect(() => {
        if (!idle)
            request.current?.();
    }, [idle]);
}
/**
 * Sonner fans the stack out on its own `mouseenter`, and a phone fires the
 * compatibility mouse events on every tap. The collapsed stack used to take
 * no pointer at all, so nothing reached it; an announcing toast's Undo now
 * does, and pressing it fanned the whole stack.
 * The mouse events that would reach Sonner's handlers are stopped on the way
 * in, phone layout only, and the tap band stays the one thing that opens it.
 */
function useNoHoverExpand(root, docked) {
    useEffect(() => {
        const el = root.current;
        if (!docked || !el)
            return;
        const inside = (node) => node instanceof Node && el.contains(node);
        const block = (event) => {
            const into = event.type === "mouseout" ? event.relatedTarget : event.target;
            if (inside(into))
                event.stopPropagation();
        };
        const types = ["mouseover", "mousemove", "mouseout"];
        for (const type of types)
            window.addEventListener(type, block, true);
        return () => {
            for (const type of types)
                window.removeEventListener(type, block, true);
        };
    }, [root, docked]);
}
/**
 * The family's toaster. Mount it once at the layout root and never unmount
 * it; raise toasts through Sonner's `toast` as usual.
 *
 * On the phone the bottom bar's nav PILL is the front card of the toast
 * stack (toasts take the pill's measured footprint and peek behind it; see
 * toast.css), and there's no hover to fan them out, so Sonner's `expand` is
 * driven from a shared store that the tap band (toast-band.tsx) and the
 * pill's swipe (use-stack-swipe.ts) toggle. A tighter `gap` keeps the
 * fanned-out stack compact on the narrow screen.
 *
 * Arriving phone toasts also "announce": the new toast pops in centred above
 * the bar at a size up on the pill (bubble-in) while any existing stacked
 * cards briefly hide, then after ~1s it dives down through the pill's exact
 * size and tucks in behind it as the others reappear. Two timed phases drive
 * the CSS: `toast-announcing` (pop + hold) then `toast-slotting` (the
 * card-shuffle into the stack).
 *
 * The pill is the dock unless a surface says otherwise (`useToastDock`): over
 * a parked chip, a sheet or a dialog the toast announces above that surface's
 * line and then leaves, and the stack waits out of sight until the pill is
 * the dock again (`toast-over` in toast.css).
 *
 * On desktop the stack hangs off the window's right edge, standing on
 * `--dl-toast-floor` so it never shares the corner with a floating button. A
 * toast slides out from under that edge, holds in the corner, then slides
 * back under it until only a glass tab with its icon shows;
 * several make a column of tabs, and hovering one pulls the stack out.
 * Sonner lays the stack out expanded the whole time, so the column is its own
 * fanned layout and the tuck is a sideways shift on top of it.
 */
export function Toaster({ gateOpen = true, phoneMaxWidth }) {
    // The width is shared, so the band and the app's own `usePhoneLayout`
    // switch at the same pixel as the toaster.
    useEffect(() => {
        if (phoneMaxWidth === undefined)
            return;
        setPhoneMaxWidth(phoneMaxWidth);
        return () => setPhoneMaxWidth(null);
    }, [phoneMaxWidth]);
    const isMobile = usePhoneLayout();
    const tucked = !isMobile;
    const expanded = useToastsExpanded();
    const { toasts } = useSonner();
    const phase = useAnnouncePhase(toasts, tucked ? desktopHold : mobileHold, refreshToastDock);
    const dock = useHeldDock(phase, isMobile);
    // Mirror the live toast count into the shared store. This Toaster never
    // unmounts (it's at the layout root), so the count is always authoritative.
    // The toast band reads it from the store instead of its own `useSonner`,
    // which would miss toasts created while the band was unmounted (see
    // toast-stack.ts).
    useEffect(() => {
        setToastCount(toasts.length);
    }, [toasts.length]);
    // Reset the toggle once the stack empties so the next toast starts tucked
    // behind the card rather than already fanned out.
    useEffect(() => {
        if (toasts.length === 0 && expanded)
            setToastsExpanded(false);
    }, [toasts.length, expanded]);
    // When the gate closes the stack is hidden (`.toast-gate-closed`); collapse
    // it too, so it comes back tucked behind the pill rather than still fanned
    // out.
    useEffect(() => {
        if (!gateOpen && expanded)
            setToastsExpanded(false);
    }, [gateOpen, expanded]);
    // A sheet or dialog over the bar tucks a fanned stack: the band that would
    // tuck it is under the cover.
    const covered = dock?.kind === "cover";
    useEffect(() => {
        if (covered && expanded)
            setToastsExpanded(false);
    }, [covered, expanded]);
    const root = useRef(null);
    useTimerRelease(root, toasts.length === 0);
    useNoHoverExpand(root, isMobile);
    const choreographing = phase !== null && toasts.length > 0;
    // The mobile stack is fanned out only when OUR store says so, never from
    // Sonner's own hover-expand. `toast-stack-open` mirrors this to the DOM so
    // the CSS can keep the collapsed stack pointer-inert (killing the
    // hover-expand flicker) while letting the expanded toasts stay interactive.
    const stackOpen = isMobile && expanded && !choreographing && !covered;
    const className = [
        // Gate closed: hide the whole stack (covers toasts that were already
        // showing when the bar left the screen).
        !gateOpen && "toast-gate-closed",
        // The layout: the stylesheet has no width query of its own, so these
        // two classes are the whole switch between phone and desktop.
        isMobile ? "toast-phone" : "toast-tuck",
        choreographing && phase === "announce" && "toast-announcing",
        choreographing && phase === "slotting" && "toast-slotting",
        stackOpen && "toast-stack-open",
        // The dock is not the pill: the toaster stands on the dock's line, and
        // on the bottom edge where there is no room above it.
        dock && "toast-over",
        dock && dock.line === 0 && "toast-over-edge",
    ]
        .filter(Boolean)
        .join(" ") || undefined;
    // `display: contents` leaves no box, so the toaster keeps its own fixed
    // position and every selector that reaches it still does.
    return (_jsx("div", { ref: root, style: { display: "contents" }, children: _jsx(SonnerToaster, { theme: "dark", position: "bottom-right", gap: 8, className: className, style: dock ? { "--dl-dock-line": `${dock.line}px` } : undefined, expand: stackOpen || tucked, visibleToasts: tucked ? DESKTOP_VISIBLE : undefined, swipeDirections: isMobile ? [...PHONE_SWIPE_DIRECTIONS] : undefined, toastOptions: {
                duration: isMobile ? MOBILE_DURATION_MS : DESKTOP_DURATION_MS,
                classNames: TOAST_CLASS_NAMES,
            } }) }));
}
//# sourceMappingURL=toaster.js.map