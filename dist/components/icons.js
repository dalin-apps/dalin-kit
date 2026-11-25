import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The few glyphs the kit's own parts draw: a check, two chevrons, an X, a
 * magnifying glass and the filter. Each app has its own icon set and passes its own icons to every
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
export function ChevronLeftGlyph(props) {
    return (_jsx(Glyph, { ...props, children: _jsx("path", { d: "m15 18-6-6 6-6" }) }));
}
export function ChevronRightGlyph(props) {
    return (_jsx(Glyph, { ...props, children: _jsx("path", { d: "m9 18 6-6-6-6" }) }));
}
/** The X that closes a sheet drawn as a dialog. */
export function CloseGlyph(props) {
    return (_jsxs(Glyph, { ...props, children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }));
}
/** The family's magnifying glass: a lens of radius 8, so the four apps draw one icon. */
export function SearchGlyph(props) {
    return (_jsxs(Glyph, { ...props, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("path", { d: "m21 21-4.3-4.3" })] }));
}
/** The filled form's stroke: lines have no inside to fill, so they get heavier. */
export const FILTER_FILLED_STROKE = 2.7;
/**
 * The family's filter: three lines that shorten as they go down, the list
 * getting smaller (the owner's pick on 2026-11-24, over two sliders and a
 * funnel). Lines have no inside, so its filled form draws them heavier.
 * `<FilterMenu>` switches to that form itself, in filter.css.
 */
export function FilterGlyph({ filled = false, ...props }) {
    return (_jsx(Glyph, { "data-filled": filled ? "" : undefined, strokeWidth: filled ? FILTER_FILLED_STROKE : 2, ...props, children: _jsx("path", { d: "M4 6.5h16M7 12h10M10 17.5h4" }) }));
}
//# sourceMappingURL=icons.js.map