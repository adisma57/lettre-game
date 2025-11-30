import type { Draw } from "./types";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// 8 lettres les plus rares
const RARE = ["J", "K", "Q", "W", "X", "Y", "Z", "H"]; 
const ALL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Construction des poids
const WEIGHTS: Record<string, number> = {};
for (const l of ALL) {
  WEIGHTS[l] = RARE.includes(l) ? 1 : 4;
}

// Pool pondéré
export const WEIGHTED_POOL: string[] = Object.entries(WEIGHTS).flatMap(
  ([letter, weight]) => Array(weight).fill(letter)
);

export function generateDraw(): Draw {
  const result: Draw = [];
  for (let i = 0; i < 4; i++) {
    const index = Math.floor(Math.random() * LETTERS.length);
    result.push(LETTERS[index]);
  }
  return result;
}


// Tirage pondéré
export function generateDrawWeighted(count = 4): string[] {
  const draw: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * WEIGHTED_POOL.length);
    draw.push(WEIGHTED_POOL[idx]);
  }
  return draw;
}