import type { PaletteGroup, PaletteItem, PaletteSource } from "./palette-types.js";
/**
 * How long a query's list waits for its slowest source. Past it the list is
 * shown without that source, whose group joins at the end when it answers.
 */
export declare const SOURCE_WAIT_MS = 400;
/** The id of the actions' group. */
export declare const ACTIONS_GROUP = "dl:actions";
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
/**
 * The palette's list machinery, shared with the phone's search: it asks
 * every source, holds the list on screen until every source has answered
 * the query in the field, lets a source slower than `SOURCE_WAIT_MS` join
 * at the end, and ranks the actions against the query the list answers, so
 * the whole list changes at once.
 */
export declare function usePaletteResults({ active, query, scope, sources, actions, actionsHeading, actionsNeedWords, tail, }: PaletteResultsOptions): PaletteResults;
//# sourceMappingURL=palette-results.d.ts.map