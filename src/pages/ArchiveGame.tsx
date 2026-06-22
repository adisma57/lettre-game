import { useState, useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useArchiveGame } from "../hooks/useArchiveGame";
import { useT } from "../contexts/LanguageContext";
import { DrawDisplay } from "../components/game/DrawDisplay";
import { WordInput } from "../components/game/WordInput";
import { ScoreCard } from "../components/game/ScoreCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { SolverResult } from "../engine/solver";

const FREE_DAYS = 3;

function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function isAccessible(dateStr: string): boolean {
  for (let i = 1; i <= FREE_DAYS; i++) {
    if (getPastDate(i) === dateStr) return true;
  }
  return false;
}

function TopWordsList({ words }: { words: SolverResult[] }) {
  const t = useT();
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
      <p className="mb-3 text-xs uppercase tracking-wider text-muted">— {t.daily.bestWords} —</p>
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
            {showMore ? t.daily.showLess : t.daily.showMore(next7.length)}
          </button>
        </>
      )}
    </div>
  );
}

export default function ArchiveGame() {
  const t = useT();
  const { date: dateStr = "" } = useParams<{ date: string }>();

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(t.archive.dateLocale, {
        weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      }),
    [t.archive.dateLocale]
  );

  // Guard: invalid date format or future date or not in free window
  if (!isValidDate(dateStr) || !isAccessible(dateStr)) {
    return <Navigate to="/archive" replace />;
  }

  return <ArchiveGameInner dateStr={dateStr} dateFmt={dateFmt} />;
}

function ArchiveGameInner({
  dateStr,
  dateFmt,
}: {
  dateStr: string;
  dateFmt: Intl.DateTimeFormat;
}) {
  const t = useT();

  const {
    draw, phase, attempts,
    bestPossibleScore, bestWord, topWords,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, currentAttemptResult,
  } = useArchiveGame(dateStr);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <Link
          to="/archive"
          className="mb-3 inline-block text-sm text-muted hover:text-fg transition-colors"
        >
          {t.archive.backLink}
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">{t.archive.title}</h1>
          <span className="text-sm text-muted capitalize">
            {dateFmt.format(new Date(dateStr + "T00:00:00Z"))}
          </span>
        </div>
      </div>

      <DrawDisplay letters={draw} className="mb-8" />

      {phase.kind === "playing" && (
        <div className="mb-6">
          <WordInput
            value={inputWord}
            onChange={setInputWord}
            onSubmit={submitWord}
            isValid={isInputValid}
            error={
              currentAttemptResult?.invalidReason === "not_in_dictionary"
                ? t.daily.notInDict
                : undefined
            }
          />
        </div>
      )}

      {attempts.map((attempt, idx) => (
        <ScoreCard
          key={idx}
          label={t.daily.attempt(idx + 1)}
          score={idx === attempts.length - 1 ? currentAttemptResult?.score ?? null : null}
          plainWord={attempt.normalizedWord}
          total={attempt.total}
          bestPossibleScore={bestPossibleScore >= 0 ? bestPossibleScore : undefined}
          className="mb-5"
        />
      ))}

      {phase.kind === "attempt_shown" && attempts.length < 3 && (
        <Button variant="secondary" onClick={retryRound}>
          {t.daily.retry(3 - attempts.length)}
        </Button>
      )}

      {phase.kind === "completed" && (
        <Card className="mt-6">
          <p className="mb-4 text-xs uppercase tracking-wider text-muted">
            — {t.daily.completed} —
          </p>

          {bestWord !== null && bestPossibleScore >= 0 && (
            <p className="mb-3 text-fg">
              {t.daily.bestWord}{" "}
              <span className="font-bold text-primary">{bestWord}</span>{" "}
              <span className="text-muted">({bestPossibleScore} pts)</span>
            </p>
          )}

          <Link
            to="/archive"
            className="inline-block text-sm text-muted hover:text-fg transition-colors underline underline-offset-2"
          >
            {t.archive.backLink}
          </Link>

          {topWords.length > 0 && <TopWordsList words={topWords} />}
        </Card>
      )}
    </div>
  );
}
