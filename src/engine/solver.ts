import { scoreWord } from "./score";
import type { Draw, ScoreResult } from "./types";
import type { Dictionary } from "./DictionaryService";

export type SolverResult = {
  word: string;
  score: ScoreResult;
};

/**
 * Scans the entire dictionary and returns the top-n words for a given draw.
 * Sort: score descending, then word length ascending (shortest wins on tie).
 * Includes all valid French words, even those with total = 0.
 * O(n) where n ≈ 336k words.
 */
export function solveTopN(
  draw: Draw,
  dictionary: Dictionary,
  n: number
): SolverResult[] {
  const results: SolverResult[] = [];

  for (const word of dictionary.words()) {
    results.push({ word, score: scoreWord(draw, word) });
  }

  results.sort(
    (a, b) => b.score.total - a.score.total || a.word.length - b.word.length
  );

  return results.slice(0, n);
}
