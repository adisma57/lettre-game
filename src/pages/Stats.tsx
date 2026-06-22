import { useMemo, useState } from "react";
import { getStats, resetStats } from "../services/statsService";
import { clearDailyState } from "../services/dailyState";
import { useLanguage, useT } from "../contexts/LanguageContext";

function StatTile({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-elevated p-4">
      <span
        className={`text-2xl font-bold font-mono ${highlight ? "text-primary" : "text-fg"}`}
      >
        {value}
      </span>
      <span className="text-xs font-medium text-muted uppercase tracking-wide">
        {label}
      </span>
      {sub && <span className="text-xs text-muted/70 mt-0.5">{sub}</span>}
    </div>
  );
}

function PerformanceBar({ pct }: { pct: number }) {
  return (
    <div className="mt-2 h-2 w-full rounded-full bg-line overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function AttemptRow({ n, count, total, }: { n: 1 | 2 | 3; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 text-xs font-mono text-muted">{n}</span>
      <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/70 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-mono text-muted">{count}</span>
    </div>
  );
}

export default function Stats() {
  const t = useT();
  const { lang } = useLanguage();
  const [resetKey, setResetKey] = useState(0);
  const [confirming, setConfirming] = useState(false);

  const s = useMemo(() => getStats(lang), [lang, resetKey]);
  const gamesPlayed = s.dailyGames.length;
  const trainingAvg =
    s.trainingGamesPlayed > 0
      ? Math.round(s.trainingTotalScore / s.trainingGamesPlayed)
      : 0;

  function handleReset() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    // Clear stats and today's game state for both languages
    resetStats("fr"); resetStats("en");
    clearDailyState("fr"); clearDailyState("en");
    setResetKey(k => k + 1);
    setConfirming(false);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">{t.stats.title}</h1>
          <p className="text-sm text-muted mt-1">{t.stats.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          onBlur={() => setConfirming(false)}
          className={[
            "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            confirming
              ? "border-error/50 bg-error/10 text-error"
              : "border-line text-muted hover:border-error/40 hover:text-error",
          ].join(" ")}
        >
          {confirming ? t.stats.resetConfirm : t.stats.resetStats}
        </button>
      </div>

      {/* Daily performance */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          {t.stats.sectionDaily}
        </h2>
        <div className="rounded-2xl border border-line bg-surface p-5 space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono text-primary">
                {s.averagePerformance}%
              </span>
              <span className="text-xs text-muted">{t.stats.vsMax}</span>
            </div>
            <PerformanceBar pct={s.averagePerformance} />
            <p className="text-xs text-muted mt-1.5">{t.stats.avgDesc}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label={t.stats.gamesPlayed} value={gamesPlayed} />
            <StatTile
              label={t.stats.perfectGames}
              value={s.perfectGames}
              highlight={s.perfectGames > 0}
            />
            <StatTile
              label={t.stats.bestScore}
              value={s.bestScore > 0 ? s.bestScore : "—"}
            />
            <StatTile
              label={t.stats.perfectRate}
              value={
                gamesPlayed > 0
                  ? `${Math.round((s.perfectGames / gamesPlayed) * 100)}%`
                  : "—"
              }
            />
          </div>
        </div>
      </section>

      {/* Streak */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          {t.stats.sectionStreak}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label={t.stats.currentStreak}
            value={s.currentStreak > 0 ? `${s.currentStreak} 🔥` : s.currentStreak}
            sub={t.stats.consecutiveDays}
            highlight={s.currentStreak > 1}
          />
          <StatTile
            label={t.stats.longestStreak}
            value={s.longestStreak}
            sub={t.stats.consecutiveDays}
          />
        </div>
      </section>

      {/* Attempts */}
      {gamesPlayed > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
            {t.stats.sectionAttempts}
          </h2>
          <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
            <p className="text-xs text-muted mb-1">{t.stats.attemptsDesc}</p>
            <AttemptRow n={1} count={s.attemptDist[1]} total={gamesPlayed} />
            <AttemptRow n={2} count={s.attemptDist[2]} total={gamesPlayed} />
            <AttemptRow n={3} count={s.attemptDist[3]} total={gamesPlayed} />
          </div>
        </section>
      )}

      {/* Training */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          {t.stats.sectionTraining}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label={t.stats.trainingPlayed} value={s.trainingGamesPlayed} />
          <StatTile
            label={t.stats.trainingAvg}
            value={s.trainingGamesPlayed > 0 ? trainingAvg : "—"}
          />
        </div>
      </section>

      {gamesPlayed === 0 && s.trainingGamesPlayed === 0 && (
        <p className="text-center text-muted text-sm py-8">{t.stats.empty}</p>
      )}
    </main>
  );
}
