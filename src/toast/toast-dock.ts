"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore, type RefObject } from "react";

/**
 * Where the phone's toasts dock.
 *
 * By default that is the nav pill: a toast announces above the bottom bar and
 * tucks in behind it. But the bottom of the usable area is not always the bar.
 * A parked chip can sit over it, and a sheet or a dialog can hide it. Each
 * surface that owns the bottom of the screen registers itself here as a dock,
 * and the one with the highest rank wins:
 *
 * - "pill": the bottom bar in any of its faces. The family case, and what the
 *   toaster does with nothing registered, so long as a bar is on the page
 *   (`useToastPill`). On a page with no bar the toast is a plain one.
 * - "line": some other surface's edge is the floor (a parked chip). A toast
 *   announces just above that line and then leaves, out of sight until the
 *   pill is the dock again. A stack already fanned out stays out.
 * - "cover": a sheet or dialog hides the bar. The same announce and exit, and
 *   a fanned stack is tucked first, since nothing there could tuck it.
 *
 * The `<Toaster>` reads the winner and draws it (`toast-over` in toast.css);
 * the `<ToastBand>` stands down while the dock is not the pill. The line is
 * measured from the dock's element: on resize, when a transition on it ends,
 * and again each time a toast arrives.
 *
 * `<Toaster cover>` names covers by selector in place of registering each.
 * Its toasts are drawn over the cover for their announce and dive alone, but
 * whether one is up is known the whole time (`useToastCovered`).
 */
export type ToastDockKind = "pill" | "line" | "cover";

/** What the toaster draws while the dock is not the pill. */
export type ToastDock = {
  kind: "line" | "cover";
  /**
   * The line, in px from the bottom of the viewport. 0 is the bottom edge:
   * the dock's own edge is there, or the strip above the dock is too short
   * for a toast, which then holds where the pill would be.
   */
  line: number;
};

export type ToastDockOptions = {
  /** What kind of surface this is. Defaults to "line". */
  kind?: ToastDockKind;
  /** Which dock wins when several are up: the highest. Ties go to the newest. Defaults to 0. */
  rank?: number;
  /** Which edge of the element is the line. Defaults to its top. */
  edge?: "top" | "bottom";
  /** A fixed line in px from the viewport's bottom, in place of measuring the element. */
  line?: number;
  /** Registers only while true. Defaults to true. */
  active?: boolean;
};

type Entry = {
  el: HTMLElement | null;
  kind: ToastDockKind;
  rank: number;
  edge: "top" | "bottom";
  line: number | undefined;
  seq: number;
};

/**
 * Room an announce needs above a line: the pill-sized toast at its 1.1
 * announce scale, the 12px it stands off the line, and a notch's worth of
 * status bar. A sheet that fills the screen never leaves this much.
 */
const ANNOUNCE_GAP_PX = 12;
const ANNOUNCE_HEADROOM_PX = 76;
const ANNOUNCE_SCALE = 1.1;
const FALLBACK_BAR_H_PX = 58;

const entries = new Map<symbol, Entry>();
const listeners = new Set<() => void>();
let seq = 0;
let current: ToastDock | null = null;

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function winner(): Entry | null {
  let best: Entry | null = null;
  for (const entry of entries.values()) {
    if (!best || entry.rank > best.rank || (entry.rank === best.rank && entry.seq > best.seq)) best = entry;
  }
  return best;
}

function barHeight(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--dl-bar-h");
  return Number.parseFloat(raw) || FALLBACK_BAR_H_PX;
}

/**
 * The line a toast can announce above, given where the dock's edge is: the
 * edge itself when the strip over it has room for a toast, else 0. Pure, so
 * the rule is tested without a layout.
 */
export function dockLine(edgeFromBottom: number, viewportHeight: number, barH: number): number {
  const line = Math.max(0, Math.round(edgeFromBottom));
  const needed = barH * ANNOUNCE_SCALE + ANNOUNCE_GAP_PX + ANNOUNCE_HEADROOM_PX;
  return viewportHeight - line >= needed ? line : 0;
}

function measure(entry: Entry): number {
  if (entry.line !== undefined) return dockLine(entry.line, window.innerHeight, barHeight());
  if (!entry.el) return 0;
  const rect = entry.el.getBoundingClientRect();
  const y = entry.edge === "top" ? rect.top : rect.bottom;
  return dockLine(window.innerHeight - y, window.innerHeight, barHeight());
}

function apply(): void {
  const dock = winner();
  const next: ToastDock | null =
    !dock || dock.kind === "pill" ? null : { kind: dock.kind, line: measure(dock) };
  if (next?.kind === current?.kind && next?.line === current?.line) return;
  current = next;
  emit();
}

/** Measures the winning dock again. The `<Toaster>` calls it as each toast arrives. */
export function refreshToastDock(): void {
  if (typeof window === "undefined") return;
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
export function measureToastCover(selector: string, skip?: string): ToastDock | null {
  if (typeof document === "undefined") return null;
  let top = Number.POSITIVE_INFINITY;
  for (const el of document.querySelectorAll(selector)) {
    if (el.closest("[data-dl-leaving]")) continue;
    if (skip && inside(el, skip)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.height > 0) top = Math.min(top, rect.top);
  }
  if (top === Number.POSITIVE_INFINITY) return null;
  return { kind: "cover", line: dockLine(window.innerHeight - top, window.innerHeight, barHeight()) };
}

/** Whether `el` matches the selector or sits inside a match. A selector the browser can't parse names nothing. */
function inside(el: Element, selector: string): boolean {
  try {
    return el.closest(selector) !== null;
  } catch {
    return false;
  }
}

/** The dock the toaster draws now, or null while it is the pill. */
export function readToastDock(): ToastDock | null {
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
export function registerToastPill(): () => void {
  pills++;
  if (pills === 1) emit();
  let counted = true;
  return () => {
    if (!counted) return;
    counted = false;
    pills--;
    if (pills === 0) emit();
  };
}

/** Whether a bottom bar has said its pill is on the page. */
export function readToastPill(): boolean {
  return pills > 0;
}

function readPillOnServer(): boolean {
  return false;
}

/** Whether a bottom bar has said its pill is on the page. */
export function useToastPill(): boolean {
  return useSyncExternalStore(subscribe, readToastPill, readPillOnServer);
}

/**
 * Counts a pill while the caller is mounted and `on`. A layout effect, so a
 * bar that mounts in the same commit as a toast is counted before that
 * commit is painted, and the toast never shows one frame in the plain
 * layout.
 */
export function useToastPillPresence(on = true): void {
  useLayoutEffect(() => {
    if (!on) return;
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
export function setNamedToastCover(up: boolean): void {
  if (named === up) return;
  named = up;
  emit();
}

/**
 * Whether a cover hides the phone's bottom bar now: a dock registered as
 * "cover" is the winner, or a surface named by `<Toaster cover>` is up.
 */
export function readToastCovered(): boolean {
  return named || current?.kind === "cover";
}

function readCoveredOnServer(): boolean {
  return false;
}

/** Whether a cover hides the phone's bottom bar now. */
export function useToastCovered(): boolean {
  return useSyncExternalStore(subscribe, readToastCovered, readCoveredOnServer);
}

function readServer(): ToastDock | null {
  return null;
}

/** The dock the toaster draws now, or null while it is the pill. */
export function useToastDockState(): ToastDock | null {
  return useSyncExternalStore(subscribe, readToastDock, readServer);
}

/** The kind of surface phone toasts dock to now: "pill" with nothing else registered. */
export function useToastDockKind(): ToastDockKind {
  return useToastDockState()?.kind ?? "pill";
}

/**
 * Registers a dock outside React. Returns the function that takes it away.
 * `el` may be null when `options.line` names a fixed line.
 */
export function registerToastDock(el: HTMLElement | null, options: ToastDockOptions = {}): () => void {
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
  if (el) observer?.observe(el);
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
export function useToastDock(ref: RefObject<HTMLElement | null> | null, options: ToastDockOptions = {}): void {
  const { kind = "line", rank = 0, edge = "top", line, active = true } = options;
  // A registered pill is a pill on the page, from the commit it mounts in.
  useToastPillPresence(kind === "pill" && active);
  useEffect(() => {
    const el = ref?.current ?? null;
    if (!active || (!el && line === undefined)) return;
    return registerToastDock(el, { kind, rank, edge, line });
  }, [ref, kind, rank, edge, line, active]);
}
