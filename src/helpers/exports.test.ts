/**
 * @vitest-environment jsdom
 *
 * What the package's root hands an app: every helper and every component,
 * beside the toast. The components also export from @dalin/kit/components.
 */
import { describe, expect, it } from "vitest";
import * as kit from "../index.js";
import * as components from "../components/index.js";

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
    "setMotionReader",
    "reducesMotion",
    "systemReducesMotion",
    "setMotionAttr",
    "MOTION_ATTR",
    "Toaster",
    "ToastBand",
    "useStackSwipe",
    "useToastDock",
    "PINNED_TOAST",
    "PROGRESS_TOAST",
    "COUNTDOWN_TOAST",
    "DALIN_APPS",
    "Wordmark",
    "FamilySwitcher",
    "Menu",
    "MenuContent",
    "MenuItem",
    "MenuShortcut",
    "ContextMenu",
    "ContextMenuContent",
    "Popover",
    "PopoverContent",
    "Kbd",
    "EmptyState",
    "CommandPalette",
    "matchParts",
    "PhoneHeader",
    "PhoneHeaderIcon",
    "PhoneSearch",
    "PhoneSearchAvatar",
    "ToastSpinner",
  ])("exports %s from its root", (name) => {
    expect((kit as Record<string, unknown>)[name]).toBeDefined();
  });

  it("exports every component from the components entry too", () => {
    for (const name of Object.keys(components)) {
      expect((kit as Record<string, unknown>)[name], name).toBe((components as Record<string, unknown>)[name]);
    }
    expect(Object.keys(components).length).toBeGreaterThanOrEqual(40);
  });
});
