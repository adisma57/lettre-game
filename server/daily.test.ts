import { describe, it, expect, beforeEach } from "vitest";
import { resolveBestPossible, resolveAnswers } from "./daily.js";
import { getDailyPuzzle, resetMemoryStore } from "./repo.js";

describe("resolveBestPossible", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("renvoie un nombre positif pour une date donnée", async () => {
    const best = await resolveBestPossible("2026-09-10");
    expect(best).toBeGreaterThan(0);
  });

  it("renvoie la même valeur au second appel sans recalculer", async () => {
    const first = await resolveBestPossible("2026-09-11");
    expect(await getDailyPuzzle("2026-09-11")).not.toBeNull();

    const second = await resolveBestPossible("2026-09-11");
    expect(second).toBe(first);
  });
});

describe("resolveAnswers", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("renvoie un mot solution non vide et exactement 10 mots classés", async () => {
    const { bestWord, topWords } = await resolveAnswers("2026-09-12");
    expect(bestWord.length).toBeGreaterThan(0);
    expect(topWords).toHaveLength(10);

    for (let i = 1; i < topWords.length; i++) {
      expect(topWords[i - 1].score.total).toBeGreaterThanOrEqual(topWords[i].score.total);
    }
  });

  it("est déterministe pour une même date", async () => {
    const first = await resolveAnswers("2026-09-13");
    resetMemoryStore();
    const second = await resolveAnswers("2026-09-13");

    expect(second.bestWord).toBe(first.bestWord);
    expect(second.topWords.map((r) => r.word)).toEqual(first.topWords.map((r) => r.word));
  });
});
