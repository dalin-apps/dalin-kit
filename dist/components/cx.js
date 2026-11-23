/** Joins class names, dropping what is empty. */
export function cx(...parts) {
    return parts.filter(Boolean).join(" ");
}
/**
 * The kit's class beside the app's own, for a Base UI part. Base UI takes a
 * class name as a string or as a function of the part's state, so the app's
 * may be either, and what goes back is the same kind.
 */
export function withClass(base, className) {
    if (typeof className === "function")
        return (state) => cx(base, className(state));
    return cx(base, className);
}
//# sourceMappingURL=cx.js.map