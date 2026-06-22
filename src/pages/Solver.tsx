import { useState } from "react";
import { solveTopN, type SolverResult } from "../engine/solver";
import { useGameResources } from "../hooks/useGameResources";
import { useT } from "../contexts/LanguageContext";
import { DrawInput } from "../components/game/DrawInput";
import { SolverResultsTable } from "../components/game/SolverResults";
import { Button } from "../components/ui/Button";
import type { Draw } from "../engine/types";

export default function Solver() {
  const t = useT();
  const resources = useGameResources();

  const dailyDraw = resources.getDailyDraw();
  const dailyDrawSorted = [...dailyDraw].sort().join("");

  const [letters, setLetters] = useState<string[]>(["", "", "", ""]);
  const [draw, setDraw]       = useState<Draw | null>(null);
  const [results, setResults] = useState<SolverResult[] | null>(null);

  const hasAnyLetter = letters.some((l) => l !== "");
  const isDaily      =
    letters.every((l) => l !== "") &&
    [...letters].map((l) => l.toUpperCase()).sort().join("") === dailyDrawSorted;
  const canAnalyse   = letters.every((l) => l !== "") && !isDaily;

  function handleLetterChange(index: number, value: string) {
    setLetters((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleAnalyse() {
    const d: Draw = letters.map((l) => l.toUpperCase());
    setDraw(d);
    setResults(solveTopN(d, resources.dictionary, 10));
  }

  function handleReset() {
    setLetters(["", "", "", ""]);
    setDraw(null);
    setResults(null);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-fg">{t.solver.title}</h1>
      <p className="mt-2 text-muted">{t.solver.subtitle}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <DrawInput letters={letters} onChange={handleLetterChange} />
        <Button onClick={handleAnalyse} disabled={!canAnalyse} className="ml-2 py-3">
          {t.solver.analyse}
        </Button>
      </div>

      {isDaily && (
        <p className="mt-3 text-sm text-error">{t.solver.dailyWarning}</p>
      )}

      {hasAnyLetter && (
        <Button variant="ghost" onClick={handleReset} className="mt-2">
          {t.solver.reset}
        </Button>
      )}

      {results !== null && draw !== null && (
        <SolverResultsTable results={results} draw={draw} />
      )}
    </div>
  );
}
