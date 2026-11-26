/** The class that settles a phone tab's glyph (phone.css). */
export declare const TAB_SETTLE_CLASS = "dl-tab-settle";
/**
 * Settles the glyph of the phone tab being opened: it grows from 0.9 to 1
 * over `--dl-t-tab-settle` (140ms) on the family's curve, as it fills (the
 * owner's pick on 2026-11-25). The tab's tint and colour keep their own
 * transition. Call it from the tap that opens the tab, with the tab's glyph,
 * and not for a tab that was already open, which plays nothing.
 *
 * It plays from its first frame each time, so two quick taps settle twice.
 * Nothing plays when the tab was opened from the keyboard or while motion is
 * reduced, and the class is gone once the settle ends, so nothing runs at
 * rest. Returns whether it played.
 */
export declare function settleTab(glyph: Element | null | undefined, options?: {
    reducedMotion?: () => boolean;
}): boolean;
//# sourceMappingURL=tab-settle.d.ts.map