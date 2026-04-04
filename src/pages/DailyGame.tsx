// M3 will implement the full 3-try game loop with localStorage persistence
// and the seeded daily draw. This shell confirms the route is reachable.
export default function DailyGame() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-fg">Défi du jour</h1>
      <p className="mt-2 text-muted">
        3 essais pour battre le meilleur score possible. Revenez chaque jour.
      </p>
    </div>
  );
}
