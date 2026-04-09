import { useState } from "react";
import { solveTopN, type SolverResult } from "../engine/solver";
import { mainDictionary } from "../engine/mainDictionary";
import { getDailyDraw } from "../engine/draw";
import { DrawInput } from "../components/game/DrawInput";
import { SolverResultsTable } from "../components/game/SolverResults";
import { Button } from "../components/ui/Button";
import type { Draw } from "../engine/types";

const dailyDraw = getDailyDraw();
const dailyDrawSorted = [...dailyDraw].sort().join("");

function isDailyDrawInput(letters: string[]): boolean {
  if (letters.some((l) => l === "")) return false;
  return [...letters].map((l) => l.toUpperCase()).sort().join("") === dailyDrawSorted;
}

export default function Solver() {
  const [letters, setLetters] = useState<string[]>(["", "", "", ""]);
  const [draw, setDraw]       = useState<Draw | null>(null);
  const [results, setResults] = useState<SolverResult[] | null>(null);

  const hasAnyLetter = letters.some((l) => l !== "");
  const isDaily      = isDailyDrawInput(letters);
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
    setResults(solveTopN(d, mainDictionary, 10));
  }

  function handleReset() {
    setLetters(["", "", "", ""]);
    setDraw(null);
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

      {isDaily && (
        <p className="mt-3 text-sm text-error">
          Ce tirage correspond au défi du jour — utilise le solveur uniquement sur d'autres tirages.
        </p>
      )}

      {hasAnyLetter && (
        <Button variant="ghost" onClick={handleReset} className="mt-2">
          Réinitialiser
        </Button>
      )}

      {results !== null && draw !== null && (
        <SolverResultsTable results={results} draw={draw} />
      )}
    </div>
  );
}
