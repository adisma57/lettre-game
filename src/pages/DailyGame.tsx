import { useState, useEffect } from "react";
import { useDailyGame } from "../hooks/useDailyGame";
import { DrawDisplay } from "../components/game/DrawDisplay";
import { WordInput } from "../components/game/WordInput";
import { ScoreCard } from "../components/game/ScoreCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { fetchLeaderboard, type LeaderboardEntry } from "../services/api";
import { AUTH_STORAGE_KEY } from "../hooks/useAuth";

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

// ─── Mini leaderboard ─────────────────────────────────────────────────────────

const RANK_COLORS: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-slate-300",
  3: "text-amber-600",
};

function MiniLeaderboard({ rows, currentUser }: { rows: LeaderboardEntry[]; currentUser: string | null }) {
  const [showMore, setShowMore] = useState(false);

  const top3   = rows.slice(0, 3);
  const next7  = rows.slice(3, 10);

  function Row({ r }: { r: LeaderboardEntry }) {
    const isMe = currentUser !== null && r.username.toLowerCase() === currentUser.toLowerCase();
    return (
      <div
        className={`flex items-center gap-3 py-2 px-3 rounded ${isMe ? "bg-primary/10 border border-primary/30" : ""}`}
      >
        <span className={`w-5 text-right font-bold text-sm ${RANK_COLORS[r.rank] ?? "text-muted"}`}>
          {r.rank}
        </span>
        <span className={`flex-1 text-sm truncate ${isMe ? "text-primary font-semibold" : "text-fg"}`}>
          {r.username}
        </span>
        <span className="text-sm font-mono text-fg">{r.total_score} pts</span>
        <span className="text-xs text-muted w-12 text-right">{r.game_count} partie{r.game_count > 1 ? "s" : ""}</span>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <p className="text-xs uppercase tracking-wider text-muted mb-2">— Classement de la semaine —</p>
      <div className="flex flex-col gap-1">
        {top3.map(r => <Row key={r.username} r={r} />)}
      </div>

      {next7.length > 0 && (
        <>
          {showMore && (
            <div className="flex flex-col gap-1 mt-1">
              {next7.map(r => <Row key={r.username} r={r} />)}
            </div>
          )}
          <button
            onClick={() => setShowMore(v => !v)}
            className="mt-3 text-xs text-muted hover:text-fg underline underline-offset-2 transition-colors"
          >
            {showMore ? "Réduire" : `Voir les ${next7.length} suivant${next7.length > 1 ? "s" : ""}`}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailyGame() {
  const {
    draw, phase, attempts,
    bestPossibleScore, bestWord,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, currentAttemptResult,
  } = useDailyGame();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const currentUser = localStorage.getItem(AUTH_STORAGE_KEY);

  useEffect(() => {
    if (phase.kind !== "completed") return;
    fetchLeaderboard("weekly").then(setLeaderboard).catch(() => {});
  }, [phase.kind]);

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

          {leaderboard.length > 0 && (
            <MiniLeaderboard rows={leaderboard} currentUser={currentUser} />
          )}
        </Card>
      )}
    </div>
  );
}
