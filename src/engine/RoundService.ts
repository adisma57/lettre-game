// src/engine/RoundService.ts
import type { Draw, ScoreResult } from "./types";
import { generateDrawWeighted } from "./draw";
import { scoreWord, normalizeWord } from "./score";

export type InvalidReason = "empty" | "not_in_dictionary";

export type WordValidator = (normalizedWord: string) => boolean;

export type RoundResult = {
  draw: Draw;
  rawWord: string;
  normalizedWord: string;
  isValid: boolean;
  invalidReason?: InvalidReason;
  score: ScoreResult | null;
  total: number; // raccourci: 0 si score null
};

/**
 * Génère un nouveau tirage pour une manche.
 * Wrapper explicite autour de generateDraw pour l’UI.
 */
export function createDraw(): Draw {
  return generateDrawWeighted(4);
}

/**
 * Évalue une manche:
 * - normalise le mot
 * - vérifie vide / dictionnaire
 * - calcule le score si valide
 */
export function evaluateRound(
  draw: Draw,
  rawWord: string,
  isValidWord: WordValidator
): RoundResult {
  const normalizedWord = normalizeWord(rawWord).trim();

  // Cas 1: mot vide
  if (!normalizedWord) {
    const total = 0;
    return {
      draw,
      rawWord,
      normalizedWord,
      isValid: false,
      invalidReason: "empty",
      score: null,
      total,
    };
  }

  // Cas 2: mot non valide selon le dictionnaire
  const valid = isValidWord(normalizedWord);
  if (!valid) {
    const total = 0;
    return {
      draw,
      rawWord,
      normalizedWord,
      isValid: false,
      invalidReason: "not_in_dictionary",
      score: null,
      total,
    };
  }

  // Cas 3: mot valide → calcul de score
  const score = scoreWord(draw, normalizedWord);
  const total = score.total;

  return {
    draw,
    rawWord,
    normalizedWord,
    isValid: true,
    score,
    total,
  };
}
