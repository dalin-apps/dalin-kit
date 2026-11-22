"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { toast } from "sonner";

/**
 * Which card on screen is which toast.
 *
 * Sonner draws each toast as an `<li>` and puts no id on it. An arriving
 * toast is always the front card, so the announce never needed one. A toast
 * updated in place can sit anywhere in the stack, and to announce it again
 * the stylesheet has to be pointed at that one card.
 *
 * So each card is tagged as it mounts. Sonner mounts cards one at a time, in
 * the order the toasts were raised, so a new card belongs to the oldest live
 * toast that has no card yet. The tag is a map held here; nothing is written
 * on the card until it is announced again (`data-again`, toaster.tsx).
 *
 * The pairing can miss in one case: a toast raised and dismissed before its
 * card mounted. Then `find` returns null for a toast, and the toaster simply
 * does not announce that update again.
 */
const CARD = "[data-sonner-toast]";

export function useToastTags(root: RefObject<HTMLElement | null>): (id: string) => HTMLElement | null {
  const cards = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const el = root.current;
    if (!el || typeof MutationObserver === "undefined") return;
    const map = cards.current;
    const tag = (card: HTMLElement) => {
      for (const [id, known] of map) if (!known.isConnected) map.delete(id);
      for (const known of map.values()) if (known === card) return;
      for (const live of toast.getToasts()) {
        const id = String(live.id);
        if (map.has(id)) continue;
        map.set(id, card);
        return;
      }
    };
    const read = (node: Node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(CARD)) tag(node);
      else for (const card of node.querySelectorAll<HTMLElement>(CARD)) tag(card);
    };
    // Cards already up (the toaster remounted under a live stack), oldest
    // first: Sonner lists the newest first.
    for (const card of [...el.querySelectorAll<HTMLElement>(CARD)].reverse()) tag(card);
    const observer = new MutationObserver((records) => {
      for (const record of records) record.addedNodes.forEach(read);
    });
    observer.observe(el, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      map.clear();
    };
  }, [root]);

  return useCallback((id: string) => {
    const card = cards.current.get(id);
    return card?.isConnected ? card : null;
  }, []);
}
