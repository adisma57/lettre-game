import { useMemo } from "react";
import { getStats } from "../services/statsService";

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

function AttemptRow({
  n,
  count,
  total,
}: {
  n: 1 | 2 | 3;
  count: number;
  total: number;
}) {
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
      <span className="w-6 text-right text-xs font-mono text-muted">
        {count}
      </span>
    </div>
  );
}

export default function Stats() {
  const stats = useMemo(() => getStats(), []);
  const gamesPlayed = stats.dailyGames.length;
  const trainingAvg =
    stats.trainingGamesPlayed > 0
      ? Math.round(stats.trainingTotalScore / stats.trainingGamesPlayed)
      : 0;

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-fg">
          Mes statistiques
        </h1>
        <p className="text-sm text-muted mt-1">
          Progression locale — mise à jour après chaque partie
        </p>
      </div>

      {/* Performance */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          Performance Défi du jour
        </h2>
        <div className="rounded-2xl border border-line bg-surface p-5 space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono text-primary">
                {stats.averagePerformance}%
              </span>
              <span className="text-xs text-muted">vs. score max</span>
            </div>
            <PerformanceBar pct={stats.averagePerformance} />
            <p className="text-xs text-muted mt-1.5">
              Score moyen rapporté au meilleur score possible de chaque jour
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              label="Parties jouées"
              value={gamesPlayed}
            />
            <StatTile
              label="Scores parfaits"
              value={stats.perfectGames}
              highlight={stats.perfectGames > 0}
            />
            <StatTile
              label="Meilleur score"
              value={stats.bestScore > 0 ? stats.bestScore : "—"}
            />
            <StatTile
              label="Taux de perfection"
              value={
                gamesPlayed > 0
                  ? `${Math.round((stats.perfectGames / gamesPlayed) * 100)}%`
                  : "—"
              }
            />
          </div>
        </div>
      </section>

      {/* Streak */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          Régularité
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Série actuelle"
            value={stats.currentStreak > 0 ? `${stats.currentStreak} 🔥` : stats.currentStreak}
            sub="jours consécutifs"
            highlight={stats.currentStreak > 1}
          />
          <StatTile
            label="Meilleure série"
            value={stats.longestStreak}
            sub="jours consécutifs"
          />
        </div>
      </section>

      {/* Attempts distribution */}
      {gamesPlayed > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
            Répartition des essais
          </h2>
          <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
            <p className="text-xs text-muted mb-1">
              Nombre d'essais utilisés pour compléter le défi
            </p>
            <AttemptRow n={1} count={stats.attemptDist[1]} total={gamesPlayed} />
            <AttemptRow n={2} count={stats.attemptDist[2]} total={gamesPlayed} />
            <AttemptRow n={3} count={stats.attemptDist[3]} total={gamesPlayed} />
          </div>
        </section>
      )}

      {/* Training */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          Entraînement
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Parties jouées"
            value={stats.trainingGamesPlayed}
          />
          <StatTile
            label="Score moyen"
            value={stats.trainingGamesPlayed > 0 ? trainingAvg : "—"}
          />
        </div>
      </section>

      {gamesPlayed === 0 && stats.trainingGamesPlayed === 0 && (
        <p className="text-center text-muted text-sm py-8">
          Joue ta première partie pour voir tes stats !
        </p>
      )}
    </main>
  );
}
