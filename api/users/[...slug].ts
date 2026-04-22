import { handle } from "hono/vercel";
import { app } from "../../server/app.js";

// Catch-all nested under /api/users/ to work around a Vercel Edge quirk:
// the top-level api/[...route].ts matches /api/users but not deeper paths
// like /api/users/:name/exists or /api/users/:name/recovery-code.
// This file picks them up and delegates to the same Hono app.
export const config = { runtime: "edge" };
export default handle(app);
