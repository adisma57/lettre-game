import { useState } from "react";
import { Link } from "react-router-dom";
import { useDailyGame } from "../hooks/useDailyGame";
import { DrawDisplay } from "../components/game/DrawDisplay";
import { WordInput } from "../components/game/WordInput";
import { ScoreCard } from "../components/game/ScoreCard";
import { ShareButton } from "../components/game/ShareButton";
import { RulesModal } from "../components/modals/RulesModal";
import { StatsModal } from "../components/modals/StatsModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { scoreWord } from "../engine/score";
import { getTodayKey, puzzleNumber } from "../engine/dayKey";
import { loadStats } from "../services/stats";
import type { SolverResult } from "../engine/solver";
import type { AttemptRecord } from "../services/dailyState";

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

// ─── Players / percentile line ────────────────────────────────────────────────

function playersLabel(playersToday: number): string {
  if (playersToday === 0) return "Vous êtes le premier à jouer aujourd'hui";
  return `${playersToday} joueur${playersToday > 1 ? "s" : ""} aujourd'hui`;
}

function RankLine({ percentile, playersToday }: { percentile: number | null; playersToday: number }) {
  return (
    <p className="mt-1 text-sm text-muted">
      {percentile !== null
        ? `Mieux que ${Math.round(percentile * 100)} % des joueurs aujourd'hui`
        : playersLabel(playersToday)}
    </p>
  );
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

// ─── End-of-game footer (percentile/players + share + training link) ─────────

function EndOfGameFooter({
  attempts, bestPossibleScore, percentile, playersToday, draw,
}: {
  attempts: AttemptRecord[];
  bestPossibleScore: number;
  percentile: number | null;
  playersToday: number;
  draw: string[];
}) {
  const bestAttempt = attempts.length
    ? attempts.reduce((a, b) => (b.total > a.total ? b : a))
    : null;

  return (
    <div className="mt-4">
      <RankLine percentile={percentile} playersToday={playersToday} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {bestAttempt && (
          <ShareButton
            input={{
              puzzleNumber: puzzleNumber(getTodayKey()),
              score: bestAttempt.total,
              bestPossible: bestPossibleScore >= 0 ? bestPossibleScore : null,
              draw,
              usedLetters: bestAttempt.score?.usedLetters ?? [],
              orderBonus: bestAttempt.score?.orderBonus ?? false,
              currentStreak: loadStats().currentStreak,
              percentile,
            }}
          />
        )}
        <Link
          to="/entrainement"
          className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
        >
          S'entraîner →
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailyGame() {
  const {
    draw, phase, attempts,
    bestPossibleScore, bestWord, topWords, percentile, playersToday,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, revealAnswers, currentAttemptResult,
  } = useDailyGame();

  const [modal, setModal] = useState<"rules" | "stats" | null>(null);

  return (
    <div className="mx-auto max-w-lg">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setModal("rules")}
          aria-label="Voir les règles du jeu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-elevated text-base font-bold text-muted transition-colors hover:border-primary/50 hover:text-fg"
        >
          ?
        </button>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Défi du jour</h1>
          <span className="text-xs text-muted">{formatUTC(new Date())}</span>
        </div>

        <button
          type="button"
          onClick={() => setModal("stats")}
          aria-label="Voir mes statistiques"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-elevated text-base text-muted transition-colors hover:border-primary/50 hover:text-fg"
        >
          📊
        </button>
      </div>

      {modal === "rules" && <RulesModal onClose={() => setModal(null)} />}
      {modal === "stats" && <StatsModal onClose={() => setModal(null)} />}

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
      {attempts.map((attempt, idx) => {
        const isLast = idx === attempts.length - 1;
        const score = isLast
          ? (currentAttemptResult?.score ?? scoreWord(draw, attempt.normalizedWord))
          : scoreWord(draw, attempt.normalizedWord);
        return (
          <ScoreCard
            key={idx}
            label={`— Essai ${idx + 1} —`}
            score={score}
            total={attempt.total}
            bestPossibleScore={bestPossibleScore >= 0 ? bestPossibleScore : undefined}
            className="mb-5"
          />
        );
      })}

      {/* Retry + reveal buttons */}
      {(phase.kind === "playing" || phase.kind === "attempt_shown") && (
        <div className="flex flex-wrap gap-3">
          {phase.kind === "attempt_shown" && attempts.length < 3 && (
            <Button variant="secondary" onClick={retryRound}>
              Réessayer ({3 - attempts.length} essai{3 - attempts.length > 1 ? "s" : ""} restant{3 - attempts.length > 1 ? "s" : ""})
            </Button>
          )}
          <Button variant="ghost" onClick={revealAnswers}>
            Voir les réponses
          </Button>
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

          <EndOfGameFooter
            attempts={attempts}
            bestPossibleScore={bestPossibleScore}
            percentile={percentile}
            playersToday={playersToday}
            draw={draw}
          />

          {topWords.length > 0 && <TopWordsList words={topWords} />}
        </Card>
      )}

      {/* Revealed summary */}
      {phase.kind === "revealed" && (
        <Card className="mt-6">
          <p className="mb-4 text-xs uppercase tracking-wider text-muted">
            — Réponses dévoilées —
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

          <EndOfGameFooter
            attempts={attempts}
            bestPossibleScore={bestPossibleScore}
            percentile={percentile}
            playersToday={playersToday}
            draw={draw}
          />

          {topWords.length > 0 && <TopWordsList words={topWords} />}
        </Card>
      )}
    </div>
  );
}
