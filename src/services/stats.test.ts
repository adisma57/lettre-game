import { describe, it, expect } from "vitest";
import { applyResult, createEmptyStats, type Stats } from "./stats";

function statsAt(overrides: Partial<Stats> = {}): Stats {
  return { ...createEmptyStats(), ...overrides };
}

describe("applyResult — série", () => {
  it("première partie → série à 1", () => {
    const next = applyResult(createEmptyStats(), {
      date: "2026-09-10", score: 12, bestPossible: 20, attempts: 2,
    });
    expect(next.currentStreak).toBe(1);
    expect(next.maxStreak).toBe(1);
    expect(next.lastPlayedDate).toBe("2026-09-10");
  });

  it("lendemain → série incrémentée", () => {
    const next = applyResult(
      statsAt({ gamesPlayed: 1, currentStreak: 4, maxStreak: 4, lastPlayedDate: "2026-09-10" }),
      { date: "2026-09-11", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(5);
    expect(next.maxStreak).toBe(5);
  });

  it("un jour manqué avec joker disponible → série maintenue et joker consommé", () => {
    const next = applyResult(
      statsAt({ gamesPlayed: 1, currentStreak: 6, maxStreak: 6, lastPlayedDate: "2026-09-10" }),
      { date: "2026-09-12", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(7);
    expect(next.jokerUsedOn).toBe("2026-09-12");
  });

  it("un jour manqué avec joker déjà consommé il y a 3 jours → série remise à 1", () => {
    const next = applyResult(
      statsAt({
        gamesPlayed: 1, currentStreak: 6, maxStreak: 6,
        lastPlayedDate: "2026-09-10", jokerUsedOn: "2026-09-09",
      }),
      { date: "2026-09-12", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(1);
    expect(next.jokerUsedOn).toBe("2026-09-09");
  });

  it("un jour manqué avec joker consommé il y a plus de 7 jours → joker de nouveau disponible", () => {
    const next = applyResult(
      statsAt({
        gamesPlayed: 1, currentStreak: 6, maxStreak: 6,
        lastPlayedDate: "2026-09-10", jokerUsedOn: "2026-09-01",
      }),
      { date: "2026-09-12", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(7);
    expect(next.jokerUsedOn).toBe("2026-09-12");
  });

  it("joker consommé exactement 7 jours avant → cooldown pas encore écoulé, série remise à 1", () => {
    // lastPlayedDate → date has a gap of 2 (one missed day), matching the other
    // joker cases. jokerUsedOn "2026-09-05" to result date "2026-09-12" is
    // exactly 7 days — the rule is `daysBetween(...) > 7`, so 7 itself must
    // still be unavailable.
    const next = applyResult(
      statsAt({
        gamesPlayed: 1, currentStreak: 6, maxStreak: 6,
        lastPlayedDate: "2026-09-10", jokerUsedOn: "2026-09-05",
      }),
      { date: "2026-09-12", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(1);
    expect(next.jokerUsedOn).toBe("2026-09-05");
  });

  it("joker consommé exactement 8 jours avant → cooldown écoulé, joker de nouveau disponible", () => {
    // Same gap of 2; jokerUsedOn "2026-09-04" to result date "2026-09-12" is
    // exactly 8 days — one day past the cooldown, so the joker should be
    // available again.
    const next = applyResult(
      statsAt({
        gamesPlayed: 1, currentStreak: 6, maxStreak: 6,
        lastPlayedDate: "2026-09-10", jokerUsedOn: "2026-09-04",
      }),
      { date: "2026-09-12", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(7);
    expect(next.jokerUsedOn).toBe("2026-09-12");
  });

  it("trois jours d'écart → série remise à 1 même avec joker", () => {
    const next = applyResult(
      statsAt({ gamesPlayed: 1, currentStreak: 9, maxStreak: 9, lastPlayedDate: "2026-09-10" }),
      { date: "2026-09-13", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(1);
  });

  it("même jour rejoué → série inchangée, jamais remise à 1", () => {
    const next = applyResult(
      statsAt({ gamesPlayed: 3, currentStreak: 8, maxStreak: 8, lastPlayedDate: "2026-09-10" }),
      { date: "2026-09-10", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(8);
    expect(next.lastPlayedDate).toBe("2026-09-10");
  });

  it("horloge reculée (écart négatif) → série inchangée et dernière partie non reculée", () => {
    const next = applyResult(
      statsAt({ gamesPlayed: 3, currentStreak: 8, maxStreak: 8, lastPlayedDate: "2026-09-12" }),
      { date: "2026-09-10", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(8);
    expect(next.lastPlayedDate).toBe("2026-09-12");
  });

  it("maxStreak conserve le record après une série cassée", () => {
    const next = applyResult(
      statsAt({ gamesPlayed: 1, currentStreak: 9, maxStreak: 12, lastPlayedDate: "2026-09-10" }),
      { date: "2026-09-20", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(1);
    expect(next.maxStreak).toBe(12);
  });
});

describe("applyResult — agrégats", () => {
  it("cumule score, précision et distribution", () => {
    const next = applyResult(createEmptyStats(), {
      date: "2026-09-10", score: 15, bestPossible: 20, attempts: 2,
    });
    expect(next.gamesPlayed).toBe(1);
    expect(next.scoreSum).toBe(15);
    expect(next.accuracySum).toBeCloseTo(0.75);
    expect(next.accuracyCount).toBe(1);
    expect(next.attemptDistribution).toEqual([0, 1, 0]);
    expect(next.perfectCount).toBe(0);
  });

  it("compte une partie parfaite", () => {
    const next = applyResult(createEmptyStats(), {
      date: "2026-09-10", score: 20, bestPossible: 20, attempts: 1,
    });
    expect(next.perfectCount).toBe(1);
    expect(next.attemptDistribution).toEqual([1, 0, 0]);
  });

  it("hors-ligne (bestPossible null) → série et gamesPlayed seulement", () => {
    const next = applyResult(createEmptyStats(), {
      date: "2026-09-10", score: 15, bestPossible: null, attempts: 3,
    });
    expect(next.gamesPlayed).toBe(1);
    expect(next.currentStreak).toBe(1);
    expect(next.scoreSum).toBe(15);
    expect(next.accuracyCount).toBe(0);
    expect(next.accuracySum).toBe(0);
    expect(next.perfectCount).toBe(0);
    expect(next.attemptDistribution).toEqual([0, 0, 1]);
  });

  it("révélation sans essai → série maintenue, aucun agrégat de performance", () => {
    const next = applyResult(createEmptyStats(), {
      date: "2026-09-10", score: 0, bestPossible: 20, attempts: 0,
    });
    expect(next.gamesPlayed).toBe(1);
    expect(next.currentStreak).toBe(1);
    expect(next.accuracyCount).toBe(0);
    expect(next.perfectCount).toBe(0);
    expect(next.attemptDistribution).toEqual([0, 0, 0]);
  });

  it("ne mute pas l'objet d'entrée", () => {
    const before = createEmptyStats();
    applyResult(before, { date: "2026-09-10", score: 5, bestPossible: 10, attempts: 1 });
    expect(before.gamesPlayed).toBe(0);
  });

  it("ne mute pas le tableau attemptDistribution de l'objet d'entrée", () => {
    const before = statsAt({ attemptDistribution: [2, 1, 0] });
    applyResult(before, { date: "2026-09-10", score: 5, bestPossible: 10, attempts: 1 });
    expect(before.attemptDistribution).toEqual([2, 1, 0]);
  });
});
