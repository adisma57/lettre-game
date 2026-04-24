import { useState } from "react";
import { useDailyGame } from "../hooks/useDailyGame";
import { useAuth } from "../hooks/useAuth";
import { DrawDisplay } from "../components/game/DrawDisplay";
import { WordInput } from "../components/game/WordInput";
import { ScoreCard } from "../components/game/ScoreCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { SolverResult } from "../engine/solver";

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

// ─── Top words list ───────────────────────────────────────────────────────────

function TopWordsList({ words }: { words: SolverResult[] }) {
  const [showMore, setShowMore] = useState(false);

  const top3  = words.slice(0, 3);
  const next7 = words.slice(3, 10);

  function WordRow({ r, rank }: { r: SolverResult; rank: number }) {
    return (
      <li className="flex items-baseline justify-between gap-4">
        <span className="text-muted">{rank}.</span>
        <span className="flex-1 font-mono font-bold text-fg">{r.word}</span>
        <span className={`font-semibold ${rank === 1 ? "text-primary" : "text-muted"}`}>
          {r.score.total} pts
        </span>
      </li>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-line bg-elevated p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-muted">— Meilleurs mots possibles —</p>
      <ol className="space-y-2">
        {top3.map((r, i) => <WordRow key={r.word} r={r} rank={i + 1} />)}
      </ol>

      {next7.length > 0 && (
        <>
          {showMore && (
            <ol className="mt-2 space-y-2">
              {next7.map((r, i) => <WordRow key={r.word} r={r} rank={i + 4} />)}
            </ol>
          )}
          <button
            onClick={() => setShowMore(v => !v)}
            className="mt-3 text-xs text-muted hover:text-fg underline underline-offset-2 transition-colors"
          >
            {showMore ? "▲ Masquer" : `▼ Voir les ${next7.length} suivant${next7.length > 1 ? "s" : ""}`}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailyGame() {
  const { auth } = useAuth();
  const username = auth.status === "authenticated" ? auth.username : null;

  const {
    draw, phase, attempts,
    bestPossibleScore, bestWord, topWords,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, currentAttemptResult,
  } = useDailyGame(username);

  return (
    <div className="mx-auto max-w-lg">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Défi du jour</h1>
        <span className="text-sm text-muted">{formatUTC(new Date())}</span>
      </div>

      {/* Draw tiles */}
      <DrawDisplay letters={draw} className="mb-8" />

      {/* Word input */}
      {phase.kind === "playing" && (
        <div className="mb-6">
          <WordInput
            value={inputWord}
            onChange={setInputWord}
            onSubmit={submitWord}
            isValid={isInputValid}
            error={
              currentAttemptResult?.invalidReason === "not_in_dictionary"
                ? "Mot non reconnu dans le dictionnaire."
                : undefined
            }
          />
        </div>
      )}

      {/* Attempt history */}
      {attempts.map((attempt, idx) => (
        <ScoreCard
          key={idx}
          label={`— Essai ${idx + 1} —`}
          score={idx === attempts.length - 1 ? currentAttemptResult?.score ?? null : null}
          plainWord={attempt.normalizedWord}
          total={attempt.total}
          bestPossibleScore={bestPossibleScore >= 0 ? bestPossibleScore : undefined}
          className="mb-5"
        />
      ))}

      {/* Retry button */}
      {phase.kind === "attempt_shown" && attempts.length < 3 && (
        <Button variant="secondary" onClick={retryRound}>
          Réessayer ({3 - attempts.length} essai{3 - attempts.length > 1 ? "s" : ""} restant{3 - attempts.length > 1 ? "s" : ""})
        </Button>
      )}

      {/* Completed summary */}
      {phase.kind === "completed" && (
        <Card className="mt-6">
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

          {topWords.length > 0 && <TopWordsList words={topWords} />}
        </Card>
      )}
    </div>
  );
}
