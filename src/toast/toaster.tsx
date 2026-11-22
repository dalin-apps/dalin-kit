"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { Toaster as SonnerToaster, useSonner } from "sonner";
import type { ToastT } from "sonner";
import {
  setToastCount,
  setToastsExpanded,
  useToastsExpanded,
} from "./toast-stack.js";
import {
  measureToastCover,
  refreshToastDock,
  useToastDockState,
  type ToastDock,
} from "./toast-dock.js";
import { holdTabStops } from "./tab-stops.js";
import { useToastTags } from "./toast-tags.js";
import { ToastSpinner } from "./toast-spinner.js";
import { PINNED_CLASS, PROGRESS_CLASS, announcesUpdate, faceOf, type ToastFace } from "./toast-update.js";
import { useNamedState } from "./use-named-state.js";
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
const PHONE_SWIPE_DIRECTIONS = ["top", "right", "bottom", "left"] as const;

/** The tint class for each toast kind (toast.css). `loading` is the progress
 *  kind: `toast.loading()` and a promise toast while it waits. A bare
 *  `toast.message` carries none and wears the plain glass, unless the app
 *  names a default kind (`defaultKind`). */
const TOAST_CLASS_NAMES = {
  error: "toast-error",
  success: "toast-success",
  warning: "toast-warning",
  info: "toast-info",
  loading: PROGRESS_CLASS,
} as const;

/** The kinds a bare toast may be given: the four with a colour and an icon of their own. */
export type ToastDefaultKind = "info" | "success" | "warning" | "error";

/**
 * The classes a bare toast wears under a default kind. They are the bare
 * kind's own names, never the typed kind's (`toast-info`): Sonner 2.0.7,
 * which the four apps lock, puts `classNames.default` on every toast, typed
 * ones too, where 2.0.8 keeps it for a toast with no type. A typed kind's
 * class there tinted every toast in the default kind's colour. toast.css
 * reads these two only on a card with no `data-type`, so on either Sonner
 * they mean something on a bare toast alone.
 */
function bareClass(kind: ToastDefaultKind): string {
  return `toast-bare toast-bare-${kind}`;
}

/**
 * The class of the progress kind, for a plain toast that carries it itself
 * (with `<ToastSpinner>` as its icon). `toast.loading()` needs neither.
 */
export const PROGRESS_TOAST = PROGRESS_CLASS;

/** Sonner's own icons stay, but for the progress kind: the family's spinner. */
const TOAST_ICONS = { loading: <ToastSpinner /> };

/**
 * The class that pins a toast: `toast("Sending in 5s", { className: PINNED_TOAST })`.
 * A pinned toast stays in view until it is dismissed or replaced: out from
 * the desktop's edge instead of tucking to a tab, and above the phone's dock
 * with its button pressable instead of diving behind the pill. For a toast
 * whose button is the point of it, such as a send counting down with Undo.
 * Give it `duration: Infinity` and dismiss it yourself, or update it in place
 * without the class to let it go.
 */
export const PINNED_TOAST = PINNED_CLASS;

type Phase = "announce" | "slotting" | null;

/** The phone's announce hold. A toast with a button holds as long as the
 *  desktop's does, because the announce is the only window its button can
 *  be pressed in (toast.css); once it tucks behind the pill the
 *  stack has to be fanned out first. */
function mobileHold(arrived: ToastT[]): number {
  return arrived.some((t) => t.action) ? DESKTOP_ATTENTION_MS : ANNOUNCE_MS;
}

/** The desktop's hold in the corner, where a failure counts as a question. */
function desktopHold(arrived: ToastT[]): number {
  return arrived.some((t) => t.action || t.type === "error")
    ? DESKTOP_ATTENTION_MS
    : DESKTOP_ANNOUNCE_MS;
}

/** The mark on the one card an update announces again (toast.css). */
const AGAIN_ATTR = "data-again";

/**
 * The announce -> slot clock. It restarts whenever a new toast id appears,
 * and whenever a live toast is updated in place in a way worth telling
 * (toast-update.ts): a change of kind, or of words.
 *
 * An arriving toast is always Sonner's front (newest) one, and the phone's
 * pill choreography and the desktop tuck (toast.css) key off the phase
 * classes this returns and that front card. An updated toast can sit anywhere
 * in the stack, so when it is not the front one its card is marked
 * `data-again` and `again` is true, which turns the stylesheet from the front
 * card to the marked one for the length of the phases. `find` is how the card
 * is found (toast-tags.ts); an update whose card can't be found is not
 * announced, since announcing would pop the wrong toast.
 */
function useAnnouncePhase(
  toasts: ToastT[],
  holdFor: (arrived: ToastT[]) => number,
  onAnnounce: () => void,
  find: (id: string) => HTMLElement | null,
  bareKind: string | undefined,
): { phase: Phase; again: boolean } {
  const [phase, setPhase] = useState<Phase>(null);
  const [again, setAgain] = useState(false);
  const seen = useRef<Map<string, ToastFace>>(new Map());
  const marked = useRef<HTMLElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // A layout effect, so the first frame that shows an arriving toast is
  // already the announce. As a passive effect it ran after that frame was
  // painted, and a busy frame (the list re-rendering for the move that raised
  // the toast) showed the toast sitting in its tucked slot first.
  useLayoutEffect(() => {
    const faces = new Map<string, ToastFace>();
    const arrived: ToastT[] = [];
    const changed: ToastT[] = [];
    for (const t of toasts) {
      const id = String(t.id);
      const now = faceOf(t, bareKind);
      const was = seen.current.get(id);
      faces.set(id, now);
      if (!was) arrived.push(t);
      else if (announcesUpdate(was, now)) changed.push(t);
    }
    seen.current = faces;
    if (arrived.length === 0 && changed.length === 0) return;

    // An arrival is the front card and needs no mark. With none, the newest
    // updated toast is the one announced, marked unless it is the front card.
    const updated = arrived.length === 0 ? changed[0] : undefined;
    const card = updated && updated !== toasts[0] ? find(String(updated.id)) : null;
    if (updated && updated !== toasts[0] && !card) return;

    timers.current.forEach(clearTimeout);
    marked.current?.removeAttribute(AGAIN_ATTR);
    marked.current = card;
    card?.setAttribute(AGAIN_ATTR, "");
    setAgain(card !== null);
    // Before the phase class lands, so where the toast announces is measured
    // in the same commit that starts it.
    onAnnounce();
    // The hold is measured by what arrived or changed, not by what is
    // already stacked.
    const hold = holdFor(arrived.length > 0 ? arrived : changed);
    setPhase("announce");
    timers.current = [
      setTimeout(() => setPhase("slotting"), hold),
      setTimeout(() => {
        setPhase(null);
        setAgain(false);
        marked.current?.removeAttribute(AGAIN_ATTR);
        marked.current = null;
      }, hold + SLOT_MS),
    ];
  }, [toasts, holdFor, onAnnounce, find, bareKind]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      marked.current?.removeAttribute(AGAIN_ATTR);
    },
    [],
  );
  return { phase, again };
}

/**
 * The dock the phone's toaster draws: the live one (toast-dock.ts), held for
 * the rest of an announce it began under. A sheet that closes while its toast
 * is still above it would otherwise drop the toast to the pill mid-flight; the
 * toast finishes over the line it started on, and the stack is behind the
 * pill when the phases end.
 *
 * `measured` is the cover `<Toaster cover>` found as the toast arrived. It
 * lasts for that toast's announce and dive and no longer: the stack then
 * waits behind the pill, which the cover itself hides.
 */
function useHeldDock(phase: Phase, phone: boolean, measured: ToastDock | null): ToastDock | null {
  const live = useToastDockState();
  const held = useRef<ToastDock | null>(null);
  if (live) held.current = live;
  else if (phase === null) held.current = null;
  if (!phone) return null;
  return live ?? held.current ?? (phase !== null ? measured : null);
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

function sendRelease(root: HTMLElement | null): void {
  const list = root?.querySelector("[data-sonner-toaster]");
  if (!list) return;
  sending = true;
  try {
    list.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  } finally {
    sending = false;
  }
}

function useTimerRelease(root: RefObject<HTMLElement | null>, idle: boolean): void {
  const request = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const down = new Set<number>();
    const armed = new Set<number>();
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One timer at a time; it re-checks both conditions when it fires, since
    // a pointer can land between the real release and this task.
    const flush = () => {
      if (!pending || down.size > 0 || timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (!pending || down.size > 0) return;
        pending = false;
        sendRelease(el);
      }, 0);
    };
    request.current = () => {
      pending = true;
      flush();
    };
    const onDown = (event: PointerEvent) => {
      if (sending) return;
      down.add(event.pointerId);
      if (event.target instanceof Node && el.contains(event.target)) {
        armed.add(event.pointerId);
      }
    };
    const onEnd = (event: PointerEvent) => {
      if (sending) return;
      down.delete(event.pointerId);
      if (armed.delete(event.pointerId)) pending = true;
      flush();
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onEnd, true);
    window.addEventListener("pointercancel", onEnd, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onEnd, true);
      window.removeEventListener("pointercancel", onEnd, true);
      if (timer !== undefined) clearTimeout(timer);
      request.current = null;
    };
  }, [root]);

  useEffect(() => {
    if (!idle) request.current?.();
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
function useNoHoverExpand(root: RefObject<HTMLElement | null>, docked: boolean): void {
  useEffect(() => {
    const el = root.current;
    if (!docked || !el) return;
    const inside = (node: EventTarget | null) => node instanceof Node && el.contains(node);
    const block = (event: MouseEvent) => {
      const into = event.type === "mouseout" ? event.relatedTarget : event.target;
      if (inside(into)) event.stopPropagation();
    };
    const types = ["mouseover", "mousemove", "mouseout"] as const;
    for (const type of types) window.addEventListener(type, block, true);
    return () => {
      for (const type of types) window.removeEventListener(type, block, true);
    };
  }, [root, docked]);
}

/**
 * While the phone's stack is tucked, its toasts and their buttons leave the
 * tab order, and focus left on one goes, as it would from any control that is
 * hidden. A card behind the pill is out of sight, and a button nobody can see
 * should not take Tab. The band's "Show notifications" is the way in, for a
 * keyboard as for a finger. A pinned toast is in view, so it keeps its stops.
 *
 * Only the tab order: the region stays in the accessibility tree, since
 * Sonner's live section is inside it, and a toast that arrives tucked is
 * still announced. `inert` took the live section out with the buttons.
 */
function useTuckedTabStops(root: RefObject<HTMLElement | null>, hidden: boolean): void {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !hidden) return;
    const release = holdTabStops(el, `[data-sonner-toast].${PINNED_CLASS}`);
    const at = document.activeElement;
    if (at instanceof HTMLElement && el.contains(at) && at.tabIndex < 0) at.blur();
    return release;
  }, [root, hidden]);
}

export type ToasterProps = {
  /**
   * Whether toasts may show right now. On the phone the stack is anchored to
   * the bottom bar's nav pill, so an app that hides its bar on some screens
   * closes the gate there: the whole stack hides (`.toast-gate-closed`), and
   * collapses, until the gate reopens. The app owns holding back toasts
   * raised meanwhile. Defaults to open.
   */
  gateOpen?: boolean;
  /**
   * The widest viewport, in px, that gets the phone layout: the pill docked
   * behind the bottom bar. Defaults to 767, or to `--dl-phone-max` when the
   * app sets that on `:root`. Calendar's phone shell runs to 899. The
   * `<ToastBand>` follows the same width without being told.
   */
  phoneMaxWidth?: number;
  /**
   * Extra classes for Sonner's list, beside the kit's own. The hook for a
   * rule only this app has, keyed on the kit's phase classes
   * (`toast-announcing`, `toast-slotting`), so the app never restates the
   * kit's clock to know when a toast is announcing.
   */
  className?: string;
  /**
   * A selector for the surfaces that cover the bottom bar on a phone: the
   * app's sheets, dialogs and viewers. As each toast arrives the kit looks
   * for one on screen and, finding it, announces the toast above its top
   * edge and dives it behind (see `useToastDock`, which does the same for a
   * surface that registers itself). Name every full-screen overlay here, or
   * its toasts announce under its scrim.
   */
  cover?: string;
  /**
   * The kind a bare `toast("...")` takes. Without it a bare toast wears the
   * plain glass with no icon, so its tucked desktop tab is a blank strip.
   * With it, every toast has a tint and an icon. Leave it out to keep the
   * plain glass.
   */
  defaultKind?: ToastDefaultKind;
  /**
   * The selector that is true while this app's own reduced-motion switch is
   * on, such as `html[data-motion="reduce"]`. While it matches, or the system
   * asks for reduced motion, the toast keeps its phases and loses the travel
   * between them (`toast-still` in toast.css). Without it the system's
   * setting alone decides, which Sonner already honours.
   */
  reducedMotionSelector?: string;
  /**
   * The selector that is true while this app has transparency turned off,
   * such as `html[data-glass="off"]`. While it matches, every toast is drawn
   * solid: `--dl-toast-solid` under the kind's tint, with no blur
   * (`toast-solid` in toast.css). Without it the toast is always glass.
   */
  reducedTransparencySelector?: string;
};

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
 * A toast updated in place announces again, the same way, when the update
 * changed its kind or its words (toast-update.ts): work that became its
 * result is told, and a progress tick is not.
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
export function Toaster({
  gateOpen = true,
  phoneMaxWidth,
  className: appClassName,
  cover,
  defaultKind,
  reducedMotionSelector,
  reducedTransparencySelector,
}: ToasterProps) {
  const still = useNamedState(reducedMotionSelector, "(prefers-reduced-motion: reduce)");
  const solid = useNamedState(reducedTransparencySelector, undefined);
  // The width is shared, so the band and the app's own `usePhoneLayout`
  // switch at the same pixel as the toaster.
  useEffect(() => {
    if (phoneMaxWidth === undefined) return;
    setPhoneMaxWidth(phoneMaxWidth);
    return () => setPhoneMaxWidth(null);
  }, [phoneMaxWidth]);
  const isMobile = usePhoneLayout();
  const tucked = !isMobile;
  const expanded = useToastsExpanded();
  const { toasts } = useSonner();
  // Where a toast announces is measured as it arrives: the registered docks
  // again, and the app's `cover` selector if it named one.
  const [measured, setMeasured] = useState<ToastDock | null>(null);
  const onAnnounce = useCallback(() => {
    refreshToastDock();
    setMeasured(cover && isMobile ? measureToastCover(cover) : null);
  }, [cover, isMobile]);
  const root = useRef<HTMLDivElement>(null);
  const find = useToastTags(root, toasts);
  const { phase, again } = useAnnouncePhase(
    toasts,
    tucked ? desktopHold : mobileHold,
    onAnnounce,
    find,
    defaultKind,
  );
  // One object for as long as the default kind stands, so Sonner's cards
  // are not handed new class names on every render.
  const classNames = useMemo(
    () => (defaultKind ? { ...TOAST_CLASS_NAMES, default: bareClass(defaultKind) } : TOAST_CLASS_NAMES),
    [defaultKind],
  );
  const dock = useHeldDock(phase, isMobile, measured);

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
    if (toasts.length === 0 && expanded) setToastsExpanded(false);
  }, [toasts.length, expanded]);

  // When the gate closes the stack is hidden (`.toast-gate-closed`); collapse
  // it too, so it comes back tucked behind the pill rather than still fanned
  // out.
  useEffect(() => {
    if (!gateOpen && expanded) setToastsExpanded(false);
  }, [gateOpen, expanded]);

  // A sheet or dialog over the bar tucks a fanned stack: the band that would
  // tuck it is under the cover.
  const covered = dock?.kind === "cover";
  useEffect(() => {
    if (covered && expanded) setToastsExpanded(false);
  }, [covered, expanded]);

  useTimerRelease(root, toasts.length === 0);
  useNoHoverExpand(root, isMobile);

  const choreographing = phase !== null && toasts.length > 0;
  // The mobile stack is fanned out only when OUR store says so, never from
  // Sonner's own hover-expand. `toast-stack-open` mirrors this to the DOM so
  // the CSS can keep the collapsed stack pointer-inert (killing the
  // hover-expand flicker) while letting the expanded toasts stay interactive.
  const stackOpen = isMobile && expanded && !choreographing && !covered;
  // Tucked behind the pill (or under a line), a phone toast is out of sight,
  // so its buttons leave the tab order too. Not during the announce, when the
  // arriving toast and its button are on screen. The desktop's tucked tabs
  // stay reachable: tabbing into them is how the column pulls out.
  useTuckedTabStops(root, isMobile && !stackOpen && !(choreographing && phase === "announce"));
  const className =
    [
      // Gate closed: hide the whole stack (covers toasts that were already
      // showing when the bar left the screen).
      !gateOpen && "toast-gate-closed",
      // The layout: the stylesheet has no width query of its own, so these
      // two classes are the whole switch between phone and desktop.
      isMobile ? "toast-phone" : "toast-tuck",
      choreographing && phase === "announce" && "toast-announcing",
      choreographing && phase === "slotting" && "toast-slotting",
      // The announce is about a toast updated in place that is not the front
      // card: the stylesheet follows the card marked `data-again` instead.
      choreographing && again && "toast-again",
      stackOpen && "toast-stack-open",
      // The dock is not the pill: the toaster stands on the dock's line, and
      // on the bottom edge where there is no room above it.
      dock && "toast-over",
      dock && dock.line === 0 && "toast-over-edge",
      // The app's own switches, named by selector, as classes the stylesheet
      // can key on.
      still && "toast-still",
      solid && "toast-solid",
      appClassName,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  // `display: contents` leaves no box, so the toaster keeps its own fixed
  // position and every selector that reaches it still does.
  return (
    <div ref={root} style={{ display: "contents" }}>
      <SonnerToaster
        theme="dark"
        position="bottom-right"
        gap={8}
        className={className}
        style={dock ? ({ "--dl-dock-line": `${dock.line}px` } as CSSProperties) : undefined}
        expand={stackOpen || tucked}
        visibleToasts={tucked ? DESKTOP_VISIBLE : undefined}
        swipeDirections={isMobile ? [...PHONE_SWIPE_DIRECTIONS] : undefined}
        icons={TOAST_ICONS}
        toastOptions={{
          duration: isMobile ? MOBILE_DURATION_MS : DESKTOP_DURATION_MS,
          classNames,
        }}
      />
    </div>
  );
}
