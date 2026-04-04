import { useEffect, useState } from "react";
import { fetchLeaderboard, type LeaderboardEntry, type LeaderboardSort } from "../services/api";

const SORT_OPTIONS: { value: LeaderboardSort; label: string }[] = [
  { value: "avg_score",   label: "Score moyen"   },
  { value: "game_count",  label: "Parties jouées" },
  { value: "account_age", label: "Ancienneté"     },
];

export default function Leaderboard() {
  const [sort, setSort]       = useState<LeaderboardSort>("avg_score");
  const [rows, setRows]       = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchLeaderboard(sort)
      .then(setRows)
      .catch(() => setError("Impossible de charger le classement."))
      .finally(() => setLoading(false));
  }, [sort]);

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Classement</h1>
          <p className="mt-1 text-sm text-muted">Meilleurs joueurs sur le défi du jour.</p>
        </div>

        {/* Sort selector */}
        <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              className={[
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
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

      {loading && (
        <p className="text-sm text-muted">Chargement…</p>
      )}

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-muted">
          Aucune partie enregistrée pour l'instant. Jouez le défi du jour pour apparaître ici !
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Joueur</th>
              <th className="px-3 py-2 text-right">Moy.</th>
              <th className="px-3 py-2 text-right">Meilleur</th>
              <th className="px-3 py-2 text-right">Parties</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.username}
                className={row.rank === 1 ? "border-l-2 border-primary bg-elevated" : ""}
              >
                <td className="border-b border-line px-3 py-3 text-muted">
                  {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : row.rank}
                </td>
                <td className="border-b border-line px-3 py-3 font-semibold text-fg">
                  {row.username}
                </td>
                <td className="border-b border-line px-3 py-3 text-right font-bold text-primary">
                  {row.avg_score}
                </td>
                <td className="border-b border-line px-3 py-3 text-right text-muted">
                  {row.best_score}
                </td>
                <td className="border-b border-line px-3 py-3 text-right text-muted">
                  {row.game_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
