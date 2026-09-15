import { GAME_LANGUAGE, IS_ENGLISH, t } from "../src/language.js";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { ensureSchema, insertPlay, getDailyPercentile } from "./repo.js";
import { resolveBestPossible, resolveAnswers } from "./daily.js";
import { getTodayKey } from "../src/engine/dayKey.js";
import { createDraw } from "../src/engine/RoundService.js";
import { solveTopN } from "../src/engine/solver.js";
import { solverDictionary } from "./dictionary.js";

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
    allowHeaders: ["Content-Type", "X-Game-Language"],
  }),
);

app.use("*", async (c, next) => {
  const language = c.req.header("X-Game-Language");
  if (language && language !== GAME_LANGUAGE) return c.json({ error: "Game language mismatch" }, 409);
  if (IS_ENGLISH && !language && c.req.path !== "/api/health") return c.json({ error: "Game language required" }, 400);
  await next();
});

let schemaReady: Promise<void> | undefined;
/** Not a global middleware: on Vercel the pathname may not be `/api/health`. */
const withDb: MiddlewareHandler = async (_c, next) => {
  schemaReady ??= ensureSchema();
  await schemaReady;
  await next();
};

app.get("/health", (c) => c.json({ ok: true, language: GAME_LANGUAGE, t: new Date().toISOString() }));

app.onError((err, c) => {
  console.error("[server error]", err);
  return c.json({ error: t("Erreur serveur.", "Server error.") }, 500);
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-fA-F-]{36}$/;

/** Rejects a malformed date, or one later than the current Paris day. */
function invalidDate(date: string): boolean {
  return !DATE_RE.test(date) || date > getTodayKey();
}

// Prepare only today's puzzle. Never expose solutions or record a player.
app.get("/daily/:date/prepare", async (c, next) => {
  if (c.req.param("date") !== getTodayKey()) return c.json({ error: "Invalid date" }, 400);
  await next();
}, withDb, async (c) => {
  await resolveBestPossible(c.req.param("date"));
  c.header("Cache-Control", "no-store");
  return c.json({ ready: true });
});

app.post("/daily/:date/attempt", withDb, async (c) => {
  const date = c.req.param("date");
  if (invalidDate(date)) return c.json({ error: t("Date invalide.", "Invalid date.") }, 400);

  const body = (await c.req.json().catch(() => ({}))) as {
    deviceId?: string;
    attemptNum?: number;
    score?: number;
  };

  if (typeof body.deviceId !== "string" || !UUID_RE.test(body.deviceId)) {
    return c.json({ error: t("Identifiant d'appareil invalide.", "Invalid device identifier.") }, 400);
  }
  if (typeof body.attemptNum !== "number" || body.attemptNum < 1 || body.attemptNum > 3) {
    return c.json({ error: t("Numéro d'essai hors limites.", "Attempt number out of range.") }, 400);
  }
  if (typeof body.score !== "number" || body.score < 0) {
    return c.json({ error: t("Score invalide.", "Invalid score.") }, 400);
  }

  const bestPossible = await resolveBestPossible(date);
  await insertPlay(body.deviceId, date, body.attemptNum, body.score);

  return c.json({ bestPossible });
});

app.post("/daily/:date/finish", withDb, async (c) => {
  const date = c.req.param("date");
  if (invalidDate(date)) return c.json({ error: "Date invalide." }, 400);

  const body = (await c.req.json().catch(() => ({}))) as { score?: number };
  const score = typeof body.score === "number" && body.score >= 0 ? body.score : 0;

  const { bestWord, topWords } = await resolveAnswers(date);
  const { percentile, playersToday } = await getDailyPercentile(date, score);

  return c.json({ bestWord, topWords, percentile, playersToday });
});

app.get("/training", async (c) => {
  const draw = createDraw();
  const top3 = solveTopN(draw, solverDictionary, 3);
  return c.json({ draw, top3 });
});

export { app };
