/**
 * A desktop toast's title is one line, and a long one ends in an ellipsis
 * (toast.css). The words cut off stay in the page, so a screen reader still
 * reads the whole title. For the pointer, a cut title carries its full text
 * as a `title` attribute, the browser's own hint; a title that fits carries
 * none, so a short toast shows no hint.
 */
/** The attribute that marks a `title` this helper wrote, so it never takes one an app set. */
const MARK = "data-dl-title-hint";
const TITLES = "[data-sonner-toast] [data-title]";
/** An Undo line shortens its name, not the title box, so the name is what gets cut. */
const CUT_PARTS = ".toast-line-name";
const cut = (el) => el.scrollWidth > el.clientWidth;
/** Gives each cut title under `root` its full text as a hint, and takes the hint off a title that fits. */
export function hintCutTitles(root) {
    for (const title of root.querySelectorAll(TITLES)) {
        const ours = title.hasAttribute(MARK);
        if (title.hasAttribute("title") && !ours)
            continue;
        const words = (title.textContent ?? "").replace(/\s+/g, " ").trim();
        const isCut = cut(title) || [...title.querySelectorAll(CUT_PARTS)].some(cut);
        if (isCut && words) {
            if (title.getAttribute("title") !== words)
                title.setAttribute("title", words);
            title.setAttribute(MARK, "");
        }
        else if (ours) {
            title.removeAttribute("title");
            title.removeAttribute(MARK);
        }
    }
}
/** Keeps the hints right as toasts come, go and change their words. Returns the stop. */
export function watchCutTitles(root) {
    hintCutTitles(root);
    let frame = 0;
    const observer = new MutationObserver(() => {
        // Once per frame, after the toasts' own changes have landed.
        if (frame)
            return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            hintCutTitles(root);
        });
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
        observer.disconnect();
        if (frame)
            cancelAnimationFrame(frame);
    };
}
//# sourceMappingURL=title-hint.js.map