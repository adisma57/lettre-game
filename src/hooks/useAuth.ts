import { useState } from "react";

const STORAGE_KEY = "auth_username";

export type AuthState =
  | { status: "unknown" }    // not yet determined (SSR guard, unused here)
  | { status: "guest" }      // no username set
  | { status: "authenticated"; username: string };

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored
      ? { status: "authenticated", username: stored }
      : { status: "guest" };
  });

  function login(username: string) {
    localStorage.setItem(STORAGE_KEY, username);
    setAuth({ status: "authenticated", username });
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuth({ status: "guest" });
  }

  return { auth, login, logout };
}
