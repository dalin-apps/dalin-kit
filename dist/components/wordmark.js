import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { dalinApp } from "./apps.js";
/**
 * The family's wordmark: "dalin" in Georgia, the period in the app's accent,
 * and the app's name in italic, as each app's sidebar drew it by hand. One
 * image to a screen reader, named "dalin. mail".
 *
 * It is drawn at the size the app sets and carries no layout of its own: no
 * height, no padding, no margin. The sidebar's header and the phone's title
 * row place it. `wordmark.css` styles it.
 */
export function Wordmark({ app, size, accent, folded = false, rollOut = false, className, style }) {
    const info = dalinApp(app);
    const dot = accent === "own" ? info.accent : accent;
    const css = { ...style };
    if (size !== undefined)
        css.fontSize = typeof size === "number" ? `${size}px` : size;
    if (dot)
        css["--dl-wordmark-dot"] = dot;
    return (_jsxs("span", { role: "img", "aria-label": `dalin. ${info.name}`, "data-slot": "wordmark", "data-app": app, "data-folded": folded ? "" : undefined, "data-roll": rollOut && !folded ? "" : undefined, className: className ? `dl-wordmark ${className}` : "dl-wordmark", style: css, children: [_jsx("span", { "aria-hidden": "true", children: "d" }), _jsx("span", { "aria-hidden": "true", className: "dl-wordmark-rest", children: "alin" }), _jsx("span", { "aria-hidden": "true", className: "dl-wordmark-dot", children: "." }), _jsx("span", { "aria-hidden": "true", className: "dl-wordmark-product-wrap", children: _jsx("span", { className: "dl-wordmark-product", children: info.name }) })] }));
}
//# sourceMappingURL=wordmark.js.map