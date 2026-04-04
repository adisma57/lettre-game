import { solveTopN } from "./solver";
import type { Draw } from "./types";
import type { Dictionary } from "./DictionaryService";

/**
 * Returns the single highest-scoring word for a given draw.
 * Delegates to solveTopN to avoid duplicating sort logic.
 */
export function findBestWordForDraw(
  draw: Draw,
  dictionary: Dictionary
): { word: string; score: number } | null {
  const results = solveTopN(draw, dictionary, 1);
  if (results.length === 0) return null;
  return { word: results[0].word, score: results[0].score.total };
}
