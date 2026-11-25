/**
 * The family's release rule and the start rules, as pure functions.
 */
import { describe, expect, it } from "vitest";
import {
  SHEET_DISMISS_PX,
  SHEET_OPEN_GUARD_MS,
  SHEET_SCROLL_GUARD_MS,
  nextSheetVelocity,
  resolveSheetDismissDistance,
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

describe("the two distance rules the apps have", () => {
  /** Mail's and calendar's sheets: the default. */
  const app = (offset: number, height: number) => sheetShouldDismiss({ offset, height, velocity: 0 });
  /** The Settings sheet in all four apps: `d.dy > DISMISS_PX`, with no share of the height. */
  const settings = (offset: number, height: number) =>
    sheetShouldDismiss({ offset, height, velocity: 0, distance: SHEET_DISMISS_PX });

  it("agree on a sheet 240px tall or more, where 40% of the height is 96px or past it", () => {
    for (const height of [240, 400, 600, 900]) {
      expect(sheetDismissDistance(height)).toBe(96);
      for (const offset of [50, 96, 97, 200]) expect(app(offset, height), `${offset} of ${height}`).toBe(settings(offset, height));
    }
  });

  it("differ on a sheet shorter than 240px: the app rule closes at 40%, the Settings rule still wants 96px", () => {
    // 200px tall: 40% is 80px.
    expect(app(85, 200)).toBe(true);
    expect(settings(85, 200)).toBe(false);
    expect(settings(96, 200)).toBe(false);
    expect(settings(97, 200)).toBe(true);
    // 239px tall, one short of where they meet: 40% is 95.6px.
    expect(app(96, 239)).toBe(true);
    expect(settings(96, 239)).toBe(false);
    // 150px tall: 40% is 60px.
    expect(app(61, 150)).toBe(true);
    expect(settings(61, 150)).toBe(false);
    expect(settings(97, 150)).toBe(true);
  });

  it("lets a sheet shorter than 96px close under the Settings rule: the finger may travel past its height", () => {
    expect(settings(90, 80)).toBe(false);
    expect(settings(97, 80)).toBe(true);
    expect(app(33, 80)).toBe(true);
  });

  it("share one flick: above 0.5px/ms once the sheet has travelled 16px", () => {
    for (const distance of [undefined, SHEET_DISMISS_PX]) {
      expect(sheetShouldDismiss({ offset: 20, height: 200, velocity: 0.6, distance })).toBe(true);
      expect(sheetShouldDismiss({ offset: 15, height: 200, velocity: 0.6, distance })).toBe(false);
      expect(sheetShouldDismiss({ offset: 20, height: 200, velocity: 0.5, distance })).toBe(false);
    }
  });

  it("takes the distance as a function of the height as well", () => {
    const half = (height: number) => height / 2;
    expect(resolveSheetDismissDistance(half, 300)).toBe(150);
    expect(sheetShouldDismiss({ offset: 140, height: 300, velocity: 0, distance: half })).toBe(false);
    expect(sheetShouldDismiss({ offset: 151, height: 300, velocity: 0, distance: half })).toBe(true);
  });

  it("falls back to the default for a distance that is no positive number", () => {
    expect(resolveSheetDismissDistance(undefined, 200)).toBe(80);
    expect(resolveSheetDismissDistance(0, 200)).toBe(80);
    expect(resolveSheetDismissDistance(Number.NaN, 200)).toBe(80);
    expect(resolveSheetDismissDistance(() => -5, 600)).toBe(96);
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
