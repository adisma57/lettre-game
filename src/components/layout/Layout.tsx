import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import { useAuth } from "../../hooks/useAuth";
import { UsernameModal } from "../UsernameModal";
import { flushPendingScores } from "../../services/scoreSync";

export default function Layout() {
  const { auth, login } = useAuth();

  // Flush any scores queued while offline / when a previous fetch was killed
  // (common on iOS when the app is backgrounded right after a submission).
  useEffect(() => {
    void flushPendingScores();
    const onFocus = () => {
      void flushPendingScores();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-canvas overflow-x-hidden">
      <NavBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {auth.status === "authenticated" && <Outlet />}
      </main>

      {auth.status === "guest" && <UsernameModal onSuccess={login} />}
    </div>
  );
}
