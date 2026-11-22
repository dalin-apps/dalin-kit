import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * An Undo toast's line: the item's name, then what happened to it ("Gate code
 * archived"), so two toasts waiting in the phone's stack say which Undo brings
 * back which item. The name leads because it is what tells them apart, and it
 * is the part that shortens when the line is too long (`.toast-line` in
 * toast.css), so the verb and the button always show whole.
 */
export function toastLine(name, verb) {
    return (_jsxs("span", { className: "toast-line", children: [_jsx("span", { className: "toast-line-name", children: name }), _jsxs("span", { className: "toast-line-verb", children: [" ", verb] })] }));
}
//# sourceMappingURL=toast-line.js.map