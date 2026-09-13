import { t } from "../language";
import { useNavigate } from "react-router-dom";
import { useTraining } from "../hooks/useTraining";
import { DrawDisplay } from "../components/game/DrawDisplay";
import { WordInput } from "../components/game/WordInput";
import { ScoreCard } from "../components/game/ScoreCard";
import { SolverResultsList } from "../components/game/SolverResults";
import { Button } from "../components/ui/Button";

export default function Training() {
  const navigate = useNavigate();
  const backButton = (
    <Button variant="secondary" className="mb-6" onClick={() => navigate("/")}>
      {t("← Retour au défi du jour", "← Back to daily challenge")}
    </Button>
  );
  const {
    draw, loading, phase,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, nextRound,
    currentResult, bestPossibleScore, top3,
    dictReady,
  } = useTraining();

  if (loading) {
    return (
      <div className="mx-auto max-w-lg">
        {backButton}
        <p className="text-center text-muted">{t("Chargement du tirage…", "Loading letters…")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {backButton}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">{t("Entraînement", "Practice")}</h1>
        <p className="mt-1 text-sm text-muted">{t("Tirages aléatoires en boucle. Aucune limite.", "Random letters. Unlimited practice.")}</p>
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
            disabled={!dictReady}
            error={
              currentResult?.invalidReason === "not_in_dictionary"
                ? t("Mot non reconnu dans le dictionnaire.", "Word not found in the dictionary.")
                : undefined
            }
          />
          {!dictReady && (
            <p className="mt-2 text-sm text-muted">{t("Chargement du dictionnaire…", "Loading dictionary…")}</p>
          )}
        </div>
      )}

      {/* Results */}
      {phase.kind === "results" && currentResult?.score && (
        <div className="mb-6">
          <ScoreCard
            label={t("Votre mot", "Your word")}
            score={currentResult.score}
            total={currentResult.total}
            bestPossibleScore={bestPossibleScore >= 0 ? bestPossibleScore : undefined}
          />

          <SolverResultsList results={top3} />

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={retryRound}>{t("Retenter", "Try again")}</Button>
            <Button onClick={nextRound}>{t("Prochain tirage →", "Next draw →")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
