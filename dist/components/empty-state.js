import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cx } from "./cx.js";
/**
 * An empty place: a large icon and a title, centred in its pane, with no
 * sentence under them. It is the look the owner kept for drive on
 * 2026-11-17 ("just get rid of the subtitles, but leave the large text and
 * icon") and picked for the family on 2026-11-22.
 *
 * There is no subtitle prop on purpose. What the title cannot say in one
 * line belongs in a tooltip or in the place itself once it has something in
 * it.
 *
 * It fills the pane it is put in: a flex child grows to the pane's free
 * space, and a block child takes the pane's height. `empty.css` styles it.
 */
export function EmptyState({ icon, title, action, className }) {
    return (_jsxs("div", { "data-slot": "empty-state", className: cx("dl-empty", className), children: [icon ? (_jsx("span", { className: "dl-empty-icon", "aria-hidden": "true", children: icon })) : null, _jsx("p", { className: "dl-empty-title", children: title }), action ? _jsx("div", { className: "dl-empty-action", children: action }) : null] }));
}
//# sourceMappingURL=empty-state.js.map