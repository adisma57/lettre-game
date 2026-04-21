import { Link } from "react-router-dom";

const PRIMARY_CARDS = [
  {
    to: "/daily",
    icon: "◈",
    title: "Défi du jour",
    description:
      "Un tirage identique pour tous. 3 essais pour battre le meilleur score possible.",
    cta: "Jouer",
    accent: true,
  },
  {
    to: "/training",
    icon: "◎",
    title: "Entraînement",
    description:
      "Tirages aléatoires en boucle. Pas de limite, pas de pression.",
    cta: "S\u2019entraîner",
    accent: false,
  },
  {
    to: "/solver",
    icon: "◉",
    title: "Solveur",
    description:
      "Entrez un tirage et découvrez les 10 meilleurs mots possibles.",
    cta: "Analyser",
    accent: false,
  },
] as const;

// Decorative letter tiles shown in the hero
const HERO_TILES = ["Q", "U", "A", "D"];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative py-16 text-center overflow-hidden">
        {/* Faint giant lettermark behind everything */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        >
          <span className="font-display font-black text-[20rem] leading-none text-primary opacity-[0.025]">
            Q
          </span>
        </div>

        {/* Decorative draw tiles */}
        <div className="relative mb-8 flex justify-center gap-3">
          {HERO_TILES.map((letter, i) => (
            <div
              key={letter}
              className={`animate-tile-drop flex h-14 w-14 items-center justify-center rounded-lg border border-primary/30 bg-surface font-mono text-2xl font-bold text-primary tile-glow delay-${[0, 75, 150, 225][i]}`}
              style={{ animationDelay: `${i * 75}ms` }}
            >
              {letter}
            </div>
          ))}
        </div>

        {/* Title */}
        <h1 className="animate-fade-up font-display text-[3.2rem] font-extrabold tracking-[0.04em] text-fg" style={{ animationDelay: "200ms" }}>
          QUADRA
        </h1>
        <p className="animate-fade-up mt-4 text-base text-muted" style={{ animationDelay: "300ms" }}>
          Formez le meilleur mot à partir d&apos;un tirage de 4 lettres.
        </p>
      </section>

      {/* Navigation cards */}
      <section className="animate-fade-up grid gap-4 sm:grid-cols-3" style={{ animationDelay: "400ms" }}>
        {PRIMARY_CARDS.map(({ to, icon, title, description, cta, accent }) => (
          <Link
            key={to}
            to={to}
            className={[
              "group relative flex flex-col gap-4 rounded-xl border p-6 transition-all duration-200",
              "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30",
              accent
                ? "border-primary/50 bg-surface hover:border-primary hover:bg-elevated"
                : "border-line bg-surface hover:border-primary/40 hover:bg-elevated",
            ].join(" ")}
          >
            {/* Accent dot for daily challenge */}
            {accent && (
              <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-primary animate-glow-pulse" />
            )}

            <div className="font-mono text-2xl text-primary/70 group-hover:text-primary transition-colors">
              {icon}
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-fg">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
            </div>

            <span className="mt-auto text-sm font-semibold text-primary group-hover:underline underline-offset-4">
              {cta} →
            </span>
          </Link>
        ))}
      </section>

      {/* Rules link */}
      <div className="mt-10 text-center animate-fade-up" style={{ animationDelay: "500ms" }}>
        <Link
          to="/rules"
          className="text-sm text-muted transition-colors hover:text-primary underline-offset-4 hover:underline"
        >
          Lire les règles du jeu
        </Link>
      </div>
    </div>
  );
}
