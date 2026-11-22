/**
 * Takes every tab stop under `root` out of the tab order (tabindex -1), the
 * ones that arrive later included, until the returned release puts each back
 * as it was. Unlike `inert`, nothing leaves the accessibility tree, so a live
 * region inside keeps announcing what arrives in it.
 *
 * `except` is a selector for what stays reachable: a stop that matches it, or
 * sits inside something that does, is left alone, and is given back if it
 * starts to match while held.
 */
export declare function holdTabStops(root: HTMLElement, except?: string): () => void;
//# sourceMappingURL=tab-stops.d.ts.map