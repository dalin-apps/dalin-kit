/**
 * How full a place is, as the family says it.
 *
 * The owner picked one rule for all four apps on 2026-11-27: a meter warns
 * in amber from 80% and turns red from 95%, with the words "Nearly full" and
 * "Full". It was drive's rule. Notes, mail and calendar had gone straight to
 * red at 90% with no word, so a warning arrived with the failure.
 *
 * A share is a fraction, 0 to 1. Anything that isn't a number reads as no
 * warning: a place with no ceiling has nothing to be full of.
 */
export type FillLevel = "ok" | "high" | "full";
/** Where amber starts, and where red does. */
export declare const FILL_HIGH = 0.8;
export declare const FILL_FULL = 0.95;
export declare function fillLevel(share: number | null | undefined): FillLevel;
/** The word a level is given beside its meter, or nothing while all is well. */
export declare function fillWord(level: FillLevel): "" | "Nearly full" | "Full";
/**
 * A share as a whole percent, 0 to 100. A place that holds something never
 * reads 0, and one that is not yet full never reads 100.
 */
export declare function fillPercent(share: number | null | undefined): number;
//# sourceMappingURL=fill-level.d.ts.map