import type { Draw } from "./types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// These letters are rare in French; they receive a lower weight so the draw
// pool produces playable hands more often.
const RARE_LETTERS = new Set(["J", "K", "Q", "W", "X", "Y", "Z", "H"]);

const LETTER_WEIGHT: Record<string, number> = Object.fromEntries(
  ALPHABET.map((l) => [l, RARE_LETTERS.has(l) ? 1 : 4])
);

// Flat pool where each letter appears as many times as its weight.
// Sampling a uniform index from this array gives a weighted random draw.
export const WEIGHTED_POOL: string[] = ALPHABET.flatMap((l) =>
  Array<string>(LETTER_WEIGHT[l]).fill(l)
);

export function generateDrawWeighted(count = 4): Draw {
  return Array.from({ length: count }, () =>
    WEIGHTED_POOL[Math.floor(Math.random() * WEIGHTED_POOL.length)]
  );
}
