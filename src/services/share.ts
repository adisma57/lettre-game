import { SITE_URL } from "../config";
import type { Draw } from "../engine/types";

const USED = "🟧";
const UNUSED = "⬜";

/**
 * One square per drawn letter. Fixed length of 4: unlike a grid shaped on the
 * word the player found, it never reveals that word's length. Duplicates are
 * handled by consuming one occurrence per match.
 */
export function drawSquares(draw: Draw, usedLetters: string[]): string {
  const pool = [...usedLetters];
  return draw
    .map((letter) => {
      const i = pool.indexOf(letter);
      if (i === -1) return UNUSED;
      pool.splice(i, 1);
      return USED;
    })
    .join("");
}

export type ShareInput = {
  puzzleNumber: number;
  score: number;
  bestPossible: number | null;
  draw: Draw;
  usedLetters: string[];
  orderBonus: boolean;
  currentStreak: number;
  percentile: number | null;
};

export function buildShareText(input: ShareInput): string {
  const scoreLabel =
    input.bestPossible === null
      ? `${input.score} pts`
      : `${input.score}/${input.bestPossible}`;

  const squares = drawSquares(input.draw, input.usedLetters);
  const bonus = input.orderBonus ? " ✅" : "";

  const streak = `Série ${input.currentStreak} 🔥`;
  const rank =
    input.percentile === null
      ? ""
      : ` · mieux que ${Math.round(input.percentile * 100)} % des joueurs`;

  return [
    `Quadra #${input.puzzleNumber} — ${scoreLabel} ${squares}${bonus}`,
    `${streak}${rank}`,
    SITE_URL,
  ].join("\n");
}
