import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  ensureSchema,
  findUserIdByUsername,
  getLeaderboard,
  insertScoreIfAbsent,
  insertUser,
  usernameExists,
} from "./repo.js";

const app = new Hono().basePath("/api");

function corsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN;
  if (raw) {
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) return list[0];
    if (list.length > 1) return list;
  }
  const vercel = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null;
  if (vercel) return [vercel, "http://localhost:5173"];
  return "http://localhost:5173";
}

app.use(
  "*",
  cors({
    origin: corsOrigins(),
    allowHeaders: ["Content-Type", "X-Username"],
  }),
);

let schemaReady: Promise<void> | undefined;
app.use("*", async (_c, next) => {
  if (!schemaReady) schemaReady = ensureSchema();
  await schemaReady;
  await next();
});

app.onError((err, c) => {
  console.error("[server error]", err);
  return c.json({ error: "Erreur serveur." }, 500);
});

// ─── POST /api/users ──────────────────────────────────────────────────────────

app.post("/users", async (c) => {
  const body = (await c.req
    .json()
    .catch(() => ({}))) as { username?: string };
  const username = (body.username ?? "").trim();

  if (!username || username.length < 2 || username.length > 20) {
    return c.json({ error: "Le pseudo doit faire entre 2 et 20 caractères." }, 400);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(username)) {
    return c.json({ error: "Caractères autorisés : lettres, chiffres, _ et -." }, 400);
  }

  const result = await insertUser(username);
  if (!result.ok) {
    return c.json({ error: "Ce pseudo est déjà pris." }, 409);
  }
  return c.json({ username }, 201);
});

// ─── POST /api/scores ────────────────────────────────────────────────────────

app.post("/scores", async (c) => {
  const username = c.req.header("X-Username")?.trim();
  if (!username) return c.json({ error: "En-tête X-Username manquant." }, 401);

  const userId = await findUserIdByUsername(username);
  if (userId == null) return c.json({ error: "Utilisateur inconnu." }, 404);

  const body = (await c.req
    .json()
    .catch(() => ({}))) as {
    date?: string;
    score?: number;
    best_possible?: number;
    attempts?: number;
  };

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

  await insertScoreIfAbsent(userId, date, score, best_possible, attempts);

  return c.json({ ok: true });
});

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────

type SortKey = "avg_score" | "game_count" | "account_age";

app.get("/leaderboard", async (c) => {
  const sortParam = (c.req.query("sort") ?? "avg_score") as SortKey;
  const sort: SortKey =
    sortParam === "game_count" || sortParam === "account_age"
      ? sortParam
      : "avg_score";

  const ranked = await getLeaderboard(sort);
  return c.json(ranked);
});

// ─── GET /api/users/:name/exists ─────────────────────────────────────────────

app.get("/users/:name/exists", async (c) => {
  const name = c.req.param("name");
  const exists = await usernameExists(name);
  return c.json({ exists });
});

export { app };
