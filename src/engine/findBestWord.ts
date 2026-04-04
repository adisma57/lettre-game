import { scoreWord } from "./score";
import type { Draw } from "./types";
import type { Dictionary } from "./DictionaryService";

/**
 * Scans the entire dictionary to find the highest-scoring word for a given draw.
 * O(n) where n ≈ 336k (French word list size).
 *
 * Returns null only if the dictionary is empty.
 * Ties are broken by first occurrence in iteration order.
 */
export function findBestWordForDraw(
  draw: Draw,
  dictionary: Dictionary
): { word: string; score: number } | null {
  let bestWord: string | null = null;
  let bestScore = -1;

  for (const word of dictionary.words()) {
    const { total } = scoreWord(draw, word);
    if (total > bestScore) {
      bestScore = total;
      bestWord = word;
    }
  }

  return bestWord !== null ? { word: bestWord, score: bestScore } : null;
}
