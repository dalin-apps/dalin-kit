import type { ReactNode } from "react";
export type EmptyStateProps = {
    /** The place's icon, from the app's own set. It is drawn at 40px in the faint grey. */
    icon?: ReactNode;
    /** One line that says what is empty: "Nothing here yet", "No mail in Archive". */
    title: ReactNode;
    /**
     * One control under the title, for a place whose empty state is where you
     * fill it: an Upload button in an empty folder. Most empty places have
     * none.
     */
    action?: ReactNode;
    className?: string;
};
/**
 * An empty place: a large icon and a title, centred in its pane, with no
 * sentence under them. It is the look the owner kept for drive on
 * 2026-11-17 ("just get rid of the subtitles, but leave the large text and
 * icon") and picked for the family on 2026-11-22.
 *
 * There is no subtitle prop on purpose. What the title cannot say in one
 * line belongs in a tooltip or in the place itself once it has something in
 * it.
 *
 * It fills the pane it is put in: a flex child grows to the pane's free
 * space, and a block child takes the pane's height. `empty.css` styles it.
 */
export declare function EmptyState({ icon, title, action, className }: EmptyStateProps): ReactNode;
//# sourceMappingURL=empty-state.d.ts.map