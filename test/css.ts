/**
 * What the stylesheet tests share: reading a sheet, finding a rule in it, and
 * weighing a selector. jsdom has no cascade worth trusting for :where() and
 * :has(), so a test that needs to know which of two rules wins weighs them.
 */
import { readFileSync } from "node:fs";

/** A kit stylesheet as text, with its comments taken out. Vitest runs from the package root. */
export function readCss(
  name: "toast" | "create" | "tokens" | "base" | "motion" | "wordmark" | "menu" | "empty" | "palette" | "phone" | "seg",
): string {
  return readFileSync(`css/${name}.css`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Every rule whose selector list contains `needle`, as [selector, body] pairs. */
export function rulesWith(css: string, needle: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = pattern.exec(css); m; m = pattern.exec(css)) {
    const selector = (m[1] ?? "").trim().replace(/\s+/g, " ");
    if (selector.includes(needle)) out.push([selector, (m[2] ?? "").trim()]);
  }
  return out;
}

/** The body of the one rule whose selector contains `needle`. Throws on none or several. */
export function ruleWith(css: string, needle: string): string {
  const found = rulesWith(css, needle);
  if (found.length !== 1) throw new Error(`${found.length} rules contain ${needle}`);
  return found[0]![1];
}

/** The body of the one rule whose whole selector is `selector`. Throws on none or several. */
export function ruleFor(css: string, selector: string): string {
  const found = rulesWith(css, selector).filter(([list]) => list === selector);
  if (found.length !== 1) throw new Error(`${found.length} rules are exactly ${selector}`);
  return found[0]![1];
}

/** The body of the one rule whose selector list names `selector` among others. Throws on none or several. */
export function ruleNaming(css: string, selector: string): string {
  const found = rulesWith(css, selector).filter(([list]) => splitList(list).includes(selector));
  if (found.length !== 1) throw new Error(`${found.length} rules name ${selector}`);
  return found[0]![1];
}

/** Splits on commas that are not inside brackets. */
export function splitList(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < list.length; i++) {
    const ch = list[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(list.slice(from, i).trim());
      from = i + 1;
    }
  }
  parts.push(list.slice(from).trim());
  return parts.filter(Boolean);
}

type Weight = [ids: number, classes: number, elements: number];

function heavier(a: Weight, b: Weight): Weight {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! > b[i]! ? a : b;
  return a;
}

/**
 * A selector's specificity as [ids, classes, elements]. Classes, attributes
 * and pseudo-classes count in the middle; :where() weighs nothing; :is(),
 * :not() and :has() weigh as their heaviest argument.
 */
export function specificity(selector: string): Weight {
  const total: Weight = [0, 0, 0];
  let i = 0;
  const s = selector;
  const group = (open: number): [string, number] => {
    let depth = 0;
    for (let j = open; j < s.length; j++) {
      if (s[j] === "(") depth++;
      else if (s[j] === ")" && --depth === 0) return [s.slice(open + 1, j), j + 1];
    }
    throw new Error(`unclosed ( in ${selector}`);
  };
  // Steps past the rest of a name once its first character is counted.
  const name = () => {
    while (i < s.length && /[\w-]/.test(s[i]!)) i++;
  };
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === "#") {
      total[0]++;
      i++;
      name();
    } else if (ch === ".") {
      total[1]++;
      i++;
      name();
    } else if (ch === "[") {
      total[1]++;
      i = s.indexOf("]", i) + 1;
    } else if (ch === ":" && s[i + 1] === ":") {
      total[2]++;
      i += 2;
      name();
    } else if (ch === ":") {
      const pseudo = /^:([\w-]+)/.exec(s.slice(i))?.[1] ?? "";
      i += pseudo.length + 1;
      if (s[i] !== "(") {
        total[1]++;
        continue;
      }
      const [inner, next] = group(i);
      i = next;
      if (pseudo === "where") continue;
      if (pseudo === "is" || pseudo === "not" || pseudo === "has") {
        const best = splitList(inner).map(specificity).reduce(heavier, [0, 0, 0]);
        for (let k = 0; k < 3; k++) total[k]! += best[k]!;
      } else {
        total[1]++;
      }
    } else if (/[a-zA-Z]/.test(ch)) {
      total[2]++;
      name();
    } else {
      i++;
    }
  }
  return total;
}

/** Whether selector `a` outweighs selector `b`. */
export function outweighs(a: string, b: string): boolean {
  const [x, y] = [specificity(a), specificity(b)];
  return heavier(x, y) === x && x.join() !== y.join();
}
