/** The kinds a bare toast may be given: the four with a colour and an icon of their own. */
export type ToastDefaultKind = "info" | "success" | "warning" | "error";
/**
 * The class of the progress kind, for a plain toast that carries it itself
 * (with `<ToastSpinner>` as its icon). `toast.loading()` needs neither.
 */
export declare const PROGRESS_TOAST = "toast-progress";
/**
 * The class that pins a toast: `toast("Sending in 5s", { className: PINNED_TOAST })`.
 * A pinned toast stays in view until it is dismissed or replaced: out from
 * the desktop's edge instead of tucking to a tab, and above the phone's dock
 * with its button pressable instead of diving behind the pill. For a toast
 * whose button is the point of it, such as a send counting down with Undo.
 * Give it `duration: Infinity` and dismiss it yourself, or update it in place
 * without the class to let it go.
 */
export declare const PINNED_TOAST = "toast-pinned";
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
export declare function Toaster({ gateOpen, phoneMaxWidth, className: appClassName, cover, scrim, onScrimTuck, defaultKind, reducedMotionSelector, reducedTransparencySelector, }: ToasterProps): import("react").JSX.Element;
//# sourceMappingURL=toaster.d.ts.map