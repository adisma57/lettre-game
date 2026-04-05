import { useDailyGame } from "../hooks/useDailyGame";
import { DrawDisplay } from "../components/game/DrawDisplay";
import { WordInput } from "../components/game/WordInput";
import { ScoreCard } from "../components/game/ScoreCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

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
        <div className="flex flex-col items-start gap-3">
          <Button variant="secondary" onClick={retryRound}>
            Réessayer ({3 - attempts.length} essai{3 - attempts.length > 1 ? "s" : ""} restant{3 - attempts.length > 1 ? "s" : ""})
          </Button>
          <p className="text-xs text-muted leading-relaxed">
            Votre score n'est envoyé au classement qu'en fin de partie — quand vous
            atteignez le meilleur score possible ou que vous avez utilisé vos 3 essais.
          </p>
        </div>
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
        </Card>
      )}
    </div>
  );
}
