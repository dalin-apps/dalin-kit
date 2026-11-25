/** Text as it is compared: lower case, no accents. */
export declare function fold(text: string): string;
/** The words of a query, folded, with nothing empty and no word twice. */
export declare function queryTerms(query: string): string[];
/** Whether every word of the query appears in the text. An empty query matches everything. */
export declare function matchesQuery(text: string, query: string): boolean;
/** A run of a row's text, and whether the query matched it. */
export type MatchPart = {
    text: string;
    match: boolean;
};
/**
 * The text cut into runs, with the runs a word of the query matched marked.
 * Every occurrence of every word is marked, and runs that touch or overlap
 * are one. With no query, or none of its words in the text, the text comes
 * back as one unmarked run.
 */
export declare function matchParts(text: string, query: string): MatchPart[];
/**
 * The lowest command-score that finds a row on the score alone, for a row
 * that does not hold every word of the query. cmdk keeps anything above 0;
 * 0.1 leaves out the matches that jump from letter to letter mid-word.
 */
export declare const SCORE_FLOOR = 0.1;
/**
 * cmdk's command-score of a row for a query, on folded text: 1 for the
 * whole text typed, near 1 for a run of its first letters, less for letters
 * that start its words ("np" for "New page"), far less for letters taken
 * from the middle of words, and 0 when the letters are not in it in order.
 * `keywords` count as more text after the title, as cmdk's aliases do.
 */
export declare function scoreQuery(text: string, query: string, keywords?: string): number;
/** One ranked row: the app's item, and whether only the score found it. */
export type RankedItem<T> = {
    item: T;
    byScore: boolean;
};
/**
 * The actions for a query, in the order the palette lists them. First the
 * rows that hold every word of the query in their title or keywords (the
 * rule `matchesQuery` states), best command-score first; then the rows that
 * do not hold every word but score `SCORE_FLOOR` or more, best first. Rows
 * that score the same keep the app's order. With no query, every row comes
 * back in the app's order.
 */
export declare function rankActions<T extends {
    title: string;
    keywords?: string;
}>(items: readonly T[], query: string): RankedItem<T>[];
/**
 * The text cut into runs, with the letters of the query marked where a row
 * found by its score alone took them. The query's letters are walked along
 * the text in order: a letter that follows the last one marked is taken
 * there, otherwise at the next word that starts with it, otherwise at its
 * next place anywhere. So "todo" marks "to" and "do" in "New to-do list",
 * and "np" marks the N and the P of "New page". Where the letters do not
 * all fall in the text (they matched the keywords) nothing is marked.
 */
export declare function scoreParts(text: string, query: string): MatchPart[];
//# sourceMappingURL=palette-match.d.ts.map