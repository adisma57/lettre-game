import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { App } from "@capacitor/app";

export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const listenerPromise = App.addListener("backButton", () => {
      if (location.pathname === "/") {
        App.exitApp();
      } else {
        navigate("/");
      }
    });
    return () => {
      listenerPromise.then(h => h.remove());
    };
  }, [navigate, location.pathname]);
}
