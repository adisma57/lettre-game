import { Hono } from "hono";
import { cors } from "hono/cors";

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

app.get("/health", (c) =>
  c.json({ ok: true, t: new Date().toISOString() }),
);

app.onError((err, c) => {
  console.error("[server error]", err);
  return c.json({ error: "Erreur serveur." }, 500);
});

export { app };
