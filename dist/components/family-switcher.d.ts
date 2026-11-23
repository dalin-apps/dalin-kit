import type { ReactNode } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { type DalinApp } from "./apps.js";
import { type WordmarkProps } from "./wordmark.js";
export type FamilySwitcherProps = Pick<WordmarkProps, "size" | "folded" | "rollOut"> & {
    /** The app this is drawn in: its wordmark is the trigger, and its row is the checked one. */
    app: DalinApp;
    /**
     * What the control does, for its accessible name, which reads
     * "dalin. mail. Switch app". Pass the words in the app's language.
     */
    label?: string;
    /**
     * Another address for an app, in place of its own. For a preview or a
     * local build, where the family is not on dalin.pro:
     * `{ mail: "http://localhost:3000" }`.
     */
    hrefs?: Partial<Record<DalinApp, string>>;
    /** Extra classes for the trigger, beside `dl-switcher-trigger`. */
    className?: MenuPrimitive.Trigger.Props["className"];
    /** Which side of the wordmark the menu opens on, and how it lines up. Below, from its left edge. */
    side?: MenuPrimitive.Positioner.Props["side"];
    align?: MenuPrimitive.Positioner.Props["align"];
};
/**
 * The family switcher: the app's wordmark as the way to the other three.
 *
 * Nothing shows at rest; the wordmark is the wordmark. Pointing at it, or
 * pressing it, opens the family's frosted menu under it, with an arrow. The
 * menu lists the four apps as their own wordmarks, each period in that
 * app's accent, with a check on the app you are in. Every row is a link to
 * the app, so a middle click or a long press does what it does on a link.
 *
 * From the keyboard the wordmark is a button: Enter or Space opens the
 * menu, the arrows move through it, Enter follows a row, and Escape closes
 * it and returns focus to the wordmark.
 *
 * It takes the wordmark's own `size`, `folded` and `rollOut`, so it goes
 * where the sidebar's `<Wordmark>` was. It needs menu.css and wordmark.css.
 */
export declare function FamilySwitcher({ app, size, folded, rollOut, label, hrefs, className, side, align, }: FamilySwitcherProps): ReactNode;
//# sourceMappingURL=family-switcher.d.ts.map