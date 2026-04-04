import { describe, it, expect } from "vitest";
import { getDailyDraw } from "./draw";

describe("getDailyDraw", () => {
  it("same Date object → same draw (determinism)", () => {
    const date = new Date("2026-04-04T12:00:00Z");
    expect(getDailyDraw(date)).toEqual(getDailyDraw(date));
  });

  it("same UTC day, different times (06:00 vs 22:00) → same draw", () => {
    const morning = new Date("2026-04-04T06:00:00Z");
    const evening = new Date("2026-04-04T22:00:00Z");
    expect(getDailyDraw(morning)).toEqual(getDailyDraw(evening));
  });

  it("different UTC dates (Apr 4 vs Apr 5) → different draws", () => {
    const apr4 = new Date("2026-04-04T12:00:00Z");
    const apr5 = new Date("2026-04-05T12:00:00Z");
    expect(getDailyDraw(apr4)).not.toEqual(getDailyDraw(apr5));
  });

  it("returns 4 uppercase letters A-Z", () => {
    const draw = getDailyDraw(new Date("2026-04-04T12:00:00Z"));
    expect(draw).toHaveLength(4);
    for (const letter of draw) {
      expect(letter).toMatch(/^[A-Z]$/);
    }
  });

  it("UTC midnight boundary: Apr 4 23:59:59Z vs Apr 5 00:00:00Z → different draws", () => {
    const before = new Date("2026-04-04T23:59:59Z");
    const after  = new Date("2026-04-05T00:00:00Z");
    expect(getDailyDraw(before)).not.toEqual(getDailyDraw(after));
  });
});
