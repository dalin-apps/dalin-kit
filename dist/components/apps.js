/** In the family's order: mail, calendar, notes, drive. */
export const DALIN_APPS = [
    { id: "mail", name: "mail", accent: "oklch(0.64 0.28 285)", href: "https://mail.dalin.pro" },
    { id: "calendar", name: "calendar", accent: "oklch(0.64 0.16 50)", href: "https://calendar.dalin.pro" },
    { id: "notes", name: "notes", accent: "oklch(0.85 0.175 95)", href: "https://notes.dalin.pro" },
    { id: "drive", name: "drive", accent: "oklch(0.64 0.16 240)", href: "https://drive.dalin.pro" },
];
/** One app's entry. */
export function dalinApp(id) {
    return DALIN_APPS.find((app) => app.id === id);
}
//# sourceMappingURL=apps.js.map