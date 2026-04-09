import { useEffect, useState } from "react";
import { fetchLeaderboard, type LeaderboardEntry, type LeaderboardSort } from "../services/api";

const SORT_OPTIONS: { value: LeaderboardSort; label: string }[] = [
  { value: "weekly",  label: "Classement hebdomadaire" },
  { value: "monthly", label: "Classement mensuel"      },
  { value: "global",  label: "Classement global"       },
];

const RANK_BADGE: Record<number, string> = {
  1: "bg-amber-500/20 border-amber-500/40 text-amber-400",
  2: "bg-zinc-400/10 border-zinc-400/30 text-zinc-300",
  3: "bg-orange-900/20 border-orange-800/30 text-orange-600",
};

const RANK_LABEL: Record<number, string> = {
  1: "01",
  2: "02",
  3: "03",
};

export default function Leaderboard() {
  const [sort, setSort]       = useState<LeaderboardSort>("weekly");
  const [rows, setRows]       = useState<LeaderboardEntry[]>([]);
  const currentUsername = localStorage.getItem("auth_username");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchLeaderboard(sort)
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Impossible de charger le classement."))
      .finally(() => setLoading(false));
  }, [sort]);

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Classement</h1>
          <p className="mt-1 text-sm text-muted">Meilleurs joueurs sur le défi du jour.</p>
        </div>

        {/* Sort pills */}
        <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                sort === value
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-elevated hover:text-fg",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {loading && (
        <p className="text-sm text-muted">Chargement…</p>
      )}
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      {!loading && !error && rows.length === 0 && (
        <div className="rounded-xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-muted">
            Aucune partie enregistrée pour l'instant.
          </p>
          <p className="mt-1 text-sm text-muted/60">
            Jouez le défi du jour pour apparaître ici !
          </p>
        </div>
      )}

      {/* Leaderboard rows */}
      {!loading && !error && rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {/* Column headers — hidden on mobile, shown on sm+ */}
          <div className="hidden sm:grid sm:grid-cols-[3rem_1fr_5rem_5rem_4rem] px-3 py-2 text-xs font-mono uppercase tracking-widest text-muted/60">
            <span>#</span>
            <span>Joueur</span>
            <span className="text-right">Total</span>
            <span className="text-right">Best</span>
            <span className="text-right">Parties</span>
          </div>

          {rows.map((row) => {
            const isCurrentUser =
              currentUsername != null &&
              row.username.toLowerCase() === currentUsername.toLowerCase();
            return (
              <div
                key={row.username}
                className={[
                  "rounded-xl border px-3 py-3 transition-colors",
                  isCurrentUser
                    ? "border-info/30 bg-info/5"
                    : row.rank === 1
                      ? "border-primary/30 bg-primary/5"
                      : "border-line bg-surface hover:bg-elevated",
                ].join(" ")}
              >
                {/* Mobile layout */}
                <div className="flex items-center gap-3 sm:hidden">
                  {/* Rank badge */}
                  <span
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold font-mono",
                      RANK_BADGE[row.rank] ?? "border-line bg-elevated text-muted",
                    ].join(" ")}
                  >
                    {RANK_LABEL[row.rank] ?? String(row.rank).padStart(2, "0")}
                  </span>

                  {/* Username */}
                  <span className="flex-1 min-w-0 font-semibold text-fg truncate">{row.username}</span>

                  {/* Stats */}
                  <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-primary text-sm">{row.total_score}</span>
                      <span className="text-muted/60 uppercase tracking-wide text-[10px]">total</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-muted">{row.best_score}</span>
                      <span className="text-muted/60 uppercase tracking-wide text-[10px]">best</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-muted">{row.game_count}</span>
                      <span className="text-muted/60 uppercase tracking-wide text-[10px]">parties</span>
                    </div>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:grid sm:grid-cols-[3rem_1fr_5rem_5rem_4rem] items-center">
                  {/* Rank badge */}
                  <div className="flex items-center">
                    <span
                      className={[
                        "flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold font-mono",
                        RANK_BADGE[row.rank] ?? "border-line bg-elevated text-muted",
                      ].join(" ")}
                    >
                      {RANK_LABEL[row.rank] ?? String(row.rank).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Username */}
                  <span className="font-semibold text-fg truncate pr-2">{row.username}</span>

                  {/* Total score */}
                  <span className="text-right font-mono font-bold text-primary">{row.total_score}</span>

                  {/* Best score */}
                  <span className="text-right font-mono text-muted">{row.best_score}</span>

                  {/* Game count */}
                  <span className="text-right font-mono text-muted">{row.game_count}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
