import { Link } from "react-router-dom";

const PRIMARY_CARDS = [
  {
    to: "/daily",
    title: "Défi du jour",
    description:
      "Un tirage identique pour tous. 3 essais pour battre le meilleur score possible.",
    cta: "Jouer",
    accent: true,
  },
  {
    to: "/training",
    title: "Entraînement",
    description:
      "Tirages aléatoires en boucle. Pas de limite, pas de pression.",
    cta: "S\u2019entraîner",
    accent: false,
  },
  {
    to: "/solver",
    title: "Solveur",
    description:
      "Entrez un tirage et découvrez les 10 meilleurs mots possibles.",
    cta: "Analyser",
    accent: false,
  },
] as const;

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="py-12 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-fg">
          <span className="text-primary">Quadra</span>
        </h1>
        <p className="mt-4 text-lg text-muted">
          Formez le meilleur mot à partir d&apos;un tirage de 4 lettres.
        </p>
      </section>

      {/* Navigation cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        {PRIMARY_CARDS.map(({ to, title, description, cta, accent }) => (
          <Link
            key={to}
            to={to}
            className={[
              "group flex flex-col gap-3 rounded-xl border p-6 transition-colors",
              accent
                ? "border-primary bg-surface hover:bg-elevated"
                : "border-line bg-surface hover:border-primary hover:bg-elevated",
            ].join(" ")}
          >
            <h2 className="text-xl font-semibold text-fg">{title}</h2>
            <p className="flex-1 text-sm leading-relaxed text-muted">
              {description}
            </p>
            <span className="text-sm font-medium text-primary group-hover:underline">
              {cta} →
            </span>
          </Link>
        ))}
      </section>

      {/* Rules link */}
      <div className="mt-8 text-center">
        <Link
          to="/rules"
          className="text-sm text-muted transition-colors hover:text-primary"
        >
          Lire les règles du jeu
        </Link>
      </div>
    </div>
  );
}
