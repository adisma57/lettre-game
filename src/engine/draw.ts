import type { Draw } from "./types.js";
import { getTodayKey } from "./dayKey.js";
import { IS_ENGLISH } from "../language.js";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Two-level game weighting, not a literal corpus-frequency distribution.
// English: K joins J/Q/X/Z; H/W/Y are not rare (Norvig, Mayzner revisited).
// Keep the French pool unchanged to preserve already published daily draws.
const RARE_LETTERS = new Set(IS_ENGLISH
  ? ["J", "K", "Q", "X", "Z"]
  : ["J", "K", "Q", "W", "X", "Y", "Z", "H"]);

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

// "2026-04-04" → 20260404
function dayKeyToSeed(dayKey: string): number {
  return Number(dayKey.replace(/-/g, ""));
}

/**
 * Returns the same draw for every player on a given day.
 * Pure function — the server gets the same result as the client.
 */
export function getDailyDraw(dayKey: string = getTodayKey()): Draw {
  const rng = mulberry32(dayKeyToSeed(dayKey));
  return Array.from({ length: 4 }, () =>
    WEIGHTED_POOL[Math.floor(rng() * WEIGHTED_POOL.length)]
  );
}
