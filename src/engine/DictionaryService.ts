import { normalizeWord } from "./score";
import type { WordValidator } from "./types";

export interface Dictionary {
  /** Returns true if `word` belongs to the dictionary (case- and accent-insensitive). */
  has(word: string): boolean;
  /** Iterates all words in their normalized (uppercase, no diacritics) form. */
  words(): Iterable<string>;
}

/**
 * Builds an in-memory dictionary from a raw word list.
 * All entries are normalized on insertion so lookups are O(1)
 * regardless of the casing or accents of the query.
 */
export function createSetDictionary(rawWords: string[]): Dictionary {
  const set = new Set<string>();

  for (const w of rawWords) {
    const normalized = normalizeWord(w).trim();
    if (normalized) set.add(normalized);
  }

  return {
    has(word: string): boolean {
      const normalized = normalizeWord(word).trim();
      if (!normalized) return false;
      return set.has(normalized);
    },
    words(): Iterable<string> {
      return set;
    },
  };
}

/**
 * Adapts a Dictionary into a WordValidator compatible with RoundService.
 * RoundService already passes a normalized word, but has() re-normalizes
 * defensively so the validator stays correct when called from other contexts.
 */
export function createWordValidatorFromDictionary(dict: Dictionary): WordValidator {
  return (normalizedWord: string) => dict.has(normalizedWord);
}
