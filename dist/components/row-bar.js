import { jsx as _jsx } from "react/jsx-runtime";
import { cx } from "./cx.js";
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
export function RowBar({ share, color, className }) {
    const held = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
    const style = color ? { "--dl-rowbar-c": color } : undefined;
    return (_jsx("span", { "data-slot": "row-bar", className: cx("dl-rowbar", className), "aria-hidden": "true", style: style, children: held > 0 ? _jsx("span", { className: "dl-rowbar-fill", style: { width: `${held * 100}%` } }) : null }));
}
//# sourceMappingURL=row-bar.js.map