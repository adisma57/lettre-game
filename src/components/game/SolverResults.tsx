import { useState } from "react";
import type { SolverResult } from "../../engine/solver";

// ─── Compact list (Training top-3, collapsible) ───────────────────────────────

interface SolverResultsListProps {
  results: SolverResult[];
  title?: string;
  collapsible?: boolean;
}

export function SolverResultsList({
  results,
  title = "Meilleurs mots possibles",
  collapsible = true,
}: SolverResultsListProps) {
  const [open, setOpen] = useState(false);

  if (results.length === 0) return null;

  return (
    <div className="mt-4">
      {collapsible && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-sm text-muted transition-colors hover:text-fg"
        >
          {open ? "▲ Masquer le top 3" : "▼ Voir le top 3"}
        </button>
      )}

      {(!collapsible || open) && (
        <div className="mt-3 rounded-xl border border-line bg-elevated p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-muted">{title}</p>
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
