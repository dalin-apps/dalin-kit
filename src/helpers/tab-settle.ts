import { startedFromKeyboard } from "./input-modality.js";
import { reducesMotion } from "./motion.js";

/** The class that settles a phone tab's glyph (phone.css). */
export const TAB_SETTLE_CLASS = "dl-tab-settle";

/**
 * Settles the glyph of the phone tab being opened: it grows from 0.9 to 1
 * over `--dl-t-tab-settle` (140ms) on the family's curve, as it fills (the
 * owner's pick on 2026-11-25). The tab's tint and colour keep their own
 * transition. Call it from the tap that opens the tab, with the tab's glyph,
 * and not for a tab that was already open, which plays nothing.
 *
 * It plays from its first frame each time, so two quick taps settle twice.
 * Nothing plays when the tab was opened from the keyboard or while motion is
 * reduced, and the class is gone once the settle ends, so nothing runs at
 * rest. Returns whether it played.
 */
export function settleTab(glyph: Element | null | undefined, options: { reducedMotion?: () => boolean } = {}): boolean {
  if (!glyph) return false;
  glyph.classList.remove(TAB_SETTLE_CLASS);
  const still = options.reducedMotion ? options.reducedMotion() : reducesMotion();
  if (still || startedFromKeyboard()) return false;
  // Read the box once, so the class added again starts the animation over.
  void (glyph as HTMLElement).offsetWidth;
  glyph.classList.add(TAB_SETTLE_CLASS);
  const done = (event: Event) => {
    if (event.target !== glyph) return;
    glyph.classList.remove(TAB_SETTLE_CLASS);
    glyph.removeEventListener("animationend", done);
    glyph.removeEventListener("animationcancel", done);
  };
  glyph.addEventListener("animationend", done);
  glyph.addEventListener("animationcancel", done);
  return true;
}
