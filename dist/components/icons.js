import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The few glyphs the kit's own parts draw: a check, a chevron, a magnifying
 * glass. Each app has its own icon set and passes its own icons to every
 * part that takes one; these are only for what the kit draws by itself.
 * They are line icons on a 24px grid at a stroke of 2, the weight the apps'
 * own icons use.
 */
function Glyph({ children, ...props }) {
    return (_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false", ...props, children: children }));
}
export function CheckGlyph(props) {
    return (_jsx(Glyph, { ...props, children: _jsx("path", { d: "M20 6 9 17l-5-5" }) }));
}
export function ChevronRightGlyph(props) {
    return (_jsx(Glyph, { ...props, children: _jsx("path", { d: "m9 18 6-6-6-6" }) }));
}
/** The family's magnifying glass: a lens of radius 8, so the four apps draw one icon. */
export function SearchGlyph(props) {
    return (_jsxs(Glyph, { ...props, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("path", { d: "m21 21-4.3-4.3" })] }));
}
//# sourceMappingURL=icons.js.map