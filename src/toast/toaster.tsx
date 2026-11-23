"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { Toaster as SonnerToaster, useSonner } from "sonner";
import type { ToastT } from "sonner";
import {
  setToastCount,
  setToastPinned,
  setToastsExpanded,
  useToastsExpanded,
} from "./toast-stack.js";
import {
  measureToastCover,
  refreshToastDock,
  setNamedToastCover,
  useToastDockState,
  useToastPill,
  type ToastDock,
} from "./toast-dock.js";
import { holdTabStops } from "./tab-stops.js";
import { useToastTags } from "./toast-tags.js";
import { ToastSpinner } from "./toast-spinner.js";
import { MOTION_CLASS, scopeSonnerReducedMotion } from "./sonner-motion.js";
import { motionReaderFor, setToasterMotionReader } from "../helpers/motion.js";
import { PINNED_CLASS, PROGRESS_CLASS, announcesUpdate, faceOf, type ToastFace } from "./toast-update.js";
import { useLiveCover } from "./use-live-cover.js";
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
 * A toast leaves whichever way it is pushed. Sonner derives its swipe
 * directions from `position`, and "bottom-right" yields down and right
 * alone: a push the other way is damped to a fraction of the pointer and
 * never reaches the 45px it takes to dismiss. That reasons about a corner.
 * The phone's toast is centred over the pill with room on every side, and a
 * desktop toast pulled out from the edge has the whole window to its left
 * and above it. Drive's and calendar's own toasters passed all four on
 * every layout; version 0.1 kept Sonner's two on the desktop.
 */
const SWIPE_DIRECTIONS = ["top", "right", "bottom", "left"] as const;

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
 * What the announce clock says: the phase, whether it is about a marked
 * card, and whether it is calm (a pinned toast released to its result, which
 * is already in view and holds there with no pop).
 */
type Flight = { phase: Phase; again: boolean; calm: boolean };

/** No toast in flight. One object, so setting it twice is not a second render. */
const GROUNDED: Flight = { phase: null, again: false, calm: false };

/**
 * The announce -> slot clock. It restarts whenever a new toast id appears,
 * and whenever a live toast is updated in place in a way worth telling
 * (toast-update.ts): a change of kind, or of words.
 *
 * A pinned toast's arrival does not start it: that toast holds above the
 * dock, or out from the desktop's edge, for as long as it is pinned. When it
 * is released to its result under the same id, the announce is `calm`: the
 * result holds where the pinned toast stood and then tucks, with no second
 * pop (`toast-calm` in toast.css).
 *
 * It runs only while `active`. The choreography is how a toast gets in
 * behind the pill, so on the phone it runs while the stack is tucked: with
 * the stack fanned out there is nothing to dive behind, and an arrival
 * simply joins the fan. Every toast is recorded either way, so one that
 * landed in the fan is not announced later as if it were new. Fanning the
 * stack out while a toast is in flight ends the flight.
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
  active: boolean,
  holdFor: (arrived: ToastT[]) => number,
  onAnnounce: () => void,
  find: (id: string) => HTMLElement | null,
  bareKind: string | undefined,
): Flight {
  const [flight, setFlight] = useState<Flight>(GROUNDED);
  const seen = useRef<Map<string, ToastFace>>(new Map());
  const marked = useRef<HTMLElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Crossing into or out of `active` ends whatever was in flight. This is
  // state adjusted on a changed input, during render, and not an effect: an
  // effect would paint one frame of the dive over the fan first.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (flight !== GROUNDED) setFlight(GROUNDED);
  }

  // A layout effect, so the first frame that shows an arriving toast is
  // already the announce. As a passive effect it ran after that frame was
  // painted, and a busy frame (the list re-rendering for the move that raised
  // the toast) showed the toast sitting in its tucked slot first.
  useLayoutEffect(() => {
    const faces = new Map<string, ToastFace>();
    const arrived: ToastT[] = [];
    const changed: ToastT[] = [];
    const released = new Set<string>();
    for (const t of toasts) {
      const id = String(t.id);
      const now = faceOf(t, bareKind);
      const was = seen.current.get(id);
      faces.set(id, now);
      // A pinned toast holds in view by itself (toast.css, PINNED), so its
      // arrival is no announce: the clock would hide every waiting card for
      // a hold the pinned toast does not need.
      if (!was) {
        if (!now.pinned) arrived.push(t);
      } else if (announcesUpdate(was, now)) {
        changed.push(t);
        if (was.pinned && !now.pinned) released.add(id);
      }
    }
    seen.current = faces;
    if (!active) return;
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
    const again = card !== null;
    // A pin that let go: its result stands where the pinned toast stood.
    const calm = updated !== undefined && released.has(String(updated.id));
    // Before the phase class lands, so where the toast announces is measured
    // in the same commit that starts it.
    onAnnounce();
    // The hold is measured by what arrived or changed, not by what is
    // already stacked.
    const hold = holdFor(arrived.length > 0 ? arrived : changed);
    setFlight({ phase: "announce", again, calm });
    timers.current = [
      setTimeout(() => setFlight({ phase: "slotting", again, calm }), hold),
      setTimeout(() => {
        setFlight(GROUNDED);
        marked.current?.removeAttribute(AGAIN_ATTR);
        marked.current = null;
      }, hold + SLOT_MS),
    ];
  }, [toasts, active, holdFor, onAnnounce, find, bareKind]);

  // The clock's timers and the mark are side effects, so they are cleared
  // here and not beside the reset above. That leaves one commit in which a
  // timer that came due can still land; the masked return below covers it.
  useLayoutEffect(() => {
    if (active) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    marked.current?.removeAttribute(AGAIN_ATTR);
    marked.current = null;
  }, [active]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      marked.current?.removeAttribute(AGAIN_ATTR);
    },
    [],
  );
  return active ? flight : GROUNDED;
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

/** The cover a selector names, measured now. A selector the browser can't parse names none. */
function measureNamedCover(selector: string): ToastDock | null {
  try {
    return measureToastCover(selector);
  } catch {
    return null;
  }
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
 * During an announce one more card is in view, the one announcing, and it
 * keeps its stops for the hold (`spared`). The cards it hides do not: the
 * announce fades every other card out, and a faded Undo should not take Tab
 * either.
 *
 * Only the tab order: the region stays in the accessibility tree, since
 * Sonner's live section is inside it, and a toast that arrives tucked is
 * still announced. `inert` took the live section out with the buttons.
 */
function useTuckedTabStops(root: RefObject<HTMLElement | null>, hidden: boolean, spared: string): void {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !hidden) return;
    const release = holdTabStops(el, spared);
    const at = document.activeElement;
    if (at instanceof HTMLElement && el.contains(at) && at.tabIndex < 0) at.blur();
    return release;
  }, [root, hidden, spared]);
}

/** The cards that keep their tab stops while the phone's stack is tucked. */
const PINNED_CARD = `[data-sonner-toast].${PINNED_CLASS}`;
const FRONT_CARD = '[data-sonner-toast][data-front="true"]';
const AGAIN_CARD = `[data-sonner-toast][${AGAIN_ATTR}]`;

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
   *
   * The selector is also watched between toasts. While a cover is up a
   * fanned stack is tucked, and the `<ToastBand>` is inert and out of the
   * tab order, since it lies under the cover (`useToastCovered`).
   */
  cover?: string;
  /**
   * Whether a tap off a fanned phone stack tucks it. With it, the kit lays a
   * layer over the page while the stack is fanned out, one step under the
   * toasts (`.toast-scrim` in toast.css), and a tap on it tucks the stack.
   * The layer is clear unless the app gives it a fill with
   * `--dl-toast-scrim`. Off by default, when only the band and the pill's
   * swipe tuck the stack. Set it where a dock other than the pill is used:
   * the band there is a thin strip while the stack is out.
   */
  scrim?: boolean;
  /** Called when a tap on the scrim tucks the stack, for the app's haptic tick. */
  onScrimTuck?: () => void;
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
   *
   * This and `fullMotionSelector` are also the one place an app names its
   * motion switch for the kit's script: the `<ToastBand>`, `useStackSwipe`
   * and `watchLeaving` follow them unless given a reader of their own.
   */
  reducedMotionSelector?: string;
  /**
   * The selector that is true while this app's own switch says Full motion,
   * such as `html[data-motion="full"]`, or `:root:not([data-reduced-motion])`
   * for an app whose one attribute is the whole answer. While it matches,
   * the system's reduced-motion setting is not followed: the toast keeps its
   * travel, and Sonner's own rule for that setting stands aside
   * (`toast-motion`, sonner-motion.ts). The app's reduce switch still wins
   * where both match. Without it, the system's setting always reduces.
   */
  fullMotionSelector?: string;
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
 * card-shuffle into the stack). With the stack fanned out there is nothing
 * to dive behind: an arrival joins the fan, and the stack stays open.
 *
 * A toast updated in place announces again, the same way, when the update
 * changed its kind or its words (toast-update.ts): work that became its
 * result is told, and a progress tick is not.
 *
 * The pill is the dock unless a surface says otherwise (`useToastDock`): over
 * a parked chip, a sheet or a dialog the toast announces above that surface's
 * line and dives behind it (`toast-over` in toast.css). Under a cover the
 * stack then waits out of sight until the pill is the dock again. Over a
 * line that is not a cover, such as a parked chip, it peeks above the line
 * and the band lies on the slivers (`toast-over-line`).
 *
 * A phone page with no bottom bar has no pill to dock behind. There the
 * toast is a plain one on the bottom edge (`toast-plain`): no announce, no
 * stack behind anything, Sonner's own four seconds.
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
  scrim = false,
  onScrimTuck,
  defaultKind,
  reducedMotionSelector,
  fullMotionSelector,
  reducedTransparencySelector,
}: ToasterProps) {
  // Motion is reduced by the app's own switch, or by the system's setting
  // unless the app's switch says Full: a choice made in the app is the more
  // particular one, and it wins.
  const reduced = useNamedState(reducedMotionSelector, undefined);
  const system = useNamedState(undefined, "(prefers-reduced-motion: reduce)");
  const full = useNamedState(fullMotionSelector, undefined) && !reduced;
  const still = reduced || (system && !full);
  // Sonner's own rule for the system's setting is scoped once, so the class
  // below can lift it from this toaster's cards.
  useEffect(() => {
    if (fullMotionSelector) scopeSonnerReducedMotion();
  }, [fullMotionSelector]);
  // The app's switch, said once. The band, the pill's swipe and the close
  // fade are script and ask helpers/motion.ts, which answers from these two
  // selectors while this toaster is mounted, so the app names its switch here
  // and nowhere else.
  useEffect(() => {
    if (!reducedMotionSelector && !fullMotionSelector) return;
    return setToasterMotionReader(motionReaderFor(reducedMotionSelector, fullMotionSelector));
  }, [reducedMotionSelector, fullMotionSelector]);
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
  // The phone's toast docks: behind the nav pill, or on the line of whatever
  // surface registered itself. A phone page with neither (no bottom bar is
  // mounted, and nothing else has said where the floor is) has nothing to
  // dock behind, so there the toast is `plain`: Sonner's own on the bottom
  // edge, in the family's glass. A closed gate is not that case. The app
  // has said its bar is off screen for now and the stack waits hidden, so
  // it keeps the phone's layout, and its thirty seconds, until the bar is
  // back.
  const pill = useToastPill();
  const registered = useToastDockState();
  const unpilled = isMobile && !pill && registered === null && gateOpen;
  // The answer is taken one commit late. A bar that mounts in the same
  // commit the page needs it (notes closing a page: the gate opens and the
  // bar mounts together) is rendered after the toaster and counted in a
  // layout effect, so for that one render there is no pill yet. Going plain
  // on it would hand the waiting stack Sonner's four seconds and take them
  // back a moment later. A page that really has no pill is still without
  // one in the next commit.
  const [settled, setSettled] = useState(false);
  useEffect(() => setSettled(unpilled), [unpilled]);
  const plain = unpilled && settled;
  const docked = isMobile && !plain;
  const expanded = useToastsExpanded();
  const { toasts } = useSonner();
  // Where a toast announces is measured as it arrives: the registered docks
  // again, and the app's `cover` selector if it named one.
  const [measured, setMeasured] = useState<ToastDock | null>(null);
  const onAnnounce = useCallback(() => {
    refreshToastDock();
    setMeasured(cover && docked ? measureNamedCover(cover) : null);
  }, [cover, docked]);
  const root = useRef<HTMLDivElement>(null);
  // Between toasts the selector is watched too, so a cover that opens over a
  // fanned stack tucks it, and the band knows to stand down under it.
  const coverUp = useLiveCover(cover, docked, root);
  useEffect(() => {
    setNamedToastCover(coverUp);
    return () => setNamedToastCover(false);
  }, [coverUp]);
  const find = useToastTags(root, toasts);
  const { phase, again, calm } = useAnnouncePhase(
    toasts,
    // The desktop column announces always. The phone announces only while
    // its stack is docked and tucked: a toast that arrives in a fanned stack
    // joins it, and a plain toast has nowhere to dive.
    tucked || (docked && !expanded),
    tucked ? desktopHold : mobileHold,
    onAnnounce,
    find,
    defaultKind,
  );
  // One array for the life of the toaster: Sonner reads it on every move.
  const swipeDirections = useMemo(() => [...SWIPE_DIRECTIONS], []);
  // One object for as long as the default kind stands, so Sonner's cards
  // are not handed new class names on every render.
  const classNames = useMemo(
    () => (defaultKind ? { ...TOAST_CLASS_NAMES, default: bareClass(defaultKind) } : TOAST_CLASS_NAMES),
    [defaultKind],
  );
  const dock = useHeldDock(phase, docked, measured);

  // Mirror the live toast count into the shared store. This Toaster never
  // unmounts (it's at the layout root), so the count is always authoritative.
  // The toast band reads it from the store instead of its own `useSonner`,
  // which would miss toasts created while the band was unmounted (see
  // toast-stack.ts).
  useEffect(() => {
    setToastCount(toasts.length);
  }, [toasts.length]);
  const anyPinned = toasts.some((t) => faceOf(t).pinned);
  useEffect(() => {
    setToastPinned(anyPinned);
  }, [anyPinned]);

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

  // Nothing fans on a page with no pill: there is no band to tuck it again.
  useEffect(() => {
    if (plain && expanded) setToastsExpanded(false);
  }, [plain, expanded]);

  // A sheet or dialog over the bar tucks a fanned stack: the band that would
  // tuck it is under the cover. That is a dock registered as a cover, a cover
  // measured as a toast arrived, or one the `cover` selector names right now.
  const covered = dock?.kind === "cover" || coverUp;
  useEffect(() => {
    if (covered && expanded) setToastsExpanded(false);
  }, [covered, expanded]);

  useTimerRelease(root, toasts.length === 0);
  useNoHoverExpand(root, docked);

  const choreographing = phase !== null && toasts.length > 0;
  // The mobile stack is fanned out only when OUR store says so, never from
  // Sonner's own hover-expand. `toast-stack-open` mirrors this to the DOM so
  // the CSS can keep the collapsed stack pointer-inert (killing the
  // hover-expand flicker) while letting the expanded toasts stay interactive.
  const stackOpen = docked && expanded && !covered;
  // Tucked behind the pill (or under a line), a phone toast is out of sight,
  // so its buttons leave the tab order too. During the announce the one
  // toast on screen keeps its stops: the front card, or the marked one when
  // the announce is about a toast updated in place. The desktop's tucked
  // tabs stay reachable: tabbing into them is how the column pulls out.
  const announcing = choreographing && phase === "announce";
  const spared = announcing ? `${PINNED_CARD}, ${again ? AGAIN_CARD : FRONT_CARD}` : PINNED_CARD;
  useTuckedTabStops(root, docked && !stackOpen, spared);
  const className =
    [
      // Gate closed: hide the whole stack (covers toasts that were already
      // showing when the bar left the screen).
      !gateOpen && "toast-gate-closed",
      // The layout: the stylesheet has no width query of its own, so these
      // classes are the whole switch between the phone's dock, the desktop's
      // column, and the plain toast of a phone page with no pill.
      docked ? "toast-phone" : plain ? "toast-plain" : "toast-tuck",
      announcing && "toast-announcing",
      choreographing && phase === "slotting" && "toast-slotting",
      // The announce is about a toast updated in place that is not the front
      // card: the stylesheet follows the card marked `data-again` instead.
      choreographing && again && "toast-again",
      // The announce is a pinned toast's result: it holds with no pop.
      choreographing && calm && "toast-calm",
      stackOpen && "toast-stack-open",
      // The dock is not the pill: the toaster stands on the dock's line, and
      // on the bottom edge where there is no room above it.
      dock && "toast-over",
      dock && dock.line === 0 && "toast-over-edge",
      // A line that is not a cover, with room over it: the stack peeks above
      // the line as it does above the pill, and the band lies on the slivers.
      dock && dock.kind === "line" && dock.line > 0 && "toast-over-line",
      // The app's own switches, named by selector, as classes the stylesheet
      // can key on.
      still && "toast-still",
      // The app's Full motion choice: Sonner's rule for the system's
      // reduced-motion setting does not take this toaster's cards.
      full && MOTION_CLASS,
      solid && "toast-solid",
      appClassName,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  // `display: contents` leaves no box, so the toaster keeps its own fixed
  // position and every selector that reaches it still does.
  return (
    <div ref={root} style={{ display: "contents" }}>
      {scrim && stackOpen ? (
        // A tap anywhere off the fanned stack tucks it. Not a button: the
        // band is the named control for this, and it takes Tab.
        <div
          aria-hidden="true"
          className={dock ? "toast-scrim toast-scrim-over" : "toast-scrim"}
          onClick={() => {
            onScrimTuck?.();
            setToastsExpanded(false);
          }}
        />
      ) : null}
      <SonnerToaster
        theme="dark"
        position="bottom-right"
        gap={plain ? undefined : 8}
        className={className}
        style={dock ? ({ "--dl-dock-line": `${dock.line}px` } as CSSProperties) : undefined}
        expand={stackOpen || tucked}
        visibleToasts={tucked ? DESKTOP_VISIBLE : undefined}
        swipeDirections={swipeDirections}
        icons={TOAST_ICONS}
        toastOptions={{
          duration: docked ? MOBILE_DURATION_MS : tucked ? DESKTOP_DURATION_MS : undefined,
          classNames,
        }}
      />
    </div>
  );
}
