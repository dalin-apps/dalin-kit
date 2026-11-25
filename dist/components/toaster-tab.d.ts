/** Where the family's toasts live: Sonner's list, which the kit's `<Toaster>` styles. */
export declare const TOASTER = "[data-sonner-toaster]";
/**
 * Lets Tab leave a modal surface for the toaster, and come back.
 *
 * A modal dialog keeps Tab inside itself, which is right for the app behind
 * it and wrong for a toast: one raised while search is open stands over the
 * sheet with an Undo that a pointer can press and a keyboard could not
 * reach. So the toaster joins the surface's tab order, after its last stop:
 * Tab on the last stop goes to the first toast, Tab on the last toast comes
 * back to the surface's first stop, and Shift+Tab runs the same loop the
 * other way. Between a toast's own stops the browser moves as usual.
 *
 * With no toast that can take Tab, nothing changes. A screen reader needs
 * none of this: Base UI leaves a live region out of what it hides. With
 * several surfaces up, the one registered last answers.
 */
export declare function useToasterTab(surface: HTMLElement | null): void;
//# sourceMappingURL=toaster-tab.d.ts.map