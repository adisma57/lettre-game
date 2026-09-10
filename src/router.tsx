import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import DailyGame from "./pages/DailyGame";
import Training from "./pages/Training";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true,          element: <DailyGame /> },
      { path: "entrainement", element: <Training />  },
    ],
  },
]);
