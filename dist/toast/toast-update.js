import { isValidElement } from "react";
/** The class a pinned toast carries. Named here and re-exported as PINNED_TOAST. */
export const PINNED_CLASS = "toast-pinned";
/** The class of the progress kind (toast.css). Re-exported as PROGRESS_TOAST. */
export const PROGRESS_CLASS = "toast-progress";
/** The plain words of a title: a string, or the text inside the element it is. */
export function textOf(node) {
    if (node === null || node === undefined || typeof node === "boolean")
        return "";
    if (typeof node === "string" || typeof node === "number" || typeof node === "bigint")
        return String(node);
    if (typeof node === "function")
        return textOf(node());
    if (Array.isArray(node))
        return node.map((part) => textOf(part)).join("");
    if (isValidElement(node))
        return textOf(node.props.children);
    return "";
}
function hasClass(toast, name) {
    return (toast.className ?? "").split(/\s+/).includes(name);
}
/**
 * What a toast is and says, as far as an announce cares. `bare` is what a
 * toast with no type counts as: the `<Toaster>`'s default kind when it has
 * one, so a bare toast and a typed one that look alike are one kind.
 */
export function faceOf(toast, bare = "default") {
    const title = textOf(toast.title);
    const description = textOf(toast.description);
    const pinned = hasClass(toast, PINNED_CLASS);
    return {
        type: toast.type ?? bare,
        quiet: toast.type === "loading" || hasClass(toast, PROGRESS_CLASS) || pinned,
        pinned,
        text: description ? `${title}\n${description}` : title,
    };
}
/** Whether a toast that went from `was` to `now` under one id announces again. */
export function announcesUpdate(was, now) {
    if (was.quiet && now.quiet)
        return false;
    if (was.type !== now.type || was.quiet !== now.quiet)
        return true;
    return was.text !== now.text;
}
//# sourceMappingURL=toast-update.js.map