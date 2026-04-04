import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import { useAuth } from "../../hooks/useAuth";
import { UsernameModal } from "../UsernameModal";

export default function Layout() {
  const { auth, login } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <NavBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      {auth.status === "guest" && <UsernameModal onSuccess={login} />}
    </div>
  );
}
