import { describe, it, expect, beforeEach } from "vitest";
import {
  insertPlay,
  getDailyPercentile,
  getDailyPuzzle,
  upsertDailyPuzzle,
  resetMemoryStore,
} from "./repo.js";

describe("getDailyPercentile", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("renvoie null en dessous de 20 joueurs distincts", async () => {
    for (let i = 0; i < 19; i++) {
      await insertPlay(`device-${i}`, "2026-09-10", 1, i);
    }
    const result = await getDailyPercentile("2026-09-10", 10);
    expect(result.percentile).toBeNull();
    expect(result.playersToday).toBe(19);
  });

  it("renvoie un percentile à partir de 20 joueurs distincts", async () => {
    for (let i = 0; i < 20; i++) {
      await insertPlay(`device-${i}`, "2026-09-10", 1, i);
    }
    const result = await getDailyPercentile("2026-09-10", 10);
    expect(result.playersToday).toBe(20);
    expect(result.percentile).toBeCloseTo(0.5);
  });

  it("utilise le meilleur score du jour par appareil", async () => {
    for (let i = 0; i < 19; i++) {
      await insertPlay(`device-${i}`, "2026-09-10", 1, 0);
    }
    await insertPlay("device-haut", "2026-09-10", 1, 2);
    await insertPlay("device-haut", "2026-09-10", 2, 30);
    await insertPlay("device-haut", "2026-09-10", 3, 5);

    const result = await getDailyPercentile("2026-09-10", 25);
    expect(result.playersToday).toBe(20);
    expect(result.percentile).toBeCloseTo(19 / 20);
  });

  it("ignore les parties des autres jours", async () => {
    for (let i = 0; i < 20; i++) {
      await insertPlay(`device-${i}`, "2026-09-09", 1, 50);
    }
    const result = await getDailyPercentile("2026-09-10", 10);
    expect(result.playersToday).toBe(0);
    expect(result.percentile).toBeNull();
  });
});

describe("insertPlay", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("est idempotent sur (device_id, date, attempt_num)", async () => {
    await insertPlay("device-a", "2026-09-10", 1, 12);
    await insertPlay("device-a", "2026-09-10", 1, 99);
    for (let i = 0; i < 19; i++) {
      await insertPlay(`device-${i}`, "2026-09-10", 1, 0);
    }
    const result = await getDailyPercentile("2026-09-10", 100);
    expect(result.playersToday).toBe(20);
    expect(result.percentile).toBeCloseTo(1);
  });

  it("accepte plusieurs essais pour un même appareil", async () => {
    await insertPlay("device-a", "2026-09-10", 1, 5);
    await insertPlay("device-a", "2026-09-10", 2, 8);
    for (let i = 0; i < 19; i++) {
      await insertPlay(`device-${i}`, "2026-09-10", 1, 0);
    }
    const result = await getDailyPercentile("2026-09-10", 7);
    expect(result.playersToday).toBe(20);
    expect(result.percentile).toBeCloseTo(19 / 20);
  });
});

describe("getDailyPuzzle / upsertDailyPuzzle", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("renvoie null pour une date absente", async () => {
    const result = await getDailyPuzzle("2026-09-10");
    expect(result).toBeNull();
  });

  it("renvoie ce qui a été écrit après un upsert", async () => {
    await upsertDailyPuzzle("2026-09-10", { bestPossible: 42, bestWord: "PATATE" });
    const result = await getDailyPuzzle("2026-09-10");
    expect(result).toEqual({ bestPossible: 42, bestWord: "PATATE" });
  });

  it("écrase la valeur précédente sur un second upsert pour la même date", async () => {
    await upsertDailyPuzzle("2026-09-10", { bestPossible: 42, bestWord: "PATATE" });
    await upsertDailyPuzzle("2026-09-10", { bestPossible: 99, bestWord: "GIROUETTE" });
    const result = await getDailyPuzzle("2026-09-10");
    expect(result).toEqual({ bestPossible: 99, bestWord: "GIROUETTE" });
  });
});
