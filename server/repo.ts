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

type MemUser = { id: number; username: string; createdAt: Date };
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
  total_score: number;   // hebdo + mensuel (0 pour global)
  game_count: number;
  best_score: number;    // hebdo + mensuel (0 pour global)
  avg_accuracy: number;  // global uniquement (0.0–1.0), 0 pour hebdo/mensuel
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

export async function insertUser(
  username: string,
): Promise<{ ok: true } | { ok: false; duplicate: true }> {
  if (isMemoryBackend()) {
    const key = username.toLowerCase();
    if (mem.lowerToId.has(key)) return { ok: false, duplicate: true };
    const id = mem.nextUserId++;
    mem.usersById.set(id, { id, username, createdAt: new Date() });
    mem.lowerToId.set(key, id);
    return { ok: true };
  }

  const sql = getNeon();
  try {
    await sql`INSERT INTO users (username) VALUES (${username})`;
    return { ok: true };
  } catch (err: unknown) {
    if (isUniqueViolation(err)) return { ok: false, duplicate: true };
    throw err;
  }
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

export async function insertScoreIfAbsent(
  userId: number,
  date: string,
  score: number,
  best_possible: number,
  attempts: number,
): Promise<void> {
  if (isMemoryBackend()) {
    const exists = mem.scores.some((s) => s.userId === userId && s.date === date);
    if (!exists) {
      mem.scores.push({ userId, date, score, best_possible, attempts });
    }
    return;
  }

  const sql = getNeon();
  await sql`
    INSERT INTO scores (user_id, date, score, best_possible, attempts)
    VALUES (${userId}, ${date}, ${score}, ${best_possible}, ${attempts})
    ON CONFLICT (user_id, date) DO NOTHING
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
        const accuracy = bp > 0 ? s.score / bp : 0;
        entry.accuracies.push(accuracy);
      }

      type Row = Omit<LeaderboardRow, "rank">;
      const rows: Row[] = [];
      for (const [, v] of byUser) {
        if (v.accuracies.length === 0) continue;
        const avg = v.accuracies.reduce((a, b) => a + b, 0) / v.accuracies.length;
        rows.push({
          username: v.username,
          total_score: 0,
          game_count: v.accuracies.length,
          best_score: 0,
          avg_accuracy: avg,
          created_at: v.createdAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
        });
      }
      rows.sort((a, b) => b.avg_accuracy - a.avg_accuracy || b.game_count - a.game_count);
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
      SELECT
        u.username,
        0::int         AS total_score,
        COUNT(*)::int  AS game_count,
        0              AS best_score,
        AVG(s.score::float / NULLIF(COALESCE(dp.best_possible, s.best_possible), 0)) AS avg_accuracy,
        u.created_at
      FROM scores s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN daily_puzzles dp ON dp.date = s.date
      GROUP BY u.id, u.username, u.created_at
      ORDER BY avg_accuracy DESC, game_count DESC
    `)) as RawRow[];

    return raw.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      total_score: 0,
      game_count: r.game_count,
      best_score: 0,
      avg_accuracy: typeof r.avg_accuracy === "string" ? parseFloat(r.avg_accuracy) : (r.avg_accuracy ?? 0),
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
