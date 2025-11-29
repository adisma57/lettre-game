import { useState } from "react";
import { createDraw, evaluateRound, type RoundResult } from "./engine/RoundService";
import { mainValidator } from "./engine/mainDictionary";
import { findBestWordForDraw } from "./engine/findBestWord";
import { mainDictionary } from "./engine/mainDictionary";


export default function App() {
  const [draw, setDraw] = useState(() => createDraw());
  const [inputWord, setInputWord] = useState("");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [sessionScore, setSessionScore] = useState(0);
  const [bestSolution, setBestSolution] = useState<{ word: string; score: number } | null>(null);

  function submitWord(e: React.FormEvent) {
    e.preventDefault();

    const r = evaluateRound(draw, inputWord, mainValidator);
    setResult(r);

    const best = findBestWordForDraw(draw, mainDictionary);
    setBestSolution(best);

    if (r.isValid) {
      setSessionScore((s) => s + r.total);
    }

    setHistory((h) => [r, ...h].slice(0, 10));
  }

  function newDraw() {
    setDraw(createDraw());
    setInputWord("");
    setResult(null);
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20, maxWidth: 600 }}>
      <h1>Jeu de Lettres (Prototype)</h1>

      <div style={{ marginBottom: 20, marginTop: 10 }}>
        <h2>Tirage</h2>
        <div style={{ fontSize: 32, letterSpacing: 8 }}>{draw.join(" ")}</div>
        <button onClick={newDraw} style={{ marginTop: 10 }}>
          Nouveau tirage
        </button>
      </div>

      <form onSubmit={submitWord}>
        <h2>Votre mot</h2>
        <input
          value={inputWord}
          onChange={(e) => setInputWord(e.target.value)}
          style={{ width: "100%", padding: 8, fontSize: 18 }}
          autoFocus
        />
        <button type="submit" style={{ marginTop: 10 }}>
          Valider
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 30 }}>
          <h2>Résultat</h2>

          {!result.isValid && (
            <div style={{ color: "red" }}>
              Mot invalide :{" "}
              {result.invalidReason === "empty" && "mot vide"}
              {result.invalidReason === "not_in_dictionary" &&
                "mot non présent dans le dictionnaire"}
            </div>
          )}

          {result.isValid && result.score && (
            <div>
              <div style={{ fontSize: 24 }}>
                Score : <strong>{result.total}</strong>
              </div>

              <div style={{ marginTop: 10 }}>
                Lettres utilisées : {result.score.usedLetters.join(", ")}
              </div>

              <div style={{ marginTop: 5 }}>
                Squelette : [{result.score.skeletonIndices.join(", ")}]
              </div>

              <div style={{ marginTop: 5 }}>
                Insertions : {result.score.insertions}
              </div>

              <div style={{ marginTop: 5 }}>
                Bonus ordre : {result.score.orderBonus ? "Oui (+3)" : "Non"}
              </div>

              <div style={{ marginTop: 10 }}>
                Détail :
                <ul>
                  {result.score.parts.map((p, i) => (
                    <li key={i}>
                      {p.label}: {p.value}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {bestSolution && (
              <div style={{ marginTop: 20, paddingTop: 10, borderTop: "1px solid #ccc" }}>
                <h3>Meilleure solution possible</h3>
                <div>Mot : <strong>{bestSolution.word}</strong></div>
                <div>Score : <strong>{bestSolution.score}</strong></div>
              </div>
            )}

        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <h2>Score de session</h2>
        <div style={{ fontSize: 22 }}>{sessionScore}</div>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Historique (10 derniers)</h2>
        <ul>
          {history.map((r, i) => (
            <li key={i}>
              {r.rawWord} → {r.total}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
