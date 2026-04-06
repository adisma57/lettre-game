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
};

export type LeaderboardRow = {
  rank: number;
  username: string;
  total_score: number;
  game_count: number;
  best_score: number;
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

const LEADERBOARD_BASE = `
  SELECT
    u.username,
    SUM(s.score)::int                   AS total_score,
    COUNT(*)::int                       AS game_count,
    MAX(s.score)                        AS best_score,
    u.created_at                        AS created_at
  FROM scores s
  JOIN users u ON u.id = s.user_id
  GROUP BY u.id, u.username, u.created_at
`;

export async function getLeaderboard(
  sort: "total_score" | "game_count" | "account_age",
): Promise<LeaderboardRow[]> {
  if (isMemoryBackend()) {
    const byUser = new Map<
      number,
      { username: string; createdAt: Date; scores: number[] }
    >();
    for (const u of mem.usersById.values()) {
      byUser.set(u.id, { username: u.username, createdAt: u.createdAt, scores: [] });
    }
    for (const s of mem.scores) {
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
        created_at: v.createdAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
      });
    }

    const cmp =
      sort === "game_count"
        ? (a: Row, b: Row) =>
            b.game_count - a.game_count || b.total_score - a.total_score
        : sort === "account_age"
          ? (a: Row, b: Row) =>
              a.created_at.localeCompare(b.created_at) ||
              b.game_count - a.game_count
          : (a: Row, b: Row) =>
              b.total_score - a.total_score || b.game_count - a.game_count;

    rows.sort(cmp);
    return rows.map((r, i) => ({ rank: i + 1, ...r }));
  }

  const sql = getNeon();
  type Row = Omit<Omit<LeaderboardRow, "rank">, "created_at"> & {
    created_at: Date | string;
  };
  let raw: Row[];
  if (sort === "game_count") {
    raw = (await sql.query(
      `${LEADERBOARD_BASE} ORDER BY game_count DESC, total_score DESC`,
    )) as Row[];
  } else if (sort === "account_age") {
    raw = (await sql.query(
      `${LEADERBOARD_BASE} ORDER BY created_at ASC, game_count DESC`,
    )) as Row[];
  } else {
    raw = (await sql.query(
      `${LEADERBOARD_BASE} ORDER BY total_score DESC, game_count DESC`,
    )) as Row[];
  }

  return raw.map((r, i) => ({
    rank: i + 1,
    username: r.username,
    total_score: r.total_score,
    game_count: r.game_count,
    best_score: r.best_score,
    created_at:
      r.created_at instanceof Date
        ? r.created_at.toISOString().replace(/\.\d{3}Z$/, "Z")
        : String(r.created_at),
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
