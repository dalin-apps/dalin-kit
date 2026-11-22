import type { ReactNode } from "react";
/**
 * An Undo toast's line: the item's name, then what happened to it ("Gate code
 * archived"), so two toasts waiting in the phone's stack say which Undo brings
 * back which item. The name leads because it is what tells them apart, and it
 * is the part that shortens when the line is too long (`.toast-line` in
 * toast.css), so the verb and the button always show whole.
 */
export declare function toastLine(name: string, verb: string): ReactNode;
//# sourceMappingURL=toast-line.d.ts.map