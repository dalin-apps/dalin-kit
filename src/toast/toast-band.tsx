"use client";

import { useToastCovered, useToastDockState, useToastPillPresence } from "./toast-dock.js";
import type { CSSProperties } from "react";
import { toggleToastsExpanded, useToastCount, useToastPinned, useToastsExpanded } from "./toast-stack.js";
import { usePhoneLayout } from "./use-phone-layout.js";
import { stackTick, useStackSwipe, type StackSwipeHost } from "./use-stack-swipe.js";

/** How many cards Sonner shows behind the phone's dock: its own default. */
const PHONE_VISIBLE = 3;

/** The app's side of the band: its nav pill, its haptic tick, its motion switch. */
export type ToastBandProps = StackSwipeHost & {
  /**
   * The band's accessible name. Defaults to "Show notifications"; an app in
   * another language passes its own words.
   */
  label?: string;
};

/**
 * The dead space around the phone's bottom bar, turned into the way the toast
 * stack fans out. It runs from the pill's top line to the bottom of the
 * screen; the bar's own controls sit above it (the bar's z-index over the
 * band's, one under it) and keep their own taps, so the band only ever
 * answers the gaps between them and the strip below. It renders at all ONLY
 * while toasts exist and the phone layout is on (the width the `<Toaster>`
 * reads): with the stack empty this space stays transparent to the pointer
 * and the page under it keeps its scroll. One tap toggles the fan, and a tap
 * that changes what you see ticks (`onTick`, or `onFan` and `onTuck` apart).
 * While the dock is another surface's line (toast-dock.ts: a parked chip)
 * the band would lie across that surface, so it moves onto the slivers that
 * peek above the line (`toast-band-line` in toast.css), where a tap fans the
 * stack as it does beside the bar. Under a cover (a sheet, a dialog, or
 * whatever `<Toaster cover>` names) it is inert and out of the tab order.
 *
 * The gaps level with the pill also take the swipe the pill does
 * (use-stack-swipe.ts): up past the pill fans the stack out, down tucks it.
 * The strip under the pill stays a tap, because that strip runs into the
 * system's home gesture.
 *
 * Mount it wherever the bottom bar shows. The stack's count comes from the
 * shared store, so the band is right the instant it mounts.
 *
 * It is a real button, named "Show notifications", with `aria-expanded`
 * saying whether the stack is out. The tucked cards and their buttons are
 * out of the tab order (toaster.tsx), so this is the way a keyboard or a
 * screen reader reaches them: Tab lands here, Enter fans the stack, and the
 * toasts are the next stops. Version 0 hid it from both (`aria-hidden`,
 * `tabIndex={-1}`), which left a tucked Undo reachable by no key at all.
 * The band is as wide as the screen, so its keyboard ring is drawn around
 * the pill's footprint instead of its own box (toast.css).
 */
export function ToastBand({ label = "Show notifications", ...host }: ToastBandProps) {
  const count = useToastCount();
  const expanded = useToastsExpanded();
  const phone = usePhoneLayout();
  const dock = useToastDockState();
  const covered = useToastCovered();
  const pinned = useToastPinned();
  const swipe = useStackSwipe({ zone: "band", ...host });
  // The band is mounted beside the bar, so it says a pill is on the page.
  useToastPillPresence();
  if (count === 0 || !phone) return null;
  // Over a line that is not a cover (a parked chip) the stack peeks above
  // the line, and the band lies on those slivers in place of the bar's dead
  // space, which the chip now owns. Not on the bottom edge, where no sliver
  // shows, and not under a pinned toast, whose button sits right over them.
  const onLine = dock !== null && !covered;
  if (onLine && (dock.line === 0 || pinned)) return null;
  const style = onLine
    ? ({ "--dl-dock-line": `${dock.line}px`, "--toast-band-cards": Math.min(count, PHONE_VISIBLE) } as CSSProperties)
    : undefined;
  return (
    <button
      type="button"
      className={onLine ? "toast-band toast-band-line" : "toast-band"}
      style={style}
      aria-label={label}
      aria-expanded={expanded}
      // Under a cover the band is out of reach of a finger and should be out
      // of reach of Tab too. It stays mounted, so focus and the swipe's state
      // have somewhere to be when the cover goes.
      inert={covered}
      tabIndex={covered ? -1 : undefined}
      {...swipe}
      // A tap on the band leaves focus where it was: Chrome would otherwise
      // focus the button on mousedown, pulling focus (and a phone's keyboard)
      // out of whatever the reader was typing in. Tab still reaches it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        // The tick for where the stack is going: out if it is tucked now.
        stackTick(host, !expanded);
        toggleToastsExpanded();
      }}
    />
  );
}
