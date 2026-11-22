import { type StackSwipeHost } from "./use-stack-swipe.js";
/** The app's side of the band: its nav pill, its haptic tick, its motion switch. */
export type ToastBandProps = StackSwipeHost;
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
 * Out of the tab order on purpose: it's a full-viewport-width touch target,
 * so a sighted keyboard user tabbing a narrow window would land on it and
 * see the app's focus ring drawn as a rectangle across the whole screen
 * bottom, and the button mounts and unmounts with the toast stack, so it
 * would also shift the tab order mid-session. It's a touch-only duplicate of
 * a path Sonner already exposes to keyboard users on its own terms (the
 * toaster region is reachable through Sonner's own hotkey, whatever this
 * button's state), so removing it from Tab costs a keyboard user nothing.
 * `aria-hidden` pairs with `tabIndex={-1}` (never one without the other) so
 * it's also silent to a screen reader's swipe navigation, since it's a large
 * invisible rect whose only job is a touch gesture the toast stack's own
 * aria-live region doesn't need.
 */
export declare function ToastBand({ pill, onTick, reducedMotion }: ToastBandProps): import("react").JSX.Element | null;
//# sourceMappingURL=toast-band.d.ts.map