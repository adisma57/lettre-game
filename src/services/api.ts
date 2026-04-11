const BASE = import.meta.env.VITE_API_URL ?? "";

export type ApiError = { error: string };

function isApiError(body: unknown): body is ApiError {
  return typeof body === "object" && body !== null && "error" in body;
}

// ─── POST /api/users ──────────────────────────────────────────────────────────

export type CreateUserResult =
  | { ok: true;  username: string }
  | { ok: false; error: string; status: number };

export async function createUser(username: string): Promise<CreateUserResult> {
  const res = await fetch(`${BASE}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const body: unknown = await res.json().catch(() => null);
  if (res.ok) {
    const username =
      body !== null &&
      typeof body === "object" &&
      "username" in body &&
      typeof (body as Record<string, unknown>).username === "string"
        ? (body as { username: string }).username
        : null;
    if (!username) return { ok: false, error: "Réponse serveur invalide.", status: 200 };
    return { ok: true, username };
  }
  return {
    ok: false,
    error: isApiError(body) ? body.error : `Erreur serveur (${res.status}).`,
    status: res.status,
  };
}

// ─── POST /api/scores ────────────────────────────────────────────────────────

export async function submitScore(payload: {
  username: string;
  date: string;
  score: number;
  best_possible: number;
  attempts: number;
}): Promise<void> {
  const { username, ...body } = payload;
  await fetch(`${BASE}/api/scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Username": username,
    },
    body: JSON.stringify(body),
  });
  // Fire-and-forget: score submission failures are non-fatal
}

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────

export type LeaderboardSort = "weekly" | "monthly" | "global";

export type LeaderboardEntry = {
  rank: number;
  username: string;
  total_score: number;
  game_count: number;
  best_score: number;
  avg_accuracy: number;  // 0.0–1.0 (global uniquement, 0 pour hebdo/mensuel)
  created_at: string;
};

export async function fetchLeaderboard(
  sort: LeaderboardSort = "weekly",
): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${BASE}/api/leaderboard?sort=${sort}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Erreur serveur (${res.status}).`);
  }
  return res.json() as Promise<LeaderboardEntry[]>;
}

// ─── GET /api/users/:name/exists ─────────────────────────────────────────────

export async function usernameExists(username: string): Promise<boolean> {
  const res = await fetch(
    `${BASE}/api/users/${encodeURIComponent(username)}/exists`,
  );
  const body = (await res.json()) as { exists: boolean };
  return body.exists;
}
