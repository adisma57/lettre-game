import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import DailyGame from "./pages/DailyGame";
import Training from "./pages/Training";
import Solver from "./pages/Solver";
import Rules from "./pages/Rules";
import Leaderboard from "./pages/Leaderboard";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true,            element: <Home />        },
      { path: "daily",          element: <DailyGame />   },
      { path: "training",       element: <Training />    },
      { path: "solver",         element: <Solver />      },
      { path: "rules",          element: <Rules />       },
      { path: "leaderboard",    element: <Leaderboard /> },
    ],
  },
]);
