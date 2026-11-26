import { reducesMotion } from "./motion.js";

/**
 * The phone's press, from the pointer (0.14, the owner's pick on
 * 2026-11-26).
 *
 * The family's phone press is a control 0.97 of its size and brighter
 * (tokens.css). It was drawn from `:active`, and a touch browser applies
 * `:active` only once it knows the touch is a tap and not a scroll: on
 * calendar's phone the plus, held for 250ms, stayed at full size and shrank
 * about 70ms after the finger had lifted, and a tab showed its press, its
 * 0.9 settle and a one-frame pop after the tap was over. The look answered
 * the lift. "the animation needs to be synced up with the user's press. not
 * after."
 *
 * So the press is an attribute this watcher writes as the pointer lands:
 *
 * - `data-pressed` on the control from `pointerdown`, until the pointer
 *   lifts, is cancelled (a scroll took the touch) or slides off it. The
 *   stylesheet draws the press from it, in one frame.
 * - `data-released` from a lift on the control, for the one settle back
 *   from the pressed size (`--dl-t-tab-settle`, 140ms, on the family's
 *   curve), and gone when the settle ends, so nothing runs at rest. A press
 *   that was cancelled or slid off lets go with no settle.
 * - `data-dl-press` on `<html>` for as long as the watcher runs, which is
 *   how the kit's stylesheets know to stop drawing the same press from
 *   `:active`.
 *
 * It marks the kit's create button (`.dl-create`, `.dl-create-glass`, and
 * the button around a glass layer) and anything the app marks `dl-press`,
 * which is how a phone tab takes it: the bar is each app's own markup. A
 * control that is disabled or busy is left alone. A key press sends no
 * pointer event, so nothing started from the keyboard moves.
 *
 * They are attributes and not classes because React owns an element's
 * class, and writes it afresh when a prop changes, in the middle of a press.
 */
export const PRESSED_ATTR = "data-pressed";
/** The mark of a control settling back from its press. */
export const RELEASED_ATTR = "data-released";
/** On `<html>` while `watchPress` runs: the stylesheets then leave `:active` alone. */
export const PRESS_WATCH_ATTR = "data-dl-press";
/** The class an app puts on a control of its own that takes the press: a phone tab. */
export const PRESS_CLASS = "dl-press";

/** The settle's keyframes (motion.css, create.css). */
const SETTLE_NAME = "dl-press-settle";
/** A settle that never reported its end (no stylesheet, a hidden control) is let go after this. */
const SETTLE_LIMIT_MS = 400;
const MARKED = `.${PRESS_CLASS}, .dl-create, .dl-create-glass`;
const IDLE = ':disabled, [aria-disabled="true"], [aria-busy="true"]';

/** How many watchers are running: the mark on `<html>` goes with the last. */
let watchers = 0;

/**
 * The control a press on `target` belongs to: the nearest element that
 * carries one of the classes, or that holds a create glass as a layer, the
 * way a button with a glass `<span>` does. Null for none, and for one that
 * is disabled or busy.
 */
export function pressTarget(target: EventTarget | null): HTMLElement | null {
  let el = target instanceof Element ? target : null;
  for (; el; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue;
    if (!el.matches(MARKED) && !hasGlassLayer(el)) continue;
    return el.matches(IDLE) ? null : el;
  }
  return null;
}

function hasGlassLayer(el: Element): boolean {
  for (const child of el.children) if (child.classList.contains("dl-create-glass")) return true;
  return false;
}

export type PressOptions = {
  /** True while motion is reduced, for this watcher alone. Left out, it is the kit's one reader (`reducesMotion`). */
  reducedMotion?: () => boolean;
};

/**
 * Starts watching, at the window and in the capture phase, so the press is
 * drawn before any handler of the control's own runs. Returns the function
 * that stops it. Call it once, from an effect at the app's root, beside
 * `watchInputModality`.
 */
export function watchPress(options: PressOptions = {}): () => void {
  const root = document.documentElement;
  const still = () => (options.reducedMotion ? options.reducedMotion() : reducesMotion());

  /** The control under the pointer, and the pointer that pressed it. */
  let held: { el: HTMLElement; id: number } | null = null;
  /** Controls settling back, each with what ends its settle. */
  const settling = new Map<HTMLElement, () => void>();

  const endSettle = (el: HTMLElement) => settling.get(el)?.();
  const settle = (el: HTMLElement) => {
    endSettle(el);
    el.setAttribute(RELEASED_ATTR, "");
    const onEnd = (event: Event) => {
      if (event.target !== el) return;
      // Another animation of the control's own ending is not the settle's.
      const name = (event as AnimationEvent).animationName;
      if (name && name !== SETTLE_NAME) return;
      done();
    };
    const timer = window.setTimeout(() => done(), SETTLE_LIMIT_MS);
    const done = () => {
      window.clearTimeout(timer);
      el.removeEventListener("animationend", onEnd);
      el.removeEventListener("animationcancel", onEnd);
      el.removeAttribute(RELEASED_ATTR);
      settling.delete(el);
    };
    el.addEventListener("animationend", onEnd);
    el.addEventListener("animationcancel", onEnd);
    settling.set(el, done);
  };

  /** Lets the held control go: with its settle after a lift on it, at once otherwise. */
  const letGo = (lifted: boolean) => {
    if (!held) return;
    const { el } = held;
    held = null;
    el.removeAttribute(PRESSED_ATTR);
    if (lifted && el.isConnected && !still()) settle(el);
  };

  /** Whether the pointer is still on the held control. A page with no hit test (jsdom) says yes. */
  const over = (event: PointerEvent): boolean => {
    if (!held) return false;
    const doc = held.el.ownerDocument;
    if (typeof doc.elementFromPoint !== "function") return true;
    const under = doc.elementFromPoint(event.clientX, event.clientY);
    return under !== null && held.el.contains(under);
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    // A press the last one never heard the end of.
    letGo(false);
    const el = pressTarget(event.target);
    if (!el) return;
    // A second tap inside the settle starts from the press again.
    endSettle(el);
    el.setAttribute(PRESSED_ATTR, "");
    held = { el, id: event.pointerId };
  };
  const onMove = (event: PointerEvent) => {
    if (!held || event.pointerId !== held.id) return;
    // Slid off: the look lets go, and the lift that follows opens nothing.
    if (!over(event)) letGo(false);
  };
  const onUp = (event: PointerEvent) => {
    if (!held || event.pointerId !== held.id) return;
    letGo(over(event));
  };
  const onCancel = (event: PointerEvent) => {
    if (!held || event.pointerId !== held.id) return;
    letGo(false);
  };
  const onBlur = () => letGo(false);

  watchers += 1;
  root.setAttribute(PRESS_WATCH_ATTR, "");
  window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
  window.addEventListener("pointermove", onMove, { capture: true, passive: true });
  window.addEventListener("pointerup", onUp, { capture: true, passive: true });
  window.addEventListener("pointercancel", onCancel, { capture: true, passive: true });
  window.addEventListener("blur", onBlur);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    window.removeEventListener("pointerdown", onDown, true);
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", onCancel, true);
    window.removeEventListener("blur", onBlur);
    letGo(false);
    for (const done of [...settling.values()]) done();
    watchers -= 1;
    if (watchers === 0) root.removeAttribute(PRESS_WATCH_ATTR);
  };
}
