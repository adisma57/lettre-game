import { describe, it, expect } from "vitest";
import { getTodayKey, daysBetween, puzzleNumber } from "./dayKey";

describe("getTodayKey", () => {
  it("23h30 heure de Paris en été → jour courant", () => {
    // 2026-09-10T21:30:00Z = 23:30 à Paris (UTC+2)
    expect(getTodayKey(new Date("2026-09-10T21:30:00Z"))).toBe("2026-09-10");
  });

  it("00h30 heure de Paris en été → jour suivant", () => {
    // 2026-09-10T22:30:00Z = 00:30 le 11 à Paris (UTC+2)
    expect(getTodayKey(new Date("2026-09-10T22:30:00Z"))).toBe("2026-09-11");
  });

  it("23h30 heure de Paris en hiver → jour courant", () => {
    // 2026-01-15T22:30:00Z = 23:30 à Paris (UTC+1)
    expect(getTodayKey(new Date("2026-01-15T22:30:00Z"))).toBe("2026-01-15");
  });

  it("00h30 heure de Paris en hiver → jour suivant", () => {
    // 2026-01-15T23:30:00Z = 00:30 le 16 à Paris (UTC+1)
    expect(getTodayKey(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
  });

  it("format YYYY-MM-DD", () => {
    expect(getTodayKey(new Date("2026-03-05T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("daysBetween", () => {
  it("jours consécutifs", () => {
    expect(daysBetween("2026-09-10", "2026-09-11")).toBe(1);
  });

  it("même jour", () => {
    expect(daysBetween("2026-09-10", "2026-09-10")).toBe(0);
  });

  it("changement de mois", () => {
    expect(daysBetween("2026-01-31", "2026-02-01")).toBe(1);
  });

  it("changement d'année", () => {
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("traverse le passage à l'heure d'été (29 mars 2026)", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });

  it("négatif si b précède a", () => {
    expect(daysBetween("2026-09-11", "2026-09-10")).toBe(-1);
  });
});

describe("puzzleNumber", () => {
  it("le jour de l'EPOCH est la partie #1", () => {
    expect(puzzleNumber("2026-09-10")).toBe(1);
  });

  it("le lendemain est la partie #2", () => {
    expect(puzzleNumber("2026-09-11")).toBe(2);
  });
});
