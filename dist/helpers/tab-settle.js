import { startedFromKeyboard } from "./input-modality.js";
import { reducesMotion } from "./motion.js";
import { RELEASED_ATTR } from "./press.js";
/** The class that settles a phone tab's glyph (motion.css). */
export const TAB_SETTLE_CLASS = "dl-tab-settle";
/**
 * Settles the glyph of the phone tab being opened: it grows back from the
 * pressed size (`--dl-press-scale`, 0.97) to 1 over `--dl-t-tab-settle`
 * (140ms) on the family's curve, as it fills. The tab's tint and colour
 * keep their own transition. Call it from the tap that opens the tab, with
 * the tab's glyph, and not for a tab that was already open.
 *
 * The settle was the owner's pick on 2026-11-25, from 0.9. From 0.14 a tab
 * takes its press from the pointer (`watchPress`, with `dl-press` on the
 * tab), and the lift settles the whole tab back from the pressed size: that
 * is the tab's settle, and this plays nothing over it, so the tab moves
 * once. An app whose tabs carry `dl-press` can drop the call. On a tab
 * without it, this still settles the glyph, from the pressed size now.
 *
 * It plays from its first frame each time, so two quick taps settle twice.
 * Nothing plays when the tab was opened from the keyboard or while motion is
 * reduced, and the class is gone once the settle ends, so nothing runs at
 * rest. Returns whether it played.
 */
export function settleTab(glyph, options = {}) {
    if (!glyph)
        return false;
    glyph.classList.remove(TAB_SETTLE_CLASS);
    const still = options.reducedMotion ? options.reducedMotion() : reducesMotion();
    if (still || startedFromKeyboard())
        return false;
    // The press's own release is settling this tab already (press.ts).
    if (glyph.closest(`[${RELEASED_ATTR}]`))
        return false;
    // Read the box once, so the class added again starts the animation over.
    void glyph.offsetWidth;
    glyph.classList.add(TAB_SETTLE_CLASS);
    const done = (event) => {
        if (event.target !== glyph)
            return;
        glyph.classList.remove(TAB_SETTLE_CLASS);
        glyph.removeEventListener("animationend", done);
        glyph.removeEventListener("animationcancel", done);
    };
    glyph.addEventListener("animationend", done);
    glyph.addEventListener("animationcancel", done);
    return true;
}
//# sourceMappingURL=tab-settle.js.map