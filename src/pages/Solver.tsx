import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { solveTopN, type SolverResult } from "../engine/solver";
import { mainDictionary } from "../engine/mainDictionary";
import type { Draw } from "../engine/types";

export default function Solver() {
  const [letters, setLetters] = useState<string[]>(["", "", "", ""]);
  const [results, setResults] = useState<SolverResult[] | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  const hasAnyLetter = letters.some((l) => l !== "");
  const canAnalyse   = letters.every((l) => l !== "");

  function handleChange(i: number, raw: string) {
    const char = raw.replace(/[^A-Za-z]/g, "").slice(-1).toUpperCase();
    setLetters((prev) => {
      const next = [...prev];
      next[i] = char;
      return next;
    });
    if (char) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && letters[i] === "") {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handleAnalyse() {
    const draw: Draw = letters.map((l) => l.toUpperCase());
    setResults(solveTopN(draw, mainDictionary, 10));
  }

  function handleReset() {
    setLetters(["", "", "", ""]);
    setResults(null);
    inputRefs.current[0]?.focus();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-fg">Solveur</h1>
      <p className="mt-2 text-muted">
        Entrez un tirage pour découvrir les 10 meilleurs mots possibles.
      </p>

      {/* Draw input */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {letters.map((letter, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            maxLength={1}
            value={letter}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-14 w-14 rounded-lg border border-line bg-surface text-center text-2xl font-bold text-primary uppercase outline-none transition-colors focus:border-primary"
          />
        ))}

        <button
          onClick={handleAnalyse}
          disabled={!canAnalyse}
          className="ml-2 rounded-lg bg-primary px-5 py-3 font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          Analyser
        </button>
      </div>

      {hasAnyLetter && (
        <button
          onClick={handleReset}
          className="mt-2 text-sm text-muted transition-colors hover:text-fg"
        >
          Réinitialiser
        </button>
      )}

      {/* Results table */}
      {results !== null && (
        <div className="mt-6 w-full overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Mot</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-left">Lettres utilisées</th>
                <th className="px-3 py-2 text-center">Ordre</th>
                <th className="px-3 py-2 text-right">Insertions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr
                  key={idx}
                  className={idx === 0 ? "border-l-2 border-primary bg-elevated" : ""}
                >
                  <td className="border-b border-line px-3 py-3 text-muted">
                    {idx + 1}
                  </td>
                  <td className="border-b border-line px-3 py-3 font-mono font-bold text-fg">
                    {r.word}
                  </td>
                  <td className={`border-b border-line px-3 py-3 text-right font-bold ${r.score.total > 0 ? "text-primary" : "text-muted"}`}>
                    {r.score.total}
                  </td>
                  <td className="border-b border-line px-3 py-3 text-muted">
                    {r.score.usedLetters.length > 0
                      ? r.score.usedLetters.join(", ")
                      : "—"}
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
            Résultats pour le tirage {letters.join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}
