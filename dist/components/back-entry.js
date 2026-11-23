/**
 * One history entry for a layer that owns the system's back while it is
 * open: the phone's search sheet today.
 *
 * Opening pushes an entry, so Android's back button and the iOS back swipe
 * close the layer and never leave the app. The entry spreads the state it
 * was pushed over, which keeps a router's own markers on it (Next's App
 * Router reloads the page on an entry without them), and adds the layer's
 * token to a list under `dalinKit`. A traversal that lands on an entry
 * without that token means the layer's entry was taken, and the layer is
 * told to close. Closing from the screen takes the entry off instead.
 *
 * Two facts shape the rest. A reload keeps `history.state`, so a token
 * carries this page load's id and one from before the reload matches
 * nothing. And a traversal lands on a later task while `pushState` is
 * immediate, so an entry pushed while one of this module's own traversals
 * is still out waits for it to land: pushed at once, it would be the entry
 * that traversal took.
 */
const KEY = "dalinKit";
const SESSION = Math.random().toString(36).slice(2);
/** How long a traversal this module started may take before its caller is told it landed anyway. */
const LAND_MS = 400;
let serial = 0;
/** The entries that are open, and have not been taken off or told to close. */
const live = new Set();
/** Traversals this module started that have not landed, oldest first. */
const pops = [];
/** Entries that wait for those traversals before they are written. */
let waiting = [];
let listening = false;
function tokensHere() {
    const state = window.history.state;
    const list = state && typeof state === "object" ? state[KEY] : null;
    return Array.isArray(list) ? list : [];
}
function write(entry) {
    const state = window.history.state;
    const base = state && typeof state === "object" ? state : {};
    window.history.pushState({ ...base, [KEY]: [...tokensHere(), entry.token] }, "");
    entry.pushed = true;
}
function land(pop) {
    if (pop.landed)
        return;
    pop.landed = true;
    pops.splice(pops.indexOf(pop), 1);
    if (pops.length === 0) {
        const entries = waiting;
        waiting = [];
        for (const entry of entries)
            if (live.has(entry))
                write(entry);
    }
    pop.then?.();
}
function onPopState() {
    // The module's own traversal: its caller is waiting, and no layer closes.
    const own = pops[0];
    if (own) {
        land(own);
        return;
    }
    const here = tokensHere();
    for (const entry of [...live]) {
        if (!entry.pushed || here.includes(entry.token))
            continue;
        live.delete(entry);
        entry.onBack();
    }
}
/**
 * Pushes one history entry for a layer that has just opened. `onBack` is
 * called when the system's back takes the entry, and never for `pop()`.
 */
export function pushBackEntry(onBack) {
    if (!listening) {
        listening = true;
        window.addEventListener("popstate", onPopState);
    }
    const entry = { token: `${SESSION}:${++serial}`, onBack, pushed: false };
    live.add(entry);
    if (pops.length > 0)
        waiting.push(entry);
    else
        write(entry);
    return {
        pop(then) {
            if (!live.delete(entry)) {
                // The system's back took it, or it was popped already.
                then?.();
                return;
            }
            if (!entry.pushed) {
                waiting = waiting.filter((other) => other !== entry);
                then?.();
                return;
            }
            // Only the top entry can be taken with one step back. With another
            // entry pushed over it (the app navigated), it is left where it is.
            const here = tokensHere();
            if (here[here.length - 1] !== entry.token) {
                then?.();
                return;
            }
            const pop = { landed: false, then };
            pops.push(pop);
            window.history.back();
            // A traversal that never reports back must not hold a row's action.
            window.setTimeout(() => land(pop), LAND_MS);
        },
    };
}
//# sourceMappingURL=back-entry.js.map