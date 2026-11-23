/** Joins class names, dropping what is empty. */
export declare function cx(...parts: Array<string | false | null | undefined>): string;
/**
 * The kit's class beside the app's own, for a Base UI part. Base UI takes a
 * class name as a string or as a function of the part's state, so the app's
 * may be either, and what goes back is the same kind.
 */
export declare function withClass<State>(base: string, className: string | ((state: State) => string | undefined) | undefined): string | ((state: State) => string | undefined);
//# sourceMappingURL=cx.d.ts.map