/**
 * A shortcut in the words `aria-keyshortcuts` takes, from the caps an app
 * draws for it. A keycap is a picture: "Ctrl", "⌘", "⌫". A screen reader
 * wants the key's name: "Control", "Meta", "Backspace". Keys are joined with
 * a plus, modifiers first as the app wrote them: `["Ctrl", "K"]` is
 * "Control+K". A cap with no name of its own (a letter, a digit, "/") is
 * the key itself.
 */
const NAMES = {
    ctrl: "Control",
    control: "Control",
    "⌃": "Control",
    cmd: "Meta",
    command: "Meta",
    meta: "Meta",
    win: "Meta",
    "⌘": "Meta",
    alt: "Alt",
    opt: "Alt",
    option: "Alt",
    "⌥": "Alt",
    shift: "Shift",
    "⇧": "Shift",
    esc: "Escape",
    escape: "Escape",
    enter: "Enter",
    return: "Enter",
    "↵": "Enter",
    "⏎": "Enter",
    del: "Delete",
    delete: "Delete",
    "⌦": "Delete",
    backspace: "Backspace",
    "⌫": "Backspace",
    space: "Space",
    "␣": "Space",
    tab: "Tab",
    "⇥": "Tab",
    up: "ArrowUp",
    "↑": "ArrowUp",
    down: "ArrowDown",
    "↓": "ArrowDown",
    left: "ArrowLeft",
    "←": "ArrowLeft",
    right: "ArrowRight",
    "→": "ArrowRight",
    "+": "Plus",
};
/** One cap's key, as `aria-keyshortcuts` names it. */
function keyName(cap) {
    const text = cap.trim();
    return NAMES[text.toLowerCase()] ?? (text.length === 1 ? text.toUpperCase() : text);
}
/** The caps of one chord as an `aria-keyshortcuts` value. Empty for no caps. */
export function ariaKeyShortcuts(keys) {
    return keys
        .map(keyName)
        .filter((name) => name !== "")
        .join("+");
}
//# sourceMappingURL=key-names.js.map