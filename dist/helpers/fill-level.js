/** Where amber starts, and where red does. */
export const FILL_HIGH = 0.8;
export const FILL_FULL = 0.95;
export function fillLevel(share) {
    if (typeof share !== "number" || !Number.isFinite(share))
        return "ok";
    if (share >= FILL_FULL)
        return "full";
    if (share >= FILL_HIGH)
        return "high";
    return "ok";
}
/** The word a level is given beside its meter, or nothing while all is well. */
export function fillWord(level) {
    if (level === "full")
        return "Full";
    if (level === "high")
        return "Nearly full";
    return "";
}
/**
 * A share as a whole percent, 0 to 100. A place that holds something never
 * reads 0, and one that is not yet full never reads 100.
 */
export function fillPercent(share) {
    if (typeof share !== "number" || !Number.isFinite(share) || share <= 0)
        return 0;
    if (share >= 1)
        return 100;
    return Math.min(99, Math.max(1, Math.round(share * 100)));
}
//# sourceMappingURL=fill-level.js.map