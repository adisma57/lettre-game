import { t } from "../language";
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

  const streak = t(`Série ${input.currentStreak} 🔥`, `${input.currentStreak}-day streak 🔥`);
  const rank =
    input.percentile === null
      ? ""
      : t(` · mieux que ${Math.round(input.percentile * 100)} % des joueurs`, ` · better than ${Math.round(input.percentile * 100)}% of players`);

  return [
    `Quadra #${input.puzzleNumber} — ${scoreLabel}`,
    t(`Lettres du jour : ${input.draw.join(" · ")}`, `Today’s letters: ${input.draw.join(" · ")}`),
    `${streak}${rank}`,
    "",
    t("Tu fais mieux avec les mêmes quatre lettres ?", "Same four letters. Can you beat my score?"),
    t("#QuadraMots #JeuxDeLettres #JeuxDeMots #WordGames #DefiDuJour", "#Quadra #WordGames #DailyPuzzle #WordChallenge #BrainTeaser"),
    SITE_URL,
  ].join("\n");
}
