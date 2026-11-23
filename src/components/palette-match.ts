/**
 * Matching for the command palette: how a query is cut into words, whether
 * a row's text holds them, and where they fall in it, so the row can mark
 * them. Pure, so the rules are tested without a palette.
 *
 * A match ignores case and accents: "resume" finds "Résumé". Every word of
 * the query has to appear, in any order, anywhere in the text.
 */

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

  // The folded text beside a map from each of its code units back to the
  // character of `text` it came from. The two do not line up by themselves:
  // an emoji is one character and two code units, and folding can drop one.
  const chars = [...text];
  let folded = "";
  const from: number[] = [];
  chars.forEach((ch, index) => {
    const piece = foldChar(ch);
    folded += piece;
    for (let i = 0; i < piece.length; i++) from.push(index);
  });

  const marked: boolean[] = new Array<boolean>(chars.length).fill(false);
  let any = false;
  for (const term of terms) {
    for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + term.length)) {
      for (let i = at; i < at + term.length; i++) marked[from[i]!] = true;
      any = true;
    }
  }
  if (!any) return [{ text, match: false }];
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
