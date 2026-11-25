/**
 * The family's release rule and the start rules, as pure functions.
 */
import { describe, expect, it } from "vitest";
import {
  SHEET_DISMISS_PX,
  SHEET_OPEN_GUARD_MS,
  SHEET_SCROLL_GUARD_MS,
  resolveSheetDismissDistance,
  sheetDismissDistance,
  sheetDragBlock,
  sheetReleaseVelocity,
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
  /** A flick at 2.8px/ms from 300, a move every 8ms. */
  const flick = [
    { y: 300, t: 0 },
    { y: 322, t: 8 },
    { y: 344, t: 16 },
    { y: 367, t: 24 },
    { y: 390, t: 32 },
  ];

  it("reads distance over time across the last three moves", () => {
    expect(sheetReleaseVelocity(flick, 34)).toBeCloseTo(68 / 24, 6);
  });

  it("keeps a flick a flick through a loaded frame: one move 60ms late", () => {
    // The last move arrives after a long frame. Mail's smoothing read
    // this one at 0.35px/ms once Android's still move came before the lift.
    const loaded = [
      { y: 300, t: 0 },
      { y: 316, t: 6 },
      { y: 338, t: 14 },
      { y: 360, t: 22 },
      { y: 390, t: 82 },
    ];
    expect(sheetReleaseVelocity(loaded, 86)).toBeCloseTo(74 / 76, 6);
  });

  it("reads only the last 100ms, or the last move alone where it took longer", () => {
    const slowThenFast = [
      { y: 300, t: 0 },
      { y: 310, t: 300 },
      { y: 320, t: 600 },
      { y: 370, t: 620 },
    ];
    expect(sheetReleaseVelocity(slowThenFast, 622)).toBeCloseTo(50 / 20, 6);
    const stalled = [
      { y: 300, t: 0 },
      { y: 316, t: 6 },
      { y: 390, t: 156 },
    ];
    expect(sheetReleaseVelocity(stalled, 158)).toBeCloseTo(74 / 150, 6);
  });

  it("has no speed once the pointer has been still for 80ms before the lift, or with one sample", () => {
    expect(sheetReleaseVelocity(flick, 32 + 81)).toBe(0);
    expect(sheetReleaseVelocity(flick, 32 + 80)).toBeGreaterThan(0.5);
    expect(sheetReleaseVelocity([{ y: 300, t: 0 }], 4)).toBe(0);
    expect(sheetReleaseVelocity([], 4)).toBe(0);
  });

  it("counts no stretch as shorter than 8ms, so two events a millisecond apart are no flick", () => {
    expect(sheetReleaseVelocity([{ y: 300, t: 0 }, { y: 302, t: 1 }], 1)).toBe(2 / 8);
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
