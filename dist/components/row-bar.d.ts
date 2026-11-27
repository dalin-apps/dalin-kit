import type { ReactNode } from "react";
export type RowBarProps = {
    /**
     * This row's value as a fraction of the largest row's, 0 to 1. Every bar
     * in a list is drawn on that one scale, so the rows can be compared.
     */
    share: number;
    /**
     * The bar's colour, where the row has one of its own: a mailbox's, a
     * calendar's, a source's. Without it the bar is the app's accent.
     */
    color?: string;
    className?: string;
};
/**
 * A bar inside a row, beside the figure it draws.
 *
 * The owner picked it on 2026-11-27 for every list that compares amounts:
 * drive's kinds and largest files, notes' library, mail's mailboxes,
 * calendar's hours. It replaced the split bar with a key of coloured
 * squares under it, which needed decoding and labelled nothing.
 *
 * The bar is decoration for the figure beside it, so a screen reader skips
 * it and reads the figure. A row holding nothing keeps the track and draws
 * no fill. A row holding anything draws at least 2px.
 *
 * `data.css` styles it. The row's own layout decides where it sits: between
 * the name and the figure on a computer, on a line of its own on a phone.
 */
export declare function RowBar({ share, color, className }: RowBarProps): ReactNode;
//# sourceMappingURL=row-bar.d.ts.map