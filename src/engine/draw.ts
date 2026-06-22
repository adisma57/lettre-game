import type { Draw } from "./types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function buildPool(rareLetters: Set<string>): string[] {
  return ALPHABET.flatMap((l) =>
    Array<string>(rareLetters.has(l) ? 1 : 4).fill(l)
  );
}

// French: W, X, Y, Z, H, J, K, Q are rare
const FR_RARE = new Set(["H", "J", "K", "Q", "W", "X", "Y", "Z"]);
export const WEIGHTED_POOL: string[] = buildPool(FR_RARE);

// English: J, K, Q, V, X, Z are rare; W, Y, H are common
const EN_RARE = new Set(["J", "K", "Q", "V", "X", "Z"]);
export const WEIGHTED_POOL_EN: string[] = buildPool(EN_RARE);

export function generateDrawWeighted(count = 4, pool = WEIGHTED_POOL): Draw {
  return Array.from({ length: count }, () =>
    pool[Math.floor(Math.random() * pool.length)]
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
 * Pass a language-specific pool to get a consistent per-language daily draw.
 */
export function getDailyDraw(date: Date = new Date(), pool = WEIGHTED_POOL): Draw {
  const rng = mulberry32(dateToSeed(date));
  return Array.from({ length: 4 }, () =>
    pool[Math.floor(rng() * pool.length)]
  );
}
