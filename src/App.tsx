import { useState } from "react";
import { createDraw, evaluateRound, type RoundResult } from "./engine/RoundService";
import { mainValidator, mainDictionary } from "./engine/mainDictionary";
import { findBestWordForDraw } from "./engine/findBestWord";
import type { Draw } from "./engine/types";

function computeOrderIndices(word: string, draw: Draw): number[] {
  const letters = draw.map((l) => l[0]); // draw est déjà en majuscules
  const indices: number[] = [];
  let pos = -1;

  for (const letter of letters) {
    if (!letter) return [];
    const nextPos = word.indexOf(letter, pos + 1);
    if (nextPos === -1) {
      return [];
    }
    indices.push(nextPos);
    pos = nextPos;
  }

  return indices;
}

function ColoredWord({ result }: { result: RoundResult }) {
  if (!result.score) {
    return <span>{result.rawWord}</span>;
  }

  const { word, skeletonIndices, orderBonus } = result.score;
  const draw = result.draw;
  const length = word.length;

  type Role = "unused" | "insert" | "unordered" | "ordered";

  const roles: Role[] = Array(length).fill("unused");

  if (skeletonIndices.length > 0) {
    const zoneStart = skeletonIndices[0];
    const zoneEnd = skeletonIndices[skeletonIndices.length - 1];

    // Par défaut, tout ce qui est dans la zone est une insertion
    for (let i = zoneStart; i <= zoneEnd; i++) {
      roles[i] = "insert";
    }

    // Lettres du squelette (non ordonnées) → bleu
    for (const idx of skeletonIndices) {
      roles[idx] = "unordered";
    }

    // Lettres du squelette qui forment la sous-suite dans l'ordre du tirage → vert
    if (orderBonus) {
      const orderIndices = computeOrderIndices(word, draw);
      for (const idx of orderIndices) {
        roles[idx] = "ordered";
      }
    }
  }

  return (
    <>
      {word.split("").map((ch, idx) => {
        let color: string;
        switch (roles[idx]) {
          case "ordered": // vert
            color = "#16a34a";
            break;
          case "unordered": // bleu
            color = "#2563eb";
            break;
          case "insert": // rouge
            color = "#dc2626";
            break;
          case "unused": // gris clair
          default:
            color = "#9ca3af";
            break;
        }
        return (
          <span key={idx} style={{ color, fontWeight: "bold" }}>
            {ch}
          </span>
        );
      })}
    </>
  );
}

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

    if (r.isValid) {
      setSessionScore((s) => s + r.total);
    }

    setHistory((h) => [r, ...h].slice(0, 10));

    const best = findBestWordForDraw(draw, mainDictionary);
    setBestSolution(best);
  }

  function newDraw() {
    setDraw(createDraw());
    setInputWord("");
    setResult(null);
    setBestSolution(null);
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20, maxWidth: 800, margin: "0 auto" }}>
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

              <div style={{ marginTop: 10, fontFamily: "monospace", fontSize: 24 }}>
                <ColoredWord result={result} />
              </div>

              <div style={{ marginTop: 8, fontSize: 12 }}>
                <span style={{ color: "#16a34a", fontWeight: "bold" }}>VERT</span> = lettres du
                tirage dans l&apos;ordre (bonus +3),{" "}
                <span style={{ color: "#2563eb", fontWeight: "bold" }}>BLEU</span> = autres lettres
                du tirage utilisées,{" "}
                <span style={{ color: "#dc2626", fontWeight: "bold" }}>ROUGE</span> = insertions,{" "}
                <span style={{ color: "#9ca3af", fontWeight: "bold" }}>GRIS</span> = lettres
                inutiles en dehors de la zone.
              </div>

              <div style={{ marginTop: 10 }}>
                Lettres utilisées : {result.score.usedLetters.join(", ")}
              </div>

              <div style={{ marginTop: 5 }}>
                Squelette (indices) : [{result.score.skeletonIndices.join(", ")}]
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
            <div
              style={{
                marginTop: 20,
                paddingTop: 10,
                borderTop: "1px solid #ccc",
              }}
            >
              <h3>Meilleure solution possible</h3>
              <div>
                Mot : <strong>{bestSolution.word}</strong>
              </div>
              <div>
                Score : <strong>{bestSolution.score}</strong>
              </div>
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
