/**
 * The widest viewport that gets the phone's toast by default: the pill docked
 * behind the bottom bar. An app whose phone shell runs wider names its own
 * width, with `<Toaster phoneMaxWidth>` or with `--dl-phone-max` on `:root`.
 */
export declare const PHONE_MAX_WIDTH_PX = 767;
/** The custom property an app may set on `:root` in place of the prop. */
export declare const PHONE_MAX_VAR = "--dl-phone-max";
/** The widest viewport that gets the phone layout right now, in px. */
export declare function readPhoneMaxWidth(): number;
/**
 * Names the phone width for every reader: the `<Toaster>`, the `<ToastBand>`
 * and `usePhoneLayout`. `<Toaster phoneMaxWidth>` calls it; `null` hands the
 * choice back to `--dl-phone-max`, read again, and then to the default.
 */
export declare function setPhoneMaxWidth(px: number | null): void;
/**
 * True when the viewport is at or under the phone width. SSR-safe: false on
 * the server, then the real value after hydration.
 */
export declare function usePhoneLayout(): boolean;
//# sourceMappingURL=use-phone-layout.d.ts.map