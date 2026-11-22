/**
 * The widest viewport that gets the phone's toast: the pill docked behind the
 * bottom bar. `toast.css` switches layouts at the same width in its media
 * queries, so the two must change together.
 */
export declare const PHONE_MAX_WIDTH_PX = 767;
/**
 * True when the viewport is at or under the phone width. SSR-safe: false on
 * the server, then the real value after hydration.
 */
export declare function usePhoneLayout(): boolean;
//# sourceMappingURL=use-phone-layout.d.ts.map