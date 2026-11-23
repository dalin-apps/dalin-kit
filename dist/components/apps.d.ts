/**
 * The four dalin apps: the name each wordmark ends in, the accent its period
 * is drawn in, and where it lives. The accents are each app's own
 * `--dl-accent`, written out here because a wordmark for another app (the
 * family switcher's rows) is drawn inside an app whose accent is its own.
 */
export type DalinApp = "mail" | "calendar" | "notes" | "drive";
export type DalinAppInfo = {
    id: DalinApp;
    /** The word after the period: "mail" in "dalin. mail". */
    name: string;
    /** The app's accent, as its own stylesheet sets `--dl-accent`. */
    accent: string;
    /** Where the app is served. */
    href: string;
};
/** In the family's order: mail, calendar, notes, drive. */
export declare const DALIN_APPS: readonly DalinAppInfo[];
/** One app's entry. */
export declare function dalinApp(id: DalinApp): DalinAppInfo;
//# sourceMappingURL=apps.d.ts.map