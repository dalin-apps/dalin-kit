import { type RefObject } from "react";
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
 * selector the browser can't parse names nothing. `ghosts` is the app's
 * selector for its own exit copies (`<Toaster coverSkip>`), which cover
 * nothing.
 */
export declare function useLiveCover(selector: string | undefined, on: boolean, skip: RefObject<HTMLElement | null>, ghosts?: string): boolean;
/** Whether the selector names a surface on screen. False for one that can't be parsed. */
export declare function coverUp(selector: string, ghosts?: string): boolean;
//# sourceMappingURL=use-live-cover.d.ts.map