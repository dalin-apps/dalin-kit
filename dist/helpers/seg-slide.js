/**
 * The segmented control's sliding lift (seg.css). Without it the picked
 * segment draws its own lift and a new pick jumps there. With it the track
 * draws one lift and slides it under the new pick, as notes' Share switch
 * did (the owner's pick on 2026-11-23).
 *
 * The segments are as wide as their words, so the lift is measured, not
 * computed: the picked segment's box is written on the group as
 * --dl-seg-x, --dl-seg-y, --dl-seg-w and --dl-seg-h, and seg.css places the
 * track's ::before there. It measures again when a pick changes and when the
 * group resizes (a font that loads late, a narrower window).
 *
 * Use it as a ref on the group. React 19 runs the cleanup it returns:
 *
 *   <span className="st-seg dl-seg" role="radiogroup" ref={slideSegLift}>
 *
 * The first placement lands at once; only later picks slide. Before it runs
 * (the server's markup, a first paint) the picked segment draws its own
 * lift, in the same place, so nothing moves when it takes over.
 */
export const SEG_SLIDE_ATTR = "data-dl-seg-slide";
const PICKED = '.dl-seg-option[aria-checked="true"]';
/** Writes the picked segment's box on the group. False when nothing is
 *  picked, or when the group isn't drawn (a hidden page measures 0 wide, and
 *  a lift placed there would slide in from the edge once it shows). */
export function placeSegLift(group) {
    const picked = group.querySelector(PICKED);
    if (!picked || picked.offsetWidth === 0)
        return false;
    group.style.setProperty("--dl-seg-x", `${picked.offsetLeft}px`);
    group.style.setProperty("--dl-seg-y", `${picked.offsetTop}px`);
    group.style.setProperty("--dl-seg-w", `${picked.offsetWidth}px`);
    group.style.setProperty("--dl-seg-h", `${picked.offsetHeight}px`);
    return true;
}
/**
 * Starts the sliding lift on a `.dl-seg` group and returns the function that
 * stops it. Takes null, as a ref callback can be handed, and does nothing then.
 */
export function slideSegLift(group) {
    if (!group || typeof window === "undefined")
        return undefined;
    let frame = 0;
    const update = () => {
        if (!placeSegLift(group)) {
            group.removeAttribute(SEG_SLIDE_ATTR);
            return;
        }
        if (group.hasAttribute(SEG_SLIDE_ATTR))
            return;
        // Placed with no transition, then live from the next frame, so the lift
        // never slides in from the track's left edge.
        group.setAttribute(SEG_SLIDE_ATTR, "placed");
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            if (group.hasAttribute(SEG_SLIDE_ATTR))
                group.setAttribute(SEG_SLIDE_ATTR, "live");
        });
    };
    update();
    const picks = new MutationObserver(update);
    picks.observe(group, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-checked"] });
    const size = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    size?.observe(group);
    return () => {
        cancelAnimationFrame(frame);
        picks.disconnect();
        size?.disconnect();
        group.removeAttribute(SEG_SLIDE_ATTR);
        for (const name of ["--dl-seg-x", "--dl-seg-y", "--dl-seg-w", "--dl-seg-h"])
            group.style.removeProperty(name);
    };
}
//# sourceMappingURL=seg-slide.js.map