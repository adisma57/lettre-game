import { describe, it, expect } from "vitest";
import { getTodayKey, daysBetween, puzzleNumber, isDayKey } from "./dayKey";

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

  it("reste correct sur une paire de dates encadrant un changement d'heure (ancrage UTC)", () => {
    // L'ancrage à minuit UTC rend le calcul insensible au changement d'heure :
    // n'importe quelle paire de dates espacées de 2 jours donnerait le même résultat,
    // que le passage à l'heure d'été (29 mars 2026) tombe entre les deux ou non.
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });

  it("négatif si b précède a", () => {
    expect(daysBetween("2026-09-11", "2026-09-10")).toBe(-1);
  });

  it("traverse une année bissextile (29 février existe)", () => {
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
  });

  it("traverse une année non bissextile (pas de 29 février)", () => {
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
  });

  it("lève une erreur si le premier argument est invalide", () => {
    expect(() => daysBetween("2026-02-30", "2026-09-10")).toThrow();
  });

  it("lève une erreur si le second argument est invalide", () => {
    expect(() => daysBetween("2026-09-10", "abc")).toThrow();
  });
});

describe("isDayKey", () => {
  it("accepte une clé de jour bien formée", () => {
    expect(isDayKey("2026-09-10")).toBe(true);
  });

  it("rejette les valeurs non-string", () => {
    expect(isDayKey(undefined)).toBe(false);
    expect(isDayKey(null)).toBe(false);
    expect(isDayKey(20260910)).toBe(false);
    expect(isDayKey({})).toBe(false);
  });

  it("rejette la chaîne vide", () => {
    expect(isDayKey("")).toBe(false);
  });

  it("rejette une chaîne non numérique", () => {
    expect(isDayKey("abc")).toBe(false);
  });

  it("rejette un mois ou un jour non complétés par un zéro", () => {
    expect(isDayKey("2026-9-10")).toBe(false);
  });

  it("rejette tout contenu additionnel", () => {
    expect(isDayKey("2026-09-10T00:00:00Z")).toBe(false);
  });

  it("rejette une date sémantiquement invalide silencieusement normalisée par le parseur ISO (jour hors plage)", () => {
    expect(isDayKey("2026-02-30")).toBe(false);
  });

  it("rejette une date sémantiquement invalide (mois hors plage)", () => {
    expect(isDayKey("2026-13-01")).toBe(false);
  });

  it("rejette un mois à zéro", () => {
    expect(isDayKey("2026-00-10")).toBe(false);
  });

  it("rejette l'année zéro", () => {
    expect(isDayKey("0000-01-01")).toBe(false);
  });

  it("rejette un espace en tête", () => {
    expect(isDayKey(" 2026-01-01")).toBe(false);
  });

  it("rejette un espace en fin", () => {
    expect(isDayKey("2026-01-01 ")).toBe(false);
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
