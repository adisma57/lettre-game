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
    <div className={`rounded-xl border border-line bg-surface p-4 ${className}`}>
      {label && (
        <p className="mb-3 text-xs font-mono uppercase tracking-widest text-muted/70">{label}</p>
      )}

      {/* Word display */}
      <div className="mb-4 min-h-[2.5rem]">
        {score ? (
          <ColoredWord score={score} />
        ) : plainWord ? (
          <span className="font-mono text-2xl font-bold text-fg">{plainWord}</span>
        ) : null}
      </div>

      {/* Score row */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs text-muted">Votre score</p>
          <p className="font-display text-2xl font-bold text-primary">{total}<span className="ml-1 text-sm font-normal text-muted">pts</span></p>
        </div>

        {bestPossibleScore !== undefined && bestPossibleScore >= 0 && (
          <>
            <div className="h-8 w-px bg-line" />
            <div>
              <p className="text-xs text-muted">Meilleur possible</p>
              <p className="font-display text-2xl font-bold text-fg/60">{bestPossibleScore}<span className="ml-1 text-sm font-normal text-muted">pts</span></p>
            </div>
          </>
        )}

        {isPerfect && (
          <span className="ml-auto rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-bold text-success">
            Score parfait ✓
          </span>
        )}
      </div>
    </div>
  );
}
