"use client";
import { useEffect, useState } from "react";
import { measureToastCover } from "./toast-dock.js";
/**
 * Whether a surface named by `<Toaster cover>` is on screen right now.
 *
 * Version 0.1 looked for one only as a toast arrived, so between toasts the
 * kit did not know a sheet was up: a stack left fanned out stayed fanned
 * under the sheet, and the band behind the sheet still took Tab. The selector
 * is watched instead. It is read again whenever the page changes (a node
 * added or removed, an attribute written, since a selector can turn on
 * either), when a transition or an animation ends, and on resize.
 *
 * A page changes often, so the reads are held to one a frame, and a change
 * inside the toaster itself (`skip`) is not a reason to read: Sonner writes
 * on its cards many times a second while they move.
 *
 * Only while `on`: the phone layout, where a cover hides the bottom bar. A
 * selector the browser can't parse names nothing.
 */
export function useLiveCover(selector, on, skip) {
    const [up, setUp] = useState(false);
    useEffect(() => {
        if (!selector || !on || typeof MutationObserver === "undefined") {
            setUp(false);
            return;
        }
        const read = () => setUp(coverUp(selector));
        let frame;
        const later = () => {
            if (frame !== undefined)
                return;
            frame = window.requestAnimationFrame(() => {
                frame = undefined;
                read();
            });
        };
        const observer = new MutationObserver((records) => {
            const own = skip.current;
            if (own && records.every((record) => own.contains(record.target)))
                return;
            later();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
        document.addEventListener("transitionend", later, true);
        document.addEventListener("animationend", later, true);
        window.addEventListener("resize", later);
        read();
        return () => {
            observer.disconnect();
            document.removeEventListener("transitionend", later, true);
            document.removeEventListener("animationend", later, true);
            window.removeEventListener("resize", later);
            if (frame !== undefined)
                window.cancelAnimationFrame(frame);
        };
    }, [selector, on, skip]);
    return up;
}
/** Whether the selector names a surface on screen. False for one that can't be parsed. */
export function coverUp(selector) {
    try {
        return measureToastCover(selector) !== null;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=use-live-cover.js.map