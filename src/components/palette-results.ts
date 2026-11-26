"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { rankActions } from "./palette-match.js";
import type { PaletteAnswer, PaletteGroup, PaletteItem, PaletteSelection, PaletteSource } from "./palette-types.js";

/**
 * How long a query's list waits for its slowest source. Past it the list is
 * shown without that source, whose group joins at the end when it answers.
 */
export const SOURCE_WAIT_MS = 400;

/** The id of the actions' group. */
export const ACTIONS_GROUP = "dl:actions";
/** The id of the selection's group, which leads the list. */
export const SELECTION_GROUP = "dl:selection";

export type PaletteResultsOptions = {
  /** Whether to ask at all: the palette or the phone's search is open. */
  active: boolean;
  /** The words in the field. */
  query: string;
  /**
   * Which page of the palette the list is for. A list from another page is
   * stale, the same as a list for other words.
   */
  scope?: string;
  sources: readonly PaletteSource[];
  actions: readonly PaletteItem[];
  actionsHeading: string;
  /**
   * What the app has selected and its verbs: a group ahead of every source,
   * ranked against the words as the actions are.
   */
  selection?: PaletteSelection | null;
  /** Leaves the actions out while the field is empty, as the phone's search does. */
  actionsNeedWords?: boolean;
  /** Rows that end the list under no heading, after any group that joined late: mail's "Show all". */
  tail?: (query: string) => readonly PaletteItem[];
};

/** The list a palette or the phone's search shows, and where it stands. */
export type PaletteResults = {
  /** The groups to draw, empty ones left out, in order. */
  groups: PaletteGroup[];
  /** The query the list answers, or null before the first answer. */
  answered: string | null;
  /** Whether the list answers an earlier query, or another page, than the field holds. */
  stale: boolean;
  /** How many sources have yet to answer the query in the field. */
  busy: number;
  /** The sources whose search failed for the query the list answers. */
  failed: readonly string[];
  /** Asks every source again with the same words: a Retry. */
  retry: () => void;
  /** The actions found by the score alone, which mark their letters and not whole words. */
  byScore: ReadonlySet<PaletteItem>;
};

type Shown = {
  query: string | null;
  scope: string;
  groups: PaletteGroup[];
  late: PaletteGroup[];
  failed: string[];
  /** The actions of the page the list was shown for, for while it is stale on another. */
  actions: readonly PaletteItem[];
  actionsHeading: string;
};

const NOTHING_SHOWN: Shown = { query: null, scope: "", groups: [], late: [], failed: [], actions: [], actionsHeading: "" };
const NO_TAIL: readonly PaletteItem[] = [];

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof (value as { then?: unknown } | null)?.then === "function";
}

function normalize(answer: PaletteAnswer): { items: PaletteItem[]; note?: ReactNode } {
  return Array.isArray(answer) ? { items: answer } : answer;
}

/**
 * The palette's list machinery, shared with the phone's search: it asks
 * every source, holds the list on screen until every source has answered
 * the query in the field, lets a source slower than `SOURCE_WAIT_MS` join
 * at the end, and ranks the actions against the query the list answers, so
 * the whole list changes at once.
 */
export function usePaletteResults({
  active,
  query,
  scope = "",
  sources,
  actions,
  actionsHeading,
  selection,
  actionsNeedWords = false,
  tail,
}: PaletteResultsOptions): PaletteResults {
  const [shown, setShown] = useState<Shown>(NOTHING_SHOWN);
  const [busy, setBusy] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef({ actions, actionsHeading });
  latest.current = { actions, actionsHeading };

  // Closing forgets the list, read in render, so the next opening starts
  // with nothing on screen for a first group to land over.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) {
      setShown(NOTHING_SHOWN);
      setBusy(0);
    }
  }

  // Ask every source. A layout effect, so what the sources answer at once
  // is in the first frame that paints.
  useLayoutEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const answers = new Map<string, { items: PaletteItem[]; note?: ReactNode }>();
    const failed: string[] = [];
    let out = 0;
    let shownYet = false;
    const group = (source: PaletteSource, answer: { items: PaletteItem[]; note?: ReactNode }): PaletteGroup => ({
      id: source.id,
      heading: source.heading,
      items: answer.items,
      note: answer.note,
    });
    const show = () => {
      shownYet = true;
      setShown({
        query,
        scope,
        groups: sources.filter((source) => answers.has(source.id)).map((source) => group(source, answers.get(source.id)!)),
        late: [],
        failed: [...failed],
        actions: latest.current.actions,
        actionsHeading: latest.current.actionsHeading,
      });
    };
    const settle = (source: PaletteSource, answer: { items: PaletteItem[]; note?: ReactNode }, ok: boolean) => {
      if (controller.signal.aborted) return;
      out -= 1;
      setBusy(out);
      if (!shownYet) {
        answers.set(source.id, answer);
        if (!ok) failed.push(source.id);
        if (out === 0) show();
        return;
      }
      // The list went up without this source. Its group joins at the end.
      setShown((prev) =>
        prev.query === query && prev.scope === scope
          ? { ...prev, late: [...prev.late, group(source, answer)], failed: ok ? prev.failed : [...prev.failed, source.id] }
          : prev,
      );
    };
    for (const source of sources) {
      let answer: PaletteAnswer | Promise<PaletteAnswer>;
      try {
        answer = source.search(query, controller.signal);
      } catch {
        answers.set(source.id, { items: [] });
        failed.push(source.id);
        continue;
      }
      if (!isPromise(answer)) {
        answers.set(source.id, normalize(answer));
        continue;
      }
      out += 1;
      answer.then(
        (found) => settle(source, normalize(found), true),
        // A search that failed shows nothing, the same as one that found
        // nothing, and is named in `failed` for a Retry line.
        () => settle(source, { items: [] }, false),
      );
    }
    setBusy(out);
    if (out === 0) {
      show();
      return () => controller.abort();
    }
    const wait = window.setTimeout(() => {
      if (!shownYet && !controller.signal.aborted) show();
    }, SOURCE_WAIT_MS);
    return () => {
      controller.abort();
      window.clearTimeout(wait);
    };
  }, [active, query, scope, sources, attempt]);

  const stale = shown.query !== query || shown.scope !== scope;

  const { groups, byScore } = useMemo(() => {
    // The actions are matched against the query the list answers, so the
    // whole list changes together.
    const answered = shown.query;
    const byScore = new Set<PaletteItem>();
    if (answered === null) return { groups: [] as PaletteGroup[], byScore };
    const samePage = shown.scope === scope;
    const pageActions = samePage ? actions : shown.actions;
    const heading = samePage ? actionsHeading : shown.actionsHeading;
    const ranked = actionsNeedWords && answered.trim() === "" ? [] : rankActions(pageActions, answered);
    for (const { item, byScore: scored } of ranked) if (scored) byScore.add(item);
    // The selection's verbs lead, on the page they were given for.
    const verbs = selection && samePage ? rankActions(selection.items, answered) : [];
    for (const { item, byScore: scored } of verbs) if (scored) byScore.add(item);
    const end = tail ? tail(answered) : NO_TAIL;
    const found: PaletteGroup[] = [
      ...(selection ? [{ id: SELECTION_GROUP, heading: selection.heading, items: verbs.map(({ item }) => item) }] : []),
      ...shown.groups,
      { id: ACTIONS_GROUP, heading, items: ranked.map(({ item }) => item) },
      ...shown.late,
      { id: "dl:tail", items: [...end] },
    ];
    return { groups: found.filter((g) => g.items.length > 0), byScore };
  }, [shown, scope, actions, actionsHeading, selection, actionsNeedWords, tail]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { groups, answered: shown.query, stale, busy, failed: shown.failed, retry, byScore };
}
