import type { CSSProperties, ReactNode } from "react";
import { type DalinApp } from "./apps.js";
export type WordmarkProps = {
    /** Which app's wordmark: the word in italic after the period. */
    app: DalinApp;
    /**
     * The size of the type: a number of px, or any CSS length. Left out, the
     * wordmark is set at the font size around it. The desktop sidebar and the
     * phone's home title both use 32.
     */
    size?: number | string;
    /**
     * The colour of the period. Left out, it is the accent of the app the
     * wordmark is drawn in (`--dl-accent`), which is right for an app's own
     * wordmark. `"own"` is the named app's accent whatever app draws it, for a
     * list of the family's apps. Any other value is used as the colour.
     */
    accent?: "own" | (string & {});
    /**
     * Shows "d." alone, with "alin" and the app's name rolled up behind it:
     * the wordmark of a folded sidebar. The box is the folded width.
     */
    folded?: boolean;
    /**
     * Rolls "alin" and the app's name out from behind "d." as it mounts,
     * mail's sidebar animation: 1.1s, then the name half a second behind over
     * 0.95s. Give the wordmark a `key` that changes to play it again, as an
     * app does each time its sidebar unfolds. Nothing rolls while the system
     * asks for reduced motion.
     */
    rollOut?: boolean;
    /** Extra classes, beside `dl-wordmark`. */
    className?: string;
    style?: CSSProperties;
};
/**
 * The family's wordmark: "dalin" in Georgia, the period in the app's accent,
 * and the app's name in italic, as each app's sidebar drew it by hand. One
 * image to a screen reader, named "dalin. mail".
 *
 * It is drawn at the size the app sets and carries no layout of its own: no
 * height, no padding, no margin. The sidebar's header and the phone's title
 * row place it. `wordmark.css` styles it.
 */
export declare function Wordmark({ app, size, accent, folded, rollOut, className, style }: WordmarkProps): ReactNode;
//# sourceMappingURL=wordmark.d.ts.map