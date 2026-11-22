/**
 * How a keyboard shortcut reads in a tooltip, after its label: "Undo · Ctrl+Z"
 * on a PC, "Undo · ⌘Z" on a Mac.
 *
 * `Mod` is the platform's command key, `Shift` its shift and `Alt` its option
 * key; every other key is written as given. Tooltips only ever render on the
 * client, after a hover, so reading the platform here can't cause a hydration
 * mismatch.
 */
export declare function isMacPlatform(platform: string): boolean;
/** Pure, so both spellings are tested. */
export declare function shortcutLabelFor(mac: boolean, keys: readonly string[]): string;
/** A chord's text for the platform the page is on: `shortcutLabel("Mod", "Z")`. */
export declare function shortcutLabel(...keys: string[]): string;
/**
 * A label and its key as one line of text, "Archive · E", for a place that
 * takes a string (an `aria-keyshortcuts` companion, a native menu). Without a
 * key it is the label alone.
 */
export declare function tipText(label: string, keys?: string | null): string;
//# sourceMappingURL=shortcut-label.d.ts.map