const BASE = import.meta.env.VITE_API_URL ?? "";

export type ApiError = { error: string };

function isApiError(body: unknown): body is ApiError {
  return typeof body === "object" && body !== null && "error" in body;
}

// ─── POST /api/users ──────────────────────────────────────────────────────────

export type CreateUserResult =
  | { ok: true; username: string; recoveryCode: string }
  | { ok: false; error: string; status: number };

export async function createUser(username: string): Promise<CreateUserResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
  } catch (err) {
    console.warn("[users] network error on create", err);
    return { ok: false, error: "Réseau indisponible.", status: 0 };
  }

  const body: unknown = await res.json().catch(() => null);
  if (res.ok) {
    const un =
      body !== null &&
      typeof body === "object" &&
      "username" in body &&
      typeof (body as Record<string, unknown>).username === "string"
        ? (body as { username: string }).username
        : null;
    const rc =
      body !== null &&
      typeof body === "object" &&
      "recovery_code" in body &&
      typeof (body as Record<string, unknown>).recovery_code === "string"
        ? (body as { recovery_code: string }).recovery_code
        : "";
    if (!un) return { ok: false, error: "Réponse serveur invalide.", status: 200 };
    return { ok: true, username: un, recoveryCode: rc };
  }
  return {
    ok: false,
    error: isApiError(body) ? body.error : `Erreur serveur (${res.status}).`,
    status: res.status,
  };
}

// ─── POST /api/users/recover ──────────────────────────────────────────────────

export type RecoverUserResult =
  | { ok: true; username: string }
  | { ok: false; error: string; status: number };

export async function recoverUser(
  username: string,
  recoveryCode: string,
): Promise<RecoverUserResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/users/recover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, recovery_code: recoveryCode }),
    });
  } catch (err) {
    console.warn("[users] network error on recover", err);
    return { ok: false, error: "Réseau indisponible.", status: 0 };
  }
  const body: unknown = await res.json().catch(() => null);
  if (res.ok) {
    const un =
      body !== null &&
      typeof body === "object" &&
      "username" in body &&
      typeof (body as Record<string, unknown>).username === "string"
        ? (body as { username: string }).username
        : null;
    if (!un) return { ok: false, error: "Réponse serveur invalide.", status: 200 };
    return { ok: true, username: un };
  }
  return {
    ok: false,
    error: isApiError(body) ? body.error : `Erreur serveur (${res.status}).`,
    status: res.status,
  };
}

// ─── POST /api/scores ────────────────────────────────────────────────────────

export type ScorePayload = {
  username: string;
  date: string;
  score: number;
  best_possible: number;
  attempts: number;
};

export type SubmitScoreResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export async function submitScore(
  payload: ScorePayload,
): Promise<SubmitScoreResult> {
  const { username, ...body } = payload;
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Username": username,
      },
      body: JSON.stringify(body),
      // Keeps the request alive even when the page is unloading / backgrounded.
      // Essential on iOS Safari, which otherwise kills pending fetches when
      // the user locks the phone or switches apps mid-submission.
      keepalive: true,
    });
  } catch (err) {
    console.warn("[scores] network error", err, payload);
    return { ok: false, status: 0, error: "network" };
  }
  if (res.ok) return { ok: true };
  const errBody = (await res.json().catch(() => ({}))) as { error?: string };
  console.warn("[scores] submission failed", {
    status: res.status,
    error: errBody.error,
    payload,
  });
  return {
    ok: false,
    status: res.status,
    error: errBody.error ?? `HTTP ${res.status}`,
  };
}

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────

export type LeaderboardSort = "weekly" | "monthly" | "global";

export type LeaderboardEntry = {
  rank: number;
  username: string;
  total_score: number;
  game_count: number;
  best_score: number;
  avg_accuracy: number;       // 0.0–1.0 (global uniquement, 0 pour hebdo/mensuel)
  bayesian_accuracy: number;  // 0.0–1.0 (global uniquement, 0 pour hebdo/mensuel)
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

// ─── POST /api/users/:name/recovery-code ─────────────────────────────────────

export type ResetRecoveryCodeResult =
  | { ok: true; recoveryCode: string }
  | { ok: false; error: string; status: number };

export async function resetRecoveryCode(
  username: string,
): Promise<ResetRecoveryCodeResult> {
  let res: Response;
  try {
    res = await fetch(
      `${BASE}/api/users/${encodeURIComponent(username)}/recovery-code`,
      {
        method: "POST",
        headers: { "X-Username": username },
      },
    );
  } catch (err) {
    console.warn("[users] network error on recovery-code reset", err);
    return { ok: false, error: "Réseau indisponible.", status: 0 };
  }
  const body: unknown = await res.json().catch(() => null);
  if (res.ok) {
    const rc =
      body !== null &&
      typeof body === "object" &&
      "recovery_code" in body &&
      typeof (body as Record<string, unknown>).recovery_code === "string"
        ? (body as { recovery_code: string }).recovery_code
        : "";
    if (!rc) return { ok: false, error: "Réponse serveur invalide.", status: 200 };
    return { ok: true, recoveryCode: rc };
  }
  return {
    ok: false,
    error: isApiError(body) ? body.error : `Erreur serveur (${res.status}).`,
    status: res.status,
  };
}

// ─── GET /api/users/:name/exists ─────────────────────────────────────────────

export async function usernameExists(username: string): Promise<boolean> {
  const res = await fetch(
    `${BASE}/api/users/${encodeURIComponent(username)}/exists`,
  );
  const body = (await res.json()) as { exists: boolean };
  return body.exists;
}
