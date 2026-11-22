"use client";
import { useSyncExternalStore } from "react";
/**
 * Tiny module-level store shared by the phone's toast stack, the tap band
 * (toast-band.tsx), the swipe on the nav pill (use-stack-swipe.ts) and the
 * always-mounted `<Toaster>`. Holds two facts:
 *   - `expanded`: whether the stack is fanned out above the nav pill.
 *   - `count`: how many toasts are live, mirrored from the `<Toaster>` (it
 *     owns the authoritative `useSonner` subscription).
 *
 * On the phone a toast announces above the bottom bar's nav pill and then
 * slots in behind it, so the pill reads as the front card of the stack (see
 * `toast.css`). There's no hover on touch, so the user fans the stack out by
 * tapping the dead space around the bar (the band) or by swiping up on the
 * pill.
 *
 * Why `count` lives here rather than the band reading `useSonner` itself: an
 * app may mount the band only where its bottom bar shows, so the band can
 * remount in the middle of a session, and `useSonner` does NOT replay
 * already-live toasts to a subscriber that mounts late. A toast created
 * during that remount would be invisible to the band's own hook, so the band
 * would never mount and a tap would do nothing. The Toaster lives at the
 * layout root and never unmounts, so the count it pushes here is always
 * right, and the band is correct the instant it mounts.
 */
let expanded = false;
let count = 0;
const listeners = new Set();
function emit() {
    for (const l of listeners)
        l();
}
function subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}
export function setToastsExpanded(value) {
    if (expanded === value)
        return;
    expanded = value;
    emit();
}
export function toggleToastsExpanded() {
    setToastsExpanded(!expanded);
}
function getExpanded() {
    return expanded;
}
/** Whether the stack is fanned out now, for a gesture deciding on the way down. */
export function readToastsExpanded() {
    return expanded;
}
/** How many toasts are live now, for a gesture deciding whether there is a stack. */
export function readToastCount() {
    return count;
}
export function useToastsExpanded() {
    return useSyncExternalStore(subscribe, getExpanded, () => false);
}
export function setToastCount(value) {
    if (count === value)
        return;
    count = value;
    emit();
}
function getCount() {
    return count;
}
export function useToastCount() {
    return useSyncExternalStore(subscribe, getCount, () => 0);
}
//# sourceMappingURL=toast-stack.js.map