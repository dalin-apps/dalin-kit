/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { SEG_SLIDE_ATTR, placeSegLift, slideSegLift } from "./seg-slide.js";

/** jsdom lays nothing out, so each option is given the box a browser would measure. */
function group(widths: number[], picked: number): HTMLElement {
  const el = document.createElement("span");
  el.className = "dl-seg";
  let x = 2;
  widths.forEach((w, i) => {
    const b = document.createElement("button");
    b.className = "dl-seg-option";
    b.setAttribute("aria-checked", String(i === picked));
    const left = x;
    Object.defineProperties(b, {
      offsetLeft: { get: () => left },
      offsetTop: { get: () => 2 },
      offsetWidth: { get: () => w },
      offsetHeight: { get: () => 22 },
    });
    x += w;
    el.append(b);
  });
  document.body.append(el);
  return el;
}

const vars = (el: HTMLElement) =>
  ["--dl-seg-x", "--dl-seg-y", "--dl-seg-w", "--dl-seg-h"].map((n) => el.style.getPropertyValue(n));
const settle = () => new Promise((r) => setTimeout(r, 0));
const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

afterEach(() => document.body.replaceChildren());

describe("placeSegLift", () => {
  it("writes the picked segment's box on the group", () => {
    const el = group([40, 70, 36], 1);
    expect(placeSegLift(el)).toBe(true);
    expect(vars(el)).toEqual(["42px", "2px", "70px", "22px"]);
  });

  it("places nothing when no segment is picked", () => {
    const el = group([40, 70], -1);
    expect(placeSegLift(el)).toBe(false);
    expect(vars(el)).toEqual(["", "", "", ""]);
  });

  it("places nothing while the group isn't drawn", () => {
    const el = group([0, 0], 0);
    expect(placeSegLift(el)).toBe(false);
  });
});

describe("slideSegLift", () => {
  it("does nothing with null, as a ref callback may be handed", () => {
    expect(slideSegLift(null)).toBeUndefined();
  });

  it("places the lift at once, then goes live from the next frame", async () => {
    const el = group([40, 70, 36], 0);
    const stop = slideSegLift(el)!;
    expect(el.getAttribute(SEG_SLIDE_ATTR)).toBe("placed");
    expect(vars(el)[0]).toBe("2px");
    await frame();
    await frame();
    expect(el.getAttribute(SEG_SLIDE_ATTR)).toBe("live");
    stop();
  });

  it("follows a new pick", async () => {
    const el = group([40, 70, 36], 0);
    const stop = slideSegLift(el)!;
    const [a, , c] = el.querySelectorAll("button");
    a!.setAttribute("aria-checked", "false");
    c!.setAttribute("aria-checked", "true");
    await settle();
    expect(vars(el)).toEqual(["112px", "2px", "36px", "22px"]);
    stop();
  });

  it("hands the lift back to the picked segment when nothing is picked", async () => {
    const el = group([40, 70], 0);
    const stop = slideSegLift(el)!;
    el.querySelector("button")!.setAttribute("aria-checked", "false");
    await settle();
    expect(el.hasAttribute(SEG_SLIDE_ATTR)).toBe(false);
    stop();
  });

  it("stops watching and clears what it wrote", async () => {
    const el = group([40, 70], 0);
    slideSegLift(el)!();
    expect(el.hasAttribute(SEG_SLIDE_ATTR)).toBe(false);
    expect(vars(el)).toEqual(["", "", "", ""]);
    el.querySelector("button")!.setAttribute("aria-checked", "false");
    el.querySelectorAll("button")[1]!.setAttribute("aria-checked", "true");
    await settle();
    expect(vars(el)).toEqual(["", "", "", ""]);
  });
});
