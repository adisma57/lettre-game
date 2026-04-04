import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { to: "/daily",       label: "Défi du jour"  },
  { to: "/training",    label: "Entraînement"  },
  { to: "/solver",      label: "Solveur"       },
  { to: "/leaderboard", label: "Classement"    },
  { to: "/rules",       label: "Règles"        },
] as const;

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close when navigating (covers browser back/forward too)
  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  return (
    <header className="border-b border-line bg-surface">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-primary hover:text-primary-dim transition-colors"
        >
          Quadra
        </Link>

        {/* Desktop nav — hidden below md (768 px) */}
        <ul className="hidden md:flex items-center gap-1">
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

        {/* Hamburger button — visible below md only */}
        <button
          type="button"
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen(v => !v)}
          className="md:hidden rounded-md p-2 text-muted hover:bg-elevated hover:text-fg transition-colors"
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile dropdown — inside <header> so it pushes page content down naturally */}
      {isOpen && (
        <div className="md:hidden border-t border-line bg-surface px-4 pb-3">
          <ul className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    [
                      "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
        </div>
      )}
    </header>
  );
}
