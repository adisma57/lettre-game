export type Draw = string[]; // 4 uppercase letters

/**
 * A function that tells whether a (already-normalized) word is in the
 * accepted vocabulary. Kept as a plain function type so the engine is
 * independent of any specific dictionary implementation.
 */
export type WordValidator = (normalizedWord: string) => boolean;

export type ScorePart = {
  label: string;
  value: number;
};

export type ScoreResult = {
  draw: Draw;
  word: string;            // normalized form
  usedLetters: string[];   // draw letters that appear in the word (with duplicates)
  skeletonIndices: number[]; // positions in the word that form the draw subsequence
  insertions: number;      // non-skeleton positions inside the skeleton zone
  orderBonus: boolean;     // skeleton matches draw order exactly
  total: number;
  parts: ScorePart[];
};
