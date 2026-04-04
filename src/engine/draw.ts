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

// ─── Daily draw (seeded, deterministic) ──────────────────────────────────────

// mulberry32: fast 32-bit seeded PRNG, no dependencies
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// UTC date → integer seed, e.g. 2026-04-04 → 20260404
function dateToSeed(date: Date): number {
  return (
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate()
  );
}

/**
 * Returns the same Draw for every user on the same UTC calendar day.
 * Pure function — safe to call server-side with the same result.
 */
export function getDailyDraw(date: Date = new Date()): Draw {
  const rng = mulberry32(dateToSeed(date));
  return Array.from({ length: 4 }, () =>
    WEIGHTED_POOL[Math.floor(rng() * WEIGHTED_POOL.length)]
  );
}
