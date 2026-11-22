import type { ReactNode } from "react";

/**
 * The action's key, after the label inside a tooltip: "New page · N". A
 * middle dot, then the key, muted and at the label's own size, so the label
 * still leads. Renders nothing without a key, so a caller can pass an
 * optional one straight through. Build a chord's text with `shortcutLabel`:
 *
 *   <TooltipContent>
 *     Undo
 *     <TipKey keys={shortcutLabel("Mod", "Z")} />
 *   </TooltipContent>
 *
 * It is the one piece mail's `TipKey` and notes' `TooltipKey` shared. The
 * tooltip itself stays each app's own. The grey is the family's muted text
 * (`--dl-fg-muted`); pass `className` to colour it with the app's own
 * utility instead.
 */
export function TipKey({ keys, className }: { keys?: string | null; className?: string }): ReactNode {
  if (!keys) return null;
  return (
    <span
      data-slot="tooltip-key"
      className={className}
      style={className ? undefined : { color: "var(--dl-fg-muted, #b8b8b8)" }}
    >
      {/* The leading space is for the tooltip's text ("Undo · Ctrl+Z"). It
          draws nothing where the tooltip is a flex row, whose gap spaces it. */}
      {" "}· {keys}
    </span>
  );
}
