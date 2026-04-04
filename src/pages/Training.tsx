import { useState } from "react";
import { useTraining } from "../hooks/useTraining";
import type { ScoreResult } from "../engine/types";
import type { SolverResult } from "../engine/solver";

// ─── Letter colouring ────────────────────────────────────────────────────────

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

// ─── Top 3 (collapsible) ─────────────────────────────────────────────────────

function Top3({ results }: { results: SolverResult[] }) {
  const [open, setOpen] = useState(false);

  if (results.length === 0) return null;
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-muted transition-colors hover:text-fg"
      >
        {open ? "▲ Masquer le top 3" : "▼ Voir le top 3"}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-line bg-elevated p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-muted">Meilleurs mots possibles</p>
          <ol className="space-y-2">
            {results.map((r, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4">
                <span className="text-muted">{i + 1}.</span>
                <span className="flex-1 font-mono font-bold text-fg">{r.word}</span>
                <span className={`font-semibold ${i === 0 ? "text-primary" : "text-muted"}`}>
                  {r.score.total} pts
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Training() {
  const {
    draw, phase,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, nextRound,
    currentResult, bestPossibleScore, top3,
  } = useTraining();

  const inputBorder =
    isInputValid === true  ? "border-success" :
    isInputValid === false ? "border-error"   :
                             "border-line";

  return (
    <div className="mx-auto max-w-lg">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Entraînement</h1>
        <p className="mt-1 text-sm text-muted">Tirages aléatoires en boucle. Aucune limite.</p>
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

      {/* Word input */}
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

          {currentResult?.invalidReason === "not_in_dictionary" && (
            <p className="mt-2 text-sm text-error">Mot non reconnu dans le dictionnaire.</p>
          )}
        </div>
      )}

      {/* Results */}
      {phase.kind === "results" && currentResult?.score && (
        <div className="mb-6">
          <p className="mb-1 text-xs uppercase tracking-wider text-muted">Votre mot</p>
          <div className="mb-2">
            <ColoredWord score={currentResult.score} />
          </div>

          <p className="text-sm text-fg">
            Votre score : <span className="font-semibold">{currentResult.total} pts</span>
          </p>
          {bestPossibleScore >= 0 && (
            <p className="text-sm text-fg">
              Meilleur possible :{" "}
              <span className="font-semibold">{bestPossibleScore} pts</span>
              {currentResult.total >= bestPossibleScore && (
                <span className="ml-2 font-semibold text-success">Score parfait !</span>
              )}
            </p>
          )}

          <Top3 results={top3} />

          <div className="mt-6 flex gap-3">
            <button
              onClick={retryRound}
              className="rounded-lg border border-line bg-elevated px-5 py-2 text-fg transition-colors hover:border-primary"
            >
              Retenter
            </button>
            <button
              onClick={nextRound}
              className="rounded-lg bg-primary px-5 py-2 font-semibold text-white transition-colors hover:bg-primary-dim"
            >
              Prochain tirage →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
