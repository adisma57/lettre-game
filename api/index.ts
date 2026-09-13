import { app } from "../server/app.js";

// The server-side dictionary exceeds the Edge bundle limit. Use Node.js and
// Vercel's Web Standard handler so Hono still receives a native Request.
// vercel.json forwards every /api/* path to this single entry point.
export default { fetch: app.fetch };
