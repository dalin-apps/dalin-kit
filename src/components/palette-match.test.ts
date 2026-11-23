/**
 * The command palette's matching: the words of a query, whether a row holds
 * them, and where to mark them.
 */
import { describe, expect, it } from "vitest";
import { fold, matchParts, matchesQuery, queryTerms } from "./palette-match.js";

describe("fold", () => {
  it("lowers the case and takes the accents off", () => {
    expect(fold("Résumé FINAL")).toBe("resume final");
    expect(fold("Ramírez")).toBe("ramirez");
  });
});

describe("queryTerms", () => {
  it("cuts a query into its words, folded, once each", () => {
    expect(queryTerms("  Sound  check sound ")).toEqual(["sound", "check"]);
    expect(queryTerms("   ")).toEqual([]);
  });
});

describe("matchesQuery", () => {
  it("needs every word, in any order, anywhere in the text", () => {
    expect(matchesQuery("Sound cues: act 3", "act sound")).toBe(true);
    expect(matchesQuery("Sound cues: act 3", "sound band")).toBe(false);
    expect(matchesQuery("Switch to Week view", "wee")).toBe(true);
  });

  it("matches everything with no query", () => {
    expect(matchesQuery("Anything", "")).toBe(true);
  });

  it("ignores case and accents on both sides", () => {
    expect(matchesQuery("Avery Quinn-Ramírez", "RAMIREZ")).toBe(true);
    expect(matchesQuery("Avery Quinn-Ramirez", "ramírez")).toBe(true);
  });
});

describe("matchParts", () => {
  it("marks the matched run and keeps the text's own letters", () => {
    expect(matchParts("Sound cues: act 3", "sound")).toEqual([
      { text: "Sound", match: true },
      { text: " cues: act 3", match: false },
    ]);
  });

  it("marks every occurrence of every word", () => {
    expect(matchParts("Sound check, then sound desk", "sound desk")).toEqual([
      { text: "Sound", match: true },
      { text: " check, then ", match: false },
      { text: "sound", match: true },
      { text: " ", match: false },
      { text: "desk", match: true },
    ]);
  });

  it("joins runs that touch or overlap", () => {
    expect(matchParts("soundcheck", "sound check")).toEqual([{ text: "soundcheck", match: true }]);
    expect(matchParts("abcd", "abc bcd")).toEqual([{ text: "abcd", match: true }]);
  });

  it("marks an accented word the query wrote plain", () => {
    expect(matchParts("Quinn-Ramírez", "ramirez")).toEqual([
      { text: "Quinn-", match: false },
      { text: "Ramírez", match: true },
    ]);
  });

  it("keeps its place after a letter written as a base and a separate accent", () => {
    // "e" followed by a combining acute: two characters that fold to one.
    const decomposed = "Re\u0301sume\u0301 2026";
    expect(matchParts(decomposed, "2026")).toEqual([
      { text: "Re\u0301sume\u0301 ", match: false },
      { text: "2026", match: true },
    ]);
    // The accent is marked with its letter, so the mark is one run.
    expect(matchParts(decomposed, "resume")).toEqual([
      { text: "Re\u0301sume\u0301", match: true },
      { text: " 2026", match: false },
    ]);
  });

  it("returns the text whole with no query, or with no word found", () => {
    expect(matchParts("Load-in checklist", "")).toEqual([{ text: "Load-in checklist", match: false }]);
    expect(matchParts("Load-in checklist", "zebra")).toEqual([{ text: "Load-in checklist", match: false }]);
    expect(matchParts("", "zebra")).toEqual([]);
  });

  it("does not split an emoji it walks past", () => {
    expect(matchParts("🎸 Gig photos", "gig")).toEqual([
      { text: "🎸 ", match: false },
      { text: "Gig", match: true },
      { text: " photos", match: false },
    ]);
  });
});
