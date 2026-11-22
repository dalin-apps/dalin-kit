/**
 * @vitest-environment jsdom
 *
 * What the package's root hands an app: every helper, beside the toast.
 */
import { describe, expect, it } from "vitest";
import * as kit from "../index.js";

describe("@dalin/kit", () => {
  it.each([
    "watchLeaving",
    "leaveInPlace",
    "endFades",
    "shouldLeave",
    "LEAVING_ATTR",
    "watchInputModality",
    "startedFromKeyboard",
    "inputForKey",
    "INPUT_ATTR",
    "shortcutLabel",
    "shortcutLabelFor",
    "isMacPlatform",
    "tipText",
    "TipKey",
    "Toaster",
    "ToastBand",
    "useStackSwipe",
    "useToastDock",
    "PINNED_TOAST",
    "PROGRESS_TOAST",
    "ToastSpinner",
  ])("exports %s from its root", (name) => {
    expect((kit as Record<string, unknown>)[name]).toBeDefined();
  });
});
