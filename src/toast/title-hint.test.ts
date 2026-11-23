/**
 * @vitest-environment jsdom
 *
 * A cut desktop title carries its full text as a `title` hint, and a title
 * that fits carries none. jsdom lays nothing out, so each title's widths are
 * given by hand.
 */
import { afterEach, describe, expect, it } from "vitest";
import { hintCutTitles, watchCutTitles } from "./title-hint.js";

function toast(words: string, widths: { scroll: number; client: number }): HTMLElement {
  const li = document.createElement("li");
  li.setAttribute("data-sonner-toast", "");
  li.innerHTML = `<div data-content><div data-title>${words}</div></div>`;
  const title = li.querySelector<HTMLElement>("[data-title]")!;
  Object.defineProperty(title, "scrollWidth", { configurable: true, get: () => widths.scroll });
  Object.defineProperty(title, "clientWidth", { configurable: true, get: () => widths.client });
  return li;
}

const titleOf = (li: Element) => li.querySelector("[data-title]")!;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("a desktop toast's title hint", () => {
  it("gives a cut title its whole text, and keeps the text in the page", () => {
    const words = "Moved 14 files from Every kind of file to the Archive of the Lisbon offsite";
    const li = toast(words, { scroll: 620, client: 300 });
    document.body.append(li);
    hintCutTitles(document.body);
    expect(titleOf(li).getAttribute("title")).toBe(words);
    expect(titleOf(li).textContent).toBe(words);
  });

  it("gives a title that fits no hint", () => {
    const li = toast("Saved", { scroll: 40, client: 300 });
    document.body.append(li);
    hintCutTitles(document.body);
    expect(titleOf(li).hasAttribute("title")).toBe(false);
  });

  it("takes its own hint off once the title fits, and never an app's", () => {
    const widths = { scroll: 620, client: 300 };
    const ours = toast("A long title that is cut", widths);
    const apps = toast("Another long title", { scroll: 620, client: 300 });
    titleOf(apps).setAttribute("title", "The app's own words");
    document.body.append(ours, apps);
    hintCutTitles(document.body);
    expect(titleOf(apps).getAttribute("title")).toBe("The app's own words");
    widths.scroll = 200;
    hintCutTitles(document.body);
    expect(titleOf(ours).hasAttribute("title")).toBe(false);
    expect(titleOf(apps).getAttribute("title")).toBe("The app's own words");
  });

  it("follows a toast as it arrives", async () => {
    const stop = watchCutTitles(document.body);
    const li = toast("Uploading 3 files to the shared folder for the October invoices", { scroll: 640, client: 300 });
    document.body.append(li);
    await new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)));
    expect(titleOf(li).getAttribute("title")).toBe("Uploading 3 files to the shared folder for the October invoices");
    stop();
  });
});
