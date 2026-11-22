/** What can take Tab in the toast stack: an action is a button or a link,
 *  and Sonner gives each toast item tabindex 0. */
const TAB_STOPS = "a[href], button, input, select, textarea, [tabindex]";

/**
 * Takes every tab stop under `root` out of the tab order (tabindex -1), the
 * ones that arrive later included, until the returned release puts each back
 * as it was. Unlike `inert`, nothing leaves the accessibility tree, so a live
 * region inside keeps announcing what arrives in it.
 *
 * `except` is a selector for what stays reachable: a stop that matches it, or
 * sits inside something that does, is left alone, and is given back if it
 * starts to match while held. It is read again when a class changes, or one
 * of the two marks that say which card is in view (`data-front`, which
 * Sonner moves to each new arrival, and the kit's `data-again`).
 */
export function holdTabStops(root: HTMLElement, except?: string): () => void {
  const held = new Map<HTMLElement, string | null>();
  const restore = (el: HTMLElement, was: string | null) => {
    if (was === null) el.removeAttribute("tabindex");
    else el.setAttribute("tabindex", was);
  };
  const sync = () => {
    for (const el of root.querySelectorAll<HTMLElement>(TAB_STOPS)) {
      const spared = except !== undefined && el.closest(except) !== null;
      const was = held.get(el);
      if (spared) {
        if (was !== undefined) {
          held.delete(el);
          restore(el, was);
        }
        continue;
      }
      if (el.tabIndex < 0) continue;
      if (was === undefined) held.set(el, el.getAttribute("tabindex"));
      el.tabIndex = -1;
    }
  };
  sync();
  const watch = new MutationObserver(sync);
  watch.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: except === undefined ? ["tabindex"] : ["tabindex", "class", "data-front", "data-again"],
  });
  return () => {
    watch.disconnect();
    for (const [el, was] of held) restore(el, was);
    held.clear();
  };
}
