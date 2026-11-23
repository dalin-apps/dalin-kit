/**
 * Matching for the command palette: how a query is cut into words, whether
 * a row's text holds them, and where they fall in it, so the row can mark
 * them. Pure, so the rules are tested without a palette.
 *
 * A match ignores case and accents: "resume" finds "Résumé". Every word of
 * the query has to appear, in any order, anywhere in the text.
 */
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
//# sourceMappingURL=palette-match.d.ts.map