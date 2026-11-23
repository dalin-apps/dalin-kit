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
export const DALIN_APPS: readonly DalinAppInfo[] = [
  { id: "mail", name: "mail", accent: "oklch(0.64 0.28 285)", href: "https://mail.dalin.pro" },
  { id: "calendar", name: "calendar", accent: "oklch(0.64 0.16 50)", href: "https://calendar.dalin.pro" },
  { id: "notes", name: "notes", accent: "oklch(0.85 0.175 95)", href: "https://notes.dalin.pro" },
  { id: "drive", name: "drive", accent: "oklch(0.64 0.16 240)", href: "https://drive.dalin.pro" },
];

/** One app's entry. */
export function dalinApp(id: DalinApp): DalinAppInfo {
  return DALIN_APPS.find((app) => app.id === id)!;
}
