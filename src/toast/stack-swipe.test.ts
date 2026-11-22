import { describe, expect, it } from "vitest";

import {
  SWIPE_LIFT_MAX_PX,
  SWIPE_LINE_PX,
  SWIPE_SLOP_PX,
  SWIPE_TUCK_PX,
  claimSwipe,
  inSwipeBand,
  readSwipe,
  swipeLine,
  type SwipeStart,
} from "./stack-swipe.js";

/** A press in the middle of a 58px pill whose top edge is at 700. */
const tucked: SwipeStart = { x: 200, y: 729, pillTop: 700, open: false };
const fanned: SwipeStart = { ...tucked, open: true };

describe("claimSwipe", () => {
  it.each([
    ["a tap that never moved", tucked, 200, 729, 0],
    ["a tap that jittered 4px up", tucked, 201, 725, 0],
    ["one pixel short of the slop", tucked, 200, 729 - (SWIPE_SLOP_PX - 1), 0],
    ["the slop, straight up", tucked, 200, 729 - SWIPE_SLOP_PX, 1],
    ["a finger sliding along the tabs", tucked, 240, 719, 0],
    ["up, but no more vertical than 1.5 to 1", tucked, 208, 717, 0],
    ["up and a little across", tucked, 204, 715, 1],
    ["down while tucked is nobody's", tucked, 200, 745, 0],
    ["up while fanned out is nobody's", fanned, 200, 700, 0],
    ["down while fanned out", fanned, 200, 729 + SWIPE_SLOP_PX, -1],
  ] as const)("%s", (_name, start, x, y, claimed) => {
    expect(claimSwipe(start, x, y)).toBe(claimed);
  });
});

describe("readSwipe, upward", () => {
  const line = swipeLine(tucked);

  it("puts the line just above the pill", () => {
    expect(line).toBe(700 - SWIPE_LINE_PX);
  });

  it("starts from nothing at the end of the slop", () => {
    expect(readSwipe(tucked, 1, 729 - SWIPE_SLOP_PX)).toEqual({
      kind: "pull",
      progress: 0,
      lift: 0,
    });
  });

  it("is full on the line and opens past it", () => {
    const at = readSwipe(tucked, 1, line);
    expect(at.kind).toBe("pull");
    if (at.kind === "pull") expect(at.progress).toBe(1);
    expect(readSwipe(tucked, 1, line - 1)).toEqual({ kind: "open" });
  });

  it("caps the lift", () => {
    const read = readSwipe(tucked, 1, line + 1);
    expect(read.kind).toBe("pull");
    if (read.kind === "pull") expect(read.lift).toBe(SWIPE_LIFT_MAX_PX);
  });

  it("never reads a drag back below its start as negative", () => {
    const read = readSwipe(tucked, 1, 760);
    expect(read).toEqual({ kind: "pull", progress: 0, lift: 0 });
  });
});

describe("readSwipe, downward", () => {
  it("builds over the tuck distance and then tucks", () => {
    const half = readSwipe(fanned, -1, 729 + SWIPE_SLOP_PX + SWIPE_TUCK_PX / 2);
    expect(half).toEqual({ kind: "tuck-pull", progress: 0.5 });
    expect(readSwipe(fanned, -1, 729 + SWIPE_SLOP_PX + SWIPE_TUCK_PX)).toEqual({
      kind: "tuck",
    });
  });
});

describe("inSwipeBand", () => {
  it("counts the gaps level with the pill and not the strip under it", () => {
    expect(inSwipeBand(700, 700, 758)).toBe(true);
    expect(inSwipeBand(758, 700, 758)).toBe(true);
    expect(inSwipeBand(770, 700, 758)).toBe(false);
    expect(inSwipeBand(690, 700, 758)).toBe(false);
  });
});
