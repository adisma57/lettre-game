import { useState } from "react";
import type { SolverResult } from "../../engine/solver";
import { useT } from "../../contexts/LanguageContext";

// ─── Compact list (Training top-3, collapsible) ───────────────────────────────

interface SolverResultsListProps {
  results: SolverResult[];
  title?: string;
  collapsible?: boolean;
}

export function SolverResultsList({
  results,
  title,
  collapsible = true,
}: SolverResultsListProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const resolvedTitle = title ?? t.game.top3Title;

  if (results.length === 0) return null;

  return (
    <div className="mt-4">
      {collapsible && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-sm text-muted transition-colors hover:text-fg"
        >
          {open ? t.game.hideTop3 : t.game.showTop3}
        </button>
      )}

      {(!collapsible || open) && (
        <div className="mt-3 rounded-xl border border-line bg-elevated p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-muted">{resolvedTitle}</p>
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

// ─── Full table (Solver page) ─────────────────────────────────────────────────

interface SolverResultsTableProps {
  results: SolverResult[];
  draw: string[];
}

export function SolverResultsTable({ results, draw }: SolverResultsTableProps) {
  const t = useT();
  if (results.length === 0) return null;

  return (
    <div className="mt-6 w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">{t.solver.colWord}</th>
            <th className="px-3 py-2 text-right">{t.solver.colScore}</th>
            <th className="px-3 py-2 text-left">{t.solver.colUsed}</th>
            <th className="px-3 py-2 text-center">{t.solver.colOrder}</th>
            <th className="px-3 py-2 text-right">{t.solver.colInsert}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, idx) => (
            <tr
              key={idx}
              className={idx === 0 ? "border-l-2 border-primary bg-elevated" : ""}
            >
              <td className="border-b border-line px-3 py-3 text-muted">{idx + 1}</td>
              <td className="border-b border-line px-3 py-3 font-mono font-bold text-fg">
                {r.word}
              </td>
              <td className={`border-b border-line px-3 py-3 text-right font-bold ${r.score.total > 0 ? "text-primary" : "text-muted"}`}>
                {r.score.total}
              </td>
              <td className="border-b border-line px-3 py-3 text-muted">
                {r.score.usedLetters.length > 0 ? r.score.usedLetters.join(", ") : "—"}
              </td>
              <td className="border-b border-line px-3 py-3 text-center">
                {r.score.orderBonus
                  ? <span className="text-success">✓</span>
                  : <span className="text-muted">✗</span>}
              </td>
              <td className="border-b border-line px-3 py-3 text-right text-muted">
                {r.score.insertions}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">
        {t.solver.resultsFor(draw.join(" · "))}
      </p>
    </div>
  );
}
