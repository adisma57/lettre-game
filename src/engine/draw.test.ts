import { describe, it, expect } from "vitest";
import { getDailyDraw } from "./draw";
import { getTodayKey } from "./dayKey";

describe("getDailyDraw", () => {
  it("même clé de jour → même tirage (déterminisme)", () => {
    expect(getDailyDraw("2026-04-04")).toEqual(getDailyDraw("2026-04-04"));
  });

  it("clés de jour différentes → tirages différents", () => {
    expect(getDailyDraw("2026-04-04")).not.toEqual(getDailyDraw("2026-04-05"));
  });

  it("renvoie 4 lettres majuscules A-Z", () => {
    const draw = getDailyDraw("2026-04-04");
    expect(draw).toHaveLength(4);
    for (const letter of draw) {
      expect(letter).toMatch(/^[A-Z]$/);
    }
  });

  it("sans argument, utilise le jour courant à Paris", () => {
    expect(getDailyDraw()).toEqual(getDailyDraw(getTodayKey()));
  });
});
