/**
 * @vitest-environment jsdom
 *
 * What each entry hands an app. The root is the toast and the helpers, and
 * loads nothing of Base UI. The components, which are built on Base UI,
 * export from @dalin/kit/components alone.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as kit from "../index.js";
import * as components from "../components/index.js";
import * as helpers from "./index.js";
import * as toast from "../toast/index.js";

/** Every package a source file imports, through whatever it imports from the kit itself. */
function packagesFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const packages = new Set<string>();
  const read = (path: string): string | null => {
    for (const ext of [".ts", ".tsx"]) {
      try {
        return readFileSync(`${path}${ext}`, "utf8");
      } catch {
        // Try the other extension.
      }
    }
    return null;
  };
  const visit = (path: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    const source = read(path);
    if (source === null) throw new Error(`no source for ${path}`);
    const dir = path.slice(0, path.lastIndexOf("/"));
    for (const match of source.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)) {
      const spec = match[1]!;
      if (!spec.startsWith(".")) {
        packages.add(spec);
        continue;
      }
      const parts = `${dir}/${spec.replace(/\.js$/, "")}`.split("/");
      const out: string[] = [];
      for (const part of parts) {
        if (part === "..") out.pop();
        else if (part !== ".") out.push(part);
      }
      visit(out.join("/"));
    }
  };
  visit(entry);
  return packages;
}
const loadsBaseUi = (entry: string) => [...packagesFrom(entry)].some((name) => name.startsWith("@base-ui/"));

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
    "ToastSpinner",
  ])("exports %s from its root", (name) => {
    expect((kit as Record<string, unknown>)[name]).toBeDefined();
  });

  it("exports the whole toast and every helper from its root, and nothing else", () => {
    expect(Object.keys(kit).sort()).toEqual([...Object.keys(toast), ...Object.keys(helpers)].sort());
  });

  it("loads nothing of Base UI for an app that imports the toast or a helper", () => {
    expect(loadsBaseUi("src/index")).toBe(false);
    expect(loadsBaseUi("src/toast/index")).toBe(false);
    expect(loadsBaseUi("src/helpers/index")).toBe(false);
    // The check itself sees Base UI where it is.
    expect(loadsBaseUi("src/components/index")).toBe(true);
  });

  it("needs sonner and React at the root, and no other package", () => {
    const allowed = new Set(["react", "react/jsx-runtime", "react-dom", "sonner"]);
    expect([...packagesFrom("src/index")].filter((name) => !allowed.has(name))).toEqual([]);
  });
});

describe("@dalin/kit/components", () => {
  it.each([
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
    "SOURCE_WAIT_MS",
    "ariaKeyShortcuts",
    "Sheet",
    "SheetTrigger",
    "SheetContent",
    "SheetHandle",
    "SheetHeader",
    "SheetTitle",
    "SheetDescription",
    "SheetBody",
    "SheetFooter",
    "SheetClose",
    "SHEET_NO_DRAG_ATTR",
    "noSheetDrag",
    "sheetShouldDismiss",
    "sheetReleaseVelocity",
    "SHEET_FLING_WINDOW_MS",
    "sheetDragBlock",
    "SHEET_DISMISS_PX",
    "resolveSheetDismissDistance",
  ])("exports %s", (name) => {
    expect((components as Record<string, unknown>)[name]).toBeDefined();
  });

  it("is the one entry the components export from: the root has none of them", () => {
    for (const name of Object.keys(components)) expect((kit as Record<string, unknown>)[name], name).toBeUndefined();
    expect(Object.keys(components).length).toBeGreaterThanOrEqual(40);
  });
});

describe("package.json", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    peerDependencies: Record<string, string>;
    peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  };

  it("asks for Base UI only of an app that uses the components", () => {
    expect(pkg.peerDependencies["@base-ui/react"]).toBeDefined();
    expect(pkg.peerDependenciesMeta?.["@base-ui/react"]?.optional).toBe(true);
    expect(pkg.peerDependenciesMeta?.sonner).toBeUndefined();
  });

  it("asks for a Base UI that has the Drawer the sheet is built on", () => {
    expect(pkg.peerDependencies["@base-ui/react"]).toBe("^1.9.0");
  });
});
