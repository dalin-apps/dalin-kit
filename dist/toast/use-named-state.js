"use client";
import { useEffect, useState } from "react";
/**
 * Whether a state the app names is on: a selector that matches somewhere in
 * the document (`html[data-motion="reduce"]`), or a media query of the
 * system's that matches, or both.
 *
 * Each app keeps its own switch for reduced motion and for transparency, on
 * its own attribute, and a stylesheet cannot be handed a selector. So the
 * `<Toaster>` is handed it instead, reads it here, and writes one class of
 * its own for toast.css to key on. The selector is read again whenever an
 * attribute on `<html>` or `<body>` changes, which is where every app's
 * switch lives.
 */
export function useNamedState(selector, media) {
    const [on, setOn] = useState(false);
    useEffect(() => {
        const list = media ? window.matchMedia(media) : null;
        const read = () => {
            let named = false;
            if (selector) {
                try {
                    named = document.querySelector(selector) !== null;
                }
                catch {
                    // A selector the browser can't parse names nothing.
                }
            }
            setOn(named || (list?.matches ?? false));
        };
        read();
        const observer = selector && typeof MutationObserver !== "undefined" ? new MutationObserver(read) : null;
        observer?.observe(document.documentElement, { attributes: true });
        observer?.observe(document.body, { attributes: true });
        list?.addEventListener("change", read);
        return () => {
            observer?.disconnect();
            list?.removeEventListener("change", read);
        };
    }, [selector, media]);
    return on;
}
//# sourceMappingURL=use-named-state.js.map