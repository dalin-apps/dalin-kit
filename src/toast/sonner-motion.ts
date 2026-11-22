/**
 * Sonner's own rule for the system's reduced-motion setting, and the one
 * change the kit makes to it.
 *
 * Sonner ships its stylesheet as a `<style>` it appends to the page, and in
 * it:
 *
 *   @media (prefers-reduced-motion) {
 *     .sonner-loading-bar, [data-sonner-toast], [data-sonner-toast] > * {
 *       transition: none !important; animation: none !important;
 *     }
 *   }
 *
 * That is the system's setting and nothing else. An app with its own motion
 * switch lets a person choose Full motion on a machine that asks for less,
 * and no rule of the kit's can give a toast its motion back from under an
 * `!important` shorthand: every transition and animation in toast.css would
 * have to be restated, with `!important`, in an order that still let each
 * state win.
 *
 * So the rule is scoped instead, where it stands. Each of its selectors is
 * put under `[data-sonner-toaster]:not(.toast-motion)`, and the `<Toaster>`
 * writes `toast-motion` on its list while the app's Full choice is on. A
 * toaster without the class, the kit's or anyone's, is ruled exactly as
 * before.
 *
 * The edit is made only for an app that names a full-motion selector, once
 * per stylesheet, and is never undone: it changes nothing until the class
 * appears. If a later Sonner writes the rule another way and it is not
 * found, nothing is changed and the system's setting simply keeps winning.
 */
export const MOTION_CLASS = "toast-motion";

const SCOPE = `[data-sonner-toaster]:not(.${MOTION_CLASS})`;

/** A rule that holds other rules: `@media`, `@supports`, `@layer`. */
function inner(rule: CSSRule): CSSRuleList | null {
  return "cssRules" in rule ? (rule as CSSGroupingRule).cssRules : null;
}

function isReducedMotion(rule: CSSRule): boolean {
  const media = "media" in rule ? (rule as CSSMediaRule).media : null;
  return media !== null && media.mediaText.includes("prefers-reduced-motion");
}

/** Splits a selector list on its top-level commas. */
function selectors(list: string): string[] {
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

/**
 * Scopes Sonner's reduced-motion rule to toasters without `toast-motion`.
 * Returns how many rules it changed: 0 when there was none to change, or it
 * was changed already.
 */
export function scopeSonnerReducedMotion(doc: Document = document): number {
  let changed = 0;
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      // A stylesheet from another origin can't be read, and is not Sonner's.
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!isReducedMotion(rule)) continue;
      for (const style of Array.from(inner(rule) ?? [])) {
        const text = (style as CSSStyleRule).selectorText;
        if (typeof text !== "string" || !text.includes("[data-sonner-toast]") || text.includes(MOTION_CLASS)) continue;
        (style as CSSStyleRule).selectorText = selectors(text)
          .map((selector) => `${SCOPE} ${selector}`)
          .join(", ");
        changed++;
      }
    }
  }
  return changed;
}
