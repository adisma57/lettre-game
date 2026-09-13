import { loadStats, isStatsStorageAvailable } from "../../services/stats";
import { Card } from "../ui/Card";

// ─── Sub-renderers ────────────────────────────────────────────────────────────

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="font-display text-2xl font-extrabold text-primary">{value}</p>
      <p className="text-xs leading-tight text-muted">{label}</p>
    </div>
  );
}

/** Horizontal bar for one attempt count. A zero count still gets a sliver so the row isn't invisible. */
function AttemptBar({ tries, count, max }: { tries: number; count: number; max: number }) {
  const pct = max > 0 ? Math.max((count / max) * 100, 4) : 4;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-4 shrink-0 text-center font-mono text-muted">{tries}</span>
      <div className="h-5 flex-1 overflow-hidden rounded bg-elevated">
        <div className="h-full rounded bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-fg">{count}</span>
    </div>
  );
}

// ─── Shared statistics ────────────────────────────────────────────────────────────────────

export function StatsPanel() {
  if (!isStatsStorageAvailable()) {
    return (
      <>
        <Card>
          <p className="text-sm leading-relaxed text-muted">
            Votre navigateur bloque le stockage local — c'est normal en navigation privée ou avec
            certaines protections anti-pistage. Les statistiques et la série ne peuvent donc pas
            être conservées d'une visite à l'autre. Vous pouvez continuer à jouer chaque jour sans
            problème, seul ce suivi n'est pas disponible.
          </p>
        </Card>
      </>
    );
  }

  const stats = loadStats();
  const accuracy =
    stats.accuracyCount === 0
      ? "—"
      : `${Math.round((stats.accuracySum / stats.accuracyCount) * 100)} %`;

  const maxAttempt = Math.max(...stats.attemptDistribution, 1);

  return (
    <>
      <div className="flex flex-col gap-6">
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Figure label="Parties jouées" value={String(stats.gamesPlayed)} />
            <Figure label="Série actuelle" value={String(stats.currentStreak)} />
            <Figure label="Meilleure série" value={String(stats.maxStreak)} />
            <Figure label="Précision moyenne" value={accuracy} />
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
            Répartition des essais
          </h3>
          <div className="flex flex-col gap-3">
            {stats.attemptDistribution.map((count, i) => (
              <AttemptBar key={i} tries={i + 1} count={count} max={maxAttempt} />
            ))}
          </div>
        </Card>

        <p className="text-center text-sm text-muted">
          {stats.perfectCount} partie{stats.perfectCount === 1 ? "" : "s"} parfaite
          {stats.perfectCount === 1 ? "" : "s"}
        </p>
      </div>
    </>
  );
}

