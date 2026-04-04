import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import db from "./db.js";

const app = new Hono();

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";
app.use("*", cors({ origin: CORS_ORIGIN }));

// Always return JSON for unhandled errors so the client can parse them
app.onError((err, c) => {
  console.error("[server error]", err);
  return c.json({ error: "Erreur serveur." }, 500);
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
// Body: { username: string }
// Creates a new user. Returns 201 on success, 409 if name already taken,
// 400 if name is missing or invalid.

app.post("/api/users", async (c) => {
  const body = await c.req.json<{ username?: string }>().catch(() => ({}));
  const username = (body.username ?? "").trim();

  if (!username || username.length < 2 || username.length > 20) {
    return c.json({ error: "Le pseudo doit faire entre 2 et 20 caractères." }, 400);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(username)) {
    return c.json({ error: "Caractères autorisés : lettres, chiffres, _ et -." }, 400);
  }

  try {
    db.prepare("INSERT INTO users (username) VALUES (?)").run(username);
    return c.json({ username }, 201);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("UNIQUE constraint failed")
    ) {
      return c.json({ error: "Ce pseudo est déjà pris." }, 409);
    }
    throw err;
  }
});

// ─── POST /api/scores ────────────────────────────────────────────────────────
// Header: X-Username
// Body:   { date, score, best_possible, attempts }
// Idempotent: submitting twice for the same date is a no-op (returns 200).

app.post("/api/scores", async (c) => {
  const username = c.req.header("X-Username")?.trim();
  if (!username) return c.json({ error: "En-tête X-Username manquant." }, 401);

  const user = db
    .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
    .get(username) as { id: number } | undefined;
  if (!user) return c.json({ error: "Utilisateur inconnu." }, 404);

  const body = await c.req.json<{
    date?: string;
    score?: number;
    best_possible?: number;
    attempts?: number;
  }>().catch(() => ({}));

  const { date, score, best_possible, attempts } = body;
  if (
    typeof date !== "string" ||
    typeof score !== "number" ||
    typeof best_possible !== "number" ||
    typeof attempts !== "number"
  ) {
    return c.json({ error: "Champs requis : date, score, best_possible, attempts." }, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: "Format de date invalide (YYYY-MM-DD attendu)." }, 400);
  }
  if (score < 0 || best_possible < 0 || attempts < 1 || attempts > 3) {
    return c.json({ error: "Valeurs hors limites." }, 400);
  }

  db.prepare(`
    INSERT INTO scores (user_id, date, score, best_possible, attempts)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO NOTHING
  `).run(user.id, date, score, best_possible, attempts);

  return c.json({ ok: true });
});

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────
// Query: ?sort=avg_score | game_count | account_age  (default: avg_score)

type LeaderboardRow = {
  rank: number;
  username: string;
  avg_score: number;
  game_count: number;
  best_score: number;
  created_at: string;
};

const SORT_COLUMNS: Record<string, string> = {
  avg_score:   "avg_score DESC, game_count DESC",
  game_count:  "game_count DESC, avg_score DESC",
  account_age: "created_at ASC, game_count DESC",
};

app.get("/api/leaderboard", (c) => {
  const sortParam = c.req.query("sort") ?? "avg_score";
  const orderBy = SORT_COLUMNS[sortParam] ?? SORT_COLUMNS.avg_score;

  const rows = db.prepare(`
    SELECT
      u.username,
      ROUND(AVG(s.score), 1)  AS avg_score,
      COUNT(*)                AS game_count,
      MAX(s.score)            AS best_score,
      u.created_at
    FROM scores s
    JOIN users u ON u.id = s.user_id
    GROUP BY s.user_id
    ORDER BY ${orderBy}
  `).all() as Omit<LeaderboardRow, "rank">[];

  const ranked: LeaderboardRow[] = rows.map((r, i) => ({ rank: i + 1, ...r }));
  return c.json(ranked);
});

// ─── GET /api/users/:name/exists ─────────────────────────────────────────────
// Returns { exists: boolean }

app.get("/api/users/:name/exists", (c) => {
  const name = c.req.param("name");
  const row = db
    .prepare("SELECT 1 FROM users WHERE username = ? COLLATE NOCASE")
    .get(name);
  return c.json({ exists: row !== undefined });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Quadra API listening on http://localhost:${PORT}`);
});
