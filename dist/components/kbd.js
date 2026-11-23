import { jsx as _jsx } from "react/jsx-runtime";
import { cx } from "./cx.js";
/**
 * A keycap: drive's and notes' shortcut hint. One cap per key, raised by a
 * thicker bottom edge (`.dl-kbd-key` in menu.css). It is a static hint with
 * no press of its own, since it sits inside a row that is already the
 * target. `data-slot="kbd"` is what a stylesheet hides on touch, where a key
 * means nothing; menu.css does that inside a menu.
 *
 * Build a chord's keys for the platform with `shortcutLabel` or pass them
 * as written: `<Kbd keys={["Ctrl", "K"]} />`, `<Kbd>E</Kbd>`.
 */
export function Kbd({ keys, children, className }) {
    const caps = keys && keys.length > 0 ? keys : null;
    if (!caps && (children === null || children === undefined || children === false))
        return null;
    return (_jsx("span", { "data-slot": "kbd", className: cx("dl-kbd", className), children: caps ? (caps.map((key, index) => (_jsx("kbd", { "data-slot": "kbd-key", className: "dl-kbd-key", children: key }, index)))) : (_jsx("kbd", { "data-slot": "kbd-key", className: "dl-kbd-key", children: children })) }));
}
//# sourceMappingURL=kbd.js.map