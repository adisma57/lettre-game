import { SITE_URL } from "../config";
import type { Draw } from "../engine/types";

export type ShareInput = {
  puzzleNumber: number;
  score: number;
  bestPossible: number | null;
  draw: Draw;
  currentStreak: number;
  percentile: number | null;
};

export function buildShareText(input: ShareInput): string {
  const scoreLabel =
    input.bestPossible === null
      ? `${input.score} pts`
      : `${input.score}/${input.bestPossible}`;

  const streak = `Série ${input.currentStreak} 🔥`;
  const rank =
    input.percentile === null
      ? ""
      : ` · mieux que ${Math.round(input.percentile * 100)} % des joueurs`;

  return [
    `Quadra #${input.puzzleNumber} — ${scoreLabel}`,
    `Lettres du jour : ${input.draw.join(" · ")}`,
    `${streak}${rank}`,
    "",
    "Tu fais mieux avec les mêmes quatre lettres ?",
    "#QuadraMots #JeuxDeLettres #JeuxDeMots #WordGames #DefiDuJour",
    SITE_URL,
  ].join("\n");
}
