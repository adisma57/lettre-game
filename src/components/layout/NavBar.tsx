import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogoMark } from "../ui/LogoMark";
import { useLanguage } from "../../contexts/LanguageContext";

export default function NavBar() {
  const { t, lang, toggleLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  const NAV_LINKS = [
    { to: "/daily",    label: t.nav.daily    },
    { to: "/training", label: t.nav.training },
    { to: "/solver",   label: t.nav.solver   },
    { to: "/stats",    label: t.nav.stats    },
    { to: "/rules",    label: t.nav.rules    },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/90 backdrop-blur-md">
      <nav className="mx-auto flex h-[60px] max-w-4xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          to="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <LogoMark size={32} />
          <span className="font-display text-lg font-bold tracking-[0.08em] text-fg">
            QUADRA
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  [
                    "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted hover:bg-elevated hover:text-fg",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-px bg-primary rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            type="button"
            onClick={toggleLang}
            aria-label={`Switch to ${lang === "fr" ? "English" : "Français"}`}
            className="hidden md:flex h-8 items-center rounded-md border border-line px-2.5 text-xs font-bold text-muted transition-colors hover:border-primary/50 hover:text-primary"
          >
            {lang === "fr" ? "EN" : "FR"}
          </button>

          {/* Hamburger */}
          <button
            type="button"
            aria-label={isOpen ? t.nav.menuClose : t.nav.menuOpen}
            aria-expanded={isOpen}
            onClick={() => setIsOpen(v => !v)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-primary/50 hover:text-fg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              {isOpen ? (
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {isOpen && (
        <div className="md:hidden border-t border-line bg-canvas/95 backdrop-blur-md px-4 pb-4">
          <ul className="flex flex-col gap-1 pt-3">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    [
                      "flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "border border-primary/30 bg-primary/10 text-primary"
                        : "text-muted hover:bg-elevated hover:text-fg",
                    ].join(" ")
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Language toggle mobile */}
          <button
            type="button"
            onClick={() => { toggleLang(); setIsOpen(false); }}
            className="mt-3 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted hover:bg-elevated hover:text-fg transition-colors"
          >
            <span className="font-bold">{lang === "fr" ? "EN" : "FR"}</span>
            <span>{lang === "fr" ? "Switch to English" : "Passer en Français"}</span>
          </button>
        </div>
      )}
    </header>
  );
}
