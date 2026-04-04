import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import db from "./db.js";

const app = new Hono();

app.use("*", cors({ origin: "http://localhost:5173" }));

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
