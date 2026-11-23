"use client";
import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
/**
 * Room an announce needs above a line: the pill-sized toast at its 1.1
 * announce scale, the 12px it stands off the line, and a notch's worth of
 * status bar. A sheet that fills the screen never leaves this much.
 */
const ANNOUNCE_GAP_PX = 12;
const ANNOUNCE_HEADROOM_PX = 76;
const ANNOUNCE_SCALE = 1.1;
const FALLBACK_BAR_H_PX = 58;
const entries = new Map();
const listeners = new Set();
let seq = 0;
let current = null;
function emit() {
    for (const l of listeners)
        l();
}
function subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}
function winner() {
    let best = null;
    for (const entry of entries.values()) {
        if (!best || entry.rank > best.rank || (entry.rank === best.rank && entry.seq > best.seq))
            best = entry;
    }
    return best;
}
function barHeight() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--dl-bar-h");
    return Number.parseFloat(raw) || FALLBACK_BAR_H_PX;
}
/**
 * The line a toast can announce above, given where the dock's edge is: the
 * edge itself when the strip over it has room for a toast, else 0. Pure, so
 * the rule is tested without a layout.
 */
export function dockLine(edgeFromBottom, viewportHeight, barH) {
    const line = Math.max(0, Math.round(edgeFromBottom));
    const needed = barH * ANNOUNCE_SCALE + ANNOUNCE_GAP_PX + ANNOUNCE_HEADROOM_PX;
    return viewportHeight - line >= needed ? line : 0;
}
function measure(entry) {
    if (entry.line !== undefined)
        return dockLine(entry.line, window.innerHeight, barHeight());
    if (!entry.el)
        return 0;
    const rect = entry.el.getBoundingClientRect();
    const y = entry.edge === "top" ? rect.top : rect.bottom;
    return dockLine(window.innerHeight - y, window.innerHeight, barHeight());
}
function apply() {
    const dock = winner();
    const next = !dock || dock.kind === "pill" ? null : { kind: dock.kind, line: measure(dock) };
    if (next?.kind === current?.kind && next?.line === current?.line)
        return;
    current = next;
    emit();
}
/** Measures the winning dock again. The `<Toaster>` calls it as each toast arrives. */
export function refreshToastDock() {
    if (typeof window === "undefined")
        return;
    apply();
}
/**
 * The cover named by a selector, measured now: the highest top edge among the
 * matching surfaces that are on screen, or null with none up. This is what
 * `<Toaster cover>` reads as each toast arrives, for an app that would rather
 * name its sheets and dialogs once than register each as a dock. A copy still
 * fading out (`data-dl-leaving`, the kit's close fade) covers nothing.
 *
 * `skip` is a selector for the app's own exit copies, for an app that leaves
 * them with an attribute of its own (drive's `[data-ghost]`,
 * `<Toaster coverSkip>`). A surface that matches it, or sits inside one that
 * does, covers nothing either.
 */
export function measureToastCover(selector, skip) {
    if (typeof document === "undefined")
        return null;
    let top = Number.POSITIVE_INFINITY;
    for (const el of document.querySelectorAll(selector)) {
        if (el.closest("[data-dl-leaving]"))
            continue;
        if (skip && inside(el, skip))
            continue;
        const rect = el.getBoundingClientRect();
        if (rect.height > 0)
            top = Math.min(top, rect.top);
    }
    if (top === Number.POSITIVE_INFINITY)
        return null;
    return { kind: "cover", line: dockLine(window.innerHeight - top, window.innerHeight, barHeight()) };
}
/** Whether `el` matches the selector or sits inside a match. A selector the browser can't parse names nothing. */
function inside(el, selector) {
    try {
        return el.closest(selector) !== null;
    }
    catch {
        return false;
    }
}
/** The dock the toaster draws now, or null while it is the pill. */
export function readToastDock() {
    return current;
}
/**
 * Whether there is a pill on the page to dock behind.
 *
 * The pill is the dock "with nothing registered", but a phone page with no
 * bottom bar at all (a sign-in page, a guest page) has no pill either, and
 * a toast docked there took a pill's footprint at the bottom of an empty
 * screen and tucked behind nothing. So each thing that only exists beside a
 * bar counts one pill while it is mounted: the pill's swipe
 * (`useStackSwipe` with zone "pill"), the `<ToastBand>`, and a dock
 * registered as "pill". With none, the `<Toaster>` shows a plain toast.
 */
let pills = 0;
/** Counts one pill on the page until the returned function is called. */
export function registerToastPill() {
    pills++;
    if (pills === 1)
        emit();
    let counted = true;
    return () => {
        if (!counted)
            return;
        counted = false;
        pills--;
        if (pills === 0)
            emit();
    };
}
/** Whether a bottom bar has said its pill is on the page. */
export function readToastPill() {
    return pills > 0;
}
function readPillOnServer() {
    return false;
}
/** Whether a bottom bar has said its pill is on the page. */
export function useToastPill() {
    return useSyncExternalStore(subscribe, readToastPill, readPillOnServer);
}
/**
 * Counts a pill while the caller is mounted and `on`. A layout effect, so a
 * bar that mounts in the same commit as a toast is counted before that
 * commit is painted, and the toast never shows one frame in the plain
 * layout.
 */
export function useToastPillPresence(on = true) {
    useLayoutEffect(() => {
        if (!on)
            return;
        return registerToastPill();
    }, [on]);
}
/**
 * Whether a surface named by `<Toaster cover>` is on screen. The `<Toaster>`
 * watches its selector and writes the answer here, so the band, which an app
 * mounts elsewhere, can read it.
 */
let named = false;
/** Called by the `<Toaster>` as the cover its selector names comes and goes. */
export function setNamedToastCover(up) {
    if (named === up)
        return;
    named = up;
    emit();
}
/**
 * Whether a cover hides the phone's bottom bar now: a dock registered as
 * "cover" is the winner, or a surface named by `<Toaster cover>` is up.
 */
export function readToastCovered() {
    return named || current?.kind === "cover";
}
function readCoveredOnServer() {
    return false;
}
/** Whether a cover hides the phone's bottom bar now. */
export function useToastCovered() {
    return useSyncExternalStore(subscribe, readToastCovered, readCoveredOnServer);
}
function readServer() {
    return null;
}
/** The dock the toaster draws now, or null while it is the pill. */
export function useToastDockState() {
    return useSyncExternalStore(subscribe, readToastDock, readServer);
}
/** The kind of surface phone toasts dock to now: "pill" with nothing else registered. */
export function useToastDockKind() {
    return useToastDockState()?.kind ?? "pill";
}
/**
 * Registers a dock outside React. Returns the function that takes it away.
 * `el` may be null when `options.line` names a fixed line.
 */
export function registerToastDock(el, options = {}) {
    const key = Symbol("dock");
    const pill = options.kind === "pill" ? registerToastPill() : null;
    entries.set(key, {
        el,
        kind: options.kind ?? "line",
        rank: options.rank ?? 0,
        edge: options.edge ?? "top",
        line: options.line,
        seq: ++seq,
    });
    apply();
    // A sheet that slides in is measured again when its transition ends, since
    // the first measurement lands mid-slide.
    const observer = el && typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    if (el)
        observer?.observe(el);
    el?.addEventListener("transitionend", apply);
    window.addEventListener("resize", apply);
    return () => {
        entries.delete(key);
        pill?.();
        observer?.disconnect();
        el?.removeEventListener("transitionend", apply);
        window.removeEventListener("resize", apply);
        apply();
    };
}
/**
 * Registers `ref`'s element as a toast dock while it is mounted and
 * `options.active` is not false. Call it from each surface that owns the
 * bottom of the phone screen: the bar ("pill"), a parked chip ("line"), a
 * sheet or dialog ("cover").
 */
export function useToastDock(ref, options = {}) {
    const { kind = "line", rank = 0, edge = "top", line, active = true } = options;
    // A registered pill is a pill on the page, from the commit it mounts in.
    useToastPillPresence(kind === "pill" && active);
    useEffect(() => {
        const el = ref?.current ?? null;
        if (!active || (!el && line === undefined))
            return;
        return registerToastDock(el, { kind, rank, edge, line });
    }, [ref, kind, rank, edge, line, active]);
}
//# sourceMappingURL=toast-dock.js.map