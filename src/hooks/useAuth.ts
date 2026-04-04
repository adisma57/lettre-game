import { useState } from "react";

export const AUTH_STORAGE_KEY = "auth_username";

export type AuthState =
  | { status: "guest" }
  | { status: "authenticated"; username: string };

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored
      ? { status: "authenticated", username: stored }
      : { status: "guest" };
  });

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
