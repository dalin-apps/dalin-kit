"use client";
import { useSyncExternalStore } from "react";
/**
 * The widest viewport that gets the phone's toast: the pill docked behind the
 * bottom bar. `toast.css` switches layouts at the same width in its media
 * queries, so the two must change together.
 */
export const PHONE_MAX_WIDTH_PX = 767;
const QUERY = `(max-width: ${PHONE_MAX_WIDTH_PX}px)`;
function subscribe(cb) {
    if (typeof window === "undefined")
        return () => { };
    const mql = window.matchMedia(QUERY);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
}
function readClient() {
    return window.matchMedia(QUERY).matches;
}
function readServer() {
    return false;
}
/**
 * True when the viewport is at or under the phone width. SSR-safe: false on
 * the server, then the real value after hydration.
 */
export function usePhoneLayout() {
    return useSyncExternalStore(subscribe, readClient, readServer);
}
//# sourceMappingURL=use-phone-layout.js.map