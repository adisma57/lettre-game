import { useDailyGame } from "../hooks/useDailyGame";
import type { ScoreResult } from "../engine/types";

// ─── Letter colouring (inline — will be extracted to shared component in M6) ─

type LetterRole = "unused" | "insert" | "unordered" | "ordered";

const ROLE_CLASS: Record<LetterRole, string> = {
  ordered:   "text-success",
  unordered: "text-info",
  insert:    "text-error",
  unused:    "text-muted",
};

function computeLetterRoles(
  word: string,
  skeletonIndices: number[],
  orderBonus: boolean
): LetterRole[] {
  const roles: LetterRole[] = Array(word.length).fill("unused" as LetterRole);
  if (skeletonIndices.length === 0) return roles;
  const zoneStart = skeletonIndices[0];
  const zoneEnd   = skeletonIndices[skeletonIndices.length - 1];
  for (let i = zoneStart; i <= zoneEnd; i++) roles[i] = "insert";
  const skeletonRole: LetterRole = orderBonus ? "ordered" : "unordered";
  for (const idx of skeletonIndices) roles[idx] = skeletonRole;
  return roles;
}

function ColoredWord({ score }: { score: ScoreResult }) {
  const roles = computeLetterRoles(score.word, score.skeletonIndices, score.orderBonus);
  return (
    <span className="font-mono text-2xl font-bold">
      {score.word.split("").map((ch, i) => (
        <span key={i} className={ROLE_CLASS[roles[i]]}>
          {ch}
        </span>
      ))}
    </span>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});

function formatUTC(date: Date): string {
  return dateFmt.format(date);
}

function tomorrow(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailyGame() {
  const {
    draw, phase, attempts,
    bestPossibleScore, bestWord,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, currentAttemptResult,
  } = useDailyGame();

  const inputBorder =
    isInputValid === true  ? "border-success" :
    isInputValid === false ? "border-error"   :
                             "border-line";

  return (
    <div className="mx-auto max-w-lg">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Défi du jour</h1>
        <span className="text-sm text-muted">{formatUTC(new Date())}</span>
      </div>

      {/* Draw tiles */}
      <div className="mb-8 flex justify-center gap-3">
        {draw.map((letter, i) => (
          <div
            key={i}
            className="flex h-14 w-14 items-center justify-center rounded-lg border border-line bg-surface text-2xl font-bold text-primary"
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Word input — visible only when actively playing */}
      {phase.kind === "playing" && (
        <div className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputWord}
              onChange={(e) => setInputWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputWord.trim()) submitWord();
              }}
              placeholder="Entrez un mot..."
              className={`flex-1 rounded-lg border-2 bg-surface px-4 py-2 text-fg outline-none placeholder:text-muted focus:border-primary ${inputBorder}`}
              autoFocus
            />
            <button
              onClick={submitWord}
              disabled={!inputWord.trim()}
              className="rounded-lg bg-primary px-5 py-2 font-semibold text-white transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-40"
            >
              Valider
            </button>
          </div>

          {/* Invalid word feedback */}
          {currentAttemptResult?.invalidReason === "not_in_dictionary" && (
            <p className="mt-2 text-sm text-error">Mot non reconnu dans le dictionnaire.</p>
          )}
        </div>
      )}

      {/* Attempt history */}
      {attempts.map((attempt, idx) => (
        <div key={idx} className="mb-5">
          <p className="mb-1 text-xs uppercase tracking-wider text-muted">
            — Essai {idx + 1} —
          </p>

          {/* Coloured word for the most recent attempt; plain text for older ones */}
          <div className="mb-1">
            {idx === attempts.length - 1 && currentAttemptResult?.score ? (
              <ColoredWord score={currentAttemptResult.score} />
            ) : (
              <span className="font-mono text-2xl font-bold text-fg">
                {attempt.normalizedWord}
              </span>
            )}
          </div>

          <p className="text-sm text-fg">
            Votre score : <span className="font-semibold">{attempt.total} pts</span>
          </p>

          {bestPossibleScore >= 0 && (
            <p className="text-sm text-fg">
              Meilleur possible :{" "}
              <span className="font-semibold">{bestPossibleScore} pts</span>
            </p>
          )}

          {idx === attempts.length - 1 &&
            bestPossibleScore >= 0 &&
            attempt.total >= bestPossibleScore && (
              <p className="mt-1 font-semibold text-success">Score parfait !</p>
            )}
        </div>
      ))}

      {/* Retry button */}
      {phase.kind === "attempt_shown" && attempts.length < 3 && (
        <button
          onClick={retryRound}
          className="rounded-lg border border-line bg-elevated px-5 py-2 text-fg transition-colors hover:border-primary"
        >
          Réessayer ({3 - attempts.length} essai{3 - attempts.length > 1 ? "s" : ""} restant{3 - attempts.length > 1 ? "s" : ""})
        </button>
      )}

      {/* Completed summary */}
      {phase.kind === "completed" && (
        <div className="mt-6 rounded-xl border border-line bg-surface p-6">
          <p className="mb-4 text-xs uppercase tracking-wider text-muted">
            — Partie terminée —
          </p>

          {bestWord !== null && bestPossibleScore >= 0 && (
            <p className="mb-3 text-fg">
              Meilleur mot :{" "}
              <span className="font-bold text-primary">{bestWord}</span>{" "}
              <span className="text-muted">({bestPossibleScore} pts)</span>
            </p>
          )}

          <p className="text-sm text-muted">
            Revenez demain — {formatUTC(tomorrow())}
          </p>
        </div>
      )}
    </div>
  );
}
