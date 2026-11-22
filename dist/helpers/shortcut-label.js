/**
 * How a keyboard shortcut reads in a tooltip, after its label: "Undo · Ctrl+Z"
 * on a PC, "Undo · ⌘Z" on a Mac.
 *
 * `Mod` is the platform's command key, `Shift` its shift and `Alt` its option
 * key; every other key is written as given. Tooltips only ever render on the
 * client, after a hover, so reading the platform here can't cause a hydration
 * mismatch.
 */
export function isMacPlatform(platform) {
    return /mac|iphone|ipad|ipod/i.test(platform);
}
/** Pure, so both spellings are tested. */
export function shortcutLabelFor(mac, keys) {
    const parts = keys.map((key) => {
        if (key === "Mod")
            return mac ? "⌘" : "Ctrl";
        if (key === "Shift")
            return mac ? "⇧" : "Shift";
        if (key === "Alt")
            return mac ? "⌥" : "Alt";
        return key;
    });
    // A Mac writes its chords run together (⌘⇧Z); a PC joins them with a plus.
    return parts.join(mac ? "" : "+");
}
/** A chord's text for the platform the page is on: `shortcutLabel("Mod", "Z")`. */
export function shortcutLabel(...keys) {
    const mac = typeof navigator !== "undefined" && isMacPlatform(navigator.platform || navigator.userAgent || "");
    return shortcutLabelFor(mac, keys);
}
/**
 * A label and its key as one line of text, "Archive · E", for a place that
 * takes a string (an `aria-keyshortcuts` companion, a native menu). Without a
 * key it is the label alone.
 */
export function tipText(label, keys) {
    return keys ? `${label} · ${keys}` : label;
}
//# sourceMappingURL=shortcut-label.js.map