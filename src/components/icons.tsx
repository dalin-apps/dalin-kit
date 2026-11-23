import type { ReactNode, SVGProps } from "react";

/**
 * The few glyphs the kit's own parts draw: a check, a chevron, a magnifying
 * glass. Each app has its own icon set and passes its own icons to every
 * part that takes one; these are only for what the kit draws by itself.
 * They are line icons on a 24px grid at a stroke of 2, the weight the apps'
 * own icons use.
 */
function Glyph({ children, ...props }: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CheckGlyph(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Glyph {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Glyph>
  );
}

export function ChevronRightGlyph(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Glyph {...props}>
      <path d="m9 18 6-6-6-6" />
    </Glyph>
  );
}

/** The family's magnifying glass: a lens of radius 8, so the four apps draw one icon. */
export function SearchGlyph(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Glyph {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Glyph>
  );
}
