/**
 * The family's release rule and the start rules, as pure functions.
 */
import { describe, expect, it } from "vitest";
import {
  SHEET_DISMISS_PX,
  SHEET_OPEN_GUARD_MS,
  SHEET_SCROLL_GUARD_MS,
  nextSheetVelocity,
  sheetDismissDistance,
  sheetDragBlock,
  sheetShouldDismiss,
} from "./sheet-release.js";

describe("the release rule", () => {
  it("closes past 96px on a tall sheet, where Base UI would want half its height", () => {
    expect(sheetDismissDistance(600)).toBe(96);
    expect(sheetShouldDismiss({ offset: 97, height: 600, velocity: 0 })).toBe(true);
    expect(sheetShouldDismiss({ offset: 96, height: 600, velocity: 0 })).toBe(false);
  });

  it("closes past 40% of a short sheet's height, which comes before 96px", () => {
    expect(sheetDismissDistance(200)).toBe(80);
    expect(sheetShouldDismiss({ offset: 81, height: 200, velocity: 0 })).toBe(true);
    expect(sheetShouldDismiss({ offset: 80, height: 200, velocity: 0 })).toBe(false);
  });

  it("falls back to 96px for a sheet with no measured height", () => {
    expect(sheetDismissDistance(0)).toBe(SHEET_DISMISS_PX);
    expect(sheetShouldDismiss({ offset: 40, height: 0, velocity: 0 })).toBe(false);
  });

  it("closes on a flick above 0.5px/ms once the sheet has travelled 16px", () => {
    expect(sheetShouldDismiss({ offset: 16, height: 600, velocity: 0.51 })).toBe(true);
    expect(sheetShouldDismiss({ offset: 15, height: 600, velocity: 2 })).toBe(false);
    expect(sheetShouldDismiss({ offset: 40, height: 600, velocity: 0.5 })).toBe(false);
  });

  it("never closes a sheet that sits at or above where it rests", () => {
    expect(sheetShouldDismiss({ offset: 0, height: 600, velocity: 3 })).toBe(false);
    expect(sheetShouldDismiss({ offset: -30, height: 600, velocity: 3 })).toBe(false);
  });
});

describe("the drag's speed", () => {
  it("takes the first sample whole, then leans on the newest", () => {
    expect(nextSheetVelocity(0, 20, 20)).toBe(1);
    expect(nextSheetVelocity(1, 1, 30)).toBeCloseTo(0.3 + (1 / 30) * 0.7, 6);
  });

  it("keeps the last speed for a move that took no time", () => {
    expect(nextSheetVelocity(0.8, 5, 0)).toBe(0.8);
  });
});

describe("the start rules", () => {
  const free = { sinceOpen: 5000, sinceScroll: 5000, onSelect: false, selecting: false };

  it("lets a press drag when nothing stands in its way", () => {
    expect(sheetDragBlock(free)).toBeNull();
  });

  it("starts no drag in the sheet's first half second", () => {
    expect(sheetDragBlock({ ...free, sinceOpen: SHEET_OPEN_GUARD_MS - 1 })).toBe("opening");
    expect(sheetDragBlock({ ...free, sinceOpen: SHEET_OPEN_GUARD_MS })).toBeNull();
  });

  it("starts none for a tenth of a second after the body scrolled", () => {
    expect(sheetDragBlock({ ...free, sinceScroll: SHEET_SCROLL_GUARD_MS - 1 })).toBe("scrolled");
    expect(sheetDragBlock({ ...free, sinceScroll: SHEET_SCROLL_GUARD_MS })).toBeNull();
  });

  it("starts none on a select, or while text is selected", () => {
    expect(sheetDragBlock({ ...free, onSelect: true })).toBe("select");
    expect(sheetDragBlock({ ...free, selecting: true })).toBe("selection");
  });
});
