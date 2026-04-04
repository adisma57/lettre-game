// M4 will implement the full infinite-play loop with random draws,
// per-round top-3 results, and a Next button.
export default function Training() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-fg">Entraînement</h1>
      <p className="mt-2 text-muted">
        Tirages aléatoires en boucle. Aucune limite.
      </p>
    </div>
  );
}
