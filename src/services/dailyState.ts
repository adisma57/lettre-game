import type { Draw } from "../engine/types";
import type { Lang } from "../i18n/translations";

export type AttemptRecord = {
  rawWord: string;
  normalizedWord: string;
  total: number;
};

export type DailyState = {
  _v: 1;                        // schema version — bump on breaking changes
  date: string;                 // "YYYY-MM-DD" UTC
  draw: Draw;
  attempts: AttemptRecord[];    // max 3 entries
  bestPossibleScore: number;    // -1 until first submit
  bestWord: string | null;      // null until first submit
  completed: boolean;
  submittedAttempts?: number[]; // attempt_num values confirmed by the backend
};

// "quadra:daily" for FR (backward-compat), "quadra:daily:en" for EN
function storageKey(lang: Lang): string {
  return lang === "en" ? "quadra:daily:en" : "quadra:daily";
}

/** Returns today's UTC date as "YYYY-MM-DD". */
export function getTodayKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Loads today's game state from localStorage for the given language.
 * Returns null if absent, wrong schema version, or stale (new day).
 */
export function loadDailyState(lang: Lang = "fr"): DailyState | null {
  try {
    const raw = localStorage.getItem(storageKey(lang));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyState>;
    if (parsed._v !== 1) return null;
    if (parsed.date !== getTodayKey()) return null;
    return parsed as DailyState;
  } catch {
    return null;
  }
}

export function saveDailyState(state: DailyState, lang: Lang = "fr"): void {
  try {
    localStorage.setItem(storageKey(lang), JSON.stringify(state));
  } catch {
    console.error("Failed to save daily state to localStorage");
  }
}

export function createFreshState(date: string, draw: Draw): DailyState {
  return {
    _v: 1,
    date,
    draw,
    attempts: [],
    bestPossibleScore: -1,
    bestWord: null,
    completed: false,
  };
}
