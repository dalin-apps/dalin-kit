"use client";

/**
 * Swiping the toast stack out of the bottom bar's nav pill, and back into it
 * (ported from the CS practice room redesign).
 *
 * A finger that lands on the pill, or in the gaps level with it, and travels
 * up past a line just above the pill fans the stack out. With the stack out, a
 * finger travelling down from the same place tucks it back. The tap band still
 * does both with a tap.
 *
 * The tap on a tab is the thing protected here. Nothing is decided on the way
 * down: no `preventDefault`, no timer, no pointer capture. A press only
 * becomes a swipe once it has travelled the slop in `stack-swipe.ts`,
 * which a tap never does, so the click that switches tabs reaches the tab
 * exactly as it did before this existed. Capture is taken at the claim and
 * only for a mouse. A touch is already captured by the element it started on,
 * which is what keeps the moves arriving after the finger leaves the pill, and
 * taking capture on the way down would retarget the release and swallow the
 * tap.
 *
 * The pill is painted, never re-rendered. The pull's progress, the finger's
 * place along the pill and the lift are custom properties written on the pill
 * itself and on Sonner's list. On the root they would be inherited by every
 * element on the page and restyle it each frame.
 *
 * What the app's bottom bar owes this hook: the pill carries `data-dl-pill`
 * (or the app passes its own selector as `pill`), spreads the returned
 * handlers, and sets `touch-action: none`. What the hook writes on the pill
 * for the app's own stylesheet to draw: `data-pull="on"` while a finger pulls
 * and `data-pull="swell"` for 460ms once the stack moves, with `--pull` (0 to
 * 1), `--pull-x` (the finger's place along the pill) and `--pull-lift` (px).
 *
 * Three things an app may add (StackSwipeHost). `liftTarget` names a second
 * element that gets `--pull-lift` too, for a piece beside the pill that rises
 * with it. `onFan` and `onTuck` are the two ticks apart, for an app whose
 * haptics differ by direction. And `pullOn` says when the matched pill draws
 * the pull at all: where another bar can stand in the pill's place and draws
 * none, the hook writes nothing and the peeking cards stay down with it.
 *
 * @see `stack-swipe.ts`, what a drag means
 * @see `toast-band.tsx`, the gaps beside the pill
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  SWIPE_CLICK_GUARD_MS,
  SWIPE_LIFT_MAX_PX,
  claimSwipe,
  inSwipeBand,
  readSwipe,
  type SwipeStart,
} from "./stack-swipe.js";
import { useToastPillPresence } from "./toast-dock.js";
import {
  readToastCount,
  readToastsExpanded,
  setToastsExpanded,
} from "./toast-stack.js";

/** The nav pill, when the app does not name its own. */
export const DEFAULT_PILL_SELECTOR = "[data-dl-pill]";
const TOASTER_SELECTOR = '[data-sonner-toaster][data-y-position="bottom"]';

/** How long the lens swells and fades once the stack moves. Matches the CSS. */
const SWELL_MS = 460;

/** A press in flight, from the moment it lands. */
type Press = SwipeStart & {
  id: number;
  pointerType: string;
  pill: HTMLElement;
  pillLeft: number;
  /** Whether this pill draws the pull (`pullOn`). False: nothing is painted. */
  draws: boolean;
  /** The app's second element for `--pull-lift` (`liftTarget`), if it is on the page. */
  also: HTMLElement | null;
  direction: -1 | 0 | 1;
  /** The stack has moved, so the rest of this press only waits for the lift. */
  done: boolean;
};

/** What differs from app to app, shared by the pill's swipe and the band. */
export type StackSwipeHost = {
  /** A selector for the bottom bar's nav pill. Defaults to `[data-dl-pill]`. */
  pill?: string;
  /**
   * Called once each time the stack fans out or tucks under a finger, for the
   * app's own haptic tick. Nothing is played when it is left out.
   */
  onTick?: () => void;
  /**
   * The tick for the stack fanning out alone, in place of `onTick`. For an
   * app whose haptics differ by direction: something arriving, something
   * leaving.
   */
  onFan?: () => void;
  /** The tick for the stack tucking away alone, in place of `onTick`. */
  onTuck?: () => void;
  /**
   * A selector for a second element that gets `--pull-lift` as the pill
   * does, and loses it with the pill: a piece of the bar beside the pill that
   * should rise with it under a pull.
   */
  liftTarget?: string;
  /**
   * A selector the matched pill must also match to draw the pull. For a bar
   * whose middle piece is not always the pill (a selection bar that swaps in
   * and draws no lens): while the piece does not match, the swipe still fans
   * and tucks the stack, but nothing is written on the piece and the peeking
   * cards do not lift, since there is no lift for them to follow. Left out,
   * the pill always draws.
   */
  pullOn?: string;
  /**
   * Whether motion is reduced right now. Defaults to the system's setting; an
   * app with its own motion switch passes its reader, so that switch wins.
   */
  reducedMotion?: () => boolean;
};

export type StackSwipeOptions = StackSwipeHost & {
  /**
   * Where the handlers are spread. The pill takes a press anywhere on it; the
   * band only one level with the pill, since the strip under it runs into the
   * system's home gesture.
   */
  zone: "pill" | "band";
};

export type StackSwipe = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  /**
   * Swallows a click that arrives just after a claimed swipe, before the next
   * press. Browsers send none for a touch that travelled; this is the
   * backstop, spread as `onClickCapture` so it runs before the tab's own
   * handler does.
   */
  onClickCapture: (event: ReactMouseEvent<HTMLElement>) => void;
};

function toaster(): HTMLElement | null {
  return document.querySelector<HTMLElement>(TOASTER_SELECTOR);
}

/** What a pull writes on, fixed for the length of a press. */
type Painted = Pick<Press, "pill" | "draws" | "also">;

/** Hands the pill and the peeking cards to the finger: no transitions. */
function begin(press: Painted) {
  if (!press.draws) return;
  press.pill.dataset.pull = "on";
  toaster()?.setAttribute("data-pulling", "");
}

function paint(press: Press, progress: number, lift: number, x: number) {
  // A pill that draws no pull does not lift, so the cards behind it don't
  // either: they would rise from behind a bar that stayed where it was.
  if (!press.draws) return;
  const along = Math.min(Math.max(x - press.pillLeft, 0), press.pill.offsetWidth);
  const style = press.pill.style;
  const px = `${lift.toFixed(2)}px`;
  style.setProperty("--pull", progress.toFixed(3));
  style.setProperty("--pull-x", `${Math.round(along)}px`);
  style.setProperty("--pull-lift", px);
  press.also?.style.setProperty("--pull-lift", px);
  toaster()?.style.setProperty("--pull-lift", px);
}

/** Lets the pill and the cards ease back to rest. */
function release(press: Painted) {
  if (!press.draws) return;
  const { pill } = press;
  if (pill.dataset.pull === "on") delete pill.dataset.pull;
  pill.style.removeProperty("--pull");
  pill.style.removeProperty("--pull-lift");
  press.also?.style.removeProperty("--pull-lift");
  const list = toaster();
  list?.removeAttribute("data-pulling");
  list?.style.removeProperty("--pull-lift");
}

/**
 * The stack moved: the lens swells out and the pill drops back while the
 * cards travel. Under reduced motion the light simply goes, since the
 * stylesheet already cuts the swell to nothing.
 */
function swell(press: Painted, reduced: boolean) {
  release(press);
  if (reduced || !press.draws) return;
  const { pill } = press;
  pill.dataset.pull = "swell";
  window.setTimeout(() => {
    if (pill.dataset.pull === "swell") delete pill.dataset.pull;
  }, SWELL_MS);
}

/**
 * The app's tick for the stack moving: its own tick for that direction when
 * it has one, else the one tick for both.
 */
export function stackTick(host: StackSwipeHost, open: boolean): void {
  (open ? (host.onFan ?? host.onTick) : (host.onTuck ?? host.onTick))?.();
}

/**
 * Claims the press once it has travelled far enough to mean something, and
 * hands the pill to the finger. False while it is still a possible tap.
 */
function claim(current: Press, event: ReactPointerEvent<HTMLElement>): boolean {
  const direction = claimSwipe(current, event.clientX, event.clientY);
  if (direction === 0) return false;
  current.direction = direction;
  if (current.pointerType === "mouse") {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* the pointer is already gone */
    }
  }
  begin(current);
  return true;
}

function systemReducesMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The stack moves: buzz, swell the lens, and fan or tuck. */
function settle(current: Press, open: boolean, host: StackSwipeHost) {
  current.done = true;
  stackTick(host, open);
  swell(current, (host.reducedMotion ?? systemReducesMotion)());
  setToastsExpanded(open);
}

/** Follows a claimed press to the pointer's current position. */
function follow(current: Press, x: number, y: number, host: StackSwipeHost) {
  const read = readSwipe(current, current.direction as -1 | 1, y);
  if (read.kind === "pull") paint(current, read.progress, read.lift, x);
  else if (read.kind === "tuck-pull") paint(current, read.progress, 0, x);
  else if (read.kind === "tuck") settle(current, false, host);
  // Nothing stacked: the pill holds its full pull and settles on release,
  // with no buzz, because nothing arrived.
  else if (readToastCount() === 0) paint(current, 1, SWIPE_LIFT_MAX_PX, x);
  else settle(current, true, host);
}

/** Reads a drag on the pill or the gaps beside it as the toast stack's swipe. */
export function useStackSwipe({
  zone,
  pill,
  onTick,
  onFan,
  onTuck,
  liftTarget,
  pullOn,
  reducedMotion,
}: StackSwipeOptions): StackSwipe {
  // The pill's swipe is mounted with the bar, so it says a pill is on the
  // page: the `<Toaster>` docks phone toasts only while one is.
  useToastPillPresence(zone === "pill");
  const press = useRef<Press | null>(null);
  const guardUntil = useRef(0);
  // The app's side, read at the moment a press needs it, so a new callback
  // identity never rebuilds the handlers.
  const host = useRef<StackSwipeHost>({ pill, onTick, onFan, onTuck, liftTarget, pullOn, reducedMotion });
  useEffect(() => {
    host.current = { pill, onTick, onFan, onTuck, liftTarget, pullOn, reducedMotion };
  }, [pill, onTick, onFan, onTuck, liftTarget, pullOn, reducedMotion]);

  // Cleared on unmount, so a bar that leaves mid-pull (a page opened from a
  // toast's action) doesn't leave Sonner's list with its transitions off.
  useEffect(
    () => () => {
      const current = press.current;
      if (current && current.direction !== 0 && !current.done) release(current);
    },
    [],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // A new press owns whatever click comes after it, so the guard left by
      // the last swipe never eats a tap that follows it quickly.
      guardUntil.current = 0;
      press.current = null;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const pill = document.querySelector<HTMLElement>(host.current.pill ?? DEFAULT_PILL_SELECTOR);
      if (!pill) return;
      const box = pill.getBoundingClientRect();
      if (zone === "band" && !inSwipeBand(event.clientY, box.top, box.bottom)) return;
      press.current = {
        id: event.pointerId,
        pointerType: event.pointerType,
        x: event.clientX,
        y: event.clientY,
        pillTop: box.top,
        open: readToastsExpanded(),
        pill,
        pillLeft: box.left,
        draws: host.current.pullOn === undefined || pill.matches(host.current.pullOn),
        also: host.current.liftTarget ? document.querySelector<HTMLElement>(host.current.liftTarget) : null,
        direction: 0,
        done: false,
      };
    },
    [zone],
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const current = press.current;
    if (!current || current.done || event.pointerId !== current.id) return;
    if (current.direction === 0 && !claim(current, event)) return;
    follow(current, event.clientX, event.clientY, host.current);
  }, []);

  const end = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const current = press.current;
    if (!current || event.pointerId !== current.id) return;
    press.current = null;
    if (current.direction === 0) return;
    guardUntil.current = performance.now() + SWIPE_CLICK_GUARD_MS;
    if (!current.done) release(current);
  }, []);

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (performance.now() >= guardUntil.current) return;
    guardUntil.current = 0;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // One object for the life of the caller, so spreading it is not a new set
  // of handlers on every render.
  return useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onClickCapture,
    }),
    [end, onClickCapture, onPointerDown, onPointerMove],
  );
}
