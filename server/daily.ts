import { getDailyDraw } from "../src/engine/draw.js";
import { solveTopN, type SolverResult } from "../src/engine/solver.js";
import { solverDictionary } from "./dictionary.js";
import { getDailyPuzzle, upsertDailyPuzzle, type DailyPuzzle } from "./repo.js";

/**
 * Per-instance memory cache: avoids rescanning the dictionary on every request
 * hitting the same warm instance. The database stays the shared source of truth
 * across instances.
 */
const topWordsCache = new Map<string, SolverResult[]>();

function solve(dayKey: string): SolverResult[] {
  const cached = topWordsCache.get(dayKey);
  if (cached) return cached;
  const results = solveTopN(getDailyDraw(dayKey), solverDictionary, 10);
  topWordsCache.set(dayKey, results);
  return results;
}

/**
 * Returns the day's denominator, computing and persisting it when absent.
 * Called by both /attempt and /finish.
 */
export async function resolveBestPossible(dayKey: string): Promise<number> {
  const stored = await getDailyPuzzle(dayKey);
  if (stored) return stored.bestPossible;

  const [best] = solve(dayKey);
  const puzzle: DailyPuzzle = {
    bestPossible: best?.score.total ?? 0,
    bestWord: best?.word ?? "",
  };
  await upsertDailyPuzzle(dayKey, puzzle);
  return puzzle.bestPossible;
}

/** Returns the solution word and top 10. End-of-game only. */
export async function resolveAnswers(
  dayKey: string,
): Promise<{ bestWord: string; topWords: SolverResult[] }> {
  await resolveBestPossible(dayKey);
  const results = solve(dayKey);
  return { bestWord: results[0]?.word ?? "", topWords: results };
}
