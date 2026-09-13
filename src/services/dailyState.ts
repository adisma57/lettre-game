import type { Draw, ScoreResult } from "../engine/types";
import type { SolverResult } from "../engine/solver";
import { getTodayKey } from "../engine/dayKey";

export type AttemptRecord = {
  rawWord: string;
  normalizedWord: string;
  total: number;
  score: ScoreResult | null;   // required by buildShareText
};

export type DailyState = {
  _v: 2;                        // 2: deviceId, percentile, no more username
  date: string;                 // "YYYY-MM-DD" (Europe/Paris)
  draw: Draw;
  attempts: AttemptRecord[];    // max 3 entries
  bestPossibleScore: number;    // -1 until the server answers
  bestWord: string | null;
  topWords: SolverResult[];
  completed: boolean;
  revealed: boolean;
  percentile: number | null;
  playersToday: number;
  statsApplied: boolean;        // stops one game being counted twice
};

const STORAGE_KEY = "quadra:daily";

/**
 * Loads today's game state from localStorage.
 * Returns null if the key is absent, the schema version is wrong,
 * or the stored date is not today (stale — new day).
 */
export function loadDailyState(): DailyState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyState>;
    if (parsed._v !== 2) return null;
    if (parsed.date !== getTodayKey()) return null;
    return parsed as DailyState;
  } catch {
    return null;
  }
}

export function saveDailyState(state: DailyState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.error("Failed to save daily state to localStorage");
  }
}

export function createFreshState(date: string, draw: Draw): DailyState {
  return {
    _v: 2,
    date,
    draw,
    attempts: [],
    bestPossibleScore: -1,
    bestWord: null,
    topWords: [],
    completed: false,
    revealed: false,
    percentile: null,
    playersToday: 0,
    statsApplied: false,
  };
}
