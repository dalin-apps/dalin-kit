import type { ReactNode } from "react";
export type MeterProps = {
    /** How full, as a fraction from 0 to 1. Out of range is held to the nearest end, and no figure reads as empty. */
    share: number | null | undefined;
    /** The meter's name for a screen reader: "dalin space, used". */
    label: string;
    /** What it reads as when a percent says too little: "620 MB of 1 GB". */
    valueText?: string;
    /**
     * The fill's colour while nothing is wrong, for a meter that measures one
     * source: that source's own colour. Without it the fill is the app's
     * accent. The warning colours replace it from 80%.
     */
    color?: string;
    /** False for a meter where full is no warning: a cache that is meant to fill. */
    warns?: boolean;
    /**
     * The thin meter: a 4px track, a tick where amber starts, and the percent
     * beside it in the fill's colour. It is the look picked for drive's
     * storage card. Without it the meter is the 6px bar of a settings row.
     */
    thin?: boolean;
    className?: string;
};
/**
 * How full something is, as one bar.
 *
 * The four apps each had a meter, and they had drifted: drive warned at 80%
 * and 95%, the other three went red at 90%, and drive's status bar never
 * changed colour at all. This is the one meter, on drive's thresholds
 * (`fillLevel`), with a name a screen reader can say.
 *
 * An empty place draws no fill. A place holding anything draws at least a
 * sliver, so "empty" and "nearly empty" never look the same.
 *
 * `data.css` styles it.
 */
export declare function Meter({ share, label, valueText, color, warns, thin, className }: MeterProps): ReactNode;
export type MeterWordProps = {
    /** The same fraction its meter was given. */
    share: number | null | undefined;
    className?: string;
};
/**
 * The word beside a meter: "Nearly full" from 80%, "Full" from 95%, and
 * nothing before that. It wears the level's colour, lifted far enough to
 * read as small text on a card.
 */
export declare function MeterWord({ share, className }: MeterWordProps): ReactNode;
//# sourceMappingURL=meter.d.ts.map