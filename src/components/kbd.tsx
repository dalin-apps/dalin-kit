import type { ReactNode } from "react";
import { cx } from "./cx.js";

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
export function Kbd({ keys, children, className }: KbdProps): ReactNode {
  const caps = keys && keys.length > 0 ? keys : null;
  if (!caps && (children === null || children === undefined || children === false)) return null;
  return (
    <span data-slot="kbd" className={cx("dl-kbd", className)}>
      {caps ? (
        caps.map((key, index) => (
          <kbd key={index} data-slot="kbd-key" className="dl-kbd-key">
            {key}
          </kbd>
        ))
      ) : (
        <kbd data-slot="kbd-key" className="dl-kbd-key">
          {children}
        </kbd>
      )}
    </span>
  );
}
