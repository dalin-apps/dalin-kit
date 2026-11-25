/**
 * The ranking of the palette's actions: every-word matches first by cmdk's
 * command-score, then the rows the score alone finds, and the letters such
 * a row marks.
 */
import { describe, expect, it } from "vitest";
import { commandScore } from "./command-score.js";
import { SCORE_FLOOR, rankActions, scoreParts, scoreQuery } from "./palette-match.js";

describe("rankActions", () => {
  // The action titles of the four apps, pooled: notes, drive, calendar and
  // mail's commands. The research behind the ranking was run on this list.
  const POOLED = [
    "New page",
    "New note",
    "New to-do list",
    "New board",
    "Show the archive",
    "Fold or open the sidebar",
    "Settings",
    "Upload",
    "New folder",
    "Home",
    "Recent",
    "Starred",
    "Shared",
    "Tags",
    "Archive",
    "Create event…",
    "Refresh your calendars",
    "Switch to Day view",
    "Switch to Week view",
    "Switch to Month view",
    "Jump to today",
    "New message",
    "New throwaway address",
    "Go to Sent",
    "Refresh mail",
    "Open Settings",
  ].map((title) => ({ title }));
  const ranked = (query: string) => rankActions(POOLED, query).map(({ item }) => item.title);

  it("finds a row by letters that start its words, or by a word written with a hyphen", () => {
    expect(ranked("todo")[0]).toBe("New to-do list");
    expect(ranked("np")[0]).toBe("New page");
    expect(ranked("swm")[0]).toBe("Switch to Month view");
  });

  it("puts the closer of two every-word matches first", () => {
    const arch = ranked("arch");
    expect(arch.indexOf("Archive")).toBeLessThan(arch.indexOf("Show the archive"));
    expect(arch.slice(0, 2)).toEqual(["Archive", "Show the archive"]);
  });

  it("keeps an every-word match above a row only the score finds", () => {
    const shar = ranked("shar");
    expect(shar[0]).toBe("Shared");
    expect(shar).toContain("Show the archive");
  });

  it("says which rows only the score found", () => {
    const found = rankActions(POOLED, "shar");
    expect(found[0]).toEqual({ item: { title: "Shared" }, byScore: false });
    expect(found.find(({ item }) => item.title === "Show the archive")?.byScore).toBe(true);
  });

  it("leaves out a row the letters only reach mid-word", () => {
    // s, h and a from three different words, the a from the middle of one.
    expect(ranked("sha")).not.toContain("Switch to Month view");
    expect(scoreQuery("Fold or open the sidebar", "np")).toBeLessThan(SCORE_FLOOR);
    expect(ranked("np")).not.toContain("Fold or open the sidebar");
  });

  it("keeps the app's order with no query, and for rows that score the same", () => {
    expect(ranked("")).toEqual(POOLED.map((row) => row.title));
    const twins = [{ title: "New page", id: 1 }, { title: "New page", id: 2 }];
    expect(rankActions(twins, "new").map(({ item }) => item.id)).toEqual([1, 2]);
  });

  it("matches accent-folded text, and counts keywords as more text", () => {
    expect(rankActions([{ title: "Résumé" }], "resume")).toHaveLength(1);
    expect(rankActions([{ title: "New page", keywords: "create add" }], "create")).toHaveLength(1);
    expect(scoreQuery("Résumé", "resu")).toBeGreaterThan(0.9);
  });
});

describe("commandScore", () => {
  it("is cmdk's: 1 for the whole text, less for a jump, 0 for letters out of order", () => {
    expect(commandScore("archive", "archive", [])).toBe(1);
    expect(commandScore("archive", "arch", [])).toBeCloseTo(0.99, 5);
    expect(commandScore("new page", "np", [])).toBeCloseTo(0.9 * 0.99, 5);
    expect(commandScore("new page", "pn", [])).toBe(0);
  });
});

describe("scoreParts", () => {
  const marked = (text: string, query: string) => scoreParts(text, query).filter((part) => part.match).map((part) => part.text);

  it("marks the letters the score took, preferring the starts of words", () => {
    expect(marked("New to-do list", "todo")).toEqual(["to", "do"]);
    expect(marked("New page", "np")).toEqual(["N", "p"]);
    expect(marked("Switch to Month view", "swm")).toEqual(["Sw", "M"]);
  });

  it("marks nothing when the letters are not all in the text", () => {
    expect(scoreParts("New page", "create")).toEqual([{ text: "New page", match: false }]);
  });

  it("marks an accented letter as the one it folds to", () => {
    expect(marked("Élan vital", "ev")).toEqual(["É", "v"]);
  });
});
