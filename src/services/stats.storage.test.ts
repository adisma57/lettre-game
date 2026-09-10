// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadStats, saveStats, createEmptyStats, isStatsStorageAvailable, STATS_STORAGE_KEY } from "./stats";

describe("loadStats", () => {
  beforeEach(() => localStorage.clear());

  it("renvoie des stats vides si rien n'est stocké", () => {
    expect(loadStats()).toEqual(createEmptyStats());
  });

  it("renvoie des stats vides sur un JSON illisible", () => {
    localStorage.setItem(STATS_STORAGE_KEY, "{pas du json");
    expect(loadStats()).toEqual(createEmptyStats());
  });

  it("renvoie des stats vides si la version de schéma diffère", () => {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify({ _v: 99, gamesPlayed: 7 }));
    expect(loadStats().gamesPlayed).toBe(0);
  });

  it("annule une date de dernière partie corrompue au lieu de la propager", () => {
    localStorage.setItem(
      STATS_STORAGE_KEY,
      JSON.stringify({ ...createEmptyStats(), lastPlayedDate: "pas-une-date", currentStreak: 5 }),
    );
    const stats = loadStats();
    expect(stats.lastPlayedDate).toBeNull();
    expect(stats.currentStreak).toBe(5);   // le reste des stats survit
  });

  it("annule un joker corrompu", () => {
    localStorage.setItem(
      STATS_STORAGE_KEY,
      JSON.stringify({ ...createEmptyStats(), jokerUsedOn: "2026-02-30" }),
    );
    expect(loadStats().jokerUsedOn).toBeNull();
  });

  it("aller-retour d'écriture puis lecture", () => {
    const stats = { ...createEmptyStats(), gamesPlayed: 3, lastPlayedDate: "2026-09-10" };
    expect(saveStats(stats)).toBe(true);
    expect(loadStats()).toEqual(stats);
  });
});

describe("isStatsStorageAvailable", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renvoie true quand localStorage fonctionne", () => {
    expect(isStatsStorageAvailable()).toBe(true);
  });

  it("renvoie false quand localStorage lève une exception (navigation privée iOS)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(isStatsStorageAvailable()).toBe(false);
  });
});
