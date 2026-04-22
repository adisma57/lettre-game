import { handle } from "hono/vercel";
import { app } from "../server/app.js";

// Top-level catch-all. Matches /api/<single-segment> paths reliably.
// Deeper paths under /api/users/ are picked up by api/users/[...slug].ts
// to work around a Vercel Edge routing quirk with multi-segment catch-alls.
export const config = { runtime: "edge" };
export default handle(app);
