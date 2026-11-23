"use client";
import { useSyncExternalStore } from "react";
/**
 * The widest viewport that gets the phone's toast by default: the pill docked
 * behind the bottom bar. An app whose phone shell runs wider names its own
 * width, with `<Toaster phoneMaxWidth>` or with `--dl-phone-max` on `:root`.
 */
export const PHONE_MAX_WIDTH_PX = 767;
/**
 * A phone held on its side: a touch screen too short for the desktop
 * layout, whatever its width (the owner's pick on 2026-11-23). It gets the
 * phone layout in every app. An app joins it to its own width with a comma,
 * in script and in CSS: `(max-width: 767px), (pointer: coarse) and
 * (max-height: 500px)`.
 */
export const PHONE_SIDEWAYS_QUERY = "(pointer: coarse) and (max-height: 500px)";
/** The custom property an app may set on `:root` in place of the prop. */
export const PHONE_MAX_VAR = "--dl-phone-max";
/** The width `<Toaster phoneMaxWidth>` named, which wins over the stylesheet. */
let fromProp = null;
/** The width the app's stylesheet named, read once; undefined until read. */
let fromSheet;
const listeners = new Set();
let unbind = null;
function emit() {
    for (const l of listeners)
        l();
}
function readSheet() {
    if (typeof window === "undefined")
        return null;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(PHONE_MAX_VAR);
    const px = Number.parseFloat(raw);
    return Number.isFinite(px) && px > 0 ? px : null;
}
/** The widest viewport that gets the phone layout right now, in px. */
export function readPhoneMaxWidth() {
    if (fromProp !== null)
        return fromProp;
    if (fromSheet === undefined)
        fromSheet = readSheet();
    return fromSheet ?? PHONE_MAX_WIDTH_PX;
}
/** The phone layout's media query: the width in force, or a phone on its side. */
export function phoneLayoutQuery() {
    return `(max-width: ${readPhoneMaxWidth()}px), ${PHONE_SIDEWAYS_QUERY}`;
}
/** Listens to the media query for the width in force, and only while read. */
function bind() {
    unbind?.();
    unbind = null;
    if (typeof window === "undefined" || listeners.size === 0)
        return;
    const list = window.matchMedia(phoneLayoutQuery());
    list.addEventListener("change", emit);
    unbind = () => list.removeEventListener("change", emit);
}
/**
 * Names the phone width for every reader: the `<Toaster>`, the `<ToastBand>`
 * and `usePhoneLayout`. `<Toaster phoneMaxWidth>` calls it; `null` hands the
 * choice back to `--dl-phone-max`, read again, and then to the default.
 */
export function setPhoneMaxWidth(px) {
    const next = px !== null && Number.isFinite(px) && px > 0 ? px : null;
    if (next === null)
        fromSheet = undefined;
    if (next === fromProp)
        return;
    fromProp = next;
    bind();
    emit();
}
function subscribe(cb) {
    listeners.add(cb);
    if (listeners.size === 1)
        bind();
    return () => {
        listeners.delete(cb);
        if (listeners.size === 0)
            bind();
    };
}
function readClient() {
    return window.matchMedia(phoneLayoutQuery()).matches;
}
function readServer() {
    return false;
}
/**
 * True when the viewport is at or under the phone width, or is a phone held
 * on its side (PHONE_SIDEWAYS_QUERY). SSR-safe: false on the server, then
 * the real value after hydration.
 */
export function usePhoneLayout() {
    return useSyncExternalStore(subscribe, readClient, readServer);
}
//# sourceMappingURL=use-phone-layout.js.map