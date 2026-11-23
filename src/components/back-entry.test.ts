/**
 * @vitest-environment jsdom
 *
 * The history entry a layer owns while it is open: what the system's back
 * does to it, and what a traversal landing late must not do.
 */
import { describe, expect, it, vi } from "vitest";
import { pushBackEntry } from "./back-entry.js";

const layers = (): unknown[] => ((window.history.state as { dalinKit?: unknown[] } | null)?.dalinKit ?? []);
/** jsdom lands a traversal, and fires popstate, on a later task. */
const landed = () => new Promise((resolve) => setTimeout(resolve, 40));

describe("pushBackEntry", () => {
  it("tells the layer when the system's back takes its entry, and not when the layer pops it", async () => {
    const onBack = vi.fn();
    const entry = pushBackEntry(onBack);
    expect(layers()).toHaveLength(1);
    window.history.back();
    await landed();
    expect(onBack).toHaveBeenCalledTimes(1);
    // Already gone: popping it now steps back no further, and runs what waited.
    const back = vi.spyOn(window.history, "back");
    const then = vi.fn();
    entry.pop(then);
    expect(then).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();

    const quiet = vi.fn();
    const second = pushBackEntry(quiet);
    second.pop();
    await landed();
    expect(quiet).not.toHaveBeenCalled();
    expect(layers()).toHaveLength(0);
  });

  it("runs what waits on a pop only once the entry has gone", async () => {
    const entry = pushBackEntry(() => {});
    const seen: number[] = [];
    entry.pop(() => seen.push(layers().length));
    expect(seen).toEqual([]);
    await landed();
    expect(seen).toEqual([0]);
  });

  it("holds an entry pushed while a pop is still out, so the traversal does not take it", async () => {
    const first = pushBackEntry(() => {});
    first.pop();
    const onBack = vi.fn();
    const second = pushBackEntry(onBack);
    // Not written yet: the step back has not landed.
    expect(layers()).toHaveLength(1);
    await landed();
    expect(layers()).toHaveLength(1);
    expect(onBack).not.toHaveBeenCalled();
    second.pop();
    await landed();
    expect(layers()).toHaveLength(0);
  });

  it("stacks: the back takes the top layer and leaves the one under it open", async () => {
    const under = vi.fn();
    const over = vi.fn();
    const a = pushBackEntry(under);
    pushBackEntry(over);
    expect(layers()).toHaveLength(2);
    window.history.back();
    await landed();
    expect(over).toHaveBeenCalledTimes(1);
    expect(under).not.toHaveBeenCalled();
    a.pop();
    await landed();
    expect(layers()).toHaveLength(0);
  });

  it("leaves its entry where it is when the app has pushed over it", async () => {
    const entry = pushBackEntry(() => {});
    window.history.pushState({ page: "thread" }, "");
    const back = vi.spyOn(window.history, "back");
    const then = vi.fn();
    entry.pop(then);
    expect(back).not.toHaveBeenCalled();
    expect(then).toHaveBeenCalledTimes(1);
    back.mockRestore();
    window.history.go(-2);
    await landed();
  });
});
