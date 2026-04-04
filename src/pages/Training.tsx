import { useTraining } from "../hooks/useTraining";
import { DrawDisplay } from "../components/game/DrawDisplay";
import { WordInput } from "../components/game/WordInput";
import { ScoreCard } from "../components/game/ScoreCard";
import { SolverResultsList } from "../components/game/SolverResults";
import { Button } from "../components/ui/Button";

export default function Training() {
  const {
    draw, phase,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, nextRound,
    currentResult, bestPossibleScore, top3,
  } = useTraining();

  return (
    <div className="mx-auto max-w-lg">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Entraînement</h1>
        <p className="mt-1 text-sm text-muted">Tirages aléatoires en boucle. Aucune limite.</p>
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
              currentResult?.invalidReason === "not_in_dictionary"
                ? "Mot non reconnu dans le dictionnaire."
                : undefined
            }
          />
        </div>
      )}

      {/* Results */}
      {phase.kind === "results" && currentResult?.score && (
        <div className="mb-6">
          <ScoreCard
            label="Votre mot"
            score={currentResult.score}
            total={currentResult.total}
            bestPossibleScore={bestPossibleScore >= 0 ? bestPossibleScore : undefined}
          />

          <SolverResultsList results={top3} />

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={retryRound}>Retenter</Button>
            <Button onClick={nextRound}>Prochain tirage →</Button>
          </div>
        </div>
      )}
    </div>
  );
}
