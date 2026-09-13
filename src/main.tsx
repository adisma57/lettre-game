import { GAME_LANGUAGE, t } from "./language";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./index.css";

document.documentElement.lang = GAME_LANGUAGE;
document.title = t("Quadra", "Quadra — Daily word challenge");
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
