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
  const body: unknown = await res.json();
  if (res.ok) return { ok: true, username: (body as { username: string }).username };
  return {
    ok: false,
    error: isApiError(body) ? body.error : "Erreur inconnue.",
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
