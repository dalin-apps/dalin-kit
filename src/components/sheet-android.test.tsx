/**
 * @vitest-environment jsdom
 *
 * Android's back gesture, which Chrome hands to an open sheet through the
 * browser's CloseWatcher before history sees it. Base UI reads the
 * platform once, as its modules load, so this file names Android in the
 * user agent and stands in a CloseWatcher before it imports the sheet.
 */
import { act, type ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { mount, one, settle, withDom } from "../../test/dom.js";
import type { SheetProps } from "./sheet.js";

withDom();

/** The watchers Base UI has made, newest last. */
const watchers: EventTarget[] = [];
class FakeCloseWatcher extends EventTarget {
  constructor() {
    super();
    watchers.push(this);
  }
  destroy(): void {
    const at = watchers.indexOf(this);
    if (at !== -1) watchers.splice(at, 1);
  }
}

let sheet: typeof import("./sheet.js");
beforeAll(async () => {
  Object.defineProperty(window.navigator, "userAgent", {
    value: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36 jsdom",
    configurable: true,
  });
  (window as { CloseWatcher?: unknown }).CloseWatcher = FakeCloseWatcher;
  sheet = await import("./sheet.js");
});

function Back(props: Partial<SheetProps> & { log: string[] }): ReactNode {
  const { Sheet, SheetBody, SheetContent } = sheet;
  const { log, ...rest } = props;
  return (
    <Sheet
      defaultOpen
      {...rest}
      onOpenChange={(next, details) => {
        log.push(details.reason);
        rest.onOpenChange?.(next, details);
      }}
    >
      <SheetContent label="Event">
        <SheetBody>words</SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/** The back gesture, as Chrome sends it: `cancel` on the newest watcher. */
async function back(cancelable = true): Promise<void> {
  const watcher = watchers[watchers.length - 1];
  if (!watcher) throw new Error("no watcher");
  await act(async () => {
    watcher.dispatchEvent(new Event("cancel", { cancelable }));
  });
  await settle(80);
}

describe("<Sheet>, Android's back", () => {
  it("names it the kit's system back for a sheet with `systemBack` on", async () => {
    const log: string[] = [];
    await mount(<Back log={log} systemBack />);
    await settle(60);
    expect(watchers.length).toBeGreaterThan(0);
    await back();
    expect(log).toEqual(["system-back"]);
    expect(one(".dl-sheet")).toBeNull();
  });

  it("leaves Base UI's own name on it for a sheet without", async () => {
    const log: string[] = [];
    await mount(<Back log={log} />);
    await settle(60);
    await back();
    expect(log).toEqual(["close-watcher"]);
  });

  it("lets the app refuse the first back, and closes on a second the browser will not let be refused", async () => {
    const log: string[] = [];
    await mount(<Back log={log} systemBack onOpenChange={(_next, details) => details.cancel()} />);
    await settle(60);
    await back(true);
    expect(one(".dl-sheet")).not.toBeNull();
    // Chrome makes a second back with no tap between them one that cannot be cancelled.
    await back(false);
    expect(log).toEqual(["system-back", "system-back"]);
    expect(one(".dl-sheet")).toBeNull();
  });
});
