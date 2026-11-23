/** The app's own reader (`setMotionReader`), and the one a `<Toaster>` derives from its selectors. */
let appReader = null;
let toasterReader = null;
/** Whether the system asks for reduced motion. False where there is no window to ask. */
export function systemReducesMotion() {
    return (typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
/**
 * Names the app's own motion reader: a function that is true while motion
 * is reduced. The band, the swipe and the close fade ask it from then on.
 * Returns the function that takes it away again.
 */
export function setMotionReader(reader) {
    appReader = reader;
    return () => {
        if (appReader === reader)
            appReader = null;
    };
}
/** Called by the `<Toaster>`: the reader its two selectors come to. */
export function setToasterMotionReader(reader) {
    toasterReader = reader;
    return () => {
        if (toasterReader === reader)
            toasterReader = null;
    };
}
/**
 * Whether motion is reduced right now: the app's reader, else the
 * `<Toaster>`'s selectors, else the system's setting.
 */
export function reducesMotion() {
    return (appReader ?? toasterReader ?? systemReducesMotion)();
}
function matches(selector) {
    if (!selector || typeof document === "undefined")
        return false;
    try {
        return document.querySelector(selector) !== null;
    }
    catch {
        // A selector the browser can't parse names nothing.
        return false;
    }
}
/**
 * The rule the `<Toaster>` applies to its two selectors, as a reader: the
 * app's reduce switch always reduces, and the system's setting reduces
 * unless the app's switch says Full. Read live, so it needs no observer.
 */
export function motionReaderFor(reducedSelector, fullSelector) {
    return () => {
        if (matches(reducedSelector))
            return true;
        return systemReducesMotion() && !matches(fullSelector);
    };
}
//# sourceMappingURL=motion.js.map