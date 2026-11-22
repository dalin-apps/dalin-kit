import type { ReactNode } from "react";
/** The class of a result that keeps the phone's progress bar, solid green (toast.css). */
export declare const PROGRESS_DONE_TOAST = "toast-progress-done";
/**
 * The progress kind's icon: a ring with one arc in the app's accent
 * (`.toast-spinner` in toast.css). The `<Toaster>` hands it to Sonner for
 * `toast.loading()` and promise toasts, so those need nothing. It is exported
 * for a plain toast that carries the progress class itself:
 *
 *   toast("Uploading", { className: PROGRESS_TOAST, icon: <ToastSpinner /> })
 */
export declare function ToastSpinner(): ReactNode;
//# sourceMappingURL=toast-spinner.d.ts.map