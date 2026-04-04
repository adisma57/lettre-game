import { useState } from "react";
import { solveTopN, type SolverResult } from "../engine/solver";
import { mainDictionary } from "../engine/mainDictionary";
import { DrawInput } from "../components/game/DrawInput";
import { SolverResultsTable } from "../components/game/SolverResults";
import { Button } from "../components/ui/Button";
import type { Draw } from "../engine/types";

export default function Solver() {
  const [letters, setLetters] = useState<string[]>(["", "", "", ""]);
  const [results, setResults] = useState<SolverResult[] | null>(null);

  const hasAnyLetter = letters.some((l) => l !== "");
  const canAnalyse   = letters.every((l) => l !== "");

  function handleLetterChange(index: number, value: string) {
    setLetters((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleAnalyse() {
    const draw: Draw = letters.map((l) => l.toUpperCase());
    setResults(solveTopN(draw, mainDictionary, 10));
  }

  function handleReset() {
    setLetters(["", "", "", ""]);
    setResults(null);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-fg">Solveur</h1>
      <p className="mt-2 text-muted">
        Entrez un tirage pour découvrir les 10 meilleurs mots possibles.
      </p>

      {/* Draw input */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <DrawInput letters={letters} onChange={handleLetterChange} />
        <Button onClick={handleAnalyse} disabled={!canAnalyse} className="ml-2 py-3">
          Analyser
        </Button>
      </div>

      {hasAnyLetter && (
        <Button variant="ghost" onClick={handleReset} className="mt-2">
          Réinitialiser
        </Button>
      )}

      {results !== null && (
        <SolverResultsTable results={results} draw={letters} />
      )}
    </div>
  );
}
