import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import { useAuth } from "../../hooks/useAuth";
import { UsernameModal } from "../UsernameModal";
import { useAndroidBackButton } from "../../hooks/useAndroidBackButton";

export default function Layout() {
  const { auth, login } = useAuth();
  useAndroidBackButton();

  return (
    <div className="flex min-h-screen flex-col bg-canvas overflow-x-hidden">
      <NavBar />
      <main
        className="mx-auto w-full max-w-4xl flex-1 px-4 py-8"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Outlet />
      </main>

      {auth.status === "guest" && <UsernameModal onSuccess={login} />}
    </div>
  );
}
