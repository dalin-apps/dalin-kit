/** Joins class names, dropping what is empty. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * The kit's class beside the app's own, for a Base UI part. Base UI takes a
 * class name as a string or as a function of the part's state, so the app's
 * may be either, and what goes back is the same kind.
 */
export function withClass<State>(
  base: string,
  className: string | ((state: State) => string | undefined) | undefined,
): string | ((state: State) => string | undefined) {
  if (typeof className === "function") return (state: State) => cx(base, className(state));
  return cx(base, className);
}
