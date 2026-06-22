import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import DailyGame from "./pages/DailyGame";
import Training from "./pages/Training";
import Solver from "./pages/Solver";
import Rules from "./pages/Rules";
import Leaderboard from "./pages/Leaderboard";
import Stats from "./pages/Stats";
import Archive from "./pages/Archive";
import ArchiveGame from "./pages/ArchiveGame";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true,              element: <Home />           },
      { path: "daily",            element: <DailyGame />      },
      { path: "training",         element: <Training />       },
      { path: "solver",           element: <Solver />         },
      { path: "archive",          element: <Archive />        },
      { path: "archive/:date",    element: <ArchiveGame />    },
      { path: "rules",            element: <Rules />          },
      { path: "stats",            element: <Stats />          },
      { path: "leaderboard",      element: <Leaderboard />    },
    ],
  },
]);
