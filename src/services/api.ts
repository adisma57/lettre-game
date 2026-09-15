import { GAME_LANGUAGE } from "../language";
import type { Draw } from "../engine/types";
import type { SolverResult } from "../engine/solver";

const BASE = import.meta.env.VITE_API_URL ?? "";
const MAX_ATTEMPTS = 3;

/**
 * Retries on network errors and 5xx, never on 4xx.
 * Carries over the strategy introduced to stop iOS Safari losing scores.
 */
async function postWithRetry<T>(path: string, body: unknown): Promise<T | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise<void>((r) => setTimeout(r, attempt * 1000));
    }
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Game-Language": GAME_LANGUAGE },
        body: JSON.stringify(body),
      });
      if (res.ok) return (await res.json()) as T;
      if (res.status >= 400 && res.status < 500) {
        console.error(`[api] ${path} → ${res.status}, abandon`);
        return null;
      }
      console.error(`[api] ${path} → ${res.status}, tentative ${attempt + 1}/${MAX_ATTEMPTS}`);
    } catch (err) {
      console.error(`[api] ${path} — erreur réseau, tentative ${attempt + 1}/${MAX_ATTEMPTS}`, err);
    }
  }
  return null;
}

export type AttemptResponse = { bestPossible: number };

/** Best-effort warmup; no answers or player data are transferred. */
export async function prepareDaily(date: string): Promise<void> {
  try {
    await fetch(`${BASE}/api/daily/${date}/prepare`, {
      headers: { "X-Game-Language": GAME_LANGUAGE },
      signal: AbortSignal.timeout(25_000),
    });
  } catch { /* Submission still works if preparation is unavailable. */ }
}

/** Records an attempt and returns the day's denominator. null when unavailable. */
export function submitAttempt(payload: {
  date: string;
  deviceId: string;
  attemptNum: number;
  score: number;
}): Promise<AttemptResponse | null> {
  const { date, ...body } = payload;
  return postWithRetry<AttemptResponse>(`/api/daily/${date}/attempt`, body);
}

export type FinishResponse = {
  bestWord: string;
  topWords: SolverResult[];
  percentile: number | null;
  playersToday: number;
};

/** Fetches the solution and the percentile. Idempotent: writes nothing. */
export function fetchFinish(date: string, score: number): Promise<FinishResponse | null> {
  return postWithRetry<FinishResponse>(`/api/daily/${date}/finish`, { score });
}

export type TrainingRound = { draw: Draw; top3: SolverResult[] };

export async function fetchTrainingRound(): Promise<TrainingRound | null> {
  try {
    const res = await fetch(`${BASE}/api/training`, { headers: { "X-Game-Language": GAME_LANGUAGE } });
    if (!res.ok) return null;
    return (await res.json()) as TrainingRound;
  } catch {
    return null;
  }
}
