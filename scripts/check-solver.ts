/**
 * Prints the best word for 30 consecutive daily draws.
 * Usage: npx tsx scripts/check-solver.ts
 *
 * Read the output by eye: if words unknown to the general public recur, the
 * solver dictionary needs frequency curation before this ships.
 */
import { getDailyDraw } from "../src/engine/draw";
import { solveTopN } from "../src/engine/solver";
import { solverDictionary } from "../server/dictionary";

const start = Date.parse("2026-09-10T12:00:00Z");

for (let i = 0; i < 30; i++) {
  const key = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
  const draw = getDailyDraw(key);
  const [best] = solveTopN(draw, solverDictionary, 1);
  console.log(
    `${key}  ${draw.join("")}  →  ${best?.word ?? "(aucun)"}  (${best?.score.total ?? 0} pts)`,
  );
}
