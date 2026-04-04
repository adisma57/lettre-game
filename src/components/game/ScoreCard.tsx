import { ColoredWord } from "./ColoredWord";
import type { ScoreResult } from "../../engine/types";

interface ScoreCardProps {
  label?: string;
  score?: ScoreResult | null;
  plainWord?: string;
  total: number;
  bestPossibleScore?: number;
  className?: string;
}

export function ScoreCard({
  label,
  score,
  plainWord,
  total,
  bestPossibleScore,
  className = "",
}: ScoreCardProps) {
  const isPerfect =
    bestPossibleScore !== undefined &&
    bestPossibleScore >= 0 &&
    total >= bestPossibleScore;

  return (
    <div className={className}>
      {label && (
        <p className="mb-1 text-xs uppercase tracking-wider text-muted">{label}</p>
      )}

      <div className="mb-1">
        {score ? (
          <ColoredWord score={score} />
        ) : plainWord ? (
          <span className="font-mono text-2xl font-bold text-fg">{plainWord}</span>
        ) : null}
      </div>

      <p className="text-sm text-fg">
        Votre score : <span className="font-semibold">{total} pts</span>
      </p>

      {bestPossibleScore !== undefined && bestPossibleScore >= 0 && (
        <p className="text-sm text-fg">
          Meilleur possible :{" "}
          <span className="font-semibold">{bestPossibleScore} pts</span>
          {isPerfect && (
            <span className="ml-2 font-semibold text-success">Score parfait !</span>
          )}
        </p>
      )}
    </div>
  );
}
