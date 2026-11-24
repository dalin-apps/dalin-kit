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
export declare const SEG_SLIDE_ATTR = "data-dl-seg-slide";
/** Writes the picked segment's box on the group. False when nothing is
 *  picked, or when the group isn't drawn (a hidden page measures 0 wide, and
 *  a lift placed there would slide in from the edge once it shows). */
export declare function placeSegLift(group: HTMLElement): boolean;
/**
 * Starts the sliding lift on a `.dl-seg` group and returns the function that
 * stops it. Takes null, as a ref callback can be handed, and does nothing then.
 */
export declare function slideSegLift(group: HTMLElement | null): (() => void) | undefined;
//# sourceMappingURL=seg-slide.d.ts.map