/**
 * Whether a state the app names is on: a selector that matches somewhere in
 * the document (`html[data-motion="reduce"]`), or a media query of the
 * system's that matches, or both.
 *
 * Each app keeps its own switch for reduced motion and for transparency, on
 * its own attribute, and a stylesheet cannot be handed a selector. So the
 * `<Toaster>` is handed it instead, reads it here, and writes one class of
 * its own for toast.css to key on. The selector is read again whenever an
 * attribute on `<html>` or `<body>` changes, which is where every app's
 * switch lives.
 */
export declare function useNamedState(selector: string | undefined, media: string | undefined): boolean;
//# sourceMappingURL=use-named-state.d.ts.map