/**
 * @vitest-environment jsdom
 *
 * The long press a phone row takes (long-press.ts): what ends a hold before
 * it fires, and the click it swallows after it fires.
 */
import { act, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { mount, one, settle, withDom } from "../../test/dom.js";
import { LONG_PRESS_MS, useLongPress } from "./long-press.js";

withDom();

function Row({ onLongPress, onClick }: { onLongPress: () => void; onClick: () => void }): ReactNode {
  const handlers = useLongPress(onLongPress);
  return (
    <button type="button" id="row" onClick={onClick} {...handlers}>
      Dana Ito
    </button>
  );
}

const at = (x: number, y: number) => ({ clientX: x, clientY: y, identifier: 1 }) as unknown as Touch;
async function fire(type: string, touches: Touch[] = []): Promise<void> {
  await act(async () => {
    one("#row")!.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches }));
  });
}

describe("useLongPress", () => {
  it("drops the hold when a second finger lands", async () => {
    const onLongPress = vi.fn();
    await mount(<Row onLongPress={onLongPress} onClick={() => {}} />);
    await fire("touchstart", [at(20, 30)]);
    await fire("touchstart", [at(20, 30), at(120, 30)]);
    await settle(LONG_PRESS_MS + 100);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("takes the browser's own menu for a finger that moved on as no hold", async () => {
    const onLongPress = vi.fn();
    await mount(<Row onLongPress={onLongPress} onClick={() => {}} />);
    await fire("touchstart", [at(20, 30)]);
    await fire("touchmove", [at(20, 60)]);
    await act(async () => {
      one("#row")!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 60 }));
    });
    await settle(LONG_PRESS_MS + 100);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("lets the next activation run after a long press the browser followed with no click", async () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    await mount(<Row onLongPress={onLongPress} onClick={onClick} />);
    await fire("touchstart", [at(20, 30)]);
    await settle(LONG_PRESS_MS + 50);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    await fire("touchend");
    // No click from the lift. A while later, Enter on the row.
    await settle(800);
    await act(async () => {
      one<HTMLButtonElement>("#row")!.click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("still swallows the click the lifting finger makes", async () => {
    const onClick = vi.fn();
    await mount(<Row onLongPress={() => {}} onClick={onClick} />);
    await fire("touchstart", [at(20, 30)]);
    await settle(LONG_PRESS_MS + 50);
    await fire("touchend");
    await act(async () => {
      one<HTMLButtonElement>("#row")!.click();
    });
    expect(onClick).not.toHaveBeenCalled();
  });
});
