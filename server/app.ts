import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import {
  ensureSchema,
  findUserIdByUsername,
  findUsernameByRecoveryCode,
  getLeaderboard,
  upsertScore,
  insertUser,
  upsertDailyPuzzle,
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
/** Ne pas passer par un middleware global : sur Vercel le pathname peut ne pas être `/api/health`. */
const withDb: MiddlewareHandler = async (_c, next) => {
  schemaReady ??= ensureSchema();
  await schemaReady;
  await next();
};

app.get("/health", (c) =>
  c.json({ ok: true, t: new Date().toISOString() }),
);

app.onError((err, c) => {
  console.error("[server error]", err);
  return c.json({ error: "Erreur serveur." }, 500);
});

// ─── POST /api/users ──────────────────────────────────────────────────────────

app.post("/users", withDb, async (c) => {
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
  return c.json({ username, recovery_code: result.recoveryCode }, 201);
});

// ─── POST /api/scores ────────────────────────────────────────────────────────

app.post("/scores", withDb, async (c) => {
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

  await upsertDailyPuzzle(date, best_possible);
  await upsertScore(userId, date, score, best_possible, attempts);

  return c.json({ ok: true });
});

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────

type SortKey = "weekly" | "monthly" | "global";

app.get("/leaderboard", withDb, async (c) => {
  const sortParam = (c.req.query("sort") ?? "weekly") as SortKey;
  const sort: SortKey =
    sortParam === "monthly" || sortParam === "global"
      ? sortParam
      : "weekly";

  const ranked = await getLeaderboard(sort);
  return c.json(ranked);
});

// ─── GET /api/users/:name/exists ─────────────────────────────────────────────

app.get("/users/:name/exists", withDb, async (c) => {
  const name = c.req.param("name");
  const exists = await usernameExists(name);
  return c.json({ exists });
});

// ─── POST /api/recovery-code ──────────────────────────────────────────────────

app.post("/recovery-code", withDb, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { code?: string };
  const code = (body.code ?? "").trim();
  if (!code) return c.json({ error: "Code de récupération manquant." }, 400);

  const username = await findUsernameByRecoveryCode(code);
  if (!username) return c.json({ error: "Code invalide ou inexistant." }, 404);

  return c.json({ username });
});

export { app };
