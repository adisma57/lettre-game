import { Link, NavLink } from "react-router-dom";

const NAV_LINKS = [
  { to: "/daily",    label: "Défi du jour"  },
  { to: "/training", label: "Entraînement"  },
  { to: "/solver",   label: "Solveur"       },
  { to: "/rules",    label: "Règles"        },
] as const;

export default function NavBar() {
  return (
    <header className="border-b border-line bg-surface">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-primary hover:text-primary-dim transition-colors"
        >
          Jeu de Lettres
        </Link>

        <ul className="flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  [
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-muted hover:bg-elevated hover:text-fg",
                  ].join(" ")
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
