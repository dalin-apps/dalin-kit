import type { ReactNode, SVGProps } from "react";
export declare function CheckGlyph(props: SVGProps<SVGSVGElement>): ReactNode;
export declare function ChevronLeftGlyph(props: SVGProps<SVGSVGElement>): ReactNode;
export declare function ChevronRightGlyph(props: SVGProps<SVGSVGElement>): ReactNode;
/** The family's magnifying glass: a lens of radius 8, so the four apps draw one icon. */
export declare function SearchGlyph(props: SVGProps<SVGSVGElement>): ReactNode;
/** The filled form's stroke: lines have no inside to fill, so they get heavier. */
export declare const FILTER_FILLED_STROKE = 2.7;
export type FilterGlyphProps = SVGProps<SVGSVGElement> & {
    /** The filled form, for hover, an open menu and a filter that is on. */
    filled?: boolean;
};
/**
 * The family's filter: three lines that shorten as they go down, the list
 * getting smaller (the owner's pick on 2026-11-24, over two sliders and a
 * funnel). Lines have no inside, so its filled form draws them heavier.
 * `<FilterMenu>` switches to that form itself, in filter.css.
 */
export declare function FilterGlyph({ filled, ...props }: FilterGlyphProps): ReactNode;
//# sourceMappingURL=icons.d.ts.map