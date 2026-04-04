import { describe, it, expect } from "vitest";
import { createSetDictionary } from "./DictionaryService";
import { solveTopN } from "./solver";
import { findBestWordForDraw } from "./findBestWord";

describe("solveTopN", () => {
  it("returns at most n results", () => {
    const dict = createSetDictionary(["rame", "mare", "amer", "arme", "ares"]);
    const draw = ["R", "A", "M", "E"];
    expect(solveTopN(draw, dict, 2).length).toBeLessThanOrEqual(2);
  });

  it("results are sorted by score descending", () => {
    const dict = createSetDictionary(["rame", "mare", "amer", "arme", "ra"]);
    const draw = ["R", "A", "M", "E"];
    const results = solveTopN(draw, dict, 10);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score.total).toBeGreaterThanOrEqual(results[i].score.total);
    }
  });

  it("on equal score, shorter word comes first", () => {
    // Both words use no draw letters → score 0 for both → sorted by length
    const dict = createSetDictionary(["xyz", "xyzw"]);
    const draw = ["R", "A", "M", "E"];
    const results = solveTopN(draw, dict, 10);
    expect(results[0].score.total).toBe(0);
    expect(results[1].score.total).toBe(0);
    expect(results[0].word.length).toBeLessThanOrEqual(results[1].word.length);
  });

  it("works with n = 1", () => {
    const dict = createSetDictionary(["rame", "ra", "mare"]);
    const draw = ["R", "A", "M", "E"];
    expect(solveTopN(draw, dict, 1).length).toBe(1);
  });

  it("top result matches findBestWordForDraw", () => {
    const dict = createSetDictionary(["rame", "mare", "amer", "arme", "ra"]);
    const draw = ["R", "A", "M", "E"];
    const top  = solveTopN(draw, dict, 1);
    const best = findBestWordForDraw(draw, dict);
    expect(top.length).toBe(1);
    expect(best).not.toBeNull();
    expect(top[0].score.total).toBe(best!.score);
  });

  it("returns empty array when dictionary is empty", () => {
    const dict = createSetDictionary([]);
    expect(solveTopN(["R", "A", "M", "E"], dict, 10)).toEqual([]);
  });

  it("all-zero-score words are sorted by length ascending", () => {
    // None of these share letters with the draw
    const dict = createSetDictionary(["sphinx", "gulf", "by"]);
    const draw = ["R", "A", "M", "E"];
    const results = solveTopN(draw, dict, 10);
    for (const r of results) expect(r.score.total).toBe(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].word.length).toBeLessThanOrEqual(results[i].word.length);
    }
  });
});
