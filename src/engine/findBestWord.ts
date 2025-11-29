import { scoreWord } from "./score";
import type { Draw } from "./types";
import type { Dictionary } from "./DictionaryService";

/**
 * Retourne le meilleur mot du dictionnaire pour un tirage donné.
 * - Parcourt tout le dictionnaire (Set)
 * - Score chaque mot
 * - Garde le meilleur (premier en cas d’égalité)
 */
export function findBestWordForDraw(
  draw: Draw,
  dictionary: Dictionary
): { word: string; score: number } | null {
  let bestWord: string | null = null;
  let bestScore = -1;

  // dictionary.has() ne donne pas la liste.
  // SetDictionary doit exposer son Set interne. On le récupère via une méthode interne.
  // Ajoute ce getter dans createSetDictionary pour l’itération.

  const iterable = (dictionary as any)._iterableWords as Set<string>;
  if (!iterable) return null;

  for (const w of iterable) {
    const r = scoreWord(draw, w);
    const s = r.total;

    if (s > bestScore) {
      bestScore = s;
      bestWord = w;
    }
  }

  return bestWord ? { word: bestWord, score: bestScore } : null;
}
