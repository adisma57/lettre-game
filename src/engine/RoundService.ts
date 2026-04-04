import type { Draw, ScoreResult, WordValidator } from "./types";
import { generateDrawWeighted } from "./draw";
import { scoreWord, normalizeWord } from "./score";

export type { WordValidator } from "./types"; // re-export for callers that import from here

export type InvalidReason = "empty" | "not_in_dictionary";

export type RoundResult = {
  draw: Draw;
  rawWord: string;
  normalizedWord: string;
  isValid: boolean;
  invalidReason?: InvalidReason;
  score: ScoreResult | null;
  total: number; // 0 when score is null
};

/** Creates a new 4-letter draw for the start of a round. */
export function createDraw(): Draw {
  return generateDrawWeighted(4);
}

/**
 * Evaluates a player's word against a draw:
 * 1. Normalizes the input
 * 2. Rejects empty words and words not in the dictionary
 * 3. Computes the score for valid words
 */
export function evaluateRound(
  draw: Draw,
  rawWord: string,
  isValidWord: WordValidator
): RoundResult {
  const normalizedWord = normalizeWord(rawWord).trim();

  if (!normalizedWord) {
    return { draw, rawWord, normalizedWord, isValid: false, invalidReason: "empty", score: null, total: 0 };
  }

  if (!isValidWord(normalizedWord)) {
    return { draw, rawWord, normalizedWord, isValid: false, invalidReason: "not_in_dictionary", score: null, total: 0 };
  }

  const score = scoreWord(draw, normalizedWord);
  return { draw, rawWord, normalizedWord, isValid: true, score, total: score.total };
}
