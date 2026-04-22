import { useState, useEffect } from "react";
import { usernameExists } from "../services/api";

export const AUTH_STORAGE_KEY = "auth_username";

export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; username: string };

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = readStoredUsername();
    return stored ? { status: "loading" } : { status: "guest" };
  });

  // On mount, if localStorage has a username, verify it still exists in DB.
  // Covers iOS ITP purges + DB migrations that desync client and server.
  useEffect(() => {
    if (auth.status !== "loading") return;
    let cancelled = false;

    verifyStoredUsername().then((next) => {
      if (!cancelled) setAuth(next);
    });

    return () => {
      cancelled = true;
    };
  }, [auth.status]);

  function login(username: string) {
    localStorage.setItem(AUTH_STORAGE_KEY, username);
    setAuth({ status: "authenticated", username });
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth({ status: "guest" });
  }

  return { auth, login, logout };
}

function readStoredUsername(): string | null {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function verifyStoredUsername(): Promise<AuthState> {
  const stored = readStoredUsername();
  if (!stored) return { status: "guest" };

  try {
    const exists = await usernameExists(stored);
    if (exists) return { status: "authenticated", username: stored };
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return { status: "guest" };
  } catch {
    // Network hiccup — trust localStorage rather than lock the user out.
    return { status: "authenticated", username: stored };
  }
}
