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

const isDeployed =
  process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

function isMemoryBackend(): boolean {
  return !process.env.DATABASE_URL && !isDeployed;
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL manquant. En production / sur Vercel, configure la variable d'environnement.",
    );
  }
  return url;
}

let _neon: ReturnType<typeof neon> | null = null;
function getNeon() {
  if (!_neon) _neon = neon(requireDatabaseUrl());
  return _neon;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

// ─── In-memory dev store (no DATABASE_URL) ───────────────────────────────────

type MemUser = {
  id: number;
  username: string;
  createdAt: Date;
  recoveryCodeHash: string | null;
};
type MemScore = {
  userId: number;
  date: string;
  score: number;
  best_possible: number;
  attempts: number;
};

const mem = {
  nextUserId: 1,
  usersById: new Map<number, MemUser>(),
  lowerToId: new Map<string, number>(),
  scores: [] as MemScore[],
  dailyPuzzles: new Map<string, number>(),
};

export type LeaderboardRow = {
  rank: number;
  username: string;
  total_score: number;          // hebdo + mensuel (0 pour global)
  game_count: number;
  best_score: number;           // hebdo + mensuel (0 pour global)
  avg_accuracy: number;         // global: précision brute [0, 1]; 0 pour hebdo/mensuel
  bayesian_accuracy: number;    // global: précision bayésienne [0, 1]; 0 pour hebdo/mensuel
  created_at: string;
};

export async function ensureSchema(): Promise<void> {
  if (isMemoryBackend()) {
    console.warn(
      "[quadra] Base en mémoire (pas de DATABASE_URL) — données perdues au redémarrage du serveur.",
    );
    return;
  }

  const sql = getNeon();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower
    ON users (LOWER(username))
  `;

  // Recovery code: SHA-256 hex digest of the plain code we showed once at
  // signup. NULL for legacy accounts — those users can set one via
  // POST /api/users/:name/recovery-code.
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS recovery_code_hash TEXT
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      date           TEXT    NOT NULL,
      score          INTEGER NOT NULL,
      best_possible  INTEGER NOT NULL,
      attempts       INTEGER NOT NULL,
      UNIQUE (user_id, date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_puzzles (
      date          TEXT    NOT NULL PRIMARY KEY,
      best_possible INTEGER NOT NULL
    )
  `;
}

/** Cryptographically-random 16-hex-char code, formatted as XXXX-XXXX-XXXX-XXXX. */
export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

export async function hashRecoveryCode(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(code.trim().toUpperCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function insertUser(
  username: string,
): Promise<
  | { ok: true; recoveryCode: string }
  | { ok: false; duplicate: true }
> {
  const recoveryCode = generateRecoveryCode();
  const codeHash = await hashRecoveryCode(recoveryCode);

  if (isMemoryBackend()) {
    const key = username.toLowerCase();
    if (mem.lowerToId.has(key)) return { ok: false, duplicate: true };
    const id = mem.nextUserId++;
    mem.usersById.set(id, {
      id,
      username,
      createdAt: new Date(),
      recoveryCodeHash: codeHash,
    });
    mem.lowerToId.set(key, id);
    return { ok: true, recoveryCode };
  }

  const sql = getNeon();
  try {
    await sql`
      INSERT INTO users (username, recovery_code_hash)
      VALUES (${username}, ${codeHash})
    `;
    return { ok: true, recoveryCode };
  } catch (err: unknown) {
    if (isUniqueViolation(err)) return { ok: false, duplicate: true };
    throw err;
  }
}

/**
 * Verify a recovery code and return the canonical username if valid.
 * Constant-time-ish: we always hash the candidate before the DB lookup.
 */
export async function verifyRecoveryCode(
  username: string,
  code: string,
): Promise<string | null> {
  const codeHash = await hashRecoveryCode(code);

  if (isMemoryBackend()) {
    const id = mem.lowerToId.get(username.toLowerCase());
    if (id == null) return null;
    const user = mem.usersById.get(id);
    if (!user || !user.recoveryCodeHash) return null;
    return user.recoveryCodeHash === codeHash ? user.username : null;
  }

  const sql = getNeon();
  const rows = (await sql`
    SELECT username FROM users
    WHERE LOWER(username) = LOWER(${username})
      AND recovery_code_hash = ${codeHash}
    LIMIT 1
  `) as { username: string }[];
  return rows[0]?.username ?? null;
}

/**
 * Set (or reset) the recovery code for an existing user.
 * Returns the plain code so the caller can show it once.
 */
export async function resetRecoveryCode(
  username: string,
): Promise<string | null> {
  const recoveryCode = generateRecoveryCode();
  const codeHash = await hashRecoveryCode(recoveryCode);

  if (isMemoryBackend()) {
    const id = mem.lowerToId.get(username.toLowerCase());
    if (id == null) return null;
    const user = mem.usersById.get(id);
    if (!user) return null;
    user.recoveryCodeHash = codeHash;
    return recoveryCode;
  }

  const sql = getNeon();
  const rows = (await sql`
    UPDATE users
    SET recovery_code_hash = ${codeHash}
    WHERE LOWER(username) = LOWER(${username})
    RETURNING id
  `) as { id: number }[];
  return rows.length > 0 ? recoveryCode : null;
}

export async function findUserIdByUsername(
  username: string,
): Promise<number | null> {
  if (isMemoryBackend()) {
    const id = mem.lowerToId.get(username.toLowerCase());
    return id ?? null;
  }

  const sql = getNeon();
  const rows = (await sql`
    SELECT id FROM users WHERE LOWER(username) = LOWER(${username})
  `) as { id: number }[];
  return rows[0]?.id ?? null;
}

export async function upsertScore(
  userId: number,
  date: string,
  score: number,
  best_possible: number,
  attempts: number,
): Promise<void> {
  if (isMemoryBackend()) {
    const existing = mem.scores.find((s) => s.userId === userId && s.date === date);
    if (existing) {
      existing.score = Math.max(existing.score, score);
      existing.attempts = attempts;
    } else {
      mem.scores.push({ userId, date, score, best_possible, attempts });
    }
    return;
  }

  const sql = getNeon();
  await sql`
    INSERT INTO scores (user_id, date, score, best_possible, attempts)
    VALUES (${userId}, ${date}, ${score}, ${best_possible}, ${attempts})
    ON CONFLICT (user_id, date) DO UPDATE SET
      score    = GREATEST(excluded.score, scores.score),
      attempts = excluded.attempts
  `;
}

export async function upsertDailyPuzzle(
  date: string,
  best_possible: number,
): Promise<void> {
  if (isMemoryBackend()) {
    if (!mem.dailyPuzzles.has(date)) mem.dailyPuzzles.set(date, best_possible);
    return;
  }

  const sql = getNeon();
  await sql`
    INSERT INTO daily_puzzles (date, best_possible)
    VALUES (${date}, ${best_possible})
    ON CONFLICT (date) DO NOTHING
  `;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns the ISO date string (YYYY-MM-DD) of the Monday of the current UTC week. */
function currentWeekMondayUtc(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

/** Returns the ISO date string of the first day of the current UTC month. */
function currentMonthStartUtc(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

const LEADERBOARD_SELECT = `
  SELECT
    u.username,
    SUM(s.score)::int                   AS total_score,
    COUNT(*)::int                       AS game_count,
    MAX(s.score)                        AS best_score,
    u.created_at                        AS created_at
  FROM scores s
  JOIN users u ON u.id = s.user_id
`;
const LEADERBOARD_GROUPBY = `GROUP BY u.id, u.username, u.created_at`;

export async function getLeaderboard(
  sort: "weekly" | "monthly" | "global",
): Promise<LeaderboardRow[]> {
  if (isMemoryBackend()) {
    if (sort === "global") {
      // Build per-score accuracy list
      const allAccuracies: number[] = [];
      const byUser = new Map<
        number,
        { username: string; createdAt: Date; accuracies: number[] }
      >();
      for (const u of mem.usersById.values()) {
        byUser.set(u.id, { username: u.username, createdAt: u.createdAt, accuracies: [] });
      }
      for (const s of mem.scores) {
        const entry = byUser.get(s.userId);
        if (!entry) continue;
        const bp = mem.dailyPuzzles.get(s.date) ?? s.best_possible;
        if (bp <= 0) continue;
        const accuracy = s.score / bp;
        entry.accuracies.push(accuracy);
        allAccuracies.push(accuracy);
      }

      // Pass 1: global average (fallback 0.5 when no scores)
      const globalAvg =
        allAccuracies.length === 0
          ? 0.5
          : allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length;

      // Pass 2: per-player Bayesian precision
      type Row = Omit<LeaderboardRow, "rank">;
      const rows: Row[] = [];
      for (const [, v] of byUser) {
        if (v.accuracies.length === 0) continue;
        const n = v.accuracies.length;
        const avg = v.accuracies.reduce((a, b) => a + b, 0) / n;
        const bayesian = (n * avg + 10 * globalAvg) / (n + 10);
        rows.push({
          username: v.username,
          total_score: 0,
          game_count: n,
          best_score: 0,
          avg_accuracy: avg,
          bayesian_accuracy: bayesian,
          created_at: v.createdAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
        });
      }
      rows.sort((a, b) => b.bayesian_accuracy - a.bayesian_accuracy || b.game_count - a.game_count);
      return rows.map((r, i) => ({ rank: i + 1, ...r }));
    }

    const minDate =
      sort === "weekly"
        ? currentWeekMondayUtc()
        : currentMonthStartUtc();

    const byUser = new Map<
      number,
      { username: string; createdAt: Date; scores: number[] }
    >();
    for (const u of mem.usersById.values()) {
      byUser.set(u.id, { username: u.username, createdAt: u.createdAt, scores: [] });
    }
    for (const s of mem.scores) {
      if (s.date < minDate) continue;
      const entry = byUser.get(s.userId);
      if (entry) entry.scores.push(s.score);
    }

    type Row = Omit<LeaderboardRow, "rank">;
    const rows: Row[] = [];
    for (const [, v] of byUser) {
      if (v.scores.length === 0) continue;
      const sum = v.scores.reduce((a, b) => a + b, 0);
      rows.push({
        username: v.username,
        total_score: sum,
        game_count: v.scores.length,
        best_score: Math.max(...v.scores),
        avg_accuracy: 0,
        bayesian_accuracy: 0,
        created_at: v.createdAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
      });
    }

    rows.sort((a, b) => b.total_score - a.total_score || b.game_count - a.game_count);
    return rows.map((r, i) => ({ rank: i + 1, ...r }));
  }

  const sql = getNeon();
  type RawRow = Omit<Omit<LeaderboardRow, "rank">, "created_at"> & {
    created_at: Date | string;
  };

  function formatCreatedAt(v: Date | string): string {
    return v instanceof Date ? v.toISOString().replace(/\.\d{3}Z$/, "Z") : String(v);
  }

  if (sort === "global") {
    const raw = (await sql.query(`
      WITH global AS (
        SELECT COALESCE(
          AVG(s.score::float / NULLIF(COALESCE(dp.best_possible, s.best_possible), 0)),
          0.5
        ) AS global_avg
        FROM scores s
        LEFT JOIN daily_puzzles dp ON dp.date = s.date
      ),
      player_stats AS (
        SELECT
          u.id,
          u.username,
          u.created_at,
          COUNT(*)::int AS game_count,
          AVG(s.score::float / NULLIF(COALESCE(dp.best_possible, s.best_possible), 0)) AS avg_accuracy
        FROM scores s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN daily_puzzles dp ON dp.date = s.date
        GROUP BY u.id, u.username, u.created_at
      )
      SELECT
        p.username,
        0::int                                                          AS total_score,
        p.game_count,
        0                                                               AS best_score,
        COALESCE(p.avg_accuracy, 0)                                     AS avg_accuracy,
        (p.game_count * COALESCE(p.avg_accuracy, 0) + 10 * g.global_avg)
          / (p.game_count + 10)                                         AS bayesian_accuracy,
        p.created_at
      FROM player_stats p
      CROSS JOIN global g
      ORDER BY bayesian_accuracy DESC, game_count DESC
    `)) as RawRow[];

    return raw.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      total_score: 0,
      game_count: r.game_count,
      best_score: 0,
      avg_accuracy: typeof r.avg_accuracy === "string" ? parseFloat(r.avg_accuracy) : (r.avg_accuracy ?? 0),
      bayesian_accuracy: typeof r.bayesian_accuracy === "string" ? parseFloat(r.bayesian_accuracy) : (r.bayesian_accuracy ?? 0),
      created_at: formatCreatedAt(r.created_at),
    }));
  }

  // DATE_TRUNC('week', …) in PostgreSQL uses ISO weeks (Monday start).
  const whereClause =
    sort === "weekly"
      ? `WHERE s.date::date >= DATE_TRUNC('week', CURRENT_DATE AT TIME ZONE 'UTC')::date`
      : `WHERE s.date::date >= DATE_TRUNC('month', CURRENT_DATE AT TIME ZONE 'UTC')::date`;

  const raw = (await sql.query(
    `${LEADERBOARD_SELECT} ${whereClause} ${LEADERBOARD_GROUPBY} ORDER BY total_score DESC, game_count DESC`,
  )) as RawRow[];

  return raw.map((r, i) => ({
    rank: i + 1,
    username: r.username,
    total_score: r.total_score,
    game_count: r.game_count,
    best_score: r.best_score,
    avg_accuracy: 0,
    bayesian_accuracy: 0,
    created_at: formatCreatedAt(r.created_at),
  }));
}

export async function usernameExists(name: string): Promise<boolean> {
  if (isMemoryBackend()) {
    return mem.lowerToId.has(name.toLowerCase());
  }

  const sql = getNeon();
  const found = (await sql`
    SELECT 1 AS ok FROM users WHERE LOWER(username) = LOWER(${name}) LIMIT 1
  `) as { ok: number }[];
  return found.length > 0;
}
