/**
 * Matching for the command palette: how a query is cut into words, whether
 * a row's text holds them, and where they fall in it, so the row can mark
 * them. Pure, so the rules are tested without a palette.
 *
 * A match ignores case and accents: "resume" finds "Résumé". Every word of
 * the query has to appear, in any order, anywhere in the text.
 *
 * The actions are ranked as well as matched (`rankActions`): the rows that
 * hold every word come first, ordered by cmdk's command-score, then the
 * rows only the score finds ("np" for "New page").
 */
import { commandScore } from "./command-score.js";

/** One character, lower-cased with its accents taken off. */
function foldChar(ch: string): string {
  return ch
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Text as it is compared: lower case, no accents. */
export function fold(text: string): string {
  let out = "";
  for (const ch of text) out += foldChar(ch);
  return out;
}

/** The words of a query, folded, with nothing empty and no word twice. */
export function queryTerms(query: string): string[] {
  return [...new Set(fold(query).split(/\s+/).filter(Boolean))];
}

/** Whether every word of the query appears in the text. An empty query matches everything. */
export function matchesQuery(text: string, query: string): boolean {
  const folded = fold(text);
  return queryTerms(query).every((term) => folded.includes(term));
}

/** A run of a row's text, and whether the query matched it. */
export type MatchPart = { text: string; match: boolean };

/**
 * The text cut into runs, with the runs a word of the query matched marked.
 * Every occurrence of every word is marked, and runs that touch or overlap
 * are one. With no query, or none of its words in the text, the text comes
 * back as one unmarked run.
 */
export function matchParts(text: string, query: string): MatchPart[] {
  const terms = queryTerms(query);
  if (!text) return [];
  if (terms.length === 0) return [{ text, match: false }];

  const { chars, folded, from } = foldMap(text);
  const marked: boolean[] = new Array<boolean>(chars.length).fill(false);
  let any = false;
  for (const term of terms) {
    for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + term.length)) {
      for (let i = at; i < at + term.length; i++) marked[from[i]!] = true;
      any = true;
    }
  }
  if (!any) return [{ text, match: false }];
  return partsOf(chars, marked);
}

/**
 * The folded text beside a map from each of its code units back to the
 * character of `text` it came from. The two do not line up by themselves:
 * an emoji is one character and two code units, and folding can drop one.
 */
function foldMap(text: string): { chars: string[]; folded: string; from: number[] } {
  const chars = [...text];
  let folded = "";
  const from: number[] = [];
  chars.forEach((ch, index) => {
    const piece = foldChar(ch);
    folded += piece;
    for (let i = 0; i < piece.length; i++) from.push(index);
  });
  return { chars, folded, from };
}

/** The characters cut into marked and unmarked runs. */
function partsOf(chars: string[], marked: boolean[]): MatchPart[] {
  // A separate accent folds to nothing, so no word can mark it. It belongs
  // to the letter before it and takes that letter's mark.
  chars.forEach((ch, index) => {
    if (index > 0 && foldChar(ch) === "") marked[index] = marked[index - 1]!;
  });
  const parts: MatchPart[] = [];
  chars.forEach((ch, index) => {
    const match = marked[index]!;
    const last = parts[parts.length - 1];
    if (last && last.match === match) last.text += ch;
    else parts.push({ text: ch, match });
  });
  return parts;
}

/**
 * The lowest command-score that finds a row on the score alone, for a row
 * that does not hold every word of the query. cmdk keeps anything above 0;
 * 0.1 leaves out the matches that jump from letter to letter mid-word.
 */
export const SCORE_FLOOR = 0.1;

/**
 * cmdk's command-score of a row for a query, on folded text: 1 for the
 * whole text typed, near 1 for a run of its first letters, less for letters
 * that start its words ("np" for "New page"), far less for letters taken
 * from the middle of words, and 0 when the letters are not in it in order.
 * `keywords` count as more text after the title, as cmdk's aliases do.
 */
export function scoreQuery(text: string, query: string, keywords?: string): number {
  const typed = fold(query).trim().replace(/\s+/g, " ");
  if (!typed) return 1;
  return commandScore(fold(text), typed, keywords ? [fold(keywords)] : []);
}

/** One ranked row: the app's item, and whether only the score found it. */
export type RankedItem<T> = { item: T; byScore: boolean };

/**
 * The actions for a query, in the order the palette lists them. First the
 * rows that hold every word of the query in their title or keywords (the
 * rule `matchesQuery` states), best command-score first; then the rows that
 * do not hold every word but score `SCORE_FLOOR` or more, best first. Rows
 * that score the same keep the app's order. With no query, every row comes
 * back in the app's order.
 */
export function rankActions<T extends { title: string; keywords?: string }>(items: readonly T[], query: string): RankedItem<T>[] {
  if (queryTerms(query).length === 0) return items.map((item) => ({ item, byScore: false }));
  const every: { item: T; score: number }[] = [];
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const score = scoreQuery(item.title, query, item.keywords);
    if (matchesQuery(`${item.title} ${item.keywords ?? ""}`, query)) every.push({ item, score });
    else if (score >= SCORE_FLOOR) scored.push({ item, score });
  }
  // Array.prototype.sort is stable, so a tie keeps the app's order.
  const best = (a: { score: number }, b: { score: number }) => b.score - a.score;
  return [
    ...every.sort(best).map(({ item }) => ({ item, byScore: false })),
    ...scored.sort(best).map(({ item }) => ({ item, byScore: true })),
  ];
}

/** What ends a word in a row's text, as command-score reads it: a space, a hyphen, or one of its gap marks. */
const WORD_EDGE = /[\s\-\\/_+.#"@[({&]/;

/**
 * The text cut into runs, with the letters of the query marked where a row
 * found by its score alone took them. The query's letters are walked along
 * the text in order: a letter that follows the last one marked is taken
 * there, otherwise at the next word that starts with it, otherwise at its
 * next place anywhere. So "todo" marks "to" and "do" in "New to-do list",
 * and "np" marks the N and the P of "New page". Where the letters do not
 * all fall in the text (they matched the keywords) nothing is marked.
 */
export function scoreParts(text: string, query: string): MatchPart[] {
  if (!text) return [];
  const letters = [...fold(query).replace(/\s+/g, "")];
  if (letters.length === 0) return [{ text, match: false }];
  const { chars, folded, from } = foldMap(text);
  const marked: boolean[] = new Array<boolean>(chars.length).fill(false);
  let at = 0;
  for (const letter of letters) {
    let found = -1;
    if (at > 0 && folded[at] === letter) found = at;
    for (let i = at; found === -1 && i < folded.length; i++) {
      if (folded[i] === letter && (i === 0 || WORD_EDGE.test(folded[i - 1]!))) found = i;
    }
    if (found === -1) found = folded.indexOf(letter, at);
    if (found === -1) return [{ text, match: false }];
    marked[from[found]!] = true;
    at = found + 1;
  }
  return partsOf(chars, marked);
}
