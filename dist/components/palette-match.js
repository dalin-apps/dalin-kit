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
function foldChar(ch) {
    return ch
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
}
/** Text as it is compared: lower case, no accents. */
export function fold(text) {
    let out = "";
    for (const ch of text)
        out += foldChar(ch);
    return out;
}
/** The words of a query, folded, with nothing empty and no word twice. */
export function queryTerms(query) {
    return [...new Set(fold(query).split(/\s+/).filter(Boolean))];
}
/** Whether every word of the query appears in the text. An empty query matches everything. */
export function matchesQuery(text, query) {
    const folded = fold(text);
    return queryTerms(query).every((term) => folded.includes(term));
}
/**
 * The text cut into runs, with the runs a word of the query matched marked.
 * Every occurrence of every word is marked, and runs that touch or overlap
 * are one. With no query, or none of its words in the text, the text comes
 * back as one unmarked run.
 */
export function matchParts(text, query) {
    const terms = queryTerms(query);
    if (!text)
        return [];
    if (terms.length === 0)
        return [{ text, match: false }];
    const { chars, folded, from } = foldMap(text);
    const marked = new Array(chars.length).fill(false);
    let any = false;
    for (const term of terms) {
        for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + term.length)) {
            for (let i = at; i < at + term.length; i++)
                marked[from[i]] = true;
            any = true;
        }
    }
    if (!any)
        return [{ text, match: false }];
    return partsOf(chars, marked);
}
/**
 * The folded text beside a map from each of its code units back to the
 * character of `text` it came from. The two do not line up by themselves:
 * an emoji is one character and two code units, and folding can drop one.
 */
function foldMap(text) {
    const chars = [...text];
    let folded = "";
    const from = [];
    chars.forEach((ch, index) => {
        const piece = foldChar(ch);
        folded += piece;
        for (let i = 0; i < piece.length; i++)
            from.push(index);
    });
    return { chars, folded, from };
}
/** The characters cut into marked and unmarked runs. */
function partsOf(chars, marked) {
    // A separate accent folds to nothing, so no word can mark it. It belongs
    // to the letter before it and takes that letter's mark.
    chars.forEach((ch, index) => {
        if (index > 0 && foldChar(ch) === "")
            marked[index] = marked[index - 1];
    });
    const parts = [];
    chars.forEach((ch, index) => {
        const match = marked[index];
        const last = parts[parts.length - 1];
        if (last && last.match === match)
            last.text += ch;
        else
            parts.push({ text: ch, match });
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
export function scoreQuery(text, query, keywords) {
    const typed = fold(query).trim().replace(/\s+/g, " ");
    if (!typed)
        return 1;
    return commandScore(fold(text), typed, keywords ? [fold(keywords)] : []);
}
/**
 * The actions for a query, in the order the palette lists them. First the
 * rows that hold every word of the query in their title or keywords (the
 * rule `matchesQuery` states), best command-score first; then the rows that
 * do not hold every word but score `SCORE_FLOOR` or more, best first. Rows
 * that score the same keep the app's order. With no query, every row comes
 * back in the app's order.
 */
export function rankActions(items, query) {
    if (queryTerms(query).length === 0)
        return items.map((item) => ({ item, byScore: false }));
    const every = [];
    const scored = [];
    for (const item of items) {
        const score = scoreQuery(item.title, query, item.keywords);
        if (matchesQuery(`${item.title} ${item.keywords ?? ""}`, query))
            every.push({ item, score });
        else if (score >= SCORE_FLOOR)
            scored.push({ item, score });
    }
    // Array.prototype.sort is stable, so a tie keeps the app's order.
    const best = (a, b) => b.score - a.score;
    return [
        ...every.sort(best).map(({ item }) => ({ item, byScore: false })),
        ...scored.sort(best).map(({ item }) => ({ item, byScore: true })),
    ];
}
/**
 * The places in `text` where command-score took the letters of `typed`,
 * for its best score: the same walk as command-score.ts, with the same
 * weights, keeping the path that won. A transposed pair marks both
 * letters. Code units throughout, as command-score counts them. Null where
 * the letters are not all in the text.
 */
function scorePath(text, typed) {
    const lower = text.toLowerCase().replace(/[\s-]/g, " ");
    const abbr = typed.toLowerCase().replace(/[\s-]/g, " ");
    const gap = /[\\/_+.#"@[({&]/;
    const space = /[\s-]/;
    const memo = new Map();
    const walk = (at, ai) => {
        if (ai === abbr.length)
            return { score: at === text.length ? 1 : 0.99, path: [] };
        const key = `${at},${ai}`;
        const known = memo.get(key);
        if (known)
            return known;
        const ch = abbr.charAt(ai);
        let best = { score: 0, path: [] };
        for (let index = lower.indexOf(ch, at); index >= 0; index = lower.indexOf(ch, index + 1)) {
            const next = walk(index + 1, ai + 1);
            let score = next.score;
            if (score > best.score) {
                if (index === at)
                    score *= 1;
                else if (gap.test(text.charAt(index - 1))) {
                    score *= 0.8;
                    const breaks = text.slice(at, index - 1).match(new RegExp(gap.source, "g"));
                    if (breaks && at > 0)
                        score *= 0.999 ** breaks.length;
                }
                else if (space.test(text.charAt(index - 1))) {
                    score *= 0.9;
                    const breaks = text.slice(at, index - 1).match(/[\s-]/g);
                    if (breaks && at > 0)
                        score *= 0.999 ** breaks.length;
                }
                else {
                    score *= 0.17;
                    if (at > 0)
                        score *= 0.999 ** (index - at);
                }
                if (text.charAt(index) !== typed.charAt(ai))
                    score *= 0.9999;
            }
            let path = [index, ...next.path];
            if ((score < 0.1 && lower.charAt(index - 1) === abbr.charAt(ai + 1)) ||
                (abbr.charAt(ai + 1) === ch && lower.charAt(index - 1) !== ch)) {
                const swapped = walk(index + 1, ai + 2);
                if (swapped.score * 0.1 > score) {
                    score = swapped.score * 0.1;
                    path = [index - 1, index, ...swapped.path];
                }
            }
            if (score > best.score)
                best = { score, path };
        }
        memo.set(key, best);
        return best;
    };
    const found = walk(0, 0);
    return found.score > 0 ? found.path : null;
}
/**
 * The text cut into runs, with the letters of the query marked where a row
 * found by its score alone took them: the alignment command-score itself
 * chose (`scorePath`), so "todo" marks "to" and "do" in "New to-do list",
 * "np" the N and the P of "New page", "ol" the O of "Copy" and the L of
 * "link", and the transposed "pgae" the whole of "Page". Where the letters
 * do not all fall in the text (they matched the keywords) nothing is marked.
 */
export function scoreParts(text, query) {
    if (!text)
        return [];
    const typed = fold(query).trim().replace(/\s+/g, " ");
    if (!typed)
        return [{ text, match: false }];
    const { chars, folded, from } = foldMap(text);
    const path = scorePath(folded, typed);
    if (!path)
        return [{ text, match: false }];
    const marked = new Array(chars.length).fill(false);
    for (const index of path) {
        // A space in the query meets a space in the text, which draws no mark.
        if (index < 0 || /\s/.test(folded.charAt(index)))
            continue;
        marked[from[index]] = true;
    }
    return partsOf(chars, marked);
}
//# sourceMappingURL=palette-match.js.map