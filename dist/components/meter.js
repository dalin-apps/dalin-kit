import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cx } from "./cx.js";
import { fillLevel, fillPercent, fillWord } from "../helpers/fill-level.js";
/** What a level of a meter that doesn't warn reads as: always fine. */
function levelOf(share, warns) {
    return warns ? fillLevel(share) : "ok";
}
/**
 * How full something is, as one bar.
 *
 * The four apps each had a meter, and they had drifted: drive warned at 80%
 * and 95%, the other three went red at 90%, and drive's status bar never
 * changed colour at all. This is the one meter, on drive's thresholds
 * (`fillLevel`), with a name a screen reader can say.
 *
 * An empty place draws no fill. A place holding anything draws at least a
 * sliver, so "empty" and "nearly empty" never look the same.
 *
 * `data.css` styles it.
 */
export function Meter({ share, label, valueText, color, warns = true, thin = false, className }) {
    const held = typeof share === "number" && Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
    const percent = fillPercent(held);
    const level = levelOf(held, warns);
    const style = color ? { "--dl-meter-c": color } : undefined;
    return (_jsxs("span", { "data-slot": "meter", className: cx("dl-meter", thin && "dl-meter--thin", className), "data-level": level === "ok" ? undefined : level, role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": percent, "aria-valuetext": valueText ?? (held > 0 && held < 0.005 ? "under 1 percent" : `${percent} percent`), "aria-label": label, style: style, children: [_jsxs("span", { className: "dl-meter-track", children: [held > 0 ? _jsx("span", { className: "dl-meter-fill", style: { width: `${Math.max(1, held * 100)}%` } }) : null, thin && warns ? _jsx("span", { className: "dl-meter-tick" }) : null] }), thin ? (_jsx("span", { className: "dl-meter-pct", "aria-hidden": "true", children: held > 0 && held < 0.005 ? "<1%" : `${percent}%` })) : null] }));
}
/**
 * The word beside a meter: "Nearly full" from 80%, "Full" from 95%, and
 * nothing before that. It wears the level's colour, lifted far enough to
 * read as small text on a card.
 */
export function MeterWord({ share, className }) {
    const level = fillLevel(share);
    const word = fillWord(level);
    if (!word)
        return null;
    return (_jsx("span", { "data-slot": "meter-word", className: cx("dl-meter-word", className), "data-level": level, children: word }));
}
//# sourceMappingURL=meter.js.map