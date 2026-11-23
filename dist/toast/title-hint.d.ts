/**
 * A desktop toast's title is one line, and a long one ends in an ellipsis
 * (toast.css). The words cut off stay in the page, so a screen reader still
 * reads the whole title. For the pointer, a cut title carries its full text
 * as a `title` attribute, the browser's own hint; a title that fits carries
 * none, so a short toast shows no hint.
 */
/** Gives each cut title under `root` its full text as a hint, and takes the hint off a title that fits. */
export declare function hintCutTitles(root: ParentNode): void;
/** Keeps the hints right as toasts come, go and change their words. Returns the stop. */
export declare function watchCutTitles(root: Element): () => void;
//# sourceMappingURL=title-hint.d.ts.map