import { submitScore, createUser, type ScorePayload } from "./api";

const KEY = "quadra:pending_scores";

function load(): ScorePayload[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list: ScorePayload[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* iOS quota / private mode — ignore */
  }
}

function enqueue(payload: ScorePayload): void {
  // Deduplicate by (username, date): newer overwrites older.
  const list = load().filter(
    (p) => !(p.username === payload.username && p.date === payload.date),
  );
  list.push(payload);
  save(list);
}

type Outcome = "ok" | "retryable" | "drop";

async function attempt(payload: ScorePayload): Promise<Outcome> {
  const res = await submitScore(payload);
  if (res.ok) return "ok";
  if (res.status === 0 || res.status >= 500) return "retryable";
  // Other 4xx (400 validation, 401 missing header) → unrecoverable.
  return "drop";
}

/**
 * Submit a score. On 404 "unknown user" the client recreates the user and
 * retries once — covers Neon branch resets or manually-deleted users while
 * the client still has a valid localStorage.
 *
 * Network failures / 5xx are queued for later replay.
 */
export async function submitScoreWithRetry(
  payload: ScorePayload,
): Promise<void> {
  const first = await submitScore(payload);
  if (first.ok) return;

  if (first.status === 404) {
    const created = await createUser(payload.username);
    if (created.ok) {
      const retry = await submitScore(payload);
      if (retry.ok) return;
    }
    // Can't recover (username taken by someone else, or still failing) → drop.
    return;
  }

  if (first.status === 0 || first.status >= 500) {
    enqueue(payload);
  }
}

/**
 * Replay any queued submissions. Called on Layout mount and on tab focus —
 * which covers iOS returning to the app after backgrounding a killed fetch.
 */
export async function flushPendingScores(): Promise<void> {
  const list = load();
  if (list.length === 0) return;

  const remaining: ScorePayload[] = [];
  for (const payload of list) {
    const outcome = await attempt(payload);
    if (outcome === "retryable") remaining.push(payload);
  }
  save(remaining);
}
