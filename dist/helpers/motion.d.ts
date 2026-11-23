/**
 * Whether motion is reduced right now, asked in one place.
 *
 * Each app has its own motion switch, and four parts of the kit need its
 * answer: the toast, the band, the pill's swipe and the close fade. The
 * toast takes the switch as selectors (`<Toaster reducedMotionSelector
 * fullMotionSelector>`), because a stylesheet needs a class. The other three
 * are script and each took a reader of its own, so an app handed the same
 * answer over three more times, and one it forgot fell back to the system's
 * setting.
 *
 * So the answer is kept here. With nothing said it is the system's setting.
 * A `<Toaster>` that names the app's switch answers from those selectors, so
 * an app that has told the toast has told the rest. An app whose switch is
 * not a selector (or that mounts no toaster) calls `setMotionReader` once
 * with its own reader, and that reader wins over the toaster's.
 *
 * Every part still takes its own `reducedMotion` option, which wins over all
 * of this for that part alone.
 */
type Reader = () => boolean;
/** Whether the system asks for reduced motion. False where there is no window to ask. */
export declare function systemReducesMotion(): boolean;
/**
 * Names the app's own motion reader: a function that is true while motion
 * is reduced. The band, the swipe and the close fade ask it from then on.
 * Returns the function that takes it away again.
 */
export declare function setMotionReader(reader: Reader | null): () => void;
/** Called by the `<Toaster>`: the reader its two selectors come to. */
export declare function setToasterMotionReader(reader: Reader | null): () => void;
/**
 * Whether motion is reduced right now: the app's reader, else the
 * `<Toaster>`'s selectors, else the system's setting.
 */
export declare function reducesMotion(): boolean;
/**
 * The rule the `<Toaster>` applies to its two selectors, as a reader: the
 * app's reduce switch always reduces, and the system's setting reduces
 * unless the app's switch says Full. Read live, so it needs no observer.
 */
export declare function motionReaderFor(reducedSelector: string | undefined, fullSelector: string | undefined): Reader;
/**
 * The attribute the kit's own stylesheets read the app's motion choice from,
 * on `<html>`: `data-dl-motion="reduce"` or `data-dl-motion="full"`.
 *
 * A stylesheet cannot be handed a selector, and each app keeps its switch on
 * an attribute of its own (`data-motion="reduce"`, `data-motion="reduced"`,
 * `data-reduced-motion`). So the kit writes one of its own, and menu.css,
 * palette.css and wordmark.css key on that: Reduce stills the menus, the
 * popovers, the palette and the wordmark's roll, and Full keeps them moving
 * on a machine that asks for less. With neither, the system's setting
 * decides.
 *
 * It is an attribute and not a class because React owns `<html>`'s class
 * and never touches an attribute it did not set.
 */
export declare const MOTION_ATTR = "data-dl-motion";
/** What the app's own switch says. `null` is no choice: the system's setting decides. */
export type MotionChoice = "reduce" | "full" | null;
/**
 * Writes the app's motion choice on `<html>`. A `<Toaster>` that names the
 * app's selectors does this itself, as the switch changes, so an app that
 * told the toast calls nothing. An app whose switch is not a selector (the
 * one that calls `setMotionReader`) calls this as its switch changes.
 */
export declare function setMotionAttr(choice: MotionChoice): void;
export {};
//# sourceMappingURL=motion.d.ts.map