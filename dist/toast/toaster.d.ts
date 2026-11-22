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
export declare function Toaster({ gateOpen, phoneMaxWidth }: ToasterProps): import("react").JSX.Element;
//# sourceMappingURL=toaster.d.ts.map