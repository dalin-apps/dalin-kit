import type { ReactNode } from "react";
export type KbdProps = {
    /** One cap per key, with no plus between them: `["Ctrl", "K"]`. */
    keys?: readonly string[];
    /** A single cap's text, in place of `keys`. */
    children?: ReactNode;
    className?: string;
};
/**
 * A keycap: drive's and notes' shortcut hint. One cap per key, raised by a
 * thicker bottom edge (`.dl-kbd-key` in menu.css). It is a static hint with
 * no press of its own, since it sits inside a row that is already the
 * target. `data-slot="kbd"` is what a stylesheet hides on touch, where a key
 * means nothing; menu.css does that inside a menu.
 *
 * Build a chord's keys for the platform with `shortcutLabel` or pass them
 * as written: `<Kbd keys={["Ctrl", "K"]} />`, `<Kbd>E</Kbd>`.
 */
export declare function Kbd({ keys, children, className }: KbdProps): ReactNode;
//# sourceMappingURL=kbd.d.ts.map