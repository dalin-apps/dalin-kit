import { type StackSwipeHost } from "./use-stack-swipe.js";
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
 * that changes what you see ticks (`onTick`). It also stands down while the
 * dock is not the pill (toast-dock.ts): over a parked chip or under a sheet
 * it would lie across that surface.
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
export declare function ToastBand({ pill, onTick, reducedMotion, label }: ToastBandProps): import("react").JSX.Element | null;
//# sourceMappingURL=toast-band.d.ts.map