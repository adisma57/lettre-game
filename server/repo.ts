import { IS_ENGLISH } from "../src/language.js";
import { neon, neonConfig } from "@neondatabase/serverless";

/** Évite de bloquer une invocation Vercel jusqu'au maxDuration si Neon ne répond pas. */
const NEON_FETCH_TIMEOUT_MS = 20_000;

const baseFetch = globalThis.fetch.bind(globalThis);
neonConfig.fetchFunction = (
  input: Parameters<typeof globalThis.fetch>[0],
  init?: Parameters<typeof globalThis.fetch>[1],
) => {
  const deadline = AbortSignal.timeout(NEON_FETCH_TIMEOUT_MS);
  const signal =
    init?.signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([init.signal, deadline])
      : deadline;
  return baseFetch(input, { ...init, signal });
};

const databaseVariable = IS_ENGLISH ? "EN_DATABASE_URL" : "DATABASE_URL";

const isDeployed =
  process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

function isMemoryBackend(): boolean {
  return !process.env[databaseVariable] && !isDeployed;
}

function requireDatabaseUrl(): string {
  const url = process.env[databaseVariable];
  if (!url) {
    throw new Error(
      `${databaseVariable} missing. Configure the database for this game language.`,
    );
  }
  return url;
}

let _neon: ReturnType<typeof neon> | null = null;
function getNeon() {
  if (!_neon) _neon = neon(requireDatabaseUrl());
  return _neon;
}

// ─── In-memory store (no DATABASE_URL) ───────────────────────────────────────

type MemPlay = {
  deviceId: string;
  date: string;
  attemptNum: number;
  score: number;
};

const mem = {
  plays: [] as MemPlay[],
  dailyPuzzles: new Map<string, { bestPossible: number; bestWord: string }>(),
};

/** Test-only: clears the in-memory store between cases. */
export function resetMemoryStore(): void {
  mem.plays = [];
  mem.dailyPuzzles.clear();
}

/** Below this many distinct players, a percentile is statistically meaningless. */
export const MIN_PLAYERS_FOR_PERCENTILE = 20;

export type DailyPuzzle = { bestPossible: number; bestWord: string };
export type PercentileResult = { percentile: number | null; playersToday: number };

export async function ensureSchema(): Promise<void> {
  if (isMemoryBackend()) {
    console.warn(
      "[quadra] Base en mémoire (pas de DATABASE_URL) — données perdues au redémarrage.",
    );
    return;
  }

  const sql = getNeon();

  await sql`
    CREATE TABLE IF NOT EXISTS plays (
      id          SERIAL PRIMARY KEY,
      device_id   TEXT    NOT NULL,
      date        TEXT    NOT NULL,
      attempt_num INTEGER NOT NULL,
      score       INTEGER NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (device_id, date, attempt_num)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS plays_date ON plays (date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_puzzles (
      date          TEXT    NOT NULL PRIMARY KEY,
      best_possible INTEGER NOT NULL
    )
  `;

  await sql`ALTER TABLE daily_puzzles ADD COLUMN IF NOT EXISTS best_word TEXT`;

  // Archive the old username + leaderboard schema. A device_id cannot be
  // reconstructed from a username, so no migration is possible; renaming is
  // reversible, dropping is not.
  //
  // `ALTER TABLE IF EXISTS x RENAME TO y` guards only the *source* name: if the
  // target already exists it still raises "relation already exists". Since this
  // runs on every cold start, an unguarded rename would turn one odd database
  // state into a permanent outage — ensureSchema() throws, and every request
  // with it. Renaming only when the source exists AND the target does not makes
  // it safe to run forever.
  await sql`
    DO $$
    BEGIN
      IF to_regclass('public.scores') IS NOT NULL
         AND to_regclass('public.scores_archive') IS NULL THEN
        ALTER TABLE scores RENAME TO scores_archive;
      END IF;
      IF to_regclass('public.users') IS NOT NULL
         AND to_regclass('public.users_archive') IS NULL THEN
        ALTER TABLE users RENAME TO users_archive;
      END IF;
    END $$
  `;
}

export async function insertPlay(
  deviceId: string,
  date: string,
  attemptNum: number,
  score: number,
): Promise<void> {
  if (isMemoryBackend()) {
    const exists = mem.plays.some(
      (p) => p.deviceId === deviceId && p.date === date && p.attemptNum === attemptNum,
    );
    if (!exists) mem.plays.push({ deviceId, date, attemptNum, score });
    return;
  }

  const sql = getNeon();
  await sql`
    INSERT INTO plays (device_id, date, attempt_num, score)
    VALUES (${deviceId}, ${date}, ${attemptNum}, ${score})
    ON CONFLICT (device_id, date, attempt_num) DO NOTHING
  `;
}

export async function getDailyPercentile(
  date: string,
  score: number,
): Promise<PercentileResult> {
  if (isMemoryBackend()) {
    const best = new Map<string, number>();
    for (const p of mem.plays) {
      if (p.date !== date) continue;
      best.set(p.deviceId, Math.max(best.get(p.deviceId) ?? -Infinity, p.score));
    }
    const playersToday = best.size;
    if (playersToday < MIN_PLAYERS_FOR_PERCENTILE) {
      return { percentile: null, playersToday };
    }
    let below = 0;
    for (const v of best.values()) if (v < score) below += 1;
    return { percentile: below / playersToday, playersToday };
  }

  const sql = getNeon();
  const rows = (await sql`
    WITH best AS (
      SELECT device_id, MAX(score) AS score
      FROM plays WHERE date = ${date} GROUP BY device_id
    )
    SELECT
      COUNT(*)::int                                   AS players_today,
      COUNT(*) FILTER (WHERE score < ${score})::int   AS below
    FROM best
  `) as { players_today: number; below: number }[];

  const playersToday = rows[0]?.players_today ?? 0;
  const below = rows[0]?.below ?? 0;
  if (playersToday < MIN_PLAYERS_FOR_PERCENTILE) {
    return { percentile: null, playersToday };
  }
  return { percentile: below / playersToday, playersToday };
}

export async function getDailyPuzzle(date: string): Promise<DailyPuzzle | null> {
  if (isMemoryBackend()) {
    return mem.dailyPuzzles.get(date) ?? null;
  }

  const sql = getNeon();
  const rows = (await sql`
    SELECT best_possible, best_word FROM daily_puzzles WHERE date = ${date}
  `) as { best_possible: number; best_word: string | null }[];

  const row = rows[0];
  if (!row || row.best_word === null) return null;
  return { bestPossible: row.best_possible, bestWord: row.best_word };
}

export async function upsertDailyPuzzle(
  date: string,
  puzzle: DailyPuzzle,
): Promise<void> {
  if (isMemoryBackend()) {
    mem.dailyPuzzles.set(date, puzzle);
    return;
  }

  const sql = getNeon();
  await sql`
    INSERT INTO daily_puzzles (date, best_possible, best_word)
    VALUES (${date}, ${puzzle.bestPossible}, ${puzzle.bestWord})
    ON CONFLICT (date) DO UPDATE
      SET best_possible = EXCLUDED.best_possible,
          best_word     = EXCLUDED.best_word
  `;
}
