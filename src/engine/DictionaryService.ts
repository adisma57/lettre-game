// src/engine/DictionaryService.ts
import { normalizeWord } from "./score";
import type { WordValidator } from "./RoundService";

/**
 * Abstraction minimale d'un dictionnaire.
 * On stocke les mots en forme normalisée (majuscules, sans accents).
 */
export interface Dictionary {
  has(word: string): boolean; // accepte brut ou normalisé, on renormalise dedans
}

/**
 * Crée un dictionnaire en mémoire à partir d'une liste de mots FR.
 * `words` peut contenir des accents et de la casse, on normalise tout.
 */
export function createSetDictionary(words: string[]): Dictionary {
  const set = new Set<string>();

  for (const w of words) {
    const normalized = normalizeWord(w).trim();
    if (normalized) {
      set.add(normalized);
    }
  }

  return {
    has(word: string): boolean {
      const normalized = normalizeWord(word).trim();
      if (!normalized) return false;
      return set.has(normalized);
    },
    // pour l'algorithme de recherche du meilleur mot
    _iterableWords: set
  } as any;
}

/**
 * Adapte un Dictionary en WordValidator pour RoundService.
 * RoundService lui passe déjà un mot normalisé, mais on renormalise quand même:
 * - ça reste correct
 * - ça permet de réutiliser le validator ailleurs avec des mots bruts.
 */
export function createWordValidatorFromDictionary(dict: Dictionary): WordValidator {
  return (normalizedWord: string): boolean => {
    return dict.has(normalizedWord);
  };
}
