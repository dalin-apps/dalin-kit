export type BackEntry = {
    /**
     * Takes the entry off, for a layer closed from the screen. `then` runs
     * once the entry has gone: at once when the system's back already took it
     * or it was never written, and when the traversal lands otherwise.
     */
    pop: (then?: () => void) => void;
};
/**
 * Pushes one history entry for a layer that has just opened. `onBack` is
 * called when the system's back takes the entry, and never for `pop()`.
 */
export declare function pushBackEntry(onBack: () => void): BackEntry;
//# sourceMappingURL=back-entry.d.ts.map