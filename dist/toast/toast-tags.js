"use client";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
/**
 * Which card on screen is which toast.
 *
 * Sonner draws each toast as an `<li>` and puts no id on it. An arriving
 * toast is always the front card, so the announce never needed one. A toast
 * updated in place can sit anywhere in the stack, and to announce it again
 * the stylesheet has to be pointed at that one card.
 *
 * So each card is tagged as it mounts. Sonner tells its own list and
 * `useSonner` about a new toast one after the other, toast by toast, so the
 * cards mount in the order the ids reach the `<Toaster>`: the first card with
 * no id belongs to the first id with no card. The two are held in a queue
 * each and paired off as either arrives. The tag is a map held here; nothing
 * is written on the card until it is announced again (`data-again`,
 * toaster.tsx).
 *
 * Sonner's own list of live toasts (`toast.getToasts()`) is not read. Under
 * 2.0.7, which the four apps lock, `toast.dismiss()` with no id takes every
 * card away and leaves each toast listed as live for good, so "the oldest
 * live toast with no card" was one that had left long ago, and every card
 * after it was tagged as the wrong toast.
 *
 * The pairing can miss in one case: a toast updated before its card has been
 * seen. Then `find` returns null for it, and the toaster simply does not
 * announce that update again.
 */
const CARD = "[data-sonner-toast]";
export function useToastTags(root, toasts) {
    const cards = useRef(new Map());
    // Cards that have mounted and ids that have arrived, each waiting for the
    // other, oldest first.
    const loose = useRef({
        cards: [],
        ids: [],
        live: new Set(),
    });
    const pair = useCallback(() => {
        const { cards: waiting, ids } = loose.current;
        while (waiting.length > 0 && ids.length > 0) {
            const card = waiting.shift();
            const id = ids.shift();
            if (card.isConnected)
                cards.current.set(id, card);
            else
                ids.unshift(id);
        }
    }, []);
    useEffect(() => {
        const el = root.current;
        if (!el || typeof MutationObserver === "undefined")
            return;
        const map = cards.current;
        const state = loose.current;
        const each = (node, fn) => {
            if (!(node instanceof HTMLElement))
                return;
            if (node.matches(CARD))
                fn(node);
            else
                for (const card of node.querySelectorAll(CARD))
                    fn(card);
        };
        const arrive = (card) => {
            if (state.cards.includes(card))
                return;
            for (const known of map.values())
                if (known === card)
                    return;
            state.cards.push(card);
        };
        const leave = (card) => {
            const at = state.cards.indexOf(card);
            if (at !== -1)
                state.cards.splice(at, 1);
            for (const [id, known] of map)
                if (known === card)
                    map.delete(id);
        };
        // Cards already up (the toaster remounted under a live stack), oldest
        // first: Sonner lists the newest first.
        for (const card of [...el.querySelectorAll(CARD)].reverse())
            arrive(card);
        pair();
        const observer = new MutationObserver((records) => {
            // What left is read first, so a card that takes a leaver's place in
            // the same batch is never taken for the leaver.
            for (const record of records)
                record.removedNodes.forEach((node) => each(node, leave));
            for (const record of records)
                record.addedNodes.forEach((node) => each(node, arrive));
            pair();
        });
        observer.observe(el, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            map.clear();
            state.cards = [];
            state.ids = [];
            state.live = new Set();
        };
    }, [root, pair]);
    // The ids, as `useSonner` reports them: newest first, so they are read
    // from the far end. An id whose card is still up (dismissed and raised
    // again before the card had gone) keeps that card.
    useLayoutEffect(() => {
        const state = loose.current;
        const now = new Set(toasts.map((t) => String(t.id)));
        for (let i = toasts.length - 1; i >= 0; i--) {
            const id = String(toasts[i].id);
            if (state.live.has(id) || state.ids.includes(id))
                continue;
            if (cards.current.get(id)?.isConnected)
                continue;
            cards.current.delete(id);
            state.ids.push(id);
        }
        // An id that left before any card was paired with it is not waiting for
        // one: its card, had it mounted, would have been paired by now.
        state.ids = state.ids.filter((id) => now.has(id));
        state.live = now;
        pair();
    }, [toasts, pair]);
    return useCallback((id) => {
        const card = cards.current.get(id);
        return card?.isConnected ? card : null;
    }, []);
}
//# sourceMappingURL=toast-tags.js.map